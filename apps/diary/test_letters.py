from datetime import date, timedelta
from unittest import mock

from django.db import connection
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User

from .models import Letter

TEXT = "Querida yo del futuro: hoy llovió y el café olía a casa. Ojalá sigas buscando esos ratos."
TODAY = date(2026, 11, 27)


def on(day):
    """Simula que hoy es `day` (la fecha local del servidor)."""
    return mock.patch("django.utils.timezone.localdate", return_value=day)


class LetterTests(APITestCase):
    """HU19: cartas a mi yo del futuro, selladas hasta la fecha que elijo."""

    url = "/api/v1/diary/letters/"

    def setUp(self):
        self.user = User.objects.create_user(email="evoca@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))
        self.client.force_authenticate(self.user)

    def write(self, opens_on=TODAY + timedelta(days=30), **extra):
        with on(TODAY):
            return self.client.post(self.url, {"content": TEXT, "opens_on": opens_on.isoformat(), **extra}, format="json")

    # Escenario 1
    def test_scenario_1_a_letter_with_a_future_date_is_sealed(self):
        response = self.write(font="kalam", ink="vino")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            {key: response.data[key] for key in ("opens_on", "font", "ink", "ready", "opened_at")},
            {"opens_on": "2026-12-27", "font": "kalam", "ink": "vino", "ready": False, "opened_at": None},
        )
        # Ni al sellarla vuelve el contenido.
        self.assertNotIn("content", response.data)
        self.assertEqual(Letter.objects.get().content, TEXT)

    def test_scenario_1_its_content_cannot_be_read_before_the_date_not_even_by_the_api(self):
        letter_id = self.write().data["id"]
        with on(TODAY + timedelta(days=29)):
            detail = self.client.get(f"{self.url}{letter_id}/")
            listed = self.client.get(self.url)
            opened = self.client.post(f"{self.url}{letter_id}/open/")

        self.assertNotIn("content", detail.data)
        self.assertNotIn("content", listed.data[0])
        self.assertEqual(opened.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(opened.data["detail"], "Esta carta sigue sellada hasta el 27/12/2026.")
        self.assertNotIn("café", str(detail.data) + str(listed.data) + str(opened.data))
        self.assertIsNone(Letter.objects.get().opened_at)

    def test_scenario_1_sealed_letters_cannot_be_edited_or_deleted(self):
        letter_id = self.write().data["id"]
        for method in ("patch", "put", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(f"{self.url}{letter_id}/", {"content": "Otra"}, format="json")
                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(Letter.objects.get().content, TEXT)

    def test_scenario_1_it_needs_text_and_a_future_date(self):
        cases = [
            ({"content": "   ", "opens_on": "2027-01-01"}, "content", "Escribe tu carta antes de sellarla."),
            ({"opens_on": "2027-01-01"}, "content", "Escribe tu carta antes de sellarla."),
            ({"content": TEXT, "opens_on": TODAY.isoformat()}, "opens_on", "Elige una fecha futura: desde mañana."),
            ({"content": TEXT, "opens_on": "2026-01-01"}, "opens_on", "Elige una fecha futura: desde mañana."),
            ({"content": TEXT, "opens_on": "2037-01-01"}, "opens_on", "Elige una fecha dentro de los próximos 10 años."),
            ({"content": TEXT}, "opens_on", "Elige cuándo se abre."),
            ({"content": "a" * 20_001, "opens_on": "2027-01-01"}, "content", "La carta puede tener hasta 20.000 caracteres."),
        ]
        for body, field, message in cases:
            with self.subTest(field=field, message=message), on(TODAY):
                response = self.client.post(self.url, body, format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(response.data[field], [message])
        self.assertFalse(Letter.objects.exists())

    def test_the_letter_is_stored_encrypted(self):
        self.write()
        with connection.cursor() as cursor:
            cursor.execute("SELECT content FROM diary_letter")
            stored = cursor.fetchone()[0]
        self.assertNotIn("café", stored)

    # Escenario 2
    def test_scenario_2_on_its_date_the_envelope_opens_and_the_letter_is_read(self):
        letter_id = self.write().data["id"]
        with on(TODAY + timedelta(days=30)):
            arrived = self.client.get(self.url).data[0]
            opened = self.client.post(f"{self.url}{letter_id}/open/")
            again = self.client.get(f"{self.url}{letter_id}/")

        # Llegó la fecha: se avisa (ready) pero el contenido sale solo al abrir el sobre.
        self.assertEqual((arrived["ready"], arrived["opened_at"]), (True, None))
        self.assertNotIn("content", arrived)
        self.assertEqual(opened.status_code, status.HTTP_200_OK)
        self.assertEqual(opened.data["content"], TEXT)
        self.assertIsNotNone(opened.data["opened_at"])
        # Ya abierta, se puede volver a leer.
        self.assertEqual(again.data["content"], TEXT)

    def test_scenario_2_opening_twice_keeps_the_first_opening(self):
        letter_id = self.write().data["id"]
        with on(TODAY + timedelta(days=40)):
            first = self.client.post(f"{self.url}{letter_id}/open/").data["opened_at"]
            second = self.client.post(f"{self.url}{letter_id}/open/").data["opened_at"]
        self.assertEqual(first, second)

    # Escenario 3
    def test_scenario_3_the_list_says_how_many_and_when_each_opens_without_content(self):
        self.write(opens_on=TODAY + timedelta(days=200))
        self.write(opens_on=TODAY + timedelta(days=5))
        with on(TODAY):
            letters = self.client.get(self.url).data

        self.assertEqual([letter["opens_on"] for letter in letters], ["2026-12-02", "2027-06-15"])
        self.assertTrue(all("content" not in letter for letter in letters))

    # Privacidad
    def test_only_my_letters(self):
        letter_id = self.write().data["id"]
        other = User.objects.create_user(email="otra@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))
        self.client.force_authenticate(other)
        with on(TODAY + timedelta(days=60)):
            self.assertEqual(self.client.get(self.url).data, [])
            self.assertEqual(self.client.get(f"{self.url}{letter_id}/").status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(self.client.post(f"{self.url}{letter_id}/open/").status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_the_export_includes_my_letters_even_sealed_and_deleting_the_account_removes_them(self):
        self.write()
        exported = self.client.get("/api/v1/auth/export/").data["letters"]

        self.assertEqual([(letter["content"], letter["opens_on"]) for letter in exported], [(TEXT, date(2026, 12, 27))])
        self.user.delete()
        self.assertFalse(Letter.objects.exists())

    @override_settings(EVOCA_DIARY_KEY="", DEBUG=False)
    def test_without_the_key_in_production_letters_say_so_without_data(self):
        response = self.write()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(Letter.objects.exists())

    def test_ready_uses_the_local_date(self):
        letter = Letter(opens_on=timezone.localdate())
        self.assertTrue(letter.ready)

from datetime import date, datetime, timedelta
from unittest import mock

from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.traces.models import Trace

from .models import SupportContent, SupportEvent

PASSWORD = "UnaClaveSegura!2026"
TODAY = date(2026, 11, 6)


def make_user(email="persona@example.com"):
    return User.objects.create_user(email=email, password=PASSWORD, date_of_birth=date(1990, 1, 1))


def at(day, hour=12):
    return timezone.make_aware(datetime(day.year, day.month, day.day, hour))


class OrientationTests(APITestCase):
    """HU6 · Escenario 1: ánimo de 2 o menos en 14 de los últimos 21 días."""

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(self.user)

    def trace(self, day, intensity, user=None, hour=12):
        return Trace.objects.create(
            user=user or self.user, sensory_type="aroma", note="Nota", emotion="tristeza",
            mood_intensity=intensity, happened_at=at(day, hour),
        )

    def low_days(self, count, start_offset=0):
        for offset in range(start_offset, start_offset + count):
            self.trace(TODAY - timedelta(days=offset), 2)

    def orientation(self, moment=None):
        with mock.patch("django.utils.timezone.now", return_value=moment or at(TODAY, 18)):
            return self.client.get(reverse("support-orientation")).data

    def test_shows_with_fourteen_low_days_in_the_last_twenty_one(self):
        self.low_days(14)

        result = self.orientation()

        self.assertTrue(result["show"])
        self.assertEqual((result["reason"], result["low_days"]), ("low_mood", 14))

    def test_thirteen_low_days_are_not_enough(self):
        self.low_days(13)
        self.trace(TODAY - timedelta(days=13), 3)

        result = self.orientation()

        self.assertFalse(result["show"])
        self.assertEqual((result["reason"], result["low_days"]), ("not_enough_low_days", 13))

    def test_a_day_is_low_when_its_average_is_two_or_less(self):
        self.low_days(13, start_offset=1)
        # Hoy: 1 y 3 dan promedio 2 (bajo). Con 1 y 4 (promedio 2,5) no lo sería.
        self.trace(TODAY, 1, hour=9)
        self.trace(TODAY, 3, hour=10)
        self.assertTrue(self.orientation()["show"])

        self.trace(TODAY, 4, hour=11)
        self.assertEqual(self.orientation()["low_days"], 13)

    def test_only_the_last_twenty_one_days_count(self):
        self.low_days(13)
        self.trace(TODAY - timedelta(days=21), 1)  # Hace 21 días: fuera de la ventana.
        self.assertEqual(self.orientation()["low_days"], 13)

        self.trace(TODAY - timedelta(days=20), 1)  # Hace 20 días: el primero de la ventana.
        self.assertTrue(self.orientation()["show"])

    def test_days_without_traces_do_not_count_as_low(self):
        self.low_days(10)

        self.assertEqual(self.orientation()["low_days"], 10)

    def test_never_counts_other_peoples_traces(self):
        other = make_user("otra@example.com")
        for offset in range(21):
            self.trace(TODAY - timedelta(days=offset), 1, user=other)

        self.assertEqual(self.orientation()["low_days"], 0)

    def test_now_not_closes_it_for_seven_days(self):
        self.low_days(14)
        with mock.patch("django.utils.timezone.now", return_value=at(TODAY, 18)):
            response = self.client.post(reverse("support-events"), {"kind": "orientation_dismissed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(self.orientation(at(TODAY + timedelta(days=6), 17))["reason"], "recently_answered")
        # Siete días después vuelve a aparecer si el ánimo sigue bajo.
        for offset in range(1, 8):
            self.trace(TODAY + timedelta(days=offset), 2)
        self.assertTrue(self.orientation(at(TODAY + timedelta(days=7), 19))["show"])

    def test_records_when_the_help_route_is_opened(self):
        self.low_days(14)

        self.assertTrue(self.orientation()["show"])
        with mock.patch("django.utils.timezone.now", return_value=at(TODAY, 18)):
            response = self.client.post(reverse("support-events"), {"kind": "help_opened"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = SupportEvent.objects.get(user=self.user)
        self.assertEqual((event.kind, event.content_version), ("help_opened", SupportContent.current().version))
        self.assertEqual(self.orientation(at(TODAY, 19))["reason"], "recently_answered")

    def test_events_only_store_the_kind_never_text(self):
        response = self.client.post(
            reverse("support-events"), {"kind": "risk_screen_shown", "note": "texto privado"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data), {"id", "kind", "content_version", "created_at"})
        self.assertNotIn("texto privado", str(SupportEvent.objects.values().get()))

    def test_rejects_unknown_event(self):
        response = self.client.post(reverse("support-events"), {"kind": "otra_cosa"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_export_includes_and_account_deletion_removes_the_events(self):
        self.client.post(reverse("support-events"), {"kind": "help_opened"}, format="json")

        exported = self.client.get(reverse("export")).data
        self.assertEqual([event["kind"] for event in exported["support_events"]], ["help_opened"])

        self.client.delete(reverse("account"), {"password": PASSWORD}, format="json")
        self.assertFalse(SupportEvent.objects.exists())

    def test_requires_an_authenticated_person(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(reverse("support-orientation")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(reverse("support-content")).status_code, status.HTTP_401_UNAUTHORIZED)


class SupportContentTests(APITestCase):
    """HU6 · Escenarios 2 y 3: palabras de riesgo y líneas de ayuda que se actualizan sin publicar la app."""

    def setUp(self):
        self.client.force_authenticate(make_user())

    def content(self):
        return self.client.get(reverse("support-content")).data

    def new_version(self, **overrides):
        base = SupportContent.current()
        fields = {
            "version": base.version + 1,
            "orientation_title": base.orientation_title,
            "orientation_message": base.orientation_message,
            "help_title": base.help_title,
            "help_message": base.help_message,
            "help_lines": base.help_lines,
            "risk_terms": base.risk_terms,
            **overrides,
        }
        content = SupportContent(**fields)
        content.full_clean()
        content.save()
        return content

    def test_starts_with_a_draft_with_lines_and_risk_words(self):
        data = self.content()

        self.assertEqual((data["version"], data["draft"]), (1, True))
        self.assertIn("quitarme la vida", data["risk_terms"])
        self.assertEqual([line["phone"] for line in data["help_lines"]], ["192", "106", "123"])

    def test_an_approved_version_replaces_the_previous_one(self):
        self.new_version(
            help_title="Texto aprobado", risk_terms="palabra nueva\nfrase nueva", approved=True, approved_by="Psicólogo asesor"
        )

        data = self.content()

        self.assertEqual((data["version"], data["draft"], data["help_title"]), (2, False, "Texto aprobado"))
        self.assertEqual(data["risk_terms"], ["palabra nueva", "frase nueva"])

    def test_a_newer_draft_does_not_replace_the_approved_version(self):
        self.new_version(approved=True, approved_by="Psicólogo asesor")
        self.new_version(version=3, help_title="Borrador en revisión")

        self.assertEqual(self.content()["version"], 2)

    def test_approval_needs_who_approved_it(self):
        with self.assertRaises(ValidationError):
            self.new_version(approved=True)

    def test_each_line_needs_a_name_and_a_phone(self):
        with self.assertRaises(ValidationError):
            self.new_version(help_lines=[{"name": "Sin número"}])

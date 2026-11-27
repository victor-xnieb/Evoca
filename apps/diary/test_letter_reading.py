from datetime import date, datetime, time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.traces.models import Trace

from .models import Letter, Notebook, Page
from .test_letters import TEXT, TODAY, on

WRITTEN = date(2026, 8, 26)  # Un miércoles: su semana va del 24 al 30 de agosto.


def at(day, hour=10):
    return timezone.make_aware(datetime.combine(day, time(hour)))


def someone(email="otra@example.com"):
    return User.objects.create_user(email=email, password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))


class OpenedLetterTests(APITestCase):
    """HU19: al abrir la carta, cómo estaba al escribirla, responderle y sellar otra."""

    url = "/api/v1/diary/letters/"

    def setUp(self):
        self.user = someone("evoca@example.com")
        self.client.force_authenticate(self.user)
        self.letter = self.letter_for(self.user, opened=True)

    def letter_for(self, user, opens_on=TODAY, opened=False):
        letter = Letter.objects.create(user=user, content=TEXT, opens_on=opens_on, opened_at=at(TODAY) if opened else None)
        Letter.objects.filter(pk=letter.pk).update(created_at=at(WRITTEN, 9))
        letter.refresh_from_db()
        return letter

    def trace(self, day, sensory_type, emotion, intensity, hour=10, user=None):
        return Trace.objects.create(
            user=user or self.user,
            sensory_type=sensory_type,
            note=f"{sensory_type} {day}",
            emotion=emotion,
            mood_intensity=intensity,
            happened_at=at(day, hour),
        )

    def detail(self, letter=None):
        with on(TODAY):
            return self.client.get(f"{self.url}{(letter or self.letter).pk}/").data

    def post(self, path="", body=None, day=TODAY):
        with on(day):
            return self.client.post(f"{self.url}{path}", body or {}, format="json")

    # «Así estabas cuando la escribiste»
    def test_the_opened_letter_shows_how_i_was_that_day_and_traces_of_that_week(self):
        self.trace(date(2026, 8, 26), "aroma", "calma", 3)
        self.trace(date(2026, 8, 26), "song", "calma", 5, hour=18)
        self.trace(date(2026, 8, 25), "place", "alegria", 4)
        self.trace(date(2026, 8, 27), "song", "tristeza", 2)  # Otra canción: se queda la más intensa.
        self.trace(date(2026, 8, 31), "color", "alegria", 5)  # Ya es otra semana.
        self.trace(TODAY, "texture", "nostalgia", 3)
        self.trace(date(2026, 8, 26), "aroma", "miedo", 5, user=someone())  # De otra persona.

        moment = self.detail()["moment"]

        self.assertEqual((moment["day"], moment["emotion"], moment["today_emotion"]), (WRITTEN, "calma", "nostalgia"))
        self.assertEqual(
            [(item["sensory_type"], item["emotion"]) for item in moment["traces"]],
            [("song", "calma"), ("place", "alegria"), ("aroma", "calma")],
        )

    def test_without_traces_the_moment_says_so(self):
        moment = self.detail()["moment"]
        self.assertEqual((moment["emotion"], moment["today_emotion"], moment["traces"]), (None, None, []))

    def test_a_sealed_letter_brings_nothing_of_its_moment_reply_or_chain(self):
        data = self.detail(self.letter_for(self.user, opens_on=TODAY + timedelta(days=10)))
        for key in ("content", "moment", "reply", "next_letters", "previous"):
            self.assertNotIn(key, data)

    # «Escribir una respuesta»
    def test_replying_creates_a_page_of_today_linked_to_the_letter_in_my_last_notebook(self):
        older = Notebook.objects.create(user=self.user, title="Viajes")
        recent = Notebook.objects.create(user=self.user, title="Mi diario")
        Page.objects.create(notebook=older, user=self.user, day=date(2026, 11, 1))
        Page.objects.create(notebook=recent, user=self.user, day=date(2026, 11, 20))

        first = self.post(f"{self.letter.pk}/reply/")
        again = self.post(f"{self.letter.pk}/reply/")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["notebook"], str(recent.pk))
        self.assertEqual((again.status_code, again.data), (status.HTTP_200_OK, first.data))
        page = Page.objects.get(pk=first.data["page"])
        self.assertEqual((page.reply_to, page.notebook), (self.letter, recent))
        self.assertEqual(self.client.get(f"/api/v1/diary/pages/{page.pk}/").data["reply_to"], {"id": str(self.letter.pk), "written": WRITTEN})
        self.assertEqual(self.detail()["reply"], {"page": str(page.pk), "notebook": str(recent.pk)})

    def test_the_reply_goes_to_the_chosen_notebook_or_to_a_new_diary(self):
        mine = Notebook.objects.create(user=self.user, title="Cartas")
        theirs = Notebook.objects.create(user=someone(), title="Ajeno")
        for value in (str(theirs.pk), "no-es-un-id"):
            with self.subTest(notebook=value):
                self.assertEqual(self.post(f"{self.letter.pk}/reply/", {"notebook": value}).data["notebook"], ["Ese cuaderno no existe."])
        self.assertEqual(self.post(f"{self.letter.pk}/reply/", {"notebook": str(mine.pk)}).data["notebook"], str(mine.pk))

        mine.delete()  # Se lleva la respuesta: la siguiente va a un cuaderno nuevo.
        response = self.post(f"{self.letter.pk}/reply/")
        self.assertEqual(Notebook.objects.get(pk=response.data["notebook"]).title, "Mi diario")

    def test_a_sealed_letter_cannot_be_replied(self):
        sealed = self.letter_for(self.user, opens_on=TODAY + timedelta(days=10))
        self.assertEqual(self.post(f"{sealed.pk}/reply/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Page.objects.exists())

    def test_only_my_letters_can_be_replied(self):
        theirs = self.letter_for(someone(), opened=True)
        self.assertEqual(self.post(f"{theirs.pk}/reply/").status_code, status.HTTP_404_NOT_FOUND)

    # «Sellar otra carta»
    def test_sealing_another_letter_makes_a_chain(self):
        created = self.post(body={"content": "Otra carta.", "opens_on": "2027-11-27", "follows": str(self.letter.pk)})
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["follows"], str(self.letter.pk))
        new_id = created.data["id"]

        self.assertEqual(self.detail()["next_letters"], [{"id": new_id, "opens_on": date(2027, 11, 27), "ready": False}])
        self.post(f"{new_id}/open/", day=date(2027, 11, 27))
        with on(date(2027, 11, 27)):
            later = self.client.get(f"{self.url}{new_id}/").data
        self.assertEqual(later["previous"], {"id": str(self.letter.pk), "written": WRITTEN})

    def test_only_an_opened_letter_of_mine_can_be_followed(self):
        sealed = self.letter_for(self.user, opens_on=TODAY + timedelta(days=10))
        theirs = self.letter_for(someone(), opened=True)
        for follows, message in [(sealed.pk, "Solo puedes seguir una carta que ya abriste."), (theirs.pk, "Esa carta no existe.")]:
            with self.subTest(message=message):
                response = self.post(body={"content": "Otra.", "opens_on": "2027-01-01", "follows": str(follows)})
                self.assertEqual(response.data["follows"], [message])

    def test_the_export_keeps_replies_and_chains(self):
        page_id = self.post(f"{self.letter.pk}/reply/").data["page"]
        follower = self.post(body={"content": "Otra.", "opens_on": "2027-01-01", "follows": str(self.letter.pk)}).data["id"]

        exported = self.client.get("/api/v1/auth/export/").data

        page = exported["diary"][0]["pages"][0]
        self.assertEqual((page["id"], page["reply_to"]), (page_id, str(self.letter.pk)))
        self.assertEqual({item["id"]: item["follows"] for item in exported["letters"]}, {str(self.letter.pk): None, follower: str(self.letter.pk)})

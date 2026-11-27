import json
import urllib.error
from datetime import date
from unittest import mock

from django.core.cache import cache
from django.db import connection
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.traces import ai
from apps.traces.management.commands.suggestion_stats import acceptance_stats
from apps.traces.models import Memory, Trace

from . import evoke
from .models import Notebook, Page

TEXT = "Hoy la casa olía a café desde temprano. En la radio sonó una salsa vieja y la canté sola en la cocina."

TRACES = [
    {"sensory_type": "aroma", "note": "Olía a café desde temprano.", "emotion": "calma", "intensity": 4, "quote": "olía a café"},
    {"sensory_type": "song", "note": "Sonó una salsa vieja en la radio.", "emotion": "alegria", "intensity": 5, "quote": "una salsa vieja"},
    {"sensory_type": "place", "note": "La cocina de la casa.", "emotion": "calma", "intensity": 3, "quote": "en la cocina"},
]
MEMORIES = [
    {"name": "Mañanas en casa", "explanation": "Parece que estos momentos comparten la calma de la casa.", "traces": [1, 3]},
    {"name": "Música con mi hermana", "explanation": "Parece que la salsa te une a tu hermana.", "traces": [2]},
]


def answer(traces=None, memories=None):
    return json.dumps({"traces": TRACES if traces is None else traces, "memories": MEMORIES if memories is None else memories})


def document(text):
    return json.dumps({"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]})


@override_settings(EVOCA_AI_API_KEY="test-key", EVOCA_AI_PROVIDER="gemini")
class EvokeTests(APITestCase):
    """HU18: evocar recuerdos a partir de lo que escribo."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="evoca@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))
        self.client.force_authenticate(self.user)
        self.notebook = Notebook.objects.create(user=self.user, title="Mi diario")
        self.page = self.write(TEXT)
        self.calls = []

    def write(self, text):
        return Page.objects.create(notebook=self.notebook, user=self.user, day=date(2026, 11, 20), content=document(text))

    def provider(self, reply=None, error=None):
        def ask(text):
            self.calls.append(text)
            if error:
                raise error
            return reply if reply is not None else answer()

        return mock.patch.dict(evoke.PROVIDERS, {"gemini": ask})

    def evoke(self, page=None, **provider):
        with self.provider(**provider):
            return self.client.post(f"/api/v1/diary/pages/{(page or self.page).pk}/evoke/")

    def accept(self, index, **body):
        return self.client.post(f"/api/v1/diary/pages/{self.page.pk}/evocation/{index}/accept/", body, format="json")

    # Escenario 1
    def test_scenario_1_evoking_proposes_traces_grouped_in_memories_with_highlights(self):
        response = self.evoke()

        self.assertEqual(response.data["status"], "ok")
        evocation = response.data["page"]["evocation"]
        self.assertEqual(
            [(m["name"], m["status"], len(m["traces"])) for m in evocation["memories"]],
            [("Mañanas en casa", "suggested", 2), ("Música con mi hermana", "suggested", 1)],
        )
        self.assertEqual(evocation["memories"][0]["explanation"], "Parece que estos momentos comparten la calma de la casa.")
        self.assertEqual(
            {(item["quote"], item["emotion"], item["memory_id"]) for item in evocation["highlights"]},
            {("olía a café", "calma", None), ("una salsa vieja", "alegria", None), ("en la cocina", "calma", None)},
        )
        # Nada se guarda como huella ni recuerdo hasta aceptarlo.
        self.assertFalse(Trace.objects.exists())
        self.assertFalse(Memory.objects.exists())

    def test_scenario_1_the_ai_only_reads_the_page_text(self):
        self.evoke()
        self.assertEqual(self.calls, [TEXT])

    def test_scenario_1_invalid_or_clinical_parts_are_dropped(self):
        reply = answer(
            traces=[
                {"sensory_type": "aroma", "note": "Olía a café.", "emotion": "calma", "intensity": 4, "quote": "frase que no está"},
                {"sensory_type": "olor", "note": "Tipo inválido.", "emotion": "calma", "intensity": 3, "quote": ""},
                {"sensory_type": "song", "note": "La salsa.", "emotion": "alegria", "intensity": 9, "quote": "salsa"},
                {"sensory_type": "place", "note": "Mi terapia en la cocina.", "emotion": "calma", "intensity": 3, "quote": "cocina"},
            ],
            memories=[
                {"name": "Un trastorno de la casa", "explanation": "Parece que comparten algo.", "traces": [1]},
                {"name": "Mañanas", "explanation": "Parece que comparten la calma.", "traces": [1, 2, 3, 4, 9]},
            ],
        )
        memories = self.evoke(reply=reply).data["page"]["evocation"]["memories"]
        self.assertEqual([m["name"] for m in memories], ["Mañanas"])
        # Solo queda la huella válida, y su frase no se ilumina porque no está en el texto.
        self.assertEqual([(t["note"], t["quote"]) for t in memories[0]["traces"]], [("Olía a café.", "")])

    def test_a_short_page_or_one_with_risk_words_is_not_sent(self):
        short = self.write("Hoy bien.")
        self.assertEqual(self.evoke(page=short).data["status"], "too_short")
        risky = self.write("Hoy pensé mucho en el suicidio mientras olía a café en la cocina.")
        self.assertEqual(self.evoke(page=risky).data["status"], "risk")
        self.assertEqual(self.calls, [])

    def test_when_the_ai_fails_the_diary_works_the_same(self):
        for error in [urllib.error.URLError("sin red"), TimeoutError(), ai.SuggestionUnavailable("x")]:
            with self.subTest(error=type(error).__name__), self.assertLogs("apps.diary.evoke", "WARNING") as logs:
                response = self.evoke(error=error)
                self.assertEqual(response.data["status"], "unavailable")
                self.assertEqual(response.data["page"]["evocation"]["memories"], [])
                self.assertNotIn("café", " ".join(logs.output))
        cache.clear()
        for reply in ["no es json", answer(memories=[])]:
            with self.subTest(reply=reply[:20]), self.assertLogs("apps.diary.evoke", "WARNING"):
                self.assertEqual(self.evoke(reply=reply).data["status"], "unavailable")

    @override_settings(EVOCA_AI_API_KEY="")
    def test_without_a_key_it_is_unavailable(self):
        self.assertEqual(self.evoke().data["status"], "unavailable")
        self.assertEqual(self.calls, [])

    # Escenario 2
    def test_scenario_2_accepting_saves_the_traces_and_the_memory(self):
        self.evoke()
        response = self.accept(0, name="Mi casa", traces=[0])

        memory = Memory.objects.get(pk=response.data["memory_id"])
        self.assertEqual((memory.name, memory.status, memory.user), ("Mi casa", Memory.Status.ACCEPTED, self.user))
        self.assertIsNotNone(memory.suggested_at)
        self.assertEqual(
            [(t.sensory_type, t.note, t.emotion, t.mood_intensity) for t in memory.traces.all()],
            [("aroma", "Olía a café desde temprano.", "calma", 4)],
        )
        self.assertEqual(timezone.localtime(memory.traces.get().happened_at).date(), date(2026, 11, 20))
        evocation = response.data["page"]["evocation"]
        self.assertEqual((evocation["memories"][0]["status"], evocation["memories"][0]["memory_id"]), ("accepted", str(memory.pk)))
        # Las frases de lo aceptado llevan al recuerdo; la huella quitada ya no se ilumina.
        self.assertIn({"quote": "olía a café", "emotion": "calma", "memory_id": str(memory.pk)}, evocation["highlights"])
        self.assertNotIn("en la cocina", [item["quote"] for item in evocation["highlights"]])
        self.assertEqual([node["name"] for node in self.client.get("/api/v1/memories/").data["nodes"]], ["Mi casa"])

    def test_scenario_2_discarding_saves_nothing_but_counts_for_the_acceptance_rate(self):
        self.evoke()
        self.accept(0)
        response = self.client.post(f"/api/v1/diary/pages/{self.page.pk}/evocation/1/discard/")

        self.assertEqual(response.data["page"]["evocation"]["memories"][1]["status"], "discarded")
        self.assertEqual(Trace.objects.count(), 2)
        self.assertEqual(acceptance_stats()["acceptance_rate"], 0.5)
        self.assertNotIn("una salsa vieja", [item["quote"] for item in response.data["page"]["evocation"]["highlights"]])

    def test_scenario_2_decided_suggestions_cannot_be_decided_again(self):
        self.evoke()
        self.accept(0)
        self.assertEqual(self.accept(0).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.accept(9).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.accept(1, traces=[]).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.accept(1, traces="todas").status_code, status.HTTP_400_BAD_REQUEST)

    def test_evoking_again_keeps_what_was_decided(self):
        self.evoke()
        self.accept(0)
        memories = self.evoke().data["page"]["evocation"]["memories"]
        self.assertEqual(
            [(m["name"], m["status"]) for m in memories],
            [("Mañanas en casa", "accepted"), ("Mañanas en casa", "suggested"), ("Música con mi hermana", "suggested")],
        )

    # Escenario 3
    def test_scenario_3_the_memory_opens_the_page_where_it_was_born(self):
        self.evoke()
        memory_id = self.accept(0).data["memory_id"]

        detail = self.client.get(f"/api/v1/memories/{memory_id}/").data

        self.assertEqual(detail["diary_page"], {"id": str(self.page.pk), "notebook": str(self.notebook.pk), "day": date(2026, 11, 20)})

    def test_a_deleted_memory_stops_shining_in_the_page(self):
        self.evoke()
        memory_id = self.accept(0).data["memory_id"]
        self.client.delete(f"/api/v1/memories/{memory_id}/")
        evocation = self.client.get(f"/api/v1/diary/pages/{self.page.pk}/").data["evocation"]
        self.assertEqual([m["status"] for m in evocation["memories"]], ["suggested"])

    # Privacidad
    def test_only_my_pages_and_the_suggestion_is_stored_encrypted(self):
        other = User.objects.create_user(email="otra@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))
        self.client.force_authenticate(other)
        self.assertEqual(self.evoke().status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.user)
        self.evoke()
        with connection.cursor() as cursor:
            cursor.execute("SELECT payload FROM diary_evocation")
            stored = cursor.fetchone()[0]
        self.assertNotIn("café", stored)

    def test_limits_evocations_per_person(self):
        with self.provider():
            codes = [self.client.post(f"/api/v1/diary/pages/{self.page.pk}/evoke/").status_code for _ in range(6)]
        self.assertEqual(codes[:5], [status.HTTP_200_OK] * 5)
        self.assertEqual(codes[5], status.HTTP_429_TOO_MANY_REQUESTS)

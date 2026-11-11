import json
import time as clock
import urllib.error
from datetime import date, datetime, time, timedelta
from unittest import mock

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.accounts.models import User

from . import ai
from .models import Memory, MemoryTrace, Trace


class TraceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="UnaClaveSegura!2026",
            date_of_birth=date(1990, 1, 1),
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="UnaClaveSegura!2026",
            date_of_birth=date(1992, 2, 2),
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.list_url = "/api/v1/traces/"

    def trace_payload(self, **overrides):
        payload = {
            "sensory_type": Trace.SensoryType.AROMA,
            "note": "Café recién hecho",
            "emotion": "calma",
            "mood_intensity": 4,
            "tags": ["Casa", "mañana", "casa"],
        }
        payload.update(overrides)
        return payload

    def test_creates_trace_for_authenticated_user(self):
        response = self.client.post(self.list_url, self.trace_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trace = Trace.objects.get()
        self.assertEqual(trace.user, self.user)
        self.assertEqual(trace.tags, ["casa", "mañana"])

    def test_rejects_mood_outside_one_to_five(self):
        response = self.client.post(
            self.list_url,
            self.trace_payload(mood_intensity=6),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("mood_intensity", response.data)

    def test_never_lists_another_users_traces(self):
        Trace.objects.create(user=self.other_user, **self.trace_payload(tags=[]))
        own_trace = Trace.objects.create(user=self.user, **self.trace_payload(tags=[]))

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(own_trace.id))

    def test_cannot_retrieve_another_users_trace(self):
        foreign_trace = Trace.objects.create(
            user=self.other_user,
            **self.trace_payload(tags=[]),
        )

        response = self.client.get(f"{self.list_url}{foreign_trace.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)



class RegisterTraceTests(APITestCase):
    """HU2: guardar una huella con tipo, nota, emoción e intensidad."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="huellas@example.com",
            password="UnaClaveSegura!2026",
            date_of_birth=date(1990, 1, 1),
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/v1/traces/"

    def payload(self, **overrides):
        data = {"sensory_type": "aroma", "note": "Café de la abuela", "emotion": "nostalgia", "mood_intensity": 4}
        data.update(overrides)
        return data

    def test_accepts_each_of_the_six_sensory_types(self):
        for sensory_type in ("aroma", "color", "song", "flavor", "texture", "place"):
            response = self.client.post(self.url, self.payload(sensory_type=sensory_type), format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, sensory_type)
        self.assertEqual(Trace.objects.filter(user=self.user).count(), 6)

    def test_rejects_unknown_sensory_type(self):
        response = self.client.post(self.url, self.payload(sensory_type="sonido"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sensory_type", response.data)

    def test_without_emotion_says_what_is_missing_and_does_not_save(self):
        data = self.payload()
        del data["emotion"]

        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data["emotion"][0]), "Elige la emoción que sentiste.")
        self.assertFalse(Trace.objects.exists())

    def test_without_intensity_says_what_is_missing_and_does_not_save(self):
        data = self.payload()
        del data["mood_intensity"]

        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data["mood_intensity"][0]), "Elige qué tan intenso fue, de 1 a 5.")
        self.assertFalse(Trace.objects.exists())

    def test_reports_both_missing_fields_at_once(self):
        response = self.client.post(self.url, {"sensory_type": "color", "note": "Azul del mar"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertSetEqual(set(response.data), {"emotion", "mood_intensity"})

    def test_intensity_goes_from_one_to_five(self):
        for level in (1, 5):
            self.assertEqual(
                self.client.post(self.url, self.payload(mood_intensity=level), format="json").status_code,
                status.HTTP_201_CREATED,
            )
        for level in (0, 6):
            self.assertEqual(
                self.client.post(self.url, self.payload(mood_intensity=level), format="json").status_code,
                status.HTTP_400_BAD_REQUEST,
            )

    def test_emotion_must_be_one_of_the_eight(self):
        response = self.client.post(self.url, self.payload(emotion="felicidad"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("emotion", response.data)

    def test_note_is_required_and_short(self):
        self.assertEqual(
            self.client.post(self.url, self.payload(note="   "), format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.post(self.url, self.payload(note="x" * 501), format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_saved_trace_appears_first_in_my_list(self):
        self.client.post(self.url, self.payload(note="Primera"), format="json")
        created = self.client.post(self.url, self.payload(note="La más reciente"), format="json")

        response = self.client.get(self.url)

        self.assertEqual(response.data["results"][0]["id"], created.data["id"])
        self.assertEqual(response.data["results"][0]["note"], "La más reciente")

    def test_catalog_lists_six_types_and_eight_emotions(self):
        response = self.client.get(f"{self.url}catalog/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["value"] for item in response.data["sensory_types"]],
            ["aroma", "color", "song", "flavor", "texture", "place"],
        )
        self.assertEqual(
            [item["value"] for item in response.data["emotions"]],
            ["alegria", "calma", "gratitud", "nostalgia", "tristeza", "ansiedad", "enojo", "miedo"],
        )
        self.assertEqual(response.data["emotions"][0]["label"], "Alegría")


class ManageTracesTests(APITestCase):
    """HU3: ver, filtrar, editar y borrar mis huellas."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="mias@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1)
        )
        self.other = User.objects.create_user(
            email="ajena@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1)
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/v1/traces/"
        base = timezone.now()
        rows = [
            ("aroma", "calma", "Café", 3),
            ("song", "alegria", "Canción del colegio", 5),
            ("aroma", "nostalgia", "Perfume de la abuela", 4),
            ("place", "calma", "El parque", 2),
        ]
        self.traces = []
        for minutes, (sensory_type, emotion, note, level) in enumerate(rows):
            trace = Trace.objects.create(
                user=self.user, sensory_type=sensory_type, emotion=emotion, note=note, mood_intensity=level
            )
            # Cada una un minuto después de la anterior: la última es la más reciente.
            Trace.objects.filter(pk=trace.pk).update(created_at=base + timedelta(minutes=minutes))
            self.traces.append(trace)
        Trace.objects.create(user=self.other, sensory_type="aroma", emotion="calma", note="Ajena", mood_intensity=3)

    def notes(self, response):
        return [item["note"] for item in response.data["results"]]

    def test_lists_only_my_traces_newest_first(self):
        response = self.client.get(self.url)

        self.assertEqual(self.notes(response), ["El parque", "Perfume de la abuela", "Canción del colegio", "Café"])

    def test_filters_by_sensory_type_newest_first(self):
        response = self.client.get(self.url, {"sensory_type": "aroma"})

        self.assertEqual(self.notes(response), ["Perfume de la abuela", "Café"])

    def test_filters_by_emotion_newest_first(self):
        response = self.client.get(self.url, {"emotion": "calma"})

        self.assertEqual(self.notes(response), ["El parque", "Café"])
        self.assertNotIn("Ajena", self.notes(response))

    def test_combines_type_and_emotion(self):
        response = self.client.get(self.url, {"sensory_type": "aroma", "emotion": "calma"})

        self.assertEqual(self.notes(response), ["Café"])

    def test_filter_without_matches_returns_empty_list(self):
        response = self.client.get(self.url, {"emotion": "miedo"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_rejects_unknown_filter_values(self):
        self.assertEqual(self.client.get(self.url, {"emotion": "felicidad"}).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(self.url, {"sensory_type": "olor"}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_edits_note_emotion_and_intensity(self):
        trace = self.traces[0]

        response = self.client.patch(
            f"{self.url}{trace.id}/",
            {"note": "Café con canela", "emotion": "gratitud", "mood_intensity": 5},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trace.refresh_from_db()
        self.assertEqual((trace.note, trace.emotion, trace.mood_intensity), ("Café con canela", "gratitud", 5))
        # Lo que leen la gráfica y el calendario (la lista de huellas) ya trae el cambio.
        listed = next(item for item in self.client.get(self.url).data["results"] if item["id"] == str(trace.id))
        self.assertEqual((listed["emotion"], listed["mood_intensity"]), ("gratitud", 5))

    def test_edit_validates_like_create(self):
        trace = self.traces[0]
        for bad in ({"mood_intensity": 6}, {"emotion": "felicidad"}, {"note": "  "}):
            response = self.client.patch(f"{self.url}{trace.id}/", bad, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, bad)

    def test_cannot_edit_or_delete_another_persons_trace(self):
        foreign = Trace.objects.get(user=self.other)

        self.assertEqual(
            self.client.patch(f"{self.url}{foreign.id}/", {"note": "x"}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.delete(f"{self.url}{foreign.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Trace.objects.filter(pk=foreign.pk).exists())

    def test_delete_removes_it_from_my_list_and_from_memories(self):
        trace = self.traces[2]
        memory = Memory.objects.create(user=self.user, name="La casa de la abuela")
        memory.traces.add(trace, self.traces[0])

        response = self.client.delete(f"{self.url}{trace.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertNotIn("Perfume de la abuela", self.notes(self.client.get(self.url)))
        self.assertFalse(Trace.objects.filter(pk=trace.pk).exists())
        self.assertEqual(list(memory.traces.all()), [self.traces[0]])
        self.assertFalse(MemoryTrace.objects.filter(trace_id=trace.pk).exists())


class MoodChartTests(APITestCase):
    """HU4: datos de la gráfica de ánimo semanal y mensual (y HU3: la edición se refleja)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="animo@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1)
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/v1/traces/mood/"
        self.now = timezone.now()

    def add(self, days_ago, intensity, emotion="calma", user=None):
        trace = Trace.objects.create(
            user=user or self.user, sensory_type="aroma", note=f"Hace {days_ago} días", emotion=emotion,
            mood_intensity=intensity,
        )
        Trace.objects.filter(pk=trace.pk).update(created_at=self.now - timedelta(days=days_ago, hours=1))
        return trace

    def test_week_has_one_point_per_real_trace_of_the_last_7_days(self):
        recent = [self.add(1, 4, "alegria"), self.add(3, 2, "tristeza"), self.add(6, 5, "gratitud")]
        self.add(8, 1)  # fuera de la semana

        response = self.client.get(self.url, {"period": "week"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        # En orden cronológico; cada punto es una huella real con su intensidad y emoción.
        self.assertEqual([p["id"] for p in response.data["points"]], [str(t.id) for t in reversed(recent)])
        by_id = {str(t.id): t for t in recent}
        for point in response.data["points"]:
            trace = by_id[point["id"]]
            self.assertEqual((point["intensity"], point["emotion"]), (trace.mood_intensity, trace.emotion))

    def test_month_includes_the_last_30_days(self):
        for days in (1, 10, 29):
            self.add(days, 3)
        self.add(31, 3)

        response = self.client.get(self.url, {"period": "month"})

        self.assertEqual(response.data["count"], 3)

    def test_average_of_the_period(self):
        self.add(1, 4)
        self.add(2, 5)
        self.add(3, 2)

        response = self.client.get(self.url, {"period": "week"})

        self.assertEqual(response.data["average"], 3.7)

    def test_empty_period_has_no_points_and_no_average(self):
        self.add(20, 3)  # solo hay datos del mes, no de la semana

        response = self.client.get(self.url, {"period": "week"})

        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["points"], [])
        self.assertIsNone(response.data["average"])

    def test_uses_when_it_happened_if_given(self):
        trace = self.add(40, 3)
        Trace.objects.filter(pk=trace.pk).update(happened_at=self.now - timedelta(days=2))

        response = self.client.get(self.url, {"period": "week"})

        self.assertEqual([p["id"] for p in response.data["points"]], [str(trace.id)])

    def test_never_includes_other_peoples_traces(self):
        other = User.objects.create_user(
            email="otra-animo@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1)
        )
        self.add(1, 5, user=other)

        self.assertEqual(self.client.get(self.url).data["count"], 0)

    def test_rejects_unknown_period(self):
        self.assertEqual(self.client.get(self.url, {"period": "year"}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_editing_a_trace_is_reflected_in_the_chart(self):
        trace = self.add(1, 2, "tristeza")

        self.client.patch(f"/api/v1/traces/{trace.id}/", {"emotion": "alegria", "mood_intensity": 5}, format="json")

        point = self.client.get(self.url).data["points"][0]
        self.assertEqual((point["emotion"], point["intensity"]), ("alegria", 5))

    def test_deleting_a_trace_removes_its_point(self):
        trace = self.add(1, 2)

        self.client.delete(f"/api/v1/traces/{trace.id}/")

        self.assertEqual(self.client.get(self.url).data["count"], 0)

    def test_ninety_days_of_data_load_in_under_two_seconds(self):
        # 90 días con 4 huellas por día (360 registros).
        rows = [
            Trace(user=self.user, sensory_type="aroma", note="x", emotion="calma", mood_intensity=(day % 5) + 1)
            for day in range(90)
            for _ in range(4)
        ]
        created = Trace.objects.bulk_create(rows)
        for index, trace in enumerate(created):
            trace.created_at = self.now - timedelta(days=index // 4, hours=index % 4)
        Trace.objects.bulk_update(created, ["created_at"])

        started = clock.perf_counter()
        with self.assertNumQueries(2):
            response = self.client.get(self.url, {"period": "month"})
        elapsed = clock.perf_counter() - started

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 120)
        self.assertIsNotNone(response.data["average"])
        self.assertLess(elapsed, 2.0)


class MoodCalendarTests(APITestCase):
    """HU7: calendario de ánimo por colores (y HU3: la edición se refleja en el calendario)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="calendario@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1)
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/v1/traces/calendar/"

    def add(self, day, hour, emotion, intensity, user=None):
        moment = timezone.make_aware(datetime.combine(day, time(hour)))
        return Trace.objects.create(
            user=user or self.user, sensory_type="aroma", note=f"{emotion} {hour}h", emotion=emotion,
            mood_intensity=intensity, happened_at=moment,
        )

    def days(self, month):
        return {item["date"]: item for item in self.client.get(self.url, {"month": month}).data["days"]}

    def test_each_day_takes_its_dominant_emotion(self):
        day = date(2026, 10, 14)
        self.add(day, 8, "calma", 3)
        self.add(day, 12, "alegria", 5)
        self.add(day, 20, "calma", 2)

        item = self.days("2026-10")["2026-10-14"]

        self.assertEqual(item["dominant_emotion"], "calma")
        self.assertEqual(item["count"], 3)
        self.assertEqual(item["average_intensity"], 3.3)

    def test_tie_goes_to_higher_total_intensity_then_most_recent(self):
        stronger = date(2026, 10, 2)
        self.add(stronger, 9, "tristeza", 2)
        self.add(stronger, 18, "gratitud", 4)
        later = date(2026, 10, 3)
        self.add(later, 9, "miedo", 3)
        self.add(later, 18, "nostalgia", 3)

        days = self.days("2026-10")

        self.assertEqual(days["2026-10-02"]["dominant_emotion"], "gratitud")
        self.assertEqual(days["2026-10-03"]["dominant_emotion"], "nostalgia")

    def test_days_without_records_are_not_sent(self):
        self.add(date(2026, 10, 14), 8, "calma", 3)

        days = self.days("2026-10")

        self.assertEqual(list(days), ["2026-10-14"])

    def test_previous_months_can_be_opened(self):
        self.add(date(2026, 8, 30), 10, "enojo", 4)
        self.add(date(2026, 10, 1), 10, "calma", 3)

        response = self.client.get(self.url, {"month": "2026-08"})

        self.assertEqual(response.data["month"], "2026-08")
        self.assertEqual([item["date"] for item in response.data["days"]], ["2026-08-30"])
        self.assertEqual(response.data["first_month"], "2026-08")

    def test_month_limits_use_local_time(self):
        # 11:30 p. m. del 31 de octubre en Bogotá (ya es 1 de noviembre en UTC) es octubre.
        self.add(date(2026, 10, 31), 23, "calma", 3)

        self.assertIn("2026-10-31", self.days("2026-10"))
        self.assertEqual(self.days("2026-11"), {})

    def test_never_includes_other_peoples_traces(self):
        other = User.objects.create_user(
            email="otra-cal@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1)
        )
        self.add(date(2026, 10, 14), 8, "miedo", 5, user=other)

        self.assertEqual(self.days("2026-10"), {})

    def test_rejects_bad_month(self):
        for bad in ("2026-13", "10-2026", "2026/10"):
            self.assertEqual(self.client.get(self.url, {"month": bad}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_filters_the_traces_of_a_day(self):
        day = date(2026, 10, 14)
        self.add(day, 8, "calma", 3)
        self.add(day, 21, "alegria", 5)
        self.add(date(2026, 10, 15), 8, "miedo", 2)

        response = self.client.get("/api/v1/traces/", {"date": "2026-10-14"})

        self.assertEqual(sorted(item["emotion"] for item in response.data["results"]), ["alegria", "calma"])
        self.assertEqual(
            self.client.get("/api/v1/traces/", {"date": "14/10/2026"}).status_code, status.HTTP_400_BAD_REQUEST
        )

    def test_editing_a_trace_changes_the_color_of_its_day(self):
        day = date(2026, 10, 14)
        trace = self.add(day, 8, "tristeza", 2)

        self.client.patch(f"/api/v1/traces/{trace.id}/", {"emotion": "alegria", "mood_intensity": 5}, format="json")

        item = self.days("2026-10")["2026-10-14"]
        self.assertEqual((item["dominant_emotion"], item["average_intensity"]), ("alegria", 5.0))

    def test_deleting_the_only_trace_leaves_the_day_neutral(self):
        trace = self.add(date(2026, 10, 14), 8, "tristeza", 2)

        self.client.delete(f"/api/v1/traces/{trace.id}/")

        self.assertNotIn("2026-10-14", self.days("2026-10"))


TEN_WORDS = "El olor a pan me recordó las mañanas con abuela"
NINE_WORDS = "El olor a pan me recordó las mañanas contigo"


def gemini_reply(emotion="nostalgia", intensity=4, confidence=0.9):
    return json.dumps({"emotion": emotion, "intensity": intensity, "confidence": confidence})


@override_settings(EVOCA_AI_API_KEY="clave-de-prueba", EVOCA_AI_PROVIDER="gemini")
class SuggestEmotionTests(APITestCase):
    """HU8: la IA propone emoción e intensidad desde la nota; la huella guarda lo que elige la persona."""

    url = "/api/v1/traces/suggest/"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="ia@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))
        self.client.force_authenticate(self.user)
        self.calls = []

    def provider(self, reply=None, error=None):
        def ask(note):
            self.calls.append(note)
            if error:
                raise error
            return reply if reply is not None else gemini_reply()

        return mock.patch.dict(ai.PROVIDERS, {"gemini": ask})

    def suggest(self, note=TEN_WORDS):
        return self.client.post(self.url, {"note": note}, format="json")

    # Escenario 1
    def test_suggests_from_ten_words(self):
        with self.provider():
            response = self.suggest()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reason"], "ok")
        self.assertEqual(response.data["suggestion"], {"emotion": "nostalgia", "intensity": 4, "confidence": 0.9})
        self.assertEqual(self.calls, [TEN_WORDS])

    def test_nine_words_are_not_enough_and_the_ai_is_not_called(self):
        with self.provider():
            response = self.suggest(NINE_WORDS)

        self.assertEqual((response.data["suggestion"], response.data["reason"]), (None, "too_short"))
        self.assertEqual(self.calls, [])

    def test_gemini_request_keeps_the_key_in_the_server_and_waits_at_most_the_timeout(self):
        captured = {}

        class Reply:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps({"candidates": [{"content": {"parts": [{"text": gemini_reply()}]}}]}).encode()

        def fake_urlopen(request, timeout):
            captured.update(request=request, timeout=timeout, body=json.loads(request.data))
            return Reply()

        with mock.patch("urllib.request.urlopen", fake_urlopen), self.settings(EVOCA_AI_MODEL="modelo-x", EVOCA_AI_TIMEOUT=2.0):
            response = self.suggest()

        request, body = captured["request"], captured["body"]
        self.assertEqual(response.data["suggestion"]["emotion"], "nostalgia")
        self.assertIn("/models/modelo-x:generateContent", request.full_url)
        self.assertNotIn("clave-de-prueba", request.full_url)
        self.assertEqual(request.get_header("X-goog-api-key"), "clave-de-prueba")
        self.assertEqual(captured["timeout"], 2.0)
        self.assertEqual(body["contents"][0]["parts"][0]["text"], TEN_WORDS)
        schema = body["generationConfig"]["responseSchema"]["properties"]
        self.assertEqual(schema["emotion"]["enum"], [value for value, _ in Trace.Emotion.choices])
        self.assertEqual((schema["intensity"]["minimum"], schema["intensity"]["maximum"]), (1, 5))
        # La sugerencia no le llega al cliente con el prompt ni con la clave.
        self.assertNotIn("Eres el asistente", json.dumps(response.data))

    # Escenario 2
    def test_suggesting_saves_nothing_and_the_trace_keeps_the_persons_choice(self):
        with self.provider(gemini_reply("nostalgia", 4)):
            self.assertEqual(self.suggest().data["suggestion"]["emotion"], "nostalgia")
        self.assertFalse(Trace.objects.exists())

        response = self.client.post(
            "/api/v1/traces/",
            {"sensory_type": "aroma", "note": TEN_WORDS, "emotion": "alegria", "mood_intensity": 2},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trace = Trace.objects.get()
        self.assertEqual((trace.emotion, trace.mood_intensity), ("alegria", 2))

    # Escenario 3
    def test_without_a_key_there_is_no_suggestion(self):
        with self.provider(), self.settings(EVOCA_AI_API_KEY=""):
            response = self.suggest()

        self.assertEqual((response.data["suggestion"], response.data["reason"]), (None, "unavailable"))
        self.assertEqual(self.calls, [])

    def test_errors_and_timeouts_answer_without_suggestion_and_never_log_the_note(self):
        failures = [
            TimeoutError(),
            urllib.error.URLError("sin red"),
            urllib.error.HTTPError("https://x", 503, "Ocupado", {}, None),
        ]
        for failure in failures:
            with self.subTest(failure=type(failure).__name__), self.provider(error=failure):
                with self.assertLogs("apps.traces.ai", level="WARNING") as logs:
                    response = self.suggest()
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual((response.data["suggestion"], response.data["reason"]), (None, "unavailable"))
                self.assertNotIn("abuela", " ".join(logs.output))

    def test_invalid_answers_are_discarded(self):
        answers = [
            gemini_reply(emotion="felicidad"),
            gemini_reply(intensity=7),
            gemini_reply(intensity=0),
            gemini_reply(intensity="3"),
            gemini_reply(intensity=True),
            gemini_reply(confidence=1.5),
            "esto no es JSON",
            json.dumps({"emotion": "calma"}),
        ]
        for answer in answers:
            with self.subTest(answer=answer), self.provider(answer), self.assertLogs("apps.traces.ai", level="WARNING"):
                self.assertEqual(self.suggest().data["reason"], "unavailable")

    def test_low_confidence_gives_no_suggestion(self):
        with self.provider(gemini_reply(confidence=0.59)):
            self.assertEqual((self.suggest().data["suggestion"], self.suggest().data["reason"]), (None, "low_confidence"))
        with self.provider(gemini_reply(confidence=0.6)):
            self.assertEqual(self.suggest().data["reason"], "ok")

    def test_needs_a_note_and_an_authenticated_person(self):
        self.assertEqual(self.client.post(self.url, {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.client.force_authenticate(None)
        self.assertEqual(self.suggest().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_limits_suggestions_per_person(self):
        with self.provider():
            codes = [self.suggest().status_code for _ in range(21)]

        self.assertEqual(codes[:20], [status.HTTP_200_OK] * 20)
        self.assertEqual(codes[20], status.HTTP_429_TOO_MANY_REQUESTS)


class MemoryMapTests(APITestCase):
    """HU10: mapa de recuerdos como esferas del color de su emoción, con filtros y detalle."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="mapa@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1)
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/v1/memories/"
        self.day = 0

    def trace(self, emotion, intensity=3, sensory_type="aroma", user=None):
        self.day += 1
        return Trace.objects.create(
            user=user or self.user, sensory_type=sensory_type, note=f"{emotion} {self.day}", emotion=emotion,
            mood_intensity=intensity, happened_at=timezone.make_aware(datetime(2026, 10, 1, 12) + timedelta(days=self.day)),
        )

    def memory(self, name, traces, status=Memory.Status.ACCEPTED, user=None):
        memory = Memory.objects.create(user=user or self.user, name=name, status=status)
        memory.traces.add(*traces)
        return memory

    def spheres(self, **params):
        response = self.client.get(self.url, params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_scenario_1_spheres_take_their_emotion_and_grow_with_their_traces(self):
        self.memory("Tardes en la finca", [self.trace("calma"), self.trace("calma"), self.trace("alegria", 5)])
        self.memory("La casa de antes", [self.trace("nostalgia")])

        data = self.spheres()

        self.assertEqual(data["total"], 2)
        by_name = {sphere["name"]: sphere for sphere in data["results"]}
        self.assertEqual(by_name["Tardes en la finca"]["emotion"], "calma")
        self.assertEqual(by_name["Tardes en la finca"]["trace_count"], 3)
        self.assertEqual(by_name["La casa de antes"]["emotion"], "nostalgia")
        self.assertEqual(by_name["La casa de antes"]["trace_count"], 1)

    def test_scenario_1_the_map_is_not_chronological(self):
        """Primero el recuerdo más antiguo y pequeño; el mapa no los ordena por fecha."""
        self.memory("Viejo y pequeño", [self.trace("miedo")])
        self.memory("Nuevo y grande", [self.trace("alegria"), self.trace("alegria")])
        self.memory("Viejo y pequeño también", [self.trace("enojo")])

        names = [sphere["name"] for sphere in self.spheres()["results"]]

        self.assertEqual(names, ["Nuevo y grande", "Viejo y pequeño", "Viejo y pequeño también"])
        self.assertNotIn("created_at", self.spheres()["results"][0])

    def test_a_tie_follows_the_calendar_rule(self):
        """Empate en cantidad: gana la de mayor intensidad sumada (igual que el calendario de HU7)."""
        self.memory("Empate", [self.trace("tristeza", 2), self.trace("gratitud", 5)])

        self.assertEqual(self.spheres()["results"][0]["emotion"], "gratitud")

    def test_only_my_accepted_memories_with_traces_are_drawn(self):
        other = User.objects.create_user(
            email="otra@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1991, 1, 1)
        )
        self.memory("Mío", [self.trace("calma")])
        self.memory("Sugerido por la IA", [self.trace("alegria")], status=Memory.Status.SUGGESTED)
        self.memory("Sin huellas", [])
        self.memory("De otra persona", [self.trace("miedo", user=other)], user=other)

        data = self.spheres()

        self.assertEqual([sphere["name"] for sphere in data["results"]], ["Mío"])
        self.assertEqual(data["total"], 1)

    def test_deleting_a_trace_shrinks_its_sphere(self):
        traces = [self.trace("calma"), self.trace("calma")]
        self.memory("Lluvia", traces)

        self.client.delete(f"/api/v1/traces/{traces[0].pk}/")

        self.assertEqual(self.spheres()["results"][0]["trace_count"], 1)

    def test_scenario_2_filter_by_sensation_keeps_spheres_with_some_trace_of_that_type(self):
        self.memory("Canciones y aromas", [self.trace("alegria", sensory_type="song"), self.trace("alegria")])
        self.memory("Solo aromas", [self.trace("calma")])

        data = self.spheres(sensory_type="song")

        self.assertEqual([sphere["name"] for sphere in data["results"]], ["Canciones y aromas"])
        self.assertEqual(data["results"][0]["sensory_types"], ["aroma", "song"])
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["total"], 2)

    def test_scenario_2_filter_by_emotion_uses_the_color_of_the_sphere(self):
        self.memory("Mayormente calma", [self.trace("calma"), self.trace("calma"), self.trace("miedo")])
        self.memory("Miedo", [self.trace("miedo")])

        names = [sphere["name"] for sphere in self.spheres(emotion="miedo")["results"]]

        self.assertEqual(names, ["Miedo"])

    def test_scenario_2_filters_can_be_combined(self):
        self.memory("Lugares tristes", [self.trace("tristeza", sensory_type="place")])
        self.memory("Lugares alegres", [self.trace("alegria", sensory_type="place")])
        self.memory("Sabores tristes", [self.trace("tristeza", sensory_type="flavor")])

        names = [sphere["name"] for sphere in self.spheres(sensory_type="place", emotion="tristeza")["results"]]

        self.assertEqual(names, ["Lugares tristes"])

    def test_unknown_filters_are_rejected(self):
        self.assertEqual(self.client.get(self.url, {"sensory_type": "olor"}).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(self.url, {"emotion": "euforia"}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_scenario_2_touching_a_sphere_shows_its_traces(self):
        older = self.trace("calma", sensory_type="color")
        newer = self.trace("alegria", sensory_type="song")
        memory = self.memory("Domingos", [older, newer])
        memory.explanation = "Huellas de domingos en familia."
        memory.save()

        response = self.client.get(f"{self.url}{memory.pk}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Domingos")
        self.assertEqual(response.data["explanation"], "Huellas de domingos en familia.")
        self.assertEqual(response.data["trace_count"], 2)
        self.assertEqual([trace["id"] for trace in response.data["traces"]], [str(newer.pk), str(older.pk)])
        self.assertEqual(response.data["traces"][0]["note"], newer.note)

    def test_nobody_else_can_open_my_memory(self):
        memory = self.memory("Privado", [self.trace("calma")])
        stranger = User.objects.create_user(
            email="extrano@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1993, 3, 3)
        )
        self.client.force_authenticate(stranger)

        self.assertEqual(self.client.get(f"{self.url}{memory.pk}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(self.url).data["results"], [])

    def test_the_map_requires_a_session(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_3_two_hundred_memories_open_in_under_three_seconds(self):
        emotions = Trace.Emotion.values
        traces = Trace.objects.bulk_create(
            [
                Trace(
                    user=self.user, sensory_type=Trace.SensoryType.values[index % 6], note=f"Huella {index}",
                    emotion=emotions[index % len(emotions)], mood_intensity=index % 5 + 1,
                )
                for index in range(600)
            ]
        )
        memories = Memory.objects.bulk_create(
            [Memory(user=self.user, name=f"Recuerdo {index}", status=Memory.Status.ACCEPTED) for index in range(200)]
        )
        MemoryTrace.objects.bulk_create(
            [MemoryTrace(memory=memory, trace=traces[index * 3 + offset]) for index, memory in enumerate(memories) for offset in range(3)]
        )

        started = clock.perf_counter()
        # Dos consultas sin importar cuántos recuerdos haya: los recuerdos y sus huellas.
        with self.assertNumQueries(2):
            response = self.client.get(self.url)
        elapsed = clock.perf_counter() - started

        self.assertEqual(response.data["count"], 200)
        self.assertLess(elapsed, 3)

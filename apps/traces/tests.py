from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.accounts.models import User

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

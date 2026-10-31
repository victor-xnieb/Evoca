from datetime import date

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.accounts.models import User

from .models import Trace


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


from datetime import date

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ConsentRecord, User


class RegistrationTests(APITestCase):
    def registration_payload(self, **overrides):
        payload = {
            "email": "persona@example.com",
            "password": "UnaClaveSegura!2026",
            "first_name": "Ana",
            "last_name": "Prueba",
            "date_of_birth": "1998-05-10",
            "accepted_terms": True,
            "accepted_privacy": True,
            "accepted_health_data": True,
        }
        payload.update(overrides)
        return payload

    def test_registers_adult_and_records_three_consents(self):
        response = self.client.post(reverse("register"), self.registration_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        user = User.objects.get(email="persona@example.com")
        self.assertEqual(user.consents.count(), 3)
        self.assertSetEqual(
            set(user.consents.values_list("consent_type", flat=True)),
            {
                ConsentRecord.Type.TERMS,
                ConsentRecord.Type.PRIVACY,
                ConsentRecord.Type.HEALTH_DATA,
            },
        )

    def test_rejects_minor(self):
        today = date.today()
        minor_birth_date = today.replace(year=today.year - 17).isoformat()

        response = self.client.post(
            reverse("register"),
            self.registration_payload(date_of_birth=minor_birth_date),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="persona@example.com").exists())

    def test_requires_sensitive_data_consent(self):
        response = self.client.post(
            reverse("register"),
            self.registration_payload(accepted_health_data=False),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("accepted_health_data", response.data)


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com",
            password="UnaClaveSegura!2026",
            date_of_birth=date(1990, 1, 1),
        )

    def test_login_and_me(self):
        login = self.client.post(
            reverse("login"),
            {"email": self.user.email, "password": "UnaClaveSegura!2026"},
            format="json",
        )

        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["email"], self.user.email)


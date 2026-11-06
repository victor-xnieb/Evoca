from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse


class HealthViewTests(TestCase):
    def test_health_reports_database_status(self):
        response = self.client.get(reverse("health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "database": "ok"})


@override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:5173"])
class CorsTests(TestCase):
    def test_default_origins_have_no_wildcard(self):
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)
        self.assertNotIn("*", settings.CORS_ALLOWED_ORIGINS)

    def test_allows_configured_frontend_origin(self):
        response = self.client.get(reverse("health"), HTTP_ORIGIN="http://localhost:5173")

        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:5173")

    def test_preflight_allows_authorization_header(self):
        response = self.client.options(
            reverse("health"),
            HTTP_ORIGIN="http://localhost:5173",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization",
        )

        self.assertIn("authorization", response["Access-Control-Allow-Headers"])

    def test_rejects_unknown_origin(self):
        response = self.client.get(reverse("health"), HTTP_ORIGIN="https://sitio-ajeno.example")

        self.assertNotIn("Access-Control-Allow-Origin", response)

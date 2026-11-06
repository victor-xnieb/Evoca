from datetime import date, datetime, time, timedelta
from unittest import mock

from django.conf import settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.traces.models import Memory, Trace

from .models import AccessPin, ConsentRecord, DailyReminder, User

PASSWORD = "UnaClaveSegura!2026"


def years_ago(years, on_date=None):
    on_date = on_date or date.today()
    try:
        return on_date.replace(year=on_date.year - years)
    except ValueError:  # 29 de febrero en un año no bisiesto
        return on_date.replace(year=on_date.year - years, day=28)


def make_user(email="persona@example.com"):
    return User.objects.create_user(email=email, password=PASSWORD, date_of_birth=date(1990, 1, 1))


class RegistrationTests(APITestCase):
    """HU1 · Escenario 1: mayoría de edad y autorización expresa de datos sensibles."""

    def registration_payload(self, **overrides):
        payload = {
            "email": "persona@example.com",
            "password": PASSWORD,
            "first_name": "Ana",
            "last_name": "Prueba",
            "date_of_birth": "1998-05-10",
            "accepted_terms": True,
            "accepted_privacy": True,
            "accepted_health_data": True,
        }
        payload.update(overrides)
        return payload

    def register(self, **overrides):
        return self.client.post(reverse("register"), self.registration_payload(**overrides), format="json")

    def test_registers_adult_and_records_three_consents(self):
        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertFalse(response.data["user"]["has_pin"])
        user = User.objects.get(email="persona@example.com")
        self.assertSetEqual(
            set(user.consents.values_list("consent_type", flat=True)),
            {ConsentRecord.Type.TERMS, ConsentRecord.Type.PRIVACY, ConsentRecord.Type.HEALTH_DATA},
        )

    def test_sensitive_data_consent_is_saved_with_date_and_version(self):
        before = timezone.now()
        self.register()

        consent = ConsentRecord.objects.get(consent_type=ConsentRecord.Type.HEALTH_DATA)
        self.assertEqual(consent.document_version, settings.EVOCA_HEALTH_DATA_VERSION)
        self.assertGreaterEqual(consent.accepted_at, before)
        self.assertLessEqual(consent.accepted_at, timezone.now())
        self.assertIsNone(consent.revoked_at)

    def test_accepts_person_who_turns_18_today(self):
        response = self.register(date_of_birth=years_ago(18).isoformat())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_rejects_person_who_turns_18_tomorrow_and_explains_why(self):
        birth = years_ago(18) + timedelta(days=1)

        response = self.register(date_of_birth=birth.isoformat())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("mayores de 18 años", str(response.data["date_of_birth"][0]))
        self.assertFalse(User.objects.exists())

    def test_rejects_minor(self):
        response = self.register(date_of_birth=years_ago(17).isoformat())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="persona@example.com").exists())

    def test_requires_sensitive_data_consent_and_explains_why(self):
        response = self.register(accepted_health_data=False)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("datos sensibles", str(response.data["accepted_health_data"][0]))
        self.assertFalse(User.objects.exists())
        self.assertFalse(ConsentRecord.objects.exists())

    def test_lists_own_consents(self):
        token = self.register().data["token"]
        make_user("otra@example.com")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.get(reverse("consents"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertTrue(all(item["document_version"] and item["accepted_at"] for item in response.data))


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com",
            password=PASSWORD,
            date_of_birth=date(1990, 1, 1),
        )

    def test_login_and_me(self):
        login = self.client.post(
            reverse("login"),
            {"email": self.user.email, "password": PASSWORD},
            format="json",
        )

        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["email"], self.user.email)


class PinTests(APITestCase):
    """HU1 · Escenario 2: PIN de 4 dígitos y bloqueo de 5 minutos tras 5 intentos fallidos."""

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(self.user)
        self.client.put(reverse("pin"), {"pin": "2468"}, format="json")

    def verify(self, pin):
        return self.client.post(reverse("pin-verify"), {"pin": pin}, format="json")

    def test_pin_must_have_exactly_four_digits(self):
        for invalid in ("123", "12345", "12a4", ""):
            response = self.client.put(reverse("pin"), {"pin": invalid, "password": PASSWORD}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, invalid)

    def test_pin_is_stored_hashed(self):
        pin = AccessPin.objects.get(user=self.user)
        self.assertNotIn("2468", pin.pin_hash)
        self.assertTrue(self.client.get(reverse("me")).data["has_pin"])

    def test_correct_pin_unlocks(self):
        response = self.verify("2468")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["verified"])

    def test_four_failures_do_not_lock(self):
        for expected_remaining in (4, 3, 2, 1):
            response = self.verify("0000")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data["remaining_attempts"], expected_remaining)

        self.assertEqual(self.verify("2468").status_code, status.HTTP_200_OK)

    def test_fifth_failure_locks_for_five_minutes(self):
        start = timezone.now()
        with mock.patch("django.utils.timezone.now", return_value=start):
            for _ in range(4):
                self.verify("0000")
            fifth = self.verify("0000")

        self.assertEqual(fifth.status_code, status.HTTP_423_LOCKED)
        self.assertEqual(fifth.data["locked_until"], start + timedelta(minutes=5))

    def test_locked_rejects_even_the_correct_pin_until_five_minutes_pass(self):
        start = timezone.now()
        with mock.patch("django.utils.timezone.now", return_value=start):
            for _ in range(5):
                self.verify("0000")

        almost = start + timedelta(minutes=5) - timedelta(seconds=1)
        with mock.patch("django.utils.timezone.now", return_value=almost):
            self.assertEqual(self.verify("2468").status_code, status.HTTP_423_LOCKED)

        after = start + timedelta(minutes=5)
        with mock.patch("django.utils.timezone.now", return_value=after):
            response = self.verify("2468")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_after_lock_expires_attempts_start_from_zero(self):
        start = timezone.now()
        with mock.patch("django.utils.timezone.now", return_value=start):
            for _ in range(5):
                self.verify("0000")
        with mock.patch("django.utils.timezone.now", return_value=start + timedelta(minutes=5)):
            response = self.verify("0000")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["remaining_attempts"], 4)

    def test_correct_pin_resets_the_failure_count(self):
        for _ in range(4):
            self.verify("0000")
        self.verify("2468")
        for _ in range(4):
            self.assertEqual(self.verify("0000").status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_reports_active_lock(self):
        for _ in range(5):
            self.verify("0000")

        response = self.client.get(reverse("pin"))

        self.assertTrue(response.data["has_pin"])
        self.assertIsNotNone(response.data["locked_until"])

    def test_changing_pin_requires_account_password(self):
        response = self.client.put(reverse("pin"), {"pin": "1357"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

        response = self.client.put(reverse("pin"), {"pin": "1357", "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.verify("1357").status_code, status.HTTP_200_OK)

    def test_password_login_releases_a_locked_pin(self):
        for _ in range(5):
            self.verify("0000")
        self.client.force_authenticate(None)

        self.client.post(reverse("login"), {"email": self.user.email, "password": PASSWORD}, format="json")

        pin = AccessPin.objects.get(user=self.user)
        self.assertEqual(pin.failed_attempts, 0)
        self.assertIsNone(pin.locked_until)

    def test_pin_endpoints_require_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.verify("2468").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(reverse("pin")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_each_person_has_their_own_pin(self):
        other = make_user("otra@example.com")
        self.client.force_authenticate(other)

        response = self.verify("2468")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DataRightsTests(APITestCase):
    """HU1 · Escenario 3: exportar mis datos o eliminar mi cuenta."""

    def setUp(self):
        self.user = make_user()
        self.other = make_user("otra@example.com")
        ConsentRecord.objects.create(
            user=self.user, consent_type=ConsentRecord.Type.HEALTH_DATA, document_version="v1"
        )
        self.trace = Trace.objects.create(
            user=self.user, sensory_type="aroma", note="Café de la abuela", emotion="nostalgia", mood_intensity=4
        )
        memory = Memory.objects.create(user=self.user, name="Casa de la abuela")
        memory.traces.add(self.trace)
        Trace.objects.create(user=self.other, sensory_type="song", note="Ajena", emotion="alegria", mood_intensity=3)
        AccessPin.objects.create(user=self.user, pin_hash="x")
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_export_returns_a_file_with_only_my_data(self):
        response = self.client.get(reverse("export"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn("evoca-mis-datos-", response["Content-Disposition"])
        self.assertEqual(response.data["account"]["email"], self.user.email)
        self.assertEqual([t["note"] for t in response.data["traces"]], ["Café de la abuela"])
        self.assertEqual(response.data["memories"][0]["trace_ids"], [str(self.trace.id)])
        self.assertEqual(response.data["consents"][0]["document_version"], "v1")
        body = response.content.decode()
        self.assertNotIn("pin_hash", body)
        self.assertNotIn("Ajena", body)

    def test_delete_requires_password(self):
        response = self.client.delete(reverse("account"), {"password": "otra-cosa"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_delete_removes_the_account_and_all_its_data(self):
        user_id = self.user.pk

        response = self.client.delete(reverse("account"), {"password": PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=user_id).exists())
        self.assertFalse(Trace.objects.filter(user_id=user_id).exists())
        self.assertFalse(Memory.objects.filter(user_id=user_id).exists())
        self.assertFalse(ConsentRecord.objects.filter(user_id=user_id).exists())
        self.assertFalse(AccessPin.objects.filter(user_id=user_id).exists())
        self.assertFalse(Token.objects.filter(user_id=user_id).exists())
        # Los datos de otras personas siguen intactos.
        self.assertTrue(Trace.objects.filter(user=self.other).exists())

    def test_deleted_token_no_longer_works(self):
        self.client.delete(reverse("account"), {"password": PASSWORD}, format="json")

        self.assertEqual(self.client.get(reverse("me")).status_code, status.HTTP_401_UNAUTHORIZED)


class DailyReminderTests(APITestCase):
    """HU5: recordatorio diario a la hora elegida, solo si hoy no hay huella."""

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(self.user)

    def at(self, day, hour, minute=0, second=0):
        return timezone.make_aware(datetime(day.year, day.month, day.day, hour, minute, second))

    def status_at(self, moment):
        with mock.patch("django.utils.timezone.now", return_value=moment):
            return self.client.get(reverse("reminder-status")).data

    def enable(self, hour="20:00"):
        return self.client.put(reverse("reminder"), {"enabled": True, "time": hour}, format="json")

    def test_starts_disabled_at_eight_pm(self):
        response = self.client.get(reverse("reminder"))

        self.assertEqual(response.data["enabled"], False)
        self.assertEqual(response.data["time"], "20:00")

    def test_saves_the_chosen_time_and_can_be_disabled(self):
        response = self.enable("21:30")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual((response.data["enabled"], response.data["time"]), (True, "21:30"))
        self.assertEqual(DailyReminder.objects.get(user=self.user).time, time(21, 30))

        response = self.client.put(reverse("reminder"), {"enabled": False}, format="json")

        self.assertFalse(response.data["enabled"])
        self.assertEqual(response.data["time"], "21:30")

    def test_rejects_invalid_time(self):
        response = self.client.put(reverse("reminder"), {"enabled": True, "time": "25:00"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("time", response.data)

    def test_is_due_exactly_when_the_chosen_time_arrives(self):
        self.enable("20:00")
        today = date(2026, 11, 6)

        self.assertEqual(self.status_at(self.at(today, 19, 59, 59))["reason"], "early")
        arrived = self.status_at(self.at(today, 20, 0))
        self.assertTrue(arrived["due"])
        self.assertEqual(arrived["reason"], "due")

    def test_not_due_when_disabled(self):
        self.client.put(reverse("reminder"), {"enabled": False, "time": "08:00"}, format="json")

        self.assertEqual(self.status_at(self.at(date(2026, 11, 6), 9))["reason"], "disabled")

    def test_not_due_if_a_trace_was_registered_today(self):
        self.enable("20:00")
        today = date(2026, 11, 6)
        Trace.objects.create(
            user=self.user, sensory_type="aroma", note="Café", emotion="calma", mood_intensity=3,
            happened_at=self.at(today, 8),
        )

        result = self.status_at(self.at(today, 20, 0))

        self.assertFalse(result["due"])
        self.assertEqual(result["reason"], "already_registered")

    def test_a_trace_from_yesterday_does_not_stop_todays_reminder(self):
        self.enable("20:00")
        Trace.objects.create(
            user=self.user, sensory_type="aroma", note="Ayer", emotion="calma", mood_intensity=3,
            happened_at=self.at(date(2026, 11, 5), 21),
        )

        self.assertTrue(self.status_at(self.at(date(2026, 11, 6), 20, 0))["due"])

    def test_only_once_per_day_after_the_app_shows_it(self):
        self.enable("20:00")
        today = date(2026, 11, 6)
        with mock.patch("django.utils.timezone.now", return_value=self.at(today, 20, 0)):
            self.client.post(reverse("reminder-ack"))

        self.assertEqual(self.status_at(self.at(today, 21))["reason"], "already_notified")
        self.assertTrue(self.status_at(self.at(date(2026, 11, 7), 20, 0))["due"])

    def ack_at(self, moment):
        with mock.patch("django.utils.timezone.now", return_value=moment):
            self.client.post(reverse("reminder-ack"))

    def test_choosing_a_later_time_after_a_reminder_notifies_again(self):
        self.enable("04:35")
        today = date(2026, 11, 6)
        self.ack_at(self.at(today, 4, 35))

        self.enable("04:50")

        self.assertEqual(self.status_at(self.at(today, 4, 49, 59))["reason"], "early")
        self.assertTrue(self.status_at(self.at(today, 4, 50))["due"])

    def test_choosing_an_earlier_time_after_a_reminder_does_not_repeat_it(self):
        self.enable("20:00")
        today = date(2026, 11, 6)
        self.ack_at(self.at(today, 20, 0))

        self.enable("19:00")

        self.assertEqual(self.status_at(self.at(today, 20, 30))["reason"], "already_notified")

    def test_starts_once_a_day_and_can_switch_to_every_hour(self):
        self.assertEqual(self.client.get(reverse("reminder")).data["frequency"], "daily")

        response = self.client.put(reverse("reminder"), {"enabled": True, "frequency": "hourly"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["frequency"], "hourly")
        self.assertEqual(DailyReminder.objects.get(user=self.user).frequency, "hourly")

    def test_rejects_unknown_frequency(self):
        response = self.client.put(reverse("reminder"), {"frequency": "weekly"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("frequency", response.data)

    def test_every_hour_until_a_trace_is_registered(self):
        self.client.put(reverse("reminder"), {"enabled": True, "frequency": "hourly"}, format="json")
        today = date(2026, 11, 6)

        self.assertEqual(self.status_at(self.at(today, 7, 59, 59))["reason"], "early")
        self.assertTrue(self.status_at(self.at(today, 8, 0))["due"])
        self.ack_at(self.at(today, 8, 0))
        self.assertEqual(self.status_at(self.at(today, 8, 59, 59))["reason"], "already_notified")
        self.assertTrue(self.status_at(self.at(today, 9, 0))["due"])
        self.ack_at(self.at(today, 9, 0))

        Trace.objects.create(
            user=self.user, sensory_type="aroma", note="Café", emotion="calma", mood_intensity=3,
            happened_at=self.at(today, 9, 20),
        )

        self.assertEqual(self.status_at(self.at(today, 10, 0))["reason"], "already_registered")
        self.assertTrue(self.status_at(self.at(date(2026, 11, 7), 8, 0))["due"])

    def test_every_hour_stops_after_nine_pm(self):
        self.client.put(reverse("reminder"), {"enabled": True, "frequency": "hourly"}, format="json")
        today = date(2026, 11, 6)

        self.assertTrue(self.status_at(self.at(today, 21, 0))["due"])
        self.ack_at(self.at(today, 21, 0))
        self.assertEqual(self.status_at(self.at(today, 21, 59))["reason"], "already_notified")
        self.assertEqual(self.status_at(self.at(today, 22, 0))["reason"], "late")

    def test_export_includes_the_reminder(self):
        self.enable("07:15")

        response = self.client.get(reverse("export"))

        self.assertEqual(response.data["daily_reminder"]["time"], "07:15")
        self.assertTrue(response.data["daily_reminder"]["enabled"])

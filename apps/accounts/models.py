import uuid
from datetime import datetime, time, timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Coalesce
from django.utils import timezone

from .managers import UserManager


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField("correo electrónico", unique=True)
    date_of_birth = models.DateField("fecha de nacimiento")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["date_of_birth"]

    objects = UserManager()

    def __str__(self):
        return self.email


class ConsentRecord(models.Model):
    class Type(models.TextChoices):
        TERMS = "terms", "Términos de uso"
        PRIVACY = "privacy", "Política de privacidad"
        HEALTH_DATA = "health_data", "Tratamiento de datos sensibles"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="consents")
    consent_type = models.CharField(max_length=20, choices=Type.choices)
    document_version = models.CharField(max_length=40)
    accepted_at = models.DateTimeField(default=timezone.now, editable=False)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-accepted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "consent_type", "document_version"],
                name="unique_user_consent_version",
            )
        ]

    def __str__(self):
        return f"{self.user.email}: {self.consent_type} ({self.document_version})"



class AccessPin(models.Model):
    """PIN de 4 dígitos que protege la app abierta. Se guarda con hash, nunca en claro."""

    MAX_ATTEMPTS = 5
    LOCK_DURATION = timedelta(minutes=5)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="access_pin",
    )
    pin_hash = models.CharField(max_length=128)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "PIN de acceso"
        verbose_name_plural = "PIN de acceso"

    def __str__(self):
        return f"PIN de {self.user.email}"

    def set_pin(self, raw_pin):
        self.pin_hash = make_password(raw_pin)
        self.reset_attempts()

    def reset_attempts(self):
        self.failed_attempts = 0
        self.locked_until = None

    def is_locked(self, now=None):
        now = now or timezone.now()
        return self.locked_until is not None and self.locked_until > now

    @property
    def remaining_attempts(self):
        return max(0, self.MAX_ATTEMPTS - self.failed_attempts)

    def verify(self, raw_pin, now=None):
        """
        Compara el PIN y actualiza el conteo. Devuelve "ok", "wrong" o "locked".
        Tras MAX_ATTEMPTS fallos seguidos, bloquea durante LOCK_DURATION (aunque luego
        llegue el PIN correcto). Al vencer el bloqueo se empieza de cero.
        """
        now = now or timezone.now()
        if self.is_locked(now):
            return "locked"
        if self.locked_until is not None:
            self.reset_attempts()
        if check_password(raw_pin, self.pin_hash):
            self.reset_attempts()
            return "ok"
        self.failed_attempts += 1
        if self.failed_attempts >= self.MAX_ATTEMPTS:
            self.locked_until = now + self.LOCK_DURATION
            return "locked"
        return "wrong"


class DailyReminder(models.Model):
    """
    Recordatorio para registrar una huella (HU5). Las horas son locales del proyecto
    (America/Bogota). Puede avisar una vez al día a la hora elegida, o cada hora en punto
    dentro de la franja diurna. Nunca avisa si ese día ya hubo huella.
    """

    class Frequency(models.TextChoices):
        DAILY = "daily", "Una vez al día"
        HOURLY = "hourly", "Cada hora"

    DEFAULT_TIME = time(20, 0)
    # Franja del modo «cada hora»: el primer aviso a las 8:00 y el último a las 21:00.
    HOURLY_FIRST = time(8, 0)
    HOURLY_LAST = time(21, 0)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="daily_reminder",
    )
    enabled = models.BooleanField(default=False)
    time = models.TimeField(default=DEFAULT_TIME)
    frequency = models.CharField(max_length=10, choices=Frequency.choices, default=Frequency.DAILY)
    last_notified_on = models.DateField(null=True, blank=True)
    last_notified_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "recordatorio diario"
        verbose_name_plural = "recordatorios diarios"

    def __str__(self):
        if self.frequency == self.Frequency.HOURLY:
            return f"Recordatorio de {self.user.email} cada hora"
        return f"Recordatorio de {self.user.email} a las {self.time:%H:%M}"

    def status(self, now=None):
        """
        Decide si toca avisar ahora. Devuelve "due" o el motivo para no hacerlo:
        "disabled", "early" (aún no llega la hora), "late" (en el modo «cada hora», ya pasó
        el último aviso del día), "already_notified" (ya se avisó por la hora elegida de hoy
        o, cada hora, en esta hora) o "already_registered" (hoy ya registró una huella).

        Si se elige una hora más tarde después de un aviso, la nueva hora vuelve a avisar: lo
        que cuenta es si hubo aviso desde la hora elegida, no si hubo alguno en el día.
        """
        from apps.traces.models import Trace

        local = timezone.localtime(now or timezone.now())
        if not self.enabled:
            return "disabled"
        if self.frequency == self.Frequency.HOURLY:
            if local.time() < self.HOURLY_FIRST:
                return "early"
            if local.hour > self.HOURLY_LAST.hour:
                return "late"
            this_hour = local.replace(minute=0, second=0, microsecond=0)
            if self.last_notified_at and self.last_notified_at >= this_hour:
                return "already_notified"
        else:
            if local.time() < self.time:
                return "early"
            scheduled = timezone.make_aware(datetime.combine(local.date(), self.time))
            if self.last_notified_at and self.last_notified_at >= scheduled:
                return "already_notified"
        start = timezone.make_aware(datetime.combine(local.date(), time.min))
        registered_today = (
            Trace.objects.filter(user=self.user)
            .annotate(at=Coalesce("happened_at", "created_at"))
            .filter(at__gte=start, at__lt=start + timedelta(days=1))
            .exists()
        )
        return "already_registered" if registered_today else "due"

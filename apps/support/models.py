import uuid
from datetime import datetime, time, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Coalesce
from django.utils import timezone


class SupportContent(models.Model):
    """
    Textos, líneas de ayuda y palabras de riesgo de la orientación (HU6). Los aprueba el
    psicólogo asesor desde el administrador: la app siempre pide la versión aprobada más
    reciente, así que un cambio aquí llega sin publicar una nueva versión de la app.
    """

    version = models.PositiveIntegerField(unique=True)
    orientation_title = models.CharField("título de la orientación", max_length=120)
    orientation_message = models.TextField("mensaje de orientación")
    help_title = models.CharField("título de la pantalla de ayuda", max_length=120)
    help_message = models.TextField("mensaje de la pantalla de ayuda")
    help_lines = models.JSONField(
        "líneas de ayuda",
        default=list,
        help_text='Lista de {"name": "...", "phone": "...", "description": "..."}.',
    )
    risk_terms = models.TextField("palabras de riesgo", help_text="Una palabra o frase por línea.")
    approved = models.BooleanField("aprobado por el psicólogo asesor", default=False)
    approved_by = models.CharField("aprobado por", max_length=120, blank=True)
    approved_at = models.DateTimeField("fecha de aprobación", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-version"]
        verbose_name = "contenido de orientación"
        verbose_name_plural = "contenidos de orientación"

    def __str__(self):
        return f"Versión {self.version}" + ("" if self.approved else " (borrador)")

    @classmethod
    def current(cls):
        """La versión aprobada más reciente; si aún no hay ninguna, el borrador más reciente."""
        return cls.objects.filter(approved=True).first() or cls.objects.first()

    def terms(self):
        return [line.strip() for line in self.risk_terms.splitlines() if line.strip()]

    def clean(self):
        if not isinstance(self.help_lines, list) or not all(
            isinstance(line, dict) and str(line.get("name", "")).strip() and str(line.get("phone", "")).strip()
            for line in self.help_lines
        ):
            raise ValidationError({"help_lines": "Cada línea necesita al menos «name» y «phone»."})
        if not self.terms():
            raise ValidationError({"risk_terms": "Escribe al menos una palabra o frase."})
        if self.approved and not self.approved_by.strip():
            raise ValidationError({"approved_by": "Indica quién aprobó esta versión."})

    def save(self, *args, **kwargs):
        if self.approved and not self.approved_at:
            self.approved_at = timezone.now()
        super().save(*args, **kwargs)


class SupportEvent(models.Model):
    """
    Qué hizo la persona con la orientación (HU6). Solo se guarda el tipo de evento y la
    versión del contenido: nunca la nota ni la palabra que activó la ayuda.
    """

    class Kind(models.TextChoices):
        ORIENTATION_SHOWN = "orientation_shown", "Vio el mensaje de orientación"
        ORIENTATION_DISMISSED = "orientation_dismissed", "Cerró la orientación con «Ahora no»"
        HELP_OPENED = "help_opened", "Abrió la ruta de ayuda"
        HELP_LINE_OPENED = "help_line_opened", "Tocó una línea de ayuda"
        RISK_SCREEN_SHOWN = "risk_screen_shown", "Se mostró la pantalla de ayuda inmediata"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_events")
    kind = models.CharField(max_length=30, choices=Kind.choices)
    content_version = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "kind", "-created_at"], name="support_user_kind_idx")]
        verbose_name = "evento de orientación"
        verbose_name_plural = "eventos de orientación"

    def __str__(self):
        return f"{self.get_kind_display()} ({self.created_at:%Y-%m-%d})"


# Regla de la orientación (HU6 · escenario 1): ánimo de 2 o menos en 14 de los últimos 21 días.
LOW_MOOD_MAX = 2
WINDOW_DAYS = 21
LOW_DAYS_NEEDED = 14
# Tras «Ahora no» o tras abrir la ruta de ayuda, el mensaje no vuelve a aparecer en 7 días.
QUIET_DAYS = 7


def orientation_status(user, now=None):
    """
    Cuenta los días con ánimo bajo de los últimos 21 (incluido hoy, en hora local). El ánimo
    de un día es el promedio de la intensidad de sus huellas; un día sin huellas no cuenta
    como bajo. Devuelve si toca mostrar la orientación y por qué.
    """
    from apps.traces.models import Trace

    now = now or timezone.now()
    today = timezone.localdate(now)
    start = timezone.make_aware(datetime.combine(today - timedelta(days=WINDOW_DAYS - 1), time.min))
    end = timezone.make_aware(datetime.combine(today + timedelta(days=1), time.min))
    days = {}
    rows = (
        Trace.objects.filter(user=user)
        .annotate(at=Coalesce("happened_at", "created_at"))
        .filter(at__gte=start, at__lt=end)
        .values_list("at", "mood_intensity")
    )
    for moment, intensity in rows:
        days.setdefault(timezone.localdate(moment), []).append(intensity)
    low_days = sum(1 for values in days.values() if sum(values) / len(values) <= LOW_MOOD_MAX)

    quiet = SupportEvent.objects.filter(
        user=user,
        kind__in=[SupportEvent.Kind.ORIENTATION_DISMISSED, SupportEvent.Kind.HELP_OPENED],
        created_at__gte=now - timedelta(days=QUIET_DAYS),
    ).exists()
    if low_days < LOW_DAYS_NEEDED:
        reason = "not_enough_low_days"
    elif quiet:
        reason = "recently_answered"
    else:
        reason = "low_mood"
    return {
        "show": reason == "low_mood",
        "reason": reason,
        "low_days": low_days,
        "window_days": WINDOW_DAYS,
        "low_days_needed": LOW_DAYS_NEEDED,
    }

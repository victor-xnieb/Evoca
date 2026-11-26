import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Trace(models.Model):
    class SensoryType(models.TextChoices):
        AROMA = "aroma", "Aroma"
        COLOR = "color", "Color"
        SONG = "song", "Canción"
        FLAVOR = "flavor", "Sabor"
        TEXTURE = "texture", "Textura"
        PLACE = "place", "Lugar"

    class Emotion(models.TextChoices):
        ALEGRIA = "alegria", "Alegría"
        CALMA = "calma", "Calma"
        GRATITUD = "gratitud", "Gratitud"
        NOSTALGIA = "nostalgia", "Nostalgia"
        TRISTEZA = "tristeza", "Tristeza"
        ANSIEDAD = "ansiedad", "Ansiedad"
        ENOJO = "enojo", "Enojo"
        MIEDO = "miedo", "Miedo"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="traces",
    )
    sensory_type = models.CharField(max_length=12, choices=SensoryType.choices)
    note = models.CharField(max_length=500)
    emotion = models.CharField(max_length=50, choices=Emotion.choices)
    mood_intensity = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    tags = models.JSONField(default=list, blank=True)
    happened_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"], name="trace_user_created_idx"),
            models.Index(fields=["user", "sensory_type"], name="trace_user_sensory_idx"),
        ]

    def __str__(self):
        return f"{self.get_sensory_type_display()}: {self.emotion} ({self.mood_intensity})"


class TraceEmbedding(models.Model):
    """
    Vector de significado de una huella (HU12), guardado para no pedirlo en cada búsqueda. Se
    recalcula cuando cambia lo que describe la huella (text_hash) o el modelo. Se borra con ella.
    """

    trace = models.OneToOneField(Trace, on_delete=models.CASCADE, primary_key=True, related_name="embedding")
    model = models.CharField(max_length=80)
    text_hash = models.CharField(max_length=64)
    # float32 normalizados, uno tras otro (768 dimensiones = 3 KB por huella).
    vector = models.BinaryField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.trace_id} ({self.model})"


class Memory(models.Model):
    class Status(models.TextChoices):
        SUGGESTED = "suggested", "Sugerido"
        ACCEPTED = "accepted", "Aceptado"
        DISCARDED = "discarded", "Descartado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memories",
    )
    name = models.CharField(max_length=120)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.SUGGESTED)
    explanation = models.CharField(max_length=255, blank=True)
    traces = models.ManyToManyField(Trace, through="MemoryTrace", related_name="memories")
    # HU9: cuándo lo propuso la IA (vacío si lo creó la persona) y cuándo se aceptó o descartó.
    suggested_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class MemoryTrace(models.Model):
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE)
    trace = models.ForeignKey(Trace, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["memory", "trace"],
                name="unique_trace_per_memory",
            )
        ]

    def clean(self):
        if self.memory_id and self.trace_id and self.memory.user_id != self.trace.user_id:
            raise ValidationError("La memoria y la huella deben pertenecer al mismo usuario.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.memory_id} - {self.trace_id}"


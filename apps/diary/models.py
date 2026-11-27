import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from .crypto import EncryptedTextField


class Paper(models.TextChoices):
    LINED = "lined", "Rayado"
    GRID = "grid", "Cuadriculado"
    DOTS = "dots", "De puntos"
    BLANK = "blank", "Liso"


class Notebook(models.Model):
    """Un cuaderno del Cuadernillo (HU17): título, portada de color y papel por defecto."""

    class Cover(models.TextChoices):
        TERRACOTA = "terracota", "Terracota"
        OLIVA = "oliva", "Oliva"
        AZUL = "azul", "Azul noche"
        CIRUELA = "ciruela", "Ciruela"
        MOSTAZA = "mostaza", "Mostaza"
        ARENA = "arena", "Arena"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notebooks")
    title = models.CharField(max_length=60)
    cover = models.CharField(max_length=12, choices=Cover.choices, default=Cover.TERRACOTA)
    paper = models.CharField(max_length=8, choices=Paper.choices, default=Paper.LINED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.title


class Page(models.Model):
    """
    Una página de un cuaderno: su día, su papel (o el del cuaderno), su letra manuscrita, su tinta
    y lo escrito, guardado cifrado como documento del editor (JSON).
    """

    class Font(models.TextChoices):
        CAVEAT = "caveat", "Caveat"
        PATRICK = "patrick", "Patrick Hand"
        KALAM = "kalam", "Kalam"
        INDIE = "indie", "Indie Flower"

    class Ink(models.TextChoices):
        SEPIA = "sepia", "Sepia"
        AZUL = "azul", "Azul"
        VERDE = "verde", "Verde"
        VINO = "vino", "Vino"
        MORADO = "morado", "Morado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name="pages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="diary_pages")
    day = models.DateField(default=timezone.localdate)
    # Vacío = el papel del cuaderno.
    paper = models.CharField(max_length=8, choices=Paper.choices, blank=True)
    font = models.CharField(max_length=10, choices=Font.choices, default=Font.CAVEAT)
    ink = models.CharField(max_length=10, choices=Ink.choices, default=Ink.SEPIA)
    content = EncryptedTextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["day", "created_at"]
        indexes = [models.Index(fields=["notebook", "day"], name="diary_page_notebook_day_idx")]

    def __str__(self):
        return f"{self.notebook_id} · {self.day}"

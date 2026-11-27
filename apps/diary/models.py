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


class Evocation(models.Model):
    """
    HU18: lo que la IA propuso a partir de una página (huellas con la frase de donde salieron,
    agrupadas en recuerdos sugeridos). Se guarda cifrado, porque cita lo escrito. Nada se vuelve
    huella ni recuerdo hasta que la persona lo acepta.
    """

    page = models.OneToOneField(Page, on_delete=models.CASCADE, primary_key=True, related_name="evocation")
    # JSON: {"traces": [...], "memories": [...]} (ver apps/diary/evoke.py).
    payload = EncryptedTextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class EvokedTrace(models.Model):
    """HU18: una huella aceptada que nació de una página, con la frase de donde salió (cifrada)."""

    trace = models.OneToOneField("traces.Trace", on_delete=models.CASCADE, primary_key=True, related_name="evoked_from")
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="evoked_traces")
    quote = EncryptedTextField(blank=True, default="")


class PageMemory(models.Model):
    """HU18: un recuerdo aceptado que nació de una página: la esfera puede abrir su página."""

    memory = models.OneToOneField("traces.Memory", on_delete=models.CASCADE, primary_key=True, related_name="born_in")
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="memories")

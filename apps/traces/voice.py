"""
Notas de voz (HU16): validación del audio que sube la app.

La app graba con MediaRecorder: WebM u Ogg con Opus (Chrome, Firefox, Android) o MP4/AAC
(Safari, iPhone). Se acepta solo audio de esos formatos (se revisa su firma, no solo lo que dice
el navegador), de hasta 60 segundos y del tamaño que eso ocupa con holgura.
"""

from django.conf import settings
from rest_framework.exceptions import ValidationError

from .models import VoiceNote

# Firma de cada formato en los primeros bytes del archivo.
FORMATS = {
    "audio/webm": lambda head: head.startswith(b"\x1a\x45\xdf\xa3"),
    "audio/ogg": lambda head: head.startswith(b"OggS"),
    "audio/mp4": lambda head: head[4:8] == b"ftyp",
}
ALIASES = {"video/webm": "audio/webm", "audio/x-m4a": "audio/mp4", "audio/aac": "audio/mp4", "video/mp4": "audio/mp4"}


def clean_audio(upload, duration):
    """(bytes, tipo, duración) del audio subido, o ValidationError con un mensaje claro."""
    if upload is None:
        raise ValidationError({"audio": "Falta la grabación."})
    try:
        seconds = float(duration)
    except (TypeError, ValueError):
        raise ValidationError({"duration": "Falta la duración de la grabación."}) from None
    if not 0 < seconds <= VoiceNote.MAX_SECONDS + 1:
        raise ValidationError({"duration": f"La nota de voz puede durar hasta {VoiceNote.MAX_SECONDS} segundos."})
    if upload.size > settings.EVOCA_VOICE_MAX_BYTES:
        raise ValidationError({"audio": "La grabación es demasiado grande."})
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    content_type = ALIASES.get(content_type, content_type)
    data = upload.read()
    check = FORMATS.get(content_type)
    if check is None or not data or not check(data[:16]):
        raise ValidationError({"audio": "Ese archivo no es una grabación de audio válida."})
    return data, content_type, round(min(seconds, VoiceNote.MAX_SECONDS), 1)

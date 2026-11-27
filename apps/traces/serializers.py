from rest_framework import serializers

from .models import Trace, VoiceNote

MISSING = {
    "sensory_type": "Elige qué despertó este recuerdo.",
    "note": "Escribe una nota corta sobre el recuerdo.",
    "emotion": "Elige la emoción que sentiste.",
    "mood_intensity": "Elige qué tan intenso fue, de 1 a 5.",
}


class TraceSerializer(serializers.ModelSerializer):
    sensory_type = serializers.ChoiceField(
        choices=Trace.SensoryType.choices,
        error_messages={
            "required": MISSING["sensory_type"],
            "null": MISSING["sensory_type"],
            "invalid_choice": "Ese tipo de huella no existe.",
        },
    )
    # HU16: con nota de voz, la nota escrita es opcional (se valida en validate()).
    note = serializers.CharField(
        max_length=500,
        allow_blank=True,
        required=False,
        error_messages={
            "required": MISSING["note"],
            "blank": MISSING["note"],
            "null": MISSING["note"],
            "max_length": "La nota puede tener máximo 500 caracteres.",
        },
    )
    emotion = serializers.ChoiceField(
        choices=Trace.Emotion.choices,
        error_messages={
            "required": MISSING["emotion"],
            "null": MISSING["emotion"],
            "invalid_choice": "Esa emoción no está en la lista.",
        },
    )
    mood_intensity = serializers.IntegerField(
        min_value=1,
        max_value=5,
        error_messages={
            "required": MISSING["mood_intensity"],
            "null": MISSING["mood_intensity"],
            "invalid": MISSING["mood_intensity"],
            "min_value": "La intensidad va de 1 a 5.",
            "max_value": "La intensidad va de 1 a 5.",
        },
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=40),
        allow_empty=True,
        required=False,
    )
    # HU16: duración en segundos de su nota de voz, o null si no tiene.
    voice_duration = serializers.SerializerMethodField()

    class Meta:
        model = Trace
        fields = (
            "id",
            "sensory_type",
            "note",
            "emotion",
            "mood_intensity",
            "tags",
            "happened_at",
            "voice_duration",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "voice_duration", "created_at", "updated_at")

    def get_voice_duration(self, trace):
        # Las listas lo traen anotado (sin cargar el audio); si no, se consulta solo la duración.
        if hasattr(trace, "voice_seconds"):
            return trace.voice_seconds
        return VoiceNote.objects.filter(trace=trace).values_list("duration", flat=True).first()

    def validate_note(self, value):
        return value.strip()

    def validate(self, attrs):
        """Hace falta una nota escrita o una nota de voz (la que se graba ahora o la que ya tiene)."""
        note = attrs.get("note", self.instance.note if self.instance else "")
        with_voice = self.context.get("with_voice") or (
            self.instance is not None and VoiceNote.objects.filter(trace=self.instance).exists()
        )
        if not note and not with_voice:
            # Al crear se puede grabar una nota de voz en su lugar (HU16); al editar, no.
            message = MISSING["note"] if self.instance else NOTE_OR_VOICE
            raise serializers.ValidationError({"note": message})
        attrs.setdefault("note", note)
        return attrs

    def validate_tags(self, value):
        normalized = []
        for tag in value:
            clean_tag = tag.strip().lower()
            if clean_tag and clean_tag not in normalized:
                normalized.append(clean_tag)
        if len(normalized) > 10:
            raise serializers.ValidationError("Una huella puede tener máximo 10 etiquetas.")
        return normalized


NOTE_OR_VOICE = "Escribe una nota corta sobre el recuerdo o graba una nota de voz."


def choice_list(choices):
    return [{"value": value, "label": label} for value, label in choices]

from rest_framework import serializers

from .models import Trace

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
    note = serializers.CharField(
        max_length=500,
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
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_note(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(MISSING["note"])
        return value

    def validate_tags(self, value):
        normalized = []
        for tag in value:
            clean_tag = tag.strip().lower()
            if clean_tag and clean_tag not in normalized:
                normalized.append(clean_tag)
        if len(normalized) > 10:
            raise serializers.ValidationError("Una huella puede tener máximo 10 etiquetas.")
        return normalized


def choice_list(choices):
    return [{"value": value, "label": label} for value, label in choices]

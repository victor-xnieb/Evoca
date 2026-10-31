from rest_framework import serializers

from .models import Trace


class TraceSerializer(serializers.ModelSerializer):
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

    def validate_tags(self, value):
        normalized = []
        for tag in value:
            clean_tag = tag.strip().lower()
            if clean_tag and clean_tag not in normalized:
                normalized.append(clean_tag)
        if len(normalized) > 10:
            raise serializers.ValidationError("Una huella puede tener máximo 10 etiquetas.")
        return normalized


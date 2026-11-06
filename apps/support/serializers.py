from rest_framework import serializers

from .models import SupportContent, SupportEvent


class SupportContentSerializer(serializers.ModelSerializer):
    draft = serializers.SerializerMethodField()
    risk_terms = serializers.SerializerMethodField()

    class Meta:
        model = SupportContent
        fields = (
            "version",
            "draft",
            "orientation_title",
            "orientation_message",
            "help_title",
            "help_message",
            "help_lines",
            "risk_terms",
            "updated_at",
        )

    def get_draft(self, content):
        return not content.approved

    def get_risk_terms(self, content):
        return content.terms()


class SupportEventSerializer(serializers.ModelSerializer):
    kind = serializers.ChoiceField(
        choices=SupportEvent.Kind.choices,
        error_messages={"invalid_choice": "Ese evento no existe."},
    )

    class Meta:
        model = SupportEvent
        fields = ("id", "kind", "content_version", "created_at")
        read_only_fields = ("id", "content_version", "created_at")

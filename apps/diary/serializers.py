from rest_framework import serializers

from . import content
from .models import Notebook, Page, Paper


class NotebookSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        max_length=60,
        trim_whitespace=True,
        error_messages={"blank": "Ponle un título a tu cuaderno.", "required": "Ponle un título a tu cuaderno."},
    )
    page_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Notebook
        fields = ("id", "title", "cover", "paper", "page_count", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class PageSerializer(serializers.ModelSerializer):
    """
    Una página: `content` es el documento del editor (JSON) y `text`, su texto plano. `day_emotion`
    es la emoción dominante de las huellas de ese día (o null), para teñir el marcador.
    """

    content = serializers.JSONField(required=False)
    text = serializers.SerializerMethodField()
    paper = serializers.ChoiceField(choices=Paper.choices, allow_blank=True, required=False)
    day_emotion = serializers.SerializerMethodField()
    # HU18: recuerdos sugeridos desde esta página y las frases que se iluminan.
    evocation = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = ("id", "notebook", "day", "paper", "font", "ink", "content", "text", "day_emotion", "evocation", "created_at", "updated_at")
        read_only_fields = ("id", "notebook", "created_at", "updated_at")

    def validate_content(self, value):
        return content.validate_document(value)

    def to_representation(self, page):
        data = super().to_representation(page)
        data["content"] = content.load(page.content)
        return data

    def get_text(self, page):
        return content.plain_text(content.load(page.content))

    def get_evocation(self, page):
        from .evoke import view

        return view(page)

    def get_day_emotion(self, page):
        return self.context.get("emotions", {}).get(page.day)

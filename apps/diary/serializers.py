from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from . import content
from .models import Letter, Notebook, Page, Paper


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


# HU19: hasta cuándo se puede sellar una carta (10 años) y cuánto puede medir.
MAX_LETTER_DAYS = 3650
MAX_LETTER_LENGTH = content.MAX_TEXT_LENGTH


class LetterSerializer(serializers.ModelSerializer):
    """
    HU19: una carta a mi yo del futuro. Se escribe una vez (`content`, `opens_on`, `font`, `ink`) y
    queda sellada. `content` solo sale cuando la persona ya abrió el sobre, lo que exige que haya
    llegado su fecha (`ready`); antes, el servidor nunca lo entrega.
    """

    content = serializers.CharField(
        max_length=MAX_LETTER_LENGTH,
        trim_whitespace=True,
        error_messages={
            "blank": "Escribe tu carta antes de sellarla.",
            "required": "Escribe tu carta antes de sellarla.",
            "max_length": "La carta puede tener hasta 20.000 caracteres.",
        },
    )
    opens_on = serializers.DateField(error_messages={"required": "Elige cuándo se abre.", "invalid": "Elige cuándo se abre."})
    ready = serializers.BooleanField(read_only=True)

    class Meta:
        model = Letter
        fields = ("id", "opens_on", "font", "ink", "content", "ready", "opened_at", "created_at")
        read_only_fields = ("id", "opened_at", "created_at")

    def validate_opens_on(self, value):
        today = timezone.localdate()
        if value <= today:
            raise serializers.ValidationError("Elige una fecha futura: desde mañana.")
        if value > today + timedelta(days=MAX_LETTER_DAYS):
            raise serializers.ValidationError("Elige una fecha dentro de los próximos 10 años.")
        return value

    def to_representation(self, letter):
        data = super().to_representation(letter)
        # Sellada (o sin abrir): el contenido no sale del servidor.
        if not (letter.ready and letter.opened_at):
            data.pop("content")
        return data

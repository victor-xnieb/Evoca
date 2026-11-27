from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from . import content, moments
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
    # HU19: la carta a la que responde esta página (o null).
    reply_to = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = ("id", "notebook", "day", "paper", "font", "ink", "content", "text", "day_emotion", "evocation", "reply_to", "created_at", "updated_at")
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

    def get_reply_to(self, page):
        letter = page.reply_to
        return {"id": str(letter.id), "written": timezone.localtime(letter.created_at).date()} if letter else None

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
    # «Sellar otra carta»: la carta (ya abierta) que se estaba leyendo al escribir esta.
    follows = serializers.PrimaryKeyRelatedField(
        queryset=Letter.objects.none(),
        pk_field=serializers.UUIDField(),
        required=False,
        allow_null=True,
        error_messages={"does_not_exist": "Esa carta no existe.", "incorrect_type": "Esa carta no existe."},
    )

    class Meta:
        model = Letter
        fields = ("id", "opens_on", "font", "ink", "content", "ready", "opened_at", "follows", "created_at")
        read_only_fields = ("id", "opened_at", "created_at")

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        # Solo se encadena con una carta propia.
        fields["follows"].queryset = Letter.objects.filter(user=request.user) if request else Letter.objects.none()
        return fields

    def validate_follows(self, value):
        if value and not value.is_open:
            raise serializers.ValidationError("Solo puedes seguir una carta que ya abriste.")
        return value

    def validate_opens_on(self, value):
        today = timezone.localdate()
        if value <= today:
            raise serializers.ValidationError("Elige una fecha futura: desde mañana.")
        if value > today + timedelta(days=MAX_LETTER_DAYS):
            raise serializers.ValidationError("Elige una fecha dentro de los próximos 10 años.")
        return value

    def to_representation(self, letter):
        data = super().to_representation(letter)
        # Sellada (o sin abrir): el contenido no sale del servidor, ni nada de lo que acompaña su lectura.
        if not letter.is_open:
            data.pop("content")
            return data
        # Abierta: cómo estaba la persona al escribirla, su respuesta y las cartas que siguieron.
        data["moment"] = moments.letter_moment(letter)
        reply = getattr(letter, "reply", None)
        data["reply"] = {"page": str(reply.id), "notebook": str(reply.notebook_id)} if reply else None
        data["next_letters"] = [
            {"id": str(item.id), "opens_on": item.opens_on, "ready": item.ready} for item in letter.followed_by.order_by("opens_on")
        ]
        previous = letter.follows
        data["previous"] = (
            {"id": str(previous.id), "written": timezone.localtime(previous.created_at).date()} if previous else None
        )
        return data

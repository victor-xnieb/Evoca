from datetime import date

from django.conf import settings
from django.contrib.auth import authenticate, password_validation
from django.db import transaction
from rest_framework import serializers

from .models import AccessPin, ConsentRecord, User


def calculate_age(date_of_birth, on_date=None):
    on_date = on_date or date.today()
    return on_date.year - date_of_birth.year - (
        (on_date.month, on_date.day) < (date_of_birth.month, date_of_birth.day)
    )


class UserSerializer(serializers.ModelSerializer):
    has_pin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "date_of_birth", "date_joined", "has_pin")
        read_only_fields = ("id", "email", "date_joined", "has_pin")

    def get_has_pin(self, user):
        return AccessPin.objects.filter(user=user).exists()


class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentRecord
        fields = ("consent_type", "document_version", "accepted_at", "revoked_at")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    accepted_terms = serializers.BooleanField(write_only=True)
    accepted_privacy = serializers.BooleanField(write_only=True)
    accepted_health_data = serializers.BooleanField(write_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "date_of_birth",
            "accepted_terms",
            "accepted_privacy",
            "accepted_health_data",
        )
        read_only_fields = ("id",)

    def validate_date_of_birth(self, value):
        if calculate_age(value) < 18:
            raise serializers.ValidationError(
                "Evoca es solo para personas mayores de 18 años, por eso no podemos crear la cuenta."
            )
        return value

    def validate(self, attrs):
        if attrs.get("accepted_health_data") is not True:
            raise serializers.ValidationError(
                {
                    "accepted_health_data": (
                        "Sin tu autorización expresa no podemos crear la cuenta: Evoca guarda "
                        "emociones y recuerdos, que la ley trata como datos sensibles."
                    )
                }
            )
        for field in ("accepted_terms", "accepted_privacy"):
            if attrs.get(field) is not True:
                raise serializers.ValidationError(
                    {field: "Este consentimiento es obligatorio para crear la cuenta."}
                )
        candidate = User(
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
            date_of_birth=attrs.get("date_of_birth"),
        )
        password_validation.validate_password(attrs["password"], user=candidate)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("accepted_terms")
        validated_data.pop("accepted_privacy")
        validated_data.pop("accepted_health_data")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)

        ConsentRecord.objects.bulk_create(
            [
                ConsentRecord(
                    user=user,
                    consent_type=ConsentRecord.Type.TERMS,
                    document_version=settings.EVOCA_TERMS_VERSION,
                ),
                ConsentRecord(
                    user=user,
                    consent_type=ConsentRecord.Type.PRIVACY,
                    document_version=settings.EVOCA_PRIVACY_VERSION,
                ),
                ConsentRecord(
                    user=user,
                    consent_type=ConsentRecord.Type.HEALTH_DATA,
                    document_version=settings.EVOCA_HEALTH_DATA_VERSION,
                ),
            ]
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"],
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("Correo o contraseña incorrectos.")
        if not user.is_active:
            raise serializers.ValidationError("La cuenta está desactivada.")
        attrs["user"] = user
        return attrs


PIN_PATTERN = r"^\d{4}$"
PIN_ERRORS = {"invalid": "El PIN debe tener exactamente 4 dígitos."}


class PinSetSerializer(serializers.Serializer):
    pin = serializers.RegexField(PIN_PATTERN, error_messages=PIN_ERRORS)
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["request"].user
        # Cambiar un PIN que ya existe exige la contraseña de la cuenta.
        if AccessPin.objects.filter(user=user).exists():
            password = attrs.get("password")
            if not password or not user.check_password(password):
                raise serializers.ValidationError(
                    {"password": "Escribe la contraseña de tu cuenta para cambiar el PIN."}
                )
        return attrs


class PinVerifySerializer(serializers.Serializer):
    pin = serializers.RegexField(PIN_PATTERN, error_messages=PIN_ERRORS)


class PasswordConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("La contraseña no es correcta.")
        return value

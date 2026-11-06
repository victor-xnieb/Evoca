from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.traces.models import Memory
from apps.traces.serializers import TraceSerializer

from .models import AccessPin, DailyReminder
from .serializers import (
    ConsentSerializer,
    DailyReminderSerializer,
    LoginSerializer,
    PasswordConfirmSerializer,
    PinSetSerializer,
    PinVerifySerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = Token.objects.create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        # Entrar con la contraseña (un factor más fuerte) libera el PIN bloqueado u olvidado.
        AccessPin.objects.filter(user=user).update(failed_attempts=0, locked_until=None)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    def post(self, request):
        if request.auth:
            request.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


def pin_status(pin):
    return {
        "has_pin": pin is not None,
        "locked_until": pin.locked_until if pin and pin.is_locked() else None,
        "remaining_attempts": pin.remaining_attempts if pin else AccessPin.MAX_ATTEMPTS,
    }


class PinView(APIView):
    """Consulta el estado del PIN o lo crea / cambia (cambiarlo pide la contraseña)."""

    def get(self, request):
        return Response(pin_status(AccessPin.objects.filter(user=request.user).first()))

    def put(self, request):
        serializer = PinSetSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        pin, _ = AccessPin.objects.get_or_create(user=request.user, defaults={"pin_hash": ""})
        pin.set_pin(serializer.validated_data["pin"])
        pin.save()
        return Response(pin_status(pin))


class PinVerifyView(APIView):
    """Verifica el PIN. Tras 5 fallos seguidos responde 423 durante 5 minutos."""

    def post(self, request):
        serializer = PinVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            pin = AccessPin.objects.select_for_update().filter(user=request.user).first()
            if pin is None:
                return Response(
                    {"detail": "Todavía no has creado un PIN."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            result = pin.verify(serializer.validated_data["pin"])
            pin.save()

        if result == "ok":
            return Response({"verified": True, **pin_status(pin)})
        if result == "locked":
            return Response(
                {
                    "detail": "Por tu seguridad bloqueamos el acceso durante 5 minutos.",
                    **pin_status(pin),
                },
                status=status.HTTP_423_LOCKED,
            )
        remaining = pin.remaining_attempts
        return Response(
            {
                "detail": (
                    f"PIN incorrecto. Te queda {remaining} intento."
                    if remaining == 1
                    else f"PIN incorrecto. Te quedan {remaining} intentos."
                ),
                **pin_status(pin),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class ConsentListView(APIView):
    """Autorizaciones que dio la persona, con su versión y fecha."""

    def get(self, request):
        return Response(ConsentSerializer(request.user.consents.all(), many=True).data)


class ExportView(APIView):
    """Descarga en un archivo JSON todos los datos de la persona autenticada."""

    def get(self, request):
        user = request.user
        memories = Memory.objects.filter(user=user).prefetch_related("traces")
        data = {
            "exported_at": timezone.now(),
            "account": UserSerializer(user).data,
            "consents": ConsentSerializer(user.consents.all(), many=True).data,
            "daily_reminder": DailyReminderSerializer(own_reminder(user)).data,
            "traces": TraceSerializer(user.traces.all(), many=True).data,
            "memories": [
                {
                    "id": str(memory.id),
                    "name": memory.name,
                    "status": memory.status,
                    "explanation": memory.explanation,
                    "trace_ids": [str(trace.id) for trace in memory.traces.all()],
                    "created_at": memory.created_at,
                }
                for memory in memories
            ],
        }
        filename = f"evoca-mis-datos-{timezone.localdate().isoformat()}.json"
        return Response(data, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


class AccountView(APIView):
    """Elimina la cuenta y todos sus datos (huellas, memorias, consentimientos, PIN y sesiones)."""

    def delete(self, request):
        serializer = PasswordConfirmSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def own_reminder(user):
    reminder, _ = DailyReminder.objects.get_or_create(user=user)
    return reminder


class DailyReminderView(APIView):
    """Recordatorio (HU5): consultarlo, activarlo, elegir la hora o «cada hora», o desactivarlo."""

    def get(self, request):
        return Response(DailyReminderSerializer(own_reminder(request.user)).data)

    def put(self, request):
        serializer = DailyReminderSerializer(own_reminder(request.user), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DailyReminderStatusView(APIView):
    """Si toca mostrar la notificación ahora: hora alcanzada, sin aviso pendiente y sin huella hoy."""

    def get(self, request):
        reminder = own_reminder(request.user)
        reason = reminder.status()
        return Response({"due": reason == "due", "reason": reason, **DailyReminderSerializer(reminder).data})


class DailyReminderAckView(APIView):
    """La app mostró la notificación: no se repite hasta mañana (o, cada hora, hasta la próxima hora)."""

    def post(self, request):
        reminder = own_reminder(request.user)
        reminder.last_notified_at = timezone.now()
        reminder.last_notified_on = timezone.localdate(reminder.last_notified_at)
        reminder.save(update_fields=["last_notified_on", "last_notified_at", "updated_at"])
        return Response(DailyReminderSerializer(reminder).data)

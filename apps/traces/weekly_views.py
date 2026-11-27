"""Resumen semanal de patrones con IA (HU14). Solo los datos de la persona autenticada."""

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import weekly
from .models import WeeklySummaryPreference


class WeeklySummaryView(APIView):
    """
    El resumen de la semana pasada (lunes a domingo). No llama a la IA: si aún no está preparado
    responde `status: "pending"` y la app pide prepararlo con POST generate/.
    """

    def get(self, request):
        return Response(weekly.payload(request.user))


class WeeklySummaryGenerateView(APIView):
    """Prepara con la IA el resumen de la semana pasada si hace falta (una sola vez por semana)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_weekly"

    def post(self, request):
        return Response(weekly.payload(request.user, generate_if_missing=True))


class PreferenceSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()


class WeeklySummarySettingsView(APIView):
    """HU14 · Escenario 3: activar o desactivar el resumen semanal."""

    def get(self, request):
        return Response({"enabled": weekly.is_enabled(request.user)})

    def put(self, request):
        serializer = PreferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        WeeklySummaryPreference.objects.update_or_create(
            user=request.user, defaults={"enabled": serializer.validated_data["enabled"]}
        )
        return Response({"enabled": serializer.validated_data["enabled"]})

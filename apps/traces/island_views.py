"""Mis islas (HU15). Solo los recuerdos e islas de la persona autenticada."""

from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import islands
from .models import Island


class IslandsView(APIView):
    """Mis islas. No llama a la IA: si aún no se calcularon responde `status: "pending"`."""

    def get(self, request):
        return Response(islands.payload(request.user))


class IslandsCalculateView(APIView):
    """
    Calcula las islas con la IA: la primera vez o cuando la persona pide volver a calcular. Los
    nombres que cambió y las islas que ocultó se conservan (escenario 3).
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_islands"

    def post(self, request):
        state = islands.payload(request.user)
        if state["status"] in ("too_few", "pending"):
            return Response(islands.payload(request.user, calculate_if_missing=True))
        try:
            islands.calculate(request.user)
        except islands.UNAVAILABLE as error:
            islands.logger.warning("Islas no disponibles: %s %s", type(error).__name__, getattr(error, "code", ""))
            return Response({**state, "status": "unavailable"})
        return Response(islands.payload(request.user))


class IslandChangeSerializer(serializers.Serializer):
    # Vacío vuelve al nombre que propuso la IA.
    name = serializers.CharField(max_length=60, allow_blank=True, trim_whitespace=True, required=False)
    hidden = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise ValidationError({"detail": "Indica el nombre o si la isla está oculta."})
        return attrs


class IslandDetailView(APIView):
    """HU15 · Escenario 3: renombrar u ocultar (o volver a mostrar) una isla propia."""

    def patch(self, request, pk):
        island = Island.objects.filter(user=request.user, pk=pk).first()
        if island is None:
            raise NotFound("Esa isla no existe.")
        serializer = IslandChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "name" in serializer.validated_data:
            name = serializer.validated_data["name"]
            island.custom_name = "" if name == island.name else name
        if "hidden" in serializer.validated_data:
            island.hidden = serializer.validated_data["hidden"]
        island.save(update_fields=["custom_name", "hidden", "updated_at"])
        return Response(islands.payload(request.user))

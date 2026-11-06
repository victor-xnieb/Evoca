from datetime import timedelta

from django.db.models import Avg
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Trace
from .serializers import TraceSerializer, choice_list

FILTERS = {
    "sensory_type": (Trace.SensoryType, "Ese tipo de huella no existe."),
    "emotion": (Trace.Emotion, "Esa emoción no está en la lista."),
}

# Vista semanal y mensual de la gráfica: los últimos 7 o 30 días hasta ahora.
MOOD_PERIODS = {"week": 7, "month": 30}


class TraceViewSet(viewsets.ModelViewSet):
    """Huellas de la persona autenticada (nunca las de otras), de la más reciente a la más antigua."""

    serializer_class = TraceSerializer

    def get_queryset(self):
        queryset = Trace.objects.filter(user=self.request.user)
        if self.action != "list":
            return queryset
        for name, (choices, message) in FILTERS.items():
            value = self.request.query_params.get(name)
            if not value:
                continue
            if value not in choices.values:
                raise ValidationError({name: message})
            queryset = queryset.filter(**{name: value})
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def catalog(self, request):
        """Tipos sensoriales y emociones válidos, con la etiqueta que se muestra."""
        return Response(
            {
                "sensory_types": choice_list(Trace.SensoryType.choices),
                "emotions": choice_list(Trace.Emotion.choices),
            }
        )

    @action(detail=False, methods=["get"])
    def mood(self, request):
        """
        Datos de la gráfica de ánimo: un punto por huella real del periodo (sin agrupar ni
        inventar valores), en orden cronológico, y el promedio de su intensidad.
        """
        period = request.query_params.get("period", "week")
        if period not in MOOD_PERIODS:
            raise ValidationError({"period": "El periodo debe ser «week» (semana) o «month» (mes)."})
        end = timezone.now()
        start = end - timedelta(days=MOOD_PERIODS[period])
        traces = (
            Trace.objects.filter(user=request.user)
            .annotate(at=Coalesce("happened_at", "created_at"))
            .filter(at__gte=start, at__lte=end)
        )
        average = traces.aggregate(value=Avg("mood_intensity"))["value"]
        points = [
            {"id": str(row["id"]), "date": row["at"], "intensity": row["mood_intensity"], "emotion": row["emotion"]}
            for row in traces.order_by("at").values("id", "at", "mood_intensity", "emotion")
        ]
        return Response(
            {
                "period": period,
                "start": start,
                "end": end,
                "count": len(points),
                "average": round(average, 1) if average is not None else None,
                "points": points,
            }
        )

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

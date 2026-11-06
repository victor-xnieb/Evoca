from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Trace
from .serializers import TraceSerializer, choice_list


class TraceViewSet(viewsets.ModelViewSet):
    serializer_class = TraceSerializer

    def get_queryset(self):
        queryset = Trace.objects.filter(user=self.request.user)
        sensory_type = self.request.query_params.get("sensory_type")
        if sensory_type:
            queryset = queryset.filter(sensory_type=sensory_type)
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

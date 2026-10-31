from rest_framework import viewsets

from .models import Trace
from .serializers import TraceSerializer


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


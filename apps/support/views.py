from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportContent, orientation_status
from .serializers import SupportContentSerializer, SupportEventSerializer


class SupportContentView(APIView):
    """Textos, líneas de ayuda y palabras de riesgo vigentes (HU6 · escenario 3)."""

    def get(self, request):
        content = SupportContent.current()
        if content is None:
            return Response({"detail": "Aún no hay contenido de orientación."}, status=status.HTTP_404_NOT_FOUND)
        return Response(SupportContentSerializer(content).data)


class OrientationView(APIView):
    """Si toca mostrar el mensaje de orientación al abrir la app (HU6 · escenario 1)."""

    def get(self, request):
        return Response(orientation_status(request.user))


class SupportEventView(APIView):
    """Registra qué hizo la persona con la orientación, sin guardar notas ni palabras."""

    def post(self, request):
        serializer = SupportEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = SupportContent.current()
        serializer.save(user=request.user, content_version=content.version if content else None)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

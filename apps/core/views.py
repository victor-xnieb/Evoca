from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class RootView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "service": "evoca-api",
                "version": "v1",
                "endpoints": {
                    "health": "/api/v1/health/",
                    "register": "/api/v1/auth/register/",
                    "login": "/api/v1/auth/login/",
                    "traces": "/api/v1/traces/",
                },
            }
        )


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return Response({"status": "ok", "database": "ok"})


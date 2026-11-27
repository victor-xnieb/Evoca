"""Cuadernillo (HU17): cuadernos y páginas de la persona autenticada, nunca los de otra."""

from collections import defaultdict
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured
from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.traces.models import Trace
from apps.traces.views import dominant_emotion, local_start, with_moment

from . import crypto
from .models import Notebook, Page
from .serializers import NotebookSerializer, PageSerializer

NOT_CONFIGURED = {"detail": "El Cuadernillo no está disponible ahora. Inténtalo más tarde."}


def day_emotions(user, days):
    """{día: emoción dominante de sus huellas} para los días dados (la misma regla del calendario)."""
    days = sorted(set(days))
    if not days:
        return {}
    rows = (
        with_moment(Trace.objects.filter(user=user))
        .filter(at__gte=local_start(days[0]), at__lt=local_start(days[-1] + timedelta(days=1)))
        .values_list("at", "emotion", "mood_intensity")
    )
    by_day = defaultdict(list)
    wanted = set(days)
    for moment, emotion, intensity in rows:
        day = timezone.localtime(moment).date()
        if day in wanted:
            by_day[day].append((moment, emotion, intensity))
    return {day: dominant_emotion(entries) for day, entries in by_day.items()}


class DiaryErrors:
    """Si falta la clave de cifrado en el servidor, responde con un mensaje claro y sin datos."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Antes de tocar la base: sin clave no se lee ni se escribe nada del Cuadernillo.
        crypto.fernet()

    def handle_exception(self, exc):
        if isinstance(exc, ImproperlyConfigured):
            return Response(NOT_CONFIGURED, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return super().handle_exception(exc)


class NotebookViewSet(DiaryErrors, viewsets.ModelViewSet):
    """Mis cuadernos (la estantería), con cuántas páginas tiene cada uno."""

    serializer_class = NotebookSerializer
    # Una estantería tiene pocos cuadernos: no se pagina.
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return Notebook.objects.filter(user=self.request.user).annotate(page_count=Count("pages"))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get", "post"])
    def pages(self, request, pk=None):
        """Las páginas del cuaderno (GET) o una página nueva (POST), de hoy si no se dice otro día."""
        notebook = self.get_object()
        if request.method == "POST":
            serializer = PageSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            page = serializer.save(notebook=notebook, user=request.user)
            return Response(
                PageSerializer(page, context={"emotions": day_emotions(request.user, [page.day])}).data,
                status=status.HTTP_201_CREATED,
            )
        pages = list(notebook.pages.all())
        context = {"emotions": day_emotions(request.user, [page.day for page in pages])}
        return Response(PageSerializer(pages, many=True, context=context).data)


class PageViewSet(DiaryErrors, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Una página: leerla, guardar lo escrito (y su papel, letra y tinta) o borrarla."""

    serializer_class = PageSerializer
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return Page.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "kwargs", {}).get("pk"):
            page = self.get_queryset().filter(pk=self.kwargs["pk"]).only("day").first()
            if page:
                context["emotions"] = day_emotions(self.request.user, [page.day])
        return context

    def perform_update(self, serializer):
        serializer.save()
        # El día pudo cambiar: la emoción se recalcula.
        serializer.context["emotions"] = day_emotions(self.request.user, [serializer.instance.day])

"""Cuadernillo (HU17): cuadernos, páginas y cartas (HU19) de la persona autenticada, nunca los de otra."""

import uuid

from django.core.exceptions import ImproperlyConfigured
from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from . import crypto, evoke
from .moments import day_emotions
from .models import Letter, Notebook, Page
from .serializers import LetterSerializer, NotebookSerializer, PageSerializer

NOT_CONFIGURED = {"detail": "El Cuadernillo no está disponible ahora. Inténtalo más tarde."}


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
    # POST solo para evocar y decidir las sugerencias (HU18); las páginas se crean en su cuaderno.
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return Page.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "kwargs", {}).get("pk"):
            page = self.get_queryset().filter(pk=self.kwargs["pk"]).only("day").first()
            if page:
                context["emotions"] = day_emotions(self.request.user, [page.day])
        return context

    def get_throttles(self):
        if self.action == "evoke":
            self.throttle_scope = "ai_evoke"
        return super().get_throttles()

    def page_data(self, page):
        page = Page.objects.get(pk=page.pk)  # Con su evocación al día.
        return PageSerializer(page, context={"emotions": day_emotions(self.request.user, [page.day])}).data

    @action(detail=True, methods=["post"], throttle_classes=[ScopedRateThrottle])
    def evoke(self, request, pk=None):
        """
        HU18 · Escenario 1: la IA lee la página y propone huellas y recuerdos. Responde `status`
        ("ok", "too_short", "risk" o "unavailable") y la página con su evocación.
        """
        page = self.get_object()
        status_value, _ = evoke.evoke(page)
        return Response({"status": status_value, "page": self.page_data(page)})

    def suggestion_index(self, page, index):
        if not hasattr(page, "evocation"):
            raise ValidationError({"detail": "Esta página aún no tiene sugerencias."})
        if int(index) >= len(evoke.load(page.evocation)["memories"]):
            raise ValidationError({"detail": "Esa sugerencia no existe."})
        return int(index)

    @action(detail=True, methods=["post"], url_path=r"evocation/(?P<index>\d+)/accept")
    def accept(self, request, pk=None, index=None):
        """
        HU18 · Escenario 2: acepta un recuerdo sugerido, con otro nombre (`name`) y solo con las
        huellas que la persona deja (`traces`, sus índices). Crea las huellas y el recuerdo.
        """
        page = self.get_object()
        position = self.suggestion_index(page, index)
        name = (request.data.get("name") or "").strip()
        if len(name) > 60:
            raise ValidationError({"name": "El nombre puede tener hasta 60 caracteres."})
        keep = request.data.get("traces")
        if keep is not None and (not isinstance(keep, list) or not all(isinstance(i, int) and not isinstance(i, bool) for i in keep)):
            raise ValidationError({"traces": "Indica qué huellas se quedan."})
        try:
            memory = evoke.accept(page, position, name=name or None, keep=keep)
        except ValueError as error:
            raise ValidationError({"detail": str(error)}) from None
        return Response({"memory_id": str(memory.pk), "page": self.page_data(page)})

    @action(detail=True, methods=["post"], url_path=r"evocation/(?P<index>\d+)/discard")
    def discard(self, request, pk=None, index=None):
        """HU18 · Escenario 2: descarta un recuerdo sugerido; nada se guarda como recuerdo."""
        page = self.get_object()
        position = self.suggestion_index(page, index)
        try:
            evoke.discard(page, position)
        except ValueError as error:
            raise ValidationError({"detail": str(error)}) from None
        return Response({"page": self.page_data(page)})

    def perform_update(self, serializer):
        serializer.save()
        # El día pudo cambiar: la emoción se recalcula.
        serializer.context["emotions"] = day_emotions(self.request.user, [serializer.instance.day])


class LetterViewSet(DiaryErrors, mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    HU19: mis cartas a mi yo del futuro. Se escriben y quedan selladas: no se editan. La lista y el
    detalle dicen cuándo se abre cada una, sin su contenido hasta que se abre el sobre.
    """

    serializer_class = LetterSerializer
    pagination_class = None
    http_method_names = ["get", "post"]

    def get_queryset(self):
        return Letter.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def open(self, request, pk=None):
        """HU19 · Escenario 2: abre el sobre si ya llegó su fecha y entrega la carta."""
        letter = self.get_object()
        if not letter.ready:
            return Response(
                {"detail": f"Esta carta sigue sellada hasta el {letter.opens_on.strftime('%d/%m/%Y')}."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not letter.opened_at:
            letter.opened_at = timezone.now()
            letter.save(update_fields=["opened_at"])
        return Response(self.get_serializer(letter).data)

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        """
        HU19: «Escribir una respuesta» a una carta ya abierta: una página de hoy en el cuaderno
        elegido (`notebook`), o en el último en que escribí (o «Mi diario» si no tengo ninguno),
        enlazada a la carta. Si ya le respondí, devuelve esa página.
        """
        letter = self.get_object()
        if not letter.is_open:
            return Response({"detail": "Abre la carta antes de responderla."}, status=status.HTTP_403_FORBIDDEN)
        page = getattr(letter, "reply", None)
        created = page is None
        if created:
            notebook = self.reply_notebook(request.user, request.data.get("notebook"))
            page = Page.objects.create(notebook=notebook, user=request.user, reply_to=letter)
        return Response(
            {"page": str(page.id), "notebook": str(page.notebook_id)},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @staticmethod
    def reply_notebook(user, notebook_id):
        notebooks = Notebook.objects.filter(user=user)
        if notebook_id:
            try:
                notebook = notebooks.filter(pk=uuid.UUID(str(notebook_id))).first()
            except ValueError:
                notebook = None
            if notebook is None:
                raise ValidationError({"notebook": ["Ese cuaderno no existe."]})
            return notebook
        last = Page.objects.filter(user=user).order_by("-updated_at").select_related("notebook").first()
        if last:
            return last.notebook
        return notebooks.order_by("-created_at").first() or Notebook.objects.create(user=user, title="Mi diario")

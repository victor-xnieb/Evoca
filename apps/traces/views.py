import re
from collections import defaultdict
from datetime import date, datetime, time, timedelta

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

MONTH_PATTERN = re.compile(r"^(\d{4})-(\d{2})$")


def local_start(day):
    """Medianoche del día en la zona horaria del proyecto (America/Bogota)."""
    return timezone.make_aware(datetime.combine(day, time.min))


def with_moment(queryset):
    """El momento de cada huella: cuándo ocurrió, o cuándo se registró si no se indicó."""
    return queryset.annotate(at=Coalesce("happened_at", "created_at"))


def dominant_emotion(entries):
    """
    La emoción más frecuente del día. Si hay empate, gana la de mayor intensidad sumada y,
    si sigue el empate, la más reciente.
    """
    stats = defaultdict(lambda: [0, 0, None])
    for moment, emotion, intensity in entries:
        item = stats[emotion]
        item[0] += 1
        item[1] += intensity
        item[2] = moment if item[2] is None or moment > item[2] else item[2]
    return max(stats, key=lambda emotion: tuple(stats[emotion]))


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
        day = self.request.query_params.get("date")
        if day:
            try:
                start = local_start(date.fromisoformat(day))
            except ValueError:
                raise ValidationError({"date": "La fecha debe tener la forma AAAA-MM-DD."}) from None
            queryset = with_moment(queryset).filter(at__gte=start, at__lt=start + timedelta(days=1))
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

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        """
        Calendario de ánimo de un mes (?month=AAAA-MM, por defecto el actual): por cada día con
        huellas, la emoción dominante, la intensidad promedio y cuántas hay. Los días sin
        huellas no se envían; la app los muestra en un color neutro.
        """
        value = request.query_params.get("month") or timezone.localdate().strftime("%Y-%m")
        match = MONTH_PATTERN.match(value)
        if not match or not 1 <= int(match.group(2)) <= 12:
            raise ValidationError({"month": "El mes debe tener la forma AAAA-MM."})
        year, month = int(match.group(1)), int(match.group(2))
        first = date(year, month, 1)
        following = date(year + month // 12, month % 12 + 1, 1)

        own = Trace.objects.filter(user=request.user)
        rows = (
            with_moment(own)
            .filter(at__gte=local_start(first), at__lt=local_start(following))
            .values_list("at", "emotion", "mood_intensity")
        )
        by_day = defaultdict(list)
        for moment, emotion, intensity in rows:
            by_day[timezone.localtime(moment).date()].append((moment, emotion, intensity))

        earliest = with_moment(own).order_by("at").values_list("at", flat=True).first()
        start_month = timezone.localtime(earliest).date() if earliest else timezone.localdate()
        joined = timezone.localtime(request.user.date_joined).date()
        first_month = min(start_month, joined).strftime("%Y-%m")

        return Response(
            {
                "month": first.strftime("%Y-%m"),
                "first_month": first_month,
                "days": [
                    {
                        "date": day.isoformat(),
                        "dominant_emotion": dominant_emotion(entries),
                        "average_intensity": round(sum(item[2] for item in entries) / len(entries), 1),
                        "count": len(entries),
                    }
                    for day, entries in sorted(by_day.items())
                ],
            }
        )

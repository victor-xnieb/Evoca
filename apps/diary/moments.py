"""
Cómo estaba la persona en un día o una semana, a partir de sus huellas (la regla del calendario
de HU7). Lo usan la cinta de cada página (HU17) y «Así estabas cuando la escribiste» (HU19).
"""

from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from apps.traces.models import Trace
from apps.traces.views import dominant_emotion, local_start, with_moment

# Huellas de la semana que se muestran junto a una carta abierta.
WEEK_TRACES = 3


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


def week_traces(user, day, limit=WEEK_TRACES):
    """
    Hasta `limit` huellas de la semana (lunes a domingo) de ese día: de tipos distintos (una
    canción, un aroma, un lugar…), primero las más intensas y, si empatan, las más recientes.
    """
    monday = day - timedelta(days=day.weekday())
    traces = (
        with_moment(Trace.objects.filter(user=user))
        .filter(at__gte=local_start(monday), at__lt=local_start(monday + timedelta(days=7)))
        .order_by("-mood_intensity", "-at")
    )
    chosen, seen = [], set()
    for trace in traces:
        if trace.sensory_type in seen:
            continue
        seen.add(trace.sensory_type)
        chosen.append(trace)
        if len(chosen) == limit:
            break
    return chosen


def letter_moment(letter):
    """
    HU19: «Así estabas cuando la escribiste»: la emoción dominante del día en que se escribió la
    carta, la de hoy (para comparar) y algunas huellas de esa semana.
    """
    written = timezone.localtime(letter.created_at).date()
    today = timezone.localdate()
    emotions = day_emotions(letter.user, [written, today])
    return {
        "day": written,
        "emotion": emotions.get(written),
        "today_emotion": emotions.get(today) if today != written else None,
        "traces": [
            {
                "id": str(trace.id),
                "sensory_type": trace.sensory_type,
                "note": trace.note,
                "emotion": trace.emotion,
                "mood_intensity": trace.mood_intensity,
                "at": trace.at,
            }
            for trace in week_traces(letter.user, written)
        ],
    }

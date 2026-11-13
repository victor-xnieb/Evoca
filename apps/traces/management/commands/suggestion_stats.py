"""
HU9 · Escenario 3: qué proporción de los recuerdos sugeridos por la IA aceptan las personas.
Solo cuenta recuerdos: no imprime nombres, notas ni correos.

    python manage.py suggestion_stats
"""

from django.core.management.base import BaseCommand

from apps.traces.models import Memory


def acceptance_stats():
    suggested = Memory.objects.filter(suggested_at__isnull=False)
    accepted = suggested.filter(status=Memory.Status.ACCEPTED).count()
    discarded = suggested.filter(status=Memory.Status.DISCARDED).count()
    pending = suggested.filter(status=Memory.Status.SUGGESTED).count()
    decided = accepted + discarded
    return {
        "suggested": suggested.count(),
        "accepted": accepted,
        "discarded": discarded,
        "pending": pending,
        "acceptance_rate": round(accepted / decided, 2) if decided else None,
    }


class Command(BaseCommand):
    help = "Tasa de aceptación de los recuerdos sugeridos por la IA (HU9, escenario 3)."

    def handle(self, *args, **options):
        stats = acceptance_stats()
        self.stdout.write(f"Recuerdos sugeridos por la IA: {stats['suggested']}")
        self.stdout.write(f"· aceptados: {stats['accepted']}")
        self.stdout.write(f"· descartados: {stats['discarded']}")
        self.stdout.write(f"· sin decidir: {stats['pending']}")
        if stats["acceptance_rate"] is None:
            self.stdout.write("Aún no hay sugerencias decididas: no se puede medir la aceptación.")
            return
        percent = round(stats["acceptance_rate"] * 100)
        verdict = "cumple" if stats["acceptance_rate"] >= 0.7 else "no cumple"
        self.stdout.write(self.style.SUCCESS(f"Aceptación: {percent} % ({verdict} el 70 % del criterio)"))

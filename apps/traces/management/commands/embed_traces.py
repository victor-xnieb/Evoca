"""
Prepara los vectores de significado de las huellas (HU12) respetando el límite de la IA: el plan
gratuito de Gemini permite 100 por minuto, así que va por lotes y espera entre uno y otro. Sirve
para dejar lista una demo o una cuenta con muchas huellas. Solo imprime cantidades.

    python manage.py embed_traces                      # todas las cuentas
    python manage.py embed_traces --email maria.demo@example.com
"""

import time
import urllib.error

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.traces import search
from apps.traces.models import Trace


class Command(BaseCommand):
    help = "Prepara los vectores de significado de las huellas (HU12), por lotes y sin pasar el límite de la IA."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Solo esta cuenta.")
        parser.add_argument("--per-minute", type=int, default=90, help="Vectores por minuto (máximo 100 en el plan gratuito).")

    def handle(self, *args, **options):
        users = User.objects.all()
        if options["email"]:
            users = users.filter(email=options["email"])
            if not users.exists():
                raise CommandError("No existe una cuenta con ese correo.")
        per_minute = max(1, min(options["per_minute"], 100))
        prepared = 0
        for user in users.order_by("email"):
            traces = list(Trace.objects.filter(user=user))
            waits = 0
            while True:
                try:
                    vectors, pending = search.ensure_embeddings(traces, limit=per_minute)
                except urllib.error.HTTPError as error:
                    # 429: se pasó el límite por minuto; se espera y se vuelve a intentar.
                    if error.code != 429 or waits >= 5:
                        raise CommandError(f"La IA respondió {error.code}; inténtalo más tarde.") from None
                    waits += 1
                    self.stdout.write("  La IA pidió una pausa: espero un minuto…")
                    time.sleep(61)
                    continue
                done = len(vectors)
                prepared += done
                self.stdout.write(f"· cuenta {user.pk}: {done} huellas listas, {pending} por preparar")
                if not pending:
                    break
                time.sleep(61)
        self.stdout.write(self.style.SUCCESS("Listo: las búsquedas por significado ya incluyen todas las huellas."))

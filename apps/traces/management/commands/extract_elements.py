"""
Reconoce de una vez el elemento de las huellas que aún no lo tienen (HU13), por lotes, para
que las estadísticas estén completas sin esperar a que cada persona las abra. Útil después de
cargar los datos demo. No imprime notas ni elementos, solo cuántas huellas se reconocieron.
"""

import time
import urllib.error

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.traces import ai, stats


class Command(BaseCommand):
    help = "Reconoce con la IA el elemento de las huellas que aún no lo tienen (HU13)."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Solo las huellas de esta cuenta.")
        parser.add_argument("--wait", type=float, default=61, help="Segundos de espera si la IA pide bajar el ritmo (429).")
        parser.add_argument("--retries", type=int, default=3, help="Reintentos seguidos por cuenta si la IA pide esperar.")

    def handle(self, *args, **options):
        users = get_user_model().objects.filter(traces__isnull=False).distinct().order_by("email")
        if options["email"]:
            users = users.filter(email=options["email"])
            if not users.exists():
                raise CommandError("No hay huellas de esa cuenta.")
        total = 0
        for number, user in enumerate(users, start=1):
            retries = options["retries"]
            while True:
                try:
                    done, pending = stats.extract_pending(user, stats.BATCH_SIZE)
                except urllib.error.HTTPError as error:
                    if error.code == 429 and retries > 0:
                        retries -= 1
                        self.stdout.write(f"La IA pidió esperar; reintento en {options['wait']:.0f} s.")
                        time.sleep(options["wait"])
                        continue
                    raise CommandError(f"La IA respondió con el código {error.code}.") from None
                except (ai.SuggestionUnavailable, urllib.error.URLError, TimeoutError, OSError) as error:
                    raise CommandError(f"La IA no está disponible ({type(error).__name__}).") from None
                total += done
                if not pending or not done:
                    break
            # Cuenta n.º, no el correo: el registro no guarda datos personales.
            self.stdout.write(f"Cuenta {number}: {pending} huellas pendientes.")
        self.stdout.write(self.style.SUCCESS(f"Huellas reconocidas: {total}."))

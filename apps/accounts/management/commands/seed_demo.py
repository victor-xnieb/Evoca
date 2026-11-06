"""
Crea tres cuentas de demostración con datos de ejemplo, pensadas para mostrar cada
funcionalidad del Sprint 1. Las fechas se calculan desde el día en que se ejecuta, así que la
demo siempre se ve actual.

    python manage.py seed_demo           # crea las que falten
    python manage.py seed_demo --reset   # borra y vuelve a crear las tres

Son datos inventados, sin información real de nadie. La contraseña y el PIN de las tres
cuentas son DEMO_PASSWORD y DEMO_PIN (o EVOCA_DEMO_PASSWORD y EVOCA_DEMO_PIN, si existen en
el entorno). En un despliegue público conviene definir esas variables con otros valores.
"""

import os
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccessPin, ConsentRecord, DailyReminder, User
from apps.traces.models import Trace

DEMO_PASSWORD = "EvocaDemo!2026"
DEMO_PIN = "2468"

# (días atrás, hora, minuto, tipo, emoción, intensidad, nota). Día 0 = hoy.
MARIA = [
    (0, None, None, "aroma", "alegria", 4, "El olor del café recién molido en la oficina me alegró la mañana."),
    (1, 19, 30, "song", "gratitud", 5, "Mi hermana me mandó la canción que bailábamos de niñas y le agradecí por recordármela."),
    (2, 8, 10, "color", "calma", 4, "El azul del cielo despejado camino a la universidad me dio mucha tranquilidad."),
    (3, 13, 0, "flavor", "alegria", 5, "Almorcé arepa con queso como las que hacía mi mamá los domingos."),
    (4, 21, 15, "texture", "calma", 3, "La cobija suave del sofá después de un día largo."),
    (5, 17, 40, "place", "nostalgia", 3, "Pasé por el parque donde aprendí a montar bicicleta."),
    (6, 9, 0, "aroma", "ansiedad", 3, "El olor a hospital en la cita médica me puso nerviosa."),
    (8, 18, 20, "song", "alegria", 4, "Sonó salsa en el bus y medio bus terminó cantando."),
    (9, 7, 45, "color", "gratitud", 4, "Los girasoles que me regaló una amiga siguen amarillos en la mesa."),
    (11, 20, 10, "flavor", "nostalgia", 4, "Un chocolate caliente con pan me llevó a las tardes en casa de mi abuela."),
    (12, 12, 30, "place", "enojo", 3, "El trancón me hizo llegar tarde a la reunión más importante de la semana."),
    (14, 16, 0, "texture", "alegria", 4, "La arena tibia en los pies durante el paseo a la playa."),
    (15, 22, 0, "song", "tristeza", 2, "Escuché la canción favorita de un amigo que se fue a vivir lejos."),
    (17, 10, 30, "aroma", "calma", 5, "El olor a lluvia sobre el pasto en la finca."),
    (19, 19, 0, "color", "alegria", 4, "El atardecer naranja desde la terraza con mis amigos."),
    (21, 8, 30, "flavor", "gratitud", 4, "Mi papá me preparó el desayuno antes del parcial."),
    (23, 14, 15, "place", "miedo", 2, "Caminé sola por una calle oscura y me asusté con un ruido."),
    (25, 18, 45, "texture", "nostalgia", 3, "Encontré mi peluche viejo en una caja de la mudanza."),
    (27, 11, 0, "song", "calma", 4, "Música instrumental mientras estudiaba en la biblioteca."),
    (29, 20, 30, "aroma", "gratitud", 5, "El perfume de mi mamá en un abrazo después de semanas sin verla."),
    (31, 9, 20, "color", "calma", 3, "El verde de las montañas desde la ventana del bus."),
    (33, 15, 10, "flavor", "alegria", 5, "Probé por primera vez un helado de lulo y me encantó."),
    (35, 21, 0, "place", "tristeza", 2, "Volví a la casa donde vivíamos antes y ya la habían pintado de otro color."),
    (38, 12, 0, "texture", "calma", 4, "Tejer con lana gruesa mientras llovía afuera."),
    (41, 17, 30, "song", "nostalgia", 4, "Un vallenato que ponía mi abuelo en los viajes por carretera."),
    (44, 8, 0, "aroma", "alegria", 4, "El pan de bono recién salido del horno en la panadería del barrio."),
    (47, 19, 15, "color", "ansiedad", 3, "La pantalla roja de notas pendientes en la plataforma de la universidad."),
    (50, 13, 45, "place", "gratitud", 5, "El mirador donde mis amigos me hicieron una sorpresa de cumpleaños."),
    (53, 10, 0, "flavor", "calma", 3, "Una aromática de hierbabuena en la tarde de lluvia."),
    (56, 18, 0, "texture", "alegria", 4, "El pasto recién cortado bajo los pies en el partido de fútbol."),
]

# Ánimo bajo (2 o menos) en los 15 días anteriores a hoy: al abrir la app ve la orientación (HU6).
MATEO = [
    (1, 21, 30, "song", "tristeza", 2, "Escuché la playlist que hicimos juntos y me quedé callado un buen rato."),
    (2, 22, 10, "place", "tristeza", 1, "Pasé frente a la cafetería donde nos veíamos los viernes."),
    (3, 20, 0, "color", "ansiedad", 2, "El gris de la oficina me tuvo inquieto toda la tarde."),
    (4, 23, 15, "texture", "tristeza", 2, "Las sábanas frías y la casa en silencio por la noche."),
    (5, 19, 45, "aroma", "ansiedad", 2, "El olor a café quemado de la reunión que salió mal."),
    (6, 21, 0, "flavor", "tristeza", 1, "Comí solo la sopa que preparaba mi mamá y no me supo igual."),
    (7, 22, 30, "song", "nostalgia", 2, "Una canción del colegio me recordó a los amigos que ya no veo."),
    (8, 18, 20, "place", "miedo", 2, "Caminar por la estación llena de gente me dio miedo de perderme."),
    (9, 20, 40, "color", "tristeza", 1, "Llovió todo el día y el cielo no cambió de color."),
    (10, 21, 50, "texture", "ansiedad", 2, "La corbata apretada antes de la entrevista de trabajo."),
    (11, 19, 10, "aroma", "tristeza", 2, "El perfume de alguien en el bus me recordó a una persona que extraño."),
    (12, 22, 0, "flavor", "enojo", 2, "El almuerzo frío después de esperar una hora por un trámite."),
    (13, 20, 30, "song", "tristeza", 1, "Me quedé despierto escuchando música triste hasta tarde."),
    (14, 21, 15, "place", "ansiedad", 2, "La sala de espera del médico estaba llena y no paraba de mirar el reloj."),
    (15, 18, 0, "color", "tristeza", 2, "Las fotos en blanco y negro del álbum familiar."),
    (24, 12, 30, "flavor", "calma", 3, "Un pandebono con café en la mañana tranquila del domingo."),
    (30, 17, 0, "place", "alegria", 4, "El partido con los amigos del barrio en la cancha de siempre."),
    (38, 10, 0, "song", "gratitud", 4, "Mi hermano me dedicó una canción en mi cumpleaños."),
]

# Sin huella hoy y con recordatorio a las 8:00: al abrir la app llega el aviso (HU5).
JULIANA = [
    (1, 7, 50, "aroma", "calma", 4, "El olor a eucalipto en la caminata de la mañana."),
    (2, 20, 0, "song", "nostalgia", 4, "La canción del primer concierto al que fui con mis primas."),
    (3, 12, 40, "flavor", "alegria", 5, "El ajiaco del almuerzo familiar del domingo."),
    (4, 9, 15, "color", "ansiedad", 3, "Las luces rojas del tablero antes de exponer en clase."),
    (6, 18, 30, "place", "gratitud", 5, "La biblioteca donde una profesora me ayudó a entender cálculo."),
    (7, 16, 0, "texture", "calma", 3, "El agua tibia de la ducha después de correr."),
    (8, 21, 20, "song", "tristeza", 3, "Una balada que sonaba el día que me despedí de mi perrita."),
    (10, 8, 30, "aroma", "alegria", 4, "El olor a mandarina en la lonchera."),
    (11, 14, 0, "color", "calma", 4, "El blanco de la neblina cubriendo el cerro."),
    (12, 19, 0, "flavor", "nostalgia", 4, "Las obleas con arequipe que comíamos a la salida del colegio."),
    (14, 10, 45, "place", "miedo", 3, "El ascensor que se quedó quieto unos segundos entre dos pisos."),
    (15, 17, 15, "texture", "gratitud", 4, "La bufanda que me tejió mi abuela para el viaje."),
    (16, 22, 0, "song", "calma", 4, "Lluvia de fondo y piano para dormir."),
    (18, 13, 30, "aroma", "enojo", 3, "El olor a humo del bus que no paraba de pitar."),
    (19, 9, 0, "color", "alegria", 5, "El arcoíris que salió al terminar el aguacero."),
    (20, 18, 40, "place", "nostalgia", 3, "La plaza del pueblo de mis abuelos en las fiestas de diciembre."),
]

DEMO_USERS = [
    {
        "email": "maria.demo@example.com",
        "first_name": "María",
        "last_name": "Gómez",
        "date_of_birth": date(1999, 3, 14),
        "traces": MARIA,
        "reminder": {"enabled": True, "frequency": "daily", "time": time(20, 0)},
        "shows": "ánimo variado: lista y filtros, gráfica semanal y mensual, calendario de tres meses; ya registró hoy",
    },
    {
        "email": "mateo.demo@example.com",
        "first_name": "Mateo",
        "last_name": "Rincón",
        "date_of_birth": date(1996, 8, 2),
        "traces": MATEO,
        "reminder": {"enabled": True, "frequency": "hourly", "time": time(20, 0)},
        "shows": "ánimo bajo 15 de los últimos 21 días: orientación al abrir; recordatorio cada hora sin huella hoy",
    },
    {
        "email": "juliana.demo@example.com",
        "first_name": "Juliana",
        "last_name": "Herrera",
        "date_of_birth": date(2001, 11, 25),
        "traces": JULIANA,
        "reminder": {"enabled": True, "frequency": "daily", "time": time(8, 0)},
        "shows": "sin huella hoy: el recordatorio diario de las 8:00 avisa al abrir; buena cuenta para registrar en vivo",
    },
]


def moment(today, now, days_ago, hour, minute):
    """Fecha local de la huella. Sin hora: una hora antes de ahora, sin salirse de hoy."""
    if hour is None:
        start_of_today = timezone.make_aware(datetime.combine(today, time(0, 5)))
        return max(start_of_today, now - timedelta(hours=1))
    return timezone.make_aware(datetime.combine(today - timedelta(days=days_ago), time(hour, minute)))


class Command(BaseCommand):
    help = "Crea tres cuentas de demostración con huellas de ejemplo (fechas relativas a hoy)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Borra y vuelve a crear las cuentas de demostración.")

    @transaction.atomic
    def handle(self, *args, **options):
        password = os.getenv("EVOCA_DEMO_PASSWORD") or DEMO_PASSWORD
        pin = os.getenv("EVOCA_DEMO_PIN") or DEMO_PIN
        now = timezone.now()
        today = timezone.localdate(now)

        for spec in DEMO_USERS:
            existing = User.objects.filter(email=spec["email"]).first()
            if existing and not options["reset"]:
                self.stdout.write(f"· {spec['email']}: ya existe (usa --reset para recrearla)")
                continue
            if existing:
                existing.delete()

            moments = [moment(today, now, *row[:3]) for row in spec["traces"]]
            user = User.objects.create_user(
                email=spec["email"],
                password=password,
                first_name=spec["first_name"],
                last_name=spec["last_name"],
                date_of_birth=spec["date_of_birth"],
            )
            # La cuenta «existe» desde un poco antes de su primera huella.
            user.date_joined = min(moments) - timedelta(days=2)
            user.save(update_fields=["date_joined"])
            ConsentRecord.objects.bulk_create(
                [
                    ConsentRecord(user=user, consent_type=kind, document_version=version)
                    for kind, version in [
                        (ConsentRecord.Type.TERMS, settings.EVOCA_TERMS_VERSION),
                        (ConsentRecord.Type.PRIVACY, settings.EVOCA_PRIVACY_VERSION),
                        (ConsentRecord.Type.HEALTH_DATA, settings.EVOCA_HEALTH_DATA_VERSION),
                    ]
                ]
            )
            ConsentRecord.objects.filter(user=user).update(accepted_at=user.date_joined)
            access = AccessPin(user=user)
            access.set_pin(pin)
            access.save()
            DailyReminder.objects.create(user=user, **spec["reminder"])
            traces = Trace.objects.bulk_create(
                [
                    Trace(
                        user=user,
                        sensory_type=sensory,
                        emotion=emotion,
                        mood_intensity=intensity,
                        note=note,
                        happened_at=at,
                    )
                    for (_, _, _, sensory, emotion, intensity, note), at in zip(spec["traces"], moments)
                ]
            )
            # Cada huella figura registrada el día en que ocurrió, para que las listas salgan en orden.
            for trace, at in zip(traces, moments):
                Trace.objects.filter(pk=trace.pk).update(created_at=at, updated_at=at)
            self.stdout.write(self.style.SUCCESS(f"· {spec['email']}: {len(moments)} huellas · {spec['shows']}"))

        self.stdout.write("La contraseña y el PIN están en apps/accounts/management/commands/seed_demo.py (o en EVOCA_DEMO_*).")

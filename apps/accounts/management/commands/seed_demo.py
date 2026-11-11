"""
Crea cinco cuentas de demostración con datos de ejemplo, pensadas para mostrar cada
funcionalidad del Sprint 1. Las fechas se calculan desde el día en que se ejecuta, así que la
demo siempre se ve actual.

    python manage.py seed_demo           # crea las que falten
    python manage.py seed_demo --reset   # borra y vuelve a crear las cinco

Son datos inventados, sin información real de nadie. La contraseña y el PIN de las cinco
cuentas son DEMO_PASSWORD y DEMO_PIN (o EVOCA_DEMO_PASSWORD y EVOCA_DEMO_PIN, si existen en
el entorno). Esos valores por defecto están en el repositorio: con DEBUG=False (un despliegue)
el comando exige definir las variables EVOCA_DEMO_*, para no publicar cuentas con claves conocidas.
"""

import os
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccessPin, ConsentRecord, DailyReminder, User
from apps.traces.models import Memory, MemoryTrace, Trace

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

# Segunda cuenta para HU6: 16 días DISTINTOS (del 1 al 16 atrás) con ánimo 1 o 2, todos dentro de
# los últimos 21 días, así que al abrir la app aparece la orientación. Un solo día no sirve: la
# regla cuenta días distintos. Tres huellas más antiguas (fuera de los 21 días) completan el historial.
VALENTINA = [
    (1, 21, 10, "song", "tristeza", 2, "Puse la canción que cantábamos en el carro y se me hizo un nudo en la garganta."),
    (2, 22, 30, "aroma", "ansiedad", 2, "El olor a pintura fresca en la oficina nueva me dejó con los hombros tensos todo el día."),
    (3, 20, 0, "place", "miedo", 1, "El pasillo oscuro del edificio al llegar tarde me aceleró el corazón."),
    (4, 19, 30, "texture", "enojo", 2, "La silla incómoda de la sala de espera después de dos horas de trámite."),
    (5, 21, 45, "flavor", "nostalgia", 2, "El arroz con leche igual al de la abuela, pero sin la abuela."),
    (6, 18, 20, "color", "tristeza", 1, "Todo se veía gris desde la ventana y no tuve ganas de salir."),
    (7, 22, 5, "song", "ansiedad", 2, "La alarma del celular sonando antes de la presentación."),
    (8, 20, 40, "aroma", "tristeza", 2, "Pasó alguien con el mismo perfume que usaba mi mejor amigo."),
    (9, 19, 10, "place", "nostalgia", 1, "Volví a la cancha donde jugábamos de niños y estaba vacía."),
    (10, 21, 25, "texture", "miedo", 2, "Las manos frías y sudadas antes de la entrevista."),
    (11, 18, 50, "flavor", "calma", 2, "Una aromática caliente, lo único que me tranquilizó hoy."),
    (12, 20, 15, "color", "enojo", 2, "El rojo del semáforo y el pitazo de los carros me sacaron de quicio."),
    (13, 22, 10, "song", "tristeza", 1, "Una balada lenta y me quedé mirando el techo hasta tarde."),
    (14, 17, 35, "aroma", "gratitud", 2, "El café que me dejó un compañero en el escritorio sin decir nada: se lo agradecí."),
    (15, 21, 0, "place", "ansiedad", 2, "La fila del banco que no avanzaba y la cita que se me hacía tarde."),
    (16, 19, 45, "texture", "alegria", 2, "Un rato corto de sol en la cara en el descanso, aunque el día fue pesado."),
    (24, 12, 30, "flavor", "alegria", 4, "Almuerzo con la familia: sancocho y risas en la mesa grande."),
    (31, 10, 0, "song", "calma", 4, "Música suave mientras caminaba por el parque."),
    (40, 16, 20, "color", "gratitud", 5, "El atardecer desde el mirador con mis amigos."),
]

# Tercera cuenta para HU6: 15 días DISTINTOS (del 1 al 15 atrás) con ánimo 1 o 2, todos dentro de
# los últimos 21 días, así que al abrir la app aparece la orientación. Dos huellas más antiguas
# (fuera de los 21 días) completan el historial.
SANTIAGO = [
    (1, 20, 40, "song", "tristeza", 2, "Sonó el bolero que cantaba mi papá y tuve que apagar la radio."),
    (2, 21, 15, "place", "ansiedad", 2, "La estación del metro llena de gente a la hora pico me dejó sin aire."),
    (3, 19, 0, "aroma", "tristeza", 1, "El olor a jabón de la ropa recién lavada me recordó la casa de antes."),
    (4, 22, 20, "texture", "miedo", 2, "El silencio del apartamento y la manija de la puerta fría al llegar de noche."),
    (5, 18, 30, "color", "tristeza", 2, "El cielo gris y las ganas de no contestar mensajes en todo el día."),
    (6, 20, 10, "flavor", "enojo", 2, "El almuerzo salió mal y la discusión por teléfono me dejó con el estómago cerrado."),
    (7, 21, 50, "song", "nostalgia", 1, "Una canción de la universidad y las fotos del grupo que ya no se junta."),
    (8, 19, 25, "place", "ansiedad", 2, "El pasillo del hospital mientras esperaba los resultados de mi mamá."),
    (9, 22, 0, "aroma", "tristeza", 2, "El olor a lluvia en el asfalto y el cansancio de toda la semana."),
    (10, 20, 35, "texture", "ansiedad", 2, "Las manos frías sobre el teclado antes de enviar el correo importante."),
    (11, 18, 45, "color", "calma", 2, "El verde del parque, el único rato del día en que respiré tranquilo."),
    (12, 21, 5, "flavor", "tristeza", 1, "Comí sin hambre el arroz de ayer, solo por cumplir."),
    (13, 19, 40, "song", "miedo", 2, "El timbre de una llamada desconocida a deshoras me aceleró el pulso."),
    (14, 20, 20, "place", "nostalgia", 2, "Pasé por la panadería donde desayunábamos y ya cambiaron el letrero."),
    (15, 17, 55, "aroma", "gratitud", 2, "El café que me preparó un vecino sin preguntar nada: se lo agradecí."),
    (26, 11, 30, "flavor", "alegria", 4, "Almuerzo de domingo con mis primos, mucha risa y sobremesa larga."),
    (36, 16, 10, "color", "calma", 4, "El azul del mar desde el muelle en el viaje de fin de año."),
]

# Recuerdos aceptados para el mapa (HU10): (nombre, explicación, posiciones de sus huellas en la
# lista de arriba). El color de cada esfera sale de la emoción dominante de sus huellas.
MARIA_MEMORIES = [
    ("Días de calma", "Momentos tranquilos con colores suaves, lluvia y texturas que abrigan.", [2, 4, 13, 18, 23, 28]),
    ("Lo que se fue", "Lugares, canciones y objetos que traen de vuelta a quienes ya no están cerca.", [5, 12, 17, 22, 24]),
    ("Fiestas y amigos", "Música, atardeceres y planes compartidos con amigos.", [7, 14, 27, 29]),
    ("Tardes de nervios", "Situaciones de espera, prisa o peligro que aceleraron el corazón.", [6, 10, 16, 26]),
    ("Sabores de la infancia", "Comidas caseras que recuerdan a la familia.", [3, 9, 25]),
    ("La familia y sus abrazos", "Gestos de la mamá, el papá y la hermana.", [1, 15, 19]),
    ("Paisajes que me abrazan", "Flores, playa y montañas vistas con calma.", [8, 11, 20]),
]

MATEO_MEMORIES = [
    ("Noches en silencio", "Noches solo, con música triste y el cielo gris.", [0, 3, 8, 12, 14]),
    ("Lo que extraño", "Lugares, sabores y aromas que recuerdan a personas que ya no están.", [1, 5, 6, 10]),
    ("Antes de cada cita", "Esperas, reuniones y entrevistas que generan inquietud.", [2, 4, 9, 13]),
    ("Domingos con los míos", "Ratos con la familia y los amigos del barrio.", [15, 16, 17]),
]

JULIANA_MEMORIES = [
    ("Mañanas frescas", "Aromas, neblina y música suave de las mañanas.", [0, 7, 8, 12]),
    ("Lo que guardo de la familia", "Sabores, canciones y fiestas con la familia.", [1, 2, 9, 15]),
    ("Sustos del día a día", "Momentos de tensión en la clase, el ascensor y el bus.", [3, 10, 13]),
    ("Gente que me cuida", "Personas que ayudaron o regalaron algo hecho a mano.", [4, 11]),
]

DEMO_USERS = [
    {
        "email": "maria.demo@example.com",
        "first_name": "María",
        "last_name": "Gómez",
        "date_of_birth": date(1999, 3, 14),
        "traces": MARIA,
        "memories": MARIA_MEMORIES,
        "reminder": {"enabled": True, "frequency": "daily", "time": time(20, 0)},
        "shows": "ánimo variado: lista y filtros, gráfica semanal y mensual, calendario de tres meses, mapa con 7 recuerdos; ya registró hoy",
    },
    {
        "email": "mateo.demo@example.com",
        "first_name": "Mateo",
        "last_name": "Rincón",
        "date_of_birth": date(1996, 8, 2),
        "traces": MATEO,
        "memories": MATEO_MEMORIES,
        "reminder": {"enabled": True, "frequency": "hourly", "time": time(20, 0)},
        "shows": "ánimo bajo 15 de los últimos 21 días: orientación al abrir; recordatorio cada hora sin huella hoy",
    },
    {
        "email": "juliana.demo@example.com",
        "first_name": "Juliana",
        "last_name": "Herrera",
        "date_of_birth": date(2001, 11, 25),
        "traces": JULIANA,
        "memories": JULIANA_MEMORIES,
        "reminder": {"enabled": True, "frequency": "daily", "time": time(8, 0)},
        "shows": "sin huella hoy: el recordatorio diario de las 8:00 avisa al abrir; buena cuenta para registrar en vivo",
    },
    {
        "email": "valentina.demo@example.com",
        "first_name": "Valentina",
        "last_name": "Ríos",
        "date_of_birth": date(1998, 6, 9),
        "traces": VALENTINA,
        # Sin recordatorio: esta cuenta es solo para mostrar la orientación de HU6, sin avisos de por medio.
        "reminder": {"enabled": False, "frequency": "daily", "time": time(20, 0)},
        "shows": "ánimo 1 o 2 en 16 días distintos de los últimos 21: orientación de HU6 sin mostrar (segunda cuenta para esa demo)",
    },
    {
        "email": "santiago.demo@example.com",
        "first_name": "Santiago",
        "last_name": "Ortiz",
        "date_of_birth": date(1994, 1, 17),
        "traces": SANTIAGO,
        # Sin recordatorio, igual que Valentina: nada se interpone entre la apertura de la app y la orientación.
        "reminder": {"enabled": False, "frequency": "daily", "time": time(20, 0)},
        "shows": "ánimo 1 o 2 en 15 días distintos de los últimos 21: orientación de HU6 sin mostrar (tercera cuenta para esa demo)",
    },
]


def moment(today, now, days_ago, hour, minute):
    """Fecha local de la huella. Sin hora: una hora antes de ahora, sin salirse de hoy."""
    if hour is None:
        start_of_today = timezone.make_aware(datetime.combine(today, time(0, 5)))
        return max(start_of_today, now - timedelta(hours=1))
    return timezone.make_aware(datetime.combine(today - timedelta(days=days_ago), time(hour, minute)))


class Command(BaseCommand):
    help = "Crea cinco cuentas de demostración con huellas de ejemplo (fechas relativas a hoy)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Borra y vuelve a crear las cuentas de demostración.")

    @transaction.atomic
    def handle(self, *args, **options):
        password = os.getenv("EVOCA_DEMO_PASSWORD") or ""
        pin = os.getenv("EVOCA_DEMO_PIN") or ""
        if not settings.DEBUG and not (password and pin):
            raise CommandError(
                "Con DEBUG=False define EVOCA_DEMO_PASSWORD y EVOCA_DEMO_PIN: los valores por "
                "defecto están en el repositorio y no deben usarse en un sitio público."
            )
        password = password or DEMO_PASSWORD
        pin = pin or DEMO_PIN
        if not (pin.isdigit() and len(pin) == 4):
            raise CommandError("EVOCA_DEMO_PIN debe tener exactamente 4 dígitos.")
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
            memories = spec.get("memories", [])
            for name, explanation, positions in memories:
                memory = Memory.objects.create(
                    user=user, name=name, explanation=explanation, status=Memory.Status.ACCEPTED
                )
                MemoryTrace.objects.bulk_create([MemoryTrace(memory=memory, trace=traces[index]) for index in positions])
            self.stdout.write(
                self.style.SUCCESS(
                    f"· {spec['email']}: {len(moments)} huellas, {len(memories)} recuerdos · {spec['shows']}"
                )
            )

        self.stdout.write("La contraseña y el PIN están en apps/accounts/management/commands/seed_demo.py (o en EVOCA_DEMO_*).")

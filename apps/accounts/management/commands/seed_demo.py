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

# Etiquetas de algunas huellas (posición en la lista de arriba): son parte de la afinidad entre
# recuerdos del mapa (HU10), así que se ven como motivo de las conexiones («la etiqueta «familia»»).
MARIA_TAGS = {
    1: ["familia"], 3: ["familia"], 9: ["familia"], 15: ["familia"], 19: ["familia"], 24: ["familia"],
    13: ["lluvia"], 23: ["lluvia"], 28: ["lluvia"],
    7: ["amigos"], 12: ["amigos"], 14: ["amigos"], 27: ["amigos"],
}
MATEO_TAGS = {0: ["noche"], 3: ["noche"], 8: ["noche"], 12: ["noche"], 13: ["espera"], 9: ["espera"], 1: ["noche"]}
JULIANA_TAGS = {1: ["familia"], 2: ["familia"], 4: ["familia"], 11: ["familia"], 15: ["familia"]}

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
    ("Mañanas frescas", "Aromas, neblina, agua tibia y música suave de las mañanas.", [0, 5, 7, 8, 12]),
    ("Lo que guardo de la familia", "Sabores, canciones y fiestas con la familia.", [1, 9, 15]),
    ("Sustos del día a día", "Momentos de tensión en la clase, el ascensor y el bus.", [3, 10, 13]),
    ("Gente que me cuida", "Personas que cocinaron, ayudaron o regalaron algo hecho a mano.", [2, 4, 11]),
]

# Más recuerdos de María para ver el mapa (HU10) con muchas esferas: 33 recuerdos con sus propias
# huellas, de hace más de un mes, para no cambiar lo que muestran el ánimo reciente (HU4), el
# recordatorio (HU5) ni la orientación (HU6). Cada huella: (días atrás, hora, minuto, tipo,
# emoción, intensidad, nota, etiquetas).
MARIA_MORE = [
    ("Navidades en casa de la abuela", "Comidas, villancicos y luces de diciembre con la familia.", [
        (350, 20, 0, "aroma", "nostalgia", 4, "El olor a natilla y buñuelos en la cocina de la abuela.", ["familia", "navidad"]),
        (349, 22, 30, "song", "alegria", 5, "Villancicos con los primos alrededor del pesebre.", ["familia", "navidad"]),
        (348, 9, 0, "color", "calma", 4, "Las luces de colores del árbol todavía prendidas en la mañana.", ["navidad"]),
    ]),
    ("Año nuevo en la finca", "La medianoche y el primer día del año en la finca.", [
        (340, 23, 50, "place", "alegria", 5, "Los abrazos de medianoche en el corredor de la finca.", ["familia", "finca"]),
        (340, 23, 0, "flavor", "gratitud", 4, "Las doce uvas, una por cada deseo.", ["familia"]),
        (339, 8, 30, "texture", "calma", 4, "La hamaca al amanecer del primero de enero.", ["finca"]),
    ]),
    ("Viaje a Cartagena", "Colores, mar y comida del viaje a la costa.", [
        (300, 17, 0, "color", "alegria", 5, "Las fachadas amarillas y fucsias de la ciudad amurallada.", ["viaje", "mar"]),
        (299, 18, 30, "aroma", "calma", 4, "El olor a mar en la muralla al atardecer.", ["viaje", "mar"]),
        (298, 13, 0, "flavor", "alegria", 4, "Arroz con coco y pescado frito frente al agua.", ["viaje", "mar"]),
    ]),
    ("Tardes de lluvia en Bogotá", "Lluvia, música vieja y abrigo después de clase.", [
        (280, 16, 0, "aroma", "calma", 4, "Olor a tierra mojada saliendo de clase.", ["lluvia"]),
        (278, 15, 30, "song", "nostalgia", 3, "La lluvia contra la ventana y una canción vieja de rock en español.", ["lluvia", "música"]),
        (275, 17, 10, "texture", "calma", 4, "El saco de lana mojado y luego el chocolate caliente.", ["lluvia"]),
    ]),
    ("Exámenes finales", "Noches de estudio, mucho café y el alivio de pasar.", [
        (260, 23, 30, "color", "ansiedad", 2, "La pantalla del computador a medianoche con el informe sin terminar.", ["universidad"]),
        (259, 7, 0, "flavor", "ansiedad", 3, "Tinto tras tinto antes del parcial de estadística.", ["universidad"]),
        (255, 12, 0, "place", "alegria", 5, "El pasillo de la facultad cuando salieron las notas y pasé.", ["universidad"]),
    ]),
    ("Conciertos con amigas", "Música en vivo y recuerdos de esas noches.", [
        (240, 21, 0, "song", "alegria", 5, "Cantar a grito todo el concierto con mis amigas.", ["amigos", "música"]),
        (240, 23, 30, "texture", "gratitud", 4, "La pulsera de tela del concierto que todavía no me quito.", ["amigos", "música"]),
        (238, 10, 0, "color", "nostalgia", 3, "Las fotos borrosas de las luces del escenario.", ["amigos", "música"]),
    ]),
    ("Domingos de mercado", "La plaza de mercado y lo que se cocinaba después.", [
        (225, 9, 30, "aroma", "alegria", 4, "El olor a guayaba y mandarina en la plaza de mercado.", ["familia", "cocina"]),
        (225, 10, 15, "color", "calma", 4, "Los colores de las frutas apiladas en los puestos.", ["cocina"]),
        (224, 12, 0, "flavor", "gratitud", 4, "El caldo que preparó mi papá con lo que compramos.", ["familia", "cocina"]),
    ]),
    ("El hospital del abuelo", "Los días difíciles en el hospital y el alivio al final.", [
        (210, 15, 0, "aroma", "miedo", 2, "El olor a desinfectante en el pasillo de urgencias.", ["abuelo"]),
        (209, 19, 0, "place", "tristeza", 2, "La sala de espera vacía de noche.", ["abuelo"]),
        (205, 11, 0, "texture", "gratitud", 4, "La mano de mi abuelo apretando la mía cuando le dieron de alta.", ["abuelo", "familia"]),
    ]),
    ("Mi perro Lucas", "Momentos con Lucas en la casa y en el parque.", [
        (195, 7, 30, "texture", "alegria", 5, "El pelo suave de Lucas cuando me recibe en la puerta.", ["lucas"]),
        (193, 18, 0, "place", "calma", 4, "Caminar con Lucas por el parque del barrio.", ["lucas"]),
        (190, 20, 0, "song", "gratitud", 4, "Lucas dormido en mis pies mientras sonaba música suave.", ["lucas", "música"]),
    ]),
    ("Primer trabajo", "Los nervios y las alegrías del primer empleo.", [
        (180, 8, 0, "place", "ansiedad", 3, "La recepción de la empresa el primer día.", ["trabajo"]),
        (178, 13, 0, "flavor", "alegria", 4, "El primer almuerzo con el equipo nuevo.", ["trabajo", "amigos"]),
        (170, 18, 0, "color", "gratitud", 5, "El primer sueldo y el regalo para mi mamá.", ["trabajo", "familia"]),
    ]),
    ("Paseo al Eje Cafetero", "Montañas, niebla y café en Salento.", [
        (165, 6, 30, "color", "calma", 5, "El verde de las montañas cubiertas de niebla en Salento.", ["viaje", "campo"]),
        (164, 9, 0, "aroma", "alegria", 5, "El olor del café recién tostado en la finca cafetera.", ["viaje", "campo"]),
        (163, 16, 0, "place", "gratitud", 4, "El valle de Cocora con las palmas de cera.", ["viaje", "campo"]),
    ]),
    ("Cumpleaños de mi mamá", "La sorpresa que le preparamos entre todos.", [
        (155, 19, 0, "flavor", "alegria", 5, "La torta de tres leches que hicimos a escondidas.", ["familia"]),
        (155, 21, 0, "song", "gratitud", 5, "Toda la familia cantándole a mi mamá.", ["familia", "música"]),
    ]),
    ("Noches de insomnio", "Noches largas sin poder dormir.", [
        (148, 2, 30, "color", "ansiedad", 2, "El techo oscuro y el celular a las dos de la mañana.", []),
        (146, 3, 0, "texture", "tristeza", 2, "Las sábanas revueltas de una noche sin dormir.", []),
        (140, 23, 0, "song", "calma", 3, "Música de lluvia para intentar dormir.", ["lluvia", "música"]),
    ]),
    ("Clases de baile", "La salsa de los jueves con el grupo de baile.", [
        (135, 19, 30, "song", "alegria", 5, "La salsa en la clase de los jueves.", ["música", "amigos"]),
        (133, 20, 0, "texture", "alegria", 4, "Los zapatos de baile que me prestó la profe.", ["música"]),
        (128, 21, 0, "place", "gratitud", 4, "El salón de baile lleno de espejos y risas.", ["amigos"]),
    ]),
    ("La mudanza", "Dejar la casa de siempre y estrenar apartamento.", [
        (120, 10, 0, "texture", "nostalgia", 3, "Las cajas de cartón con mis cosas de la infancia.", ["casa"]),
        (118, 18, 0, "place", "ansiedad", 3, "El apartamento nuevo todavía vacío y con eco.", ["casa"]),
        (110, 20, 0, "color", "calma", 4, "Pinté mi cuarto nuevo de verde salvia.", ["casa"]),
    ]),
    ("Recetas de la abuela", "Cocinar lo que ella me enseñó.", [
        (105, 12, 0, "flavor", "nostalgia", 4, "El ajiaco con la receta escrita a mano de mi abuela.", ["familia", "abuela", "cocina"]),
        (104, 16, 0, "aroma", "gratitud", 4, "El olor a guascas llenando el apartamento nuevo.", ["abuela", "cocina"]),
        (100, 11, 0, "texture", "calma", 4, "Amasar arepas como ella me enseñó.", ["abuela", "cocina"]),
    ]),
    ("Partidos de fútbol", "El estadio, la hinchada y un mal rato de regreso.", [
        (95, 15, 0, "place", "alegria", 5, "El estadio lleno cuando ganó el equipo.", ["amigos"]),
        (95, 17, 0, "song", "alegria", 4, "Los cánticos de la hinchada camino a casa.", ["amigos", "música"]),
        (93, 18, 0, "color", "enojo", 2, "La camiseta manchada después de la pelea en el bus.", []),
    ]),
    ("Caminatas en los cerros", "Subir temprano y ver la ciudad desde arriba.", [
        (88, 6, 0, "aroma", "calma", 5, "El olor a eucalipto subiendo a Monserrate.", ["campo"]),
        (86, 7, 30, "color", "gratitud", 5, "La ciudad entera desde arriba al amanecer.", ["campo"]),
        (80, 8, 0, "texture", "calma", 4, "Las piedras frías del camino de los cerros.", ["campo"]),
    ]),
    ("Una pelea con mi hermana", "La discusión, los días sin hablarnos y las paces.", [
        (76, 21, 0, "place", "enojo", 2, "La cocina donde discutimos por una tontería.", ["familia"]),
        (75, 22, 0, "song", "tristeza", 2, "Una canción triste mientras no nos hablábamos.", ["música"]),
        (72, 19, 0, "flavor", "gratitud", 4, "El helado que compartimos cuando hicimos las paces.", ["familia"]),
    ]),
    ("Atardeceres en la terraza", "El final de la tarde desde la terraza.", [
        (68, 18, 0, "color", "calma", 5, "El cielo naranja y morado desde la terraza.", []),
        (64, 18, 30, "aroma", "calma", 4, "El jazmín de la vecina al caer la tarde.", []),
        (60, 18, 15, "song", "gratitud", 4, "Una canción suave mientras el sol se escondía.", ["música"]),
    ]),
    ("Vacaciones en Santa Marta", "Playa, mar transparente y jugos frente al agua.", [
        (55, 11, 0, "texture", "alegria", 5, "La arena caliente de Playa Cristal.", ["viaje", "mar"]),
        (54, 9, 0, "color", "calma", 5, "El azul transparente del agua en el Tayrona.", ["viaje", "mar"]),
        (53, 20, 0, "flavor", "alegria", 4, "El jugo de corozo frente al mar.", ["viaje", "mar"]),
    ]),
    ("Mañanas de biblioteca", "Estudiar temprano en la biblioteca de la universidad.", [
        (48, 8, 0, "place", "calma", 4, "La mesa del rincón en la biblioteca de la universidad.", ["universidad"]),
        (46, 9, 30, "aroma", "calma", 4, "El olor a libros viejos de la sección de historia.", ["universidad"]),
        (44, 10, 0, "texture", "alegria", 4, "Las hojas del cuaderno nuevo en el primer día de semestre.", ["universidad"]),
    ]),
    ("Un susto en la calle", "La noche del susto y la calma del día siguiente.", [
        (42, 22, 0, "place", "miedo", 2, "El callejón oscuro saliendo de la estación.", []),
        (42, 22, 30, "color", "miedo", 2, "Las luces de la moto que me siguió dos cuadras.", []),
        (41, 9, 0, "texture", "calma", 3, "La cobija y el té a la mañana siguiente.", ["casa"]),
    ]),
    ("Serenata a mi mamá", "El aniversario de mis papás con mariachi en la sala.", [
        (39, 20, 0, "song", "gratitud", 5, "El mariachi que le llevamos a mi mamá en su aniversario.", ["familia", "música"]),
        (39, 21, 0, "color", "alegria", 4, "Los trajes brillantes de los músicos en la sala.", ["música"]),
    ]),
    ("Cocinar para mis amigos", "La primera comida que preparé para el grupo.", [
        (37, 19, 0, "flavor", "alegria", 4, "La lasaña que me quedó cruda por dentro y aun así nos reímos.", ["amigos", "cocina"]),
        (37, 21, 0, "aroma", "gratitud", 4, "El olor a pan de ajo llenando el apartamento.", ["amigos", "cocina"]),
    ]),
    ("La despedida de Laura", "El día que Laura se fue a estudiar al exterior.", [
        (36, 17, 0, "place", "tristeza", 2, "El aeropuerto cuando Laura se fue a estudiar afuera.", ["amigos"]),
        (36, 18, 0, "texture", "nostalgia", 3, "La bufanda que me dejó de recuerdo.", ["amigos"]),
        (35, 21, 0, "song", "nostalgia", 3, "Nuestra canción de la adolescencia sonando en el taxi de vuelta.", ["amigos", "música"]),
    ]),
    ("Feria de las flores", "El viaje a Medellín en agosto.", [
        (380, 11, 0, "color", "alegria", 5, "Los silleteros llenos de flores en el desfile de Medellín.", ["viaje"]),
        (379, 12, 0, "aroma", "alegria", 4, "El olor de las flores frescas en la feria.", ["viaje"]),
        (378, 20, 0, "song", "alegria", 4, "La música de la verbena hasta tarde.", ["viaje", "música"]),
    ]),
    ("Clases de pintura", "Las mañanas de acuarela en el taller.", [
        (330, 10, 0, "color", "calma", 5, "Mezclar azules para pintar un cielo de acuarela.", []),
        (326, 10, 30, "texture", "calma", 4, "El papel rugoso de acuarela bajo el pincel.", []),
        (320, 11, 0, "aroma", "alegria", 4, "El olor a trementina en el taller.", []),
    ]),
    ("Noches de juegos de mesa", "Parqués, crispetas y risas en la sala.", [
        (310, 20, 0, "texture", "alegria", 4, "Las fichas del parqués en la mesa de la sala.", ["amigos", "familia"]),
        (305, 21, 0, "flavor", "alegria", 4, "Crispetas y gaseosa en la noche de juegos.", ["amigos"]),
    ]),
    ("La despedida de la tía Rosa", "El día que despedimos a la tía Rosa.", [
        (290, 10, 0, "place", "tristeza", 1, "La iglesia fría en la despedida de la tía Rosa.", ["familia"]),
        (290, 12, 0, "aroma", "tristeza", 2, "El olor a velas y flores blancas.", ["familia"]),
        (288, 19, 0, "song", "nostalgia", 3, "El bolero que le gustaba a ella.", ["familia", "música"]),
    ]),
    ("Picnic en el parque", "Una tarde de agosto con amigos y cometas.", [
        (270, 13, 0, "texture", "alegria", 4, "El pasto recién cortado bajo la manta del picnic.", ["amigos", "campo"]),
        (270, 14, 0, "flavor", "alegria", 4, "Las fresas con crema que llevó Andrés.", ["amigos"]),
        (270, 16, 0, "color", "calma", 4, "Las cometas de colores en el cielo de agosto.", ["campo"]),
    ]),
    ("La entrevista de trabajo", "Los nervios de la entrevista y la buena noticia.", [
        (250, 8, 30, "texture", "ansiedad", 2, "Las manos sudadas sobre la carpeta con la hoja de vida.", ["trabajo"]),
        (250, 9, 0, "place", "ansiedad", 2, "La oficina de vidrio donde esperaba mi turno.", ["trabajo"]),
        (245, 17, 0, "color", "alegria", 5, "El correo que decía «Bienvenida al equipo».", ["trabajo"]),
    ]),
    ("Retiro de yoga", "Un fin de semana de calma en el campo.", [
        (215, 7, 0, "aroma", "calma", 5, "El incienso de sándalo en el salón de yoga.", ["campo"]),
        (214, 6, 30, "texture", "calma", 5, "El tapete húmedo de rocío en la clase al aire libre.", ["campo"]),
        (213, 18, 0, "song", "gratitud", 4, "Los cuencos tibetanos al final de la meditación.", ["música"]),
    ]),
]


def with_bundles(traces, tags, memories, bundles):
    """Agrega recuerdos con sus propias huellas (y etiquetas) al final de las listas de una cuenta."""
    traces, tags, memories = list(traces), dict(tags), list(memories)
    for name, explanation, items in bundles:
        positions = []
        for *trace, trace_tags in items:
            positions.append(len(traces))
            if trace_tags:
                tags[len(traces)] = trace_tags
            traces.append(tuple(trace))
        memories.append((name, explanation, positions))
    return traces, tags, memories


MARIA, MARIA_TAGS, MARIA_MEMORIES = with_bundles(MARIA, MARIA_TAGS, MARIA_MEMORIES, MARIA_MORE)

DEMO_USERS = [
    {
        "email": "maria.demo@example.com",
        "first_name": "María",
        "last_name": "Gómez",
        "date_of_birth": date(1999, 3, 14),
        "traces": MARIA,
        "memories": MARIA_MEMORIES,
        "tags": MARIA_TAGS,
        "reminder": {"enabled": True, "frequency": "daily", "time": time(20, 0)},
        "shows": "ánimo variado: lista y filtros, gráfica semanal y mensual, calendario de tres meses, mapa con 40 recuerdos de más de un año; ya registró hoy",
    },
    {
        "email": "mateo.demo@example.com",
        "first_name": "Mateo",
        "last_name": "Rincón",
        "date_of_birth": date(1996, 8, 2),
        "traces": MATEO,
        "memories": MATEO_MEMORIES,
        "tags": MATEO_TAGS,
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
        "tags": JULIANA_TAGS,
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
                        tags=spec.get("tags", {}).get(position, []),
                    )
                    for position, ((_, _, _, sensory, emotion, intensity, note), at) in enumerate(zip(spec["traces"], moments))
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

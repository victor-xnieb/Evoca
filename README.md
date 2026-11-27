# Evoca

Evoca es una app web instalable (PWA) para que personas adultas en Colombia registren
huellas sensoriales (un aroma, un color, una canción, un sabor, una textura o un lugar) con
una emoción y una intensidad, y vean cómo evoluciona su ánimo. Es una herramienta de
autoconocimiento, no clínica.

El repositorio tiene dos partes:

| Carpeta | Qué es | Tecnología |
| --- | --- | --- |
| raíz (`apps/`, `config/`) | API REST en `/api/v1/` | Django + Django REST Framework, PostgreSQL (Neon) |
| `frontend/` | Cliente web instalable en el celular | React + TypeScript (Vite), Tailwind CSS, shadcn/ui, Motion, Recharts, PWA |

Django es solo el backend. El uso en Android e iOS se cubre con la PWA (responsive e
instalable desde el navegador); no se construye una app nativa.

## Compatibilidad del equipo

El proyecto no modifica la instalación global de nadie. Cada integrante usa su propia
carpeta `.venv`:

| Python | Django instalado por `requirements.txt` |
| --- | --- |
| 3.12, 3.13 o 3.14 | 6.1.1 |
| 3.10 u 3.11 | 5.2.18 LTS |

El código evita funciones exclusivas de Django 6.1 y se prueba en ambos perfiles. Para
evitar migraciones inconsistentes, las migraciones se generan una sola vez y se comparten
por Git; ningún integrante debe borrarlas y regenerarlas por su cuenta.

> Django 6.1.1 es la versión solicitada para el entorno académico. Antes de publicar la
> aplicación en Internet se debe planear el paso a un parche de seguridad vigente de la
> misma serie.

## Requisitos

- Python 3.10 a 3.14 (backend).
- Node.js 22.12 o superior y npm (frontend). El CI usa Node 24.

## Inicio rápido del backend en Windows (PowerShell)

Desde la raíz del repositorio:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

`py -3.14` usa el lanzador oficial de Python para Windows; cambia la versión por la que
tengas instalada (3.10 a 3.14, `py -0` las lista).

> **Si `python` o `pip` apuntan a otra instalación** (por ejemplo MSYS2 o un Python global),
> o si PowerShell no deja ejecutar `Activate.ps1`, no actives el entorno: llama directamente
> al intérprete de `.venv`. Así nunca se instala nada en el Python global.
>
> ```powershell
> .\.venv\Scripts\python.exe -m pip install -r requirements.txt
> .\.venv\Scripts\python.exe manage.py migrate
> .\.venv\Scripts\python.exe manage.py runserver
> ```
>
> Nunca ejecutes `pip install` suelto sin el entorno activo: modificaría tu Python global.

También se puede ejecutar `scripts\bootstrap.ps1`, que realiza esos pasos sin tocar otras
instalaciones de Python o Django.

Genera una clave para Django:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copia el resultado en `DJANGO_SECRET_KEY` dentro de `.env`.

## Configurar Neon

No hace falta crear una API key de Neon para que Django se conecte. Se necesitan dos URI de
PostgreSQL de la rama `development`, ambas con la contraseña del rol:

1. En Neon, abre el proyecto `evoca_db`, rama `development`, y pulsa **Connect**.
2. Selecciona la base `neondb` y el rol `neondb_owner`.
3. Activa **Connection pooling**, muestra/copia la cadena completa y guárdala en
   `DATABASE_URL`. El host debe contener `-pooler`.
4. Desactiva **Connection pooling**, copia la cadena y guárdala en
   `DATABASE_URL_UNPOOLED`. Ese host no contiene `-pooler`.
5. Conserva `sslmode=require` (y `channel_binding=require` si Neon lo entrega).

Ejemplo de forma; no copies estos valores ficticios:

```dotenv
DATABASE_URL=postgresql://usuario:contraseña@ep-ejemplo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_URL_UNPOOLED=postgresql://usuario:contraseña@ep-ejemplo.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

`.env` está ignorado por Git. Nunca envíes ese archivo por chat ni lo subas al repositorio.

**Sugerencia de emoción con IA (HU8).** Para activarla, crea una clave en
[Google AI Studio](https://aistudio.google.com) y escríbela en `.env` como
`EVOCA_AI_API_KEY=...`. La clave solo la usa el servidor. Sin clave, la app funciona igual,
sin sugerencia. El modelo y los tiempos se ajustan con las variables `EVOCA_AI_*` de
`.env.example`.
Cada integrante debe recibir acceso a Neon o una cadena rotada por un canal seguro.

## Crear el esquema y ejecutar

Las migraciones usan la URL directa:

```powershell
$env:USE_UNPOOLED_DATABASE="True"
python manage.py migrate
Remove-Item Env:USE_UNPOOLED_DATABASE
```

Si la rama de Neon alcanzó a usar la primera versión experimental del modelo de usuario,
`accounts.0002_repair_legacy_account_schema` renombra `birth_date`, conserva los
consentimientos anteriores y crea la tabla versionada sin borrar usuarios.

Luego crea una cuenta administrativa y levanta el servidor con la URL agrupada:

```powershell
python manage.py createsuperuser
python manage.py runserver
```

Rutas útiles:

- API: `http://127.0.0.1:8000/api/v1/`
- Salud y conexión: `http://127.0.0.1:8000/api/v1/health/`
- Administración: `http://127.0.0.1:8000/admin/`

Si `DATABASE_URL` está vacía, el proyecto usa SQLite solo para facilitar el arranque local.
No representa el entorno compartido del equipo.

## Levantar el frontend

Con el backend corriendo en `http://127.0.0.1:8000`, en otra terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Abre `http://localhost:5173`. La variable `VITE_API_URL` de `frontend/.env` indica dónde
está la API (por defecto `http://127.0.0.1:8000/api/v1`).

El backend solo acepta peticiones del navegador desde los orígenes de
`DJANGO_CORS_ALLOWED_ORIGINS` (por defecto `http://localhost:5173` y
`http://127.0.0.1:5173`). Si cambias el puerto del frontend, agrega el origen en el `.env`
del backend separado por comas; nunca uses `*`.

Catálogo de componentes (Storybook), solo para desarrollo:

```powershell
cd frontend
npm run storybook
```

Abre `http://localhost:6006`. Desde la barra superior se cambia entre modo claro y oscuro y
se prueba el movimiento reducido.

Para probar la PWA instalable se usa el paquete de producción:

```powershell
cd frontend
npm run build
npm run preview
```

## Despliegue

El despliegue en Render (backend, frontend y la misma base de Neon) está descrito en
[`render.yaml`](render.yaml) y se explica paso a paso en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Datos de demostración

Para mostrar la app sin usar datos reales, carga cinco cuentas de ejemplo con huellas inventadas.
Las fechas se calculan desde el día en que se ejecuta, así que la demo siempre se ve actual.

```powershell
python manage.py seed_demo           # crea las que falten
python manage.py seed_demo --reset   # borra y vuelve a crear las cinco (por ejemplo, el día de la demo)
```

En local, la contraseña y el PIN de las cinco cuentas están en
`apps/accounts/management/commands/seed_demo.py` (`DEMO_PASSWORD` y `DEMO_PIN`). En un
despliegue (con `DJANGO_DEBUG=False`) el comando **exige** definir `EVOCA_DEMO_PASSWORD` y
`EVOCA_DEMO_PIN`, para no publicar cuentas con claves que están en el repositorio.

| Cuenta | Huellas | Qué mostrar |
| --- | --- | --- |
| `maria.demo@example.com` | 125, en algo más de un año | **HU2/HU3**: lista, filtros por tipo y emoción, editar y borrar. **HU4**: gráfica semanal y mensual. **HU7**: calendario de colores con meses anteriores. **HU10**: grafo grande con 40 recuerdos y 77 conexiones (viajes, familia, música, universidad, trabajo…), ninguno con más de 4. Los 33 recuerdos agregados son de hace más de un mes, así que no cambian el ánimo reciente. Ya registró hoy, así que el recordatorio no avisa (HU5 · escenario 3) |
| `mateo.demo@example.com` | 18 | **HU6**: ánimo bajo 15 de los últimos 21 días, así que al abrir aparece la orientación («Ver opciones de ayuda» o «Ahora no»). **HU5**: recordatorio «cada hora» y sin huella hoy, así que avisa al abrir. **HU10**: 4 recuerdos y 1 conexión (la etiqueta «noche») |
| `juliana.demo@example.com` | 16 | **HU5**: sin huella hoy y recordatorio diario a las 8:00, así que avisa al abrir. Buena cuenta para registrar en vivo: **HU2**, **HU8** (sugerencia de la IA) y **HU6** (pantalla de ayuda al escribir, por ejemplo, «quiero morir»). **HU10**: 4 recuerdos y 1 conexión (la etiqueta «familia») |
| `valentina.demo@example.com` | 19 | **HU6**: segunda cuenta para la orientación. Tiene ánimo 1 o 2 en **16 días distintos** de los últimos 21 (la regla cuenta días distintos: 14 huellas de un mismo día no sirven) y el mensaje sin mostrar, así que al abrir aparece «Aquí hay apoyo si lo necesitas». No tiene recordatorio, para que nada se interponga. Sirve cuando la orientación de Mateo ya se mostró o se descartó. **HU9**: dos recuerdos sugeridos por la IA sin revisar («Canciones y silencios» y «Antes de la entrevista»), para aceptar, renombrar o separar sin depender de Gemini |
| `santiago.demo@example.com` | 17 | **HU6**: tercera cuenta para la orientación, igual que la de Valentina pero con **15 días distintos** de ánimo 1 o 2 en los últimos 21 y sin recordatorio. Al abrir aparece «Aquí hay apoyo si lo necesitas». Sirve para mostrarla varias veces sin recargar con `--reset`. **HU9**: sus 17 huellas no están en ningún recuerdo, así que al abrir **Recuerdos** la IA real propone recuerdos (con `EVOCA_AI_API_KEY`) |

Valentina y Santiago no tienen recuerdos aceptados: sirven para mostrar el mapa vacío de **HU10** y, al aceptar una sugerencia, cómo aparece la primera esfera.

Con cualquiera de las cinco se puede mostrar **HU1**: entrar, el bloqueo con PIN al volver a la
app, y en Ajustes la autorización de datos sensibles, exportar los datos y eliminar la cuenta.
Después de una demo, `--reset` las deja como al principio (por ejemplo, si se tocó «Ahora no»
en la orientación de Mateo, que la pausa 7 días).

## API del Sprint 1

| Método | Ruta | Función |
| --- | --- | --- |
| POST | `/api/v1/auth/register/` | Crea una cuenta adulta y registra tres consentimientos |
| POST | `/api/v1/auth/login/` | Devuelve un token |
| POST | `/api/v1/auth/logout/` | Revoca el token actual |
| GET | `/api/v1/auth/me/` | Devuelve el perfil autenticado (incluye `has_pin`) |
| GET/PUT | `/api/v1/auth/pin/` | Estado del PIN o crearlo / cambiarlo (cambiarlo pide `password`) |
| POST | `/api/v1/auth/pin/verify/` | Verifica el PIN; tras 5 fallos responde 423 durante 5 minutos |
| GET | `/api/v1/auth/consents/` | Autorizaciones dadas, con versión y fecha |
| GET | `/api/v1/auth/export/` | Descarga un archivo JSON con todos los datos propios |
| DELETE | `/api/v1/auth/account/` | Elimina la cuenta y todos sus datos (pide `password`) |
| GET/PUT | `/api/v1/auth/reminder/` | Recordatorio: activo, `frequency` (`daily` a la hora `HH:MM` elegida u `hourly` de 8:00 a 21:00, hora de Bogotá) |
| GET | `/api/v1/auth/reminder/status/` | Si toca avisar ahora (hora alcanzada, sin aviso pendiente y sin huella hoy) |
| POST | `/api/v1/auth/reminder/ack/` | Marca el aviso para no repetirlo hoy (o, cada hora, en esta hora) |
| GET | `/api/v1/support/content/` | Textos, líneas de ayuda y palabras de riesgo vigentes (la versión aprobada más reciente) |
| GET | `/api/v1/support/orientation/` | Si toca mostrar la orientación (ánimo de 2 o menos en 14 de los últimos 21 días; el ánimo combina emoción e intensidad, ver «Ánimo de una huella») |
| POST | `/api/v1/support/events/` | Registra qué hizo la persona con la orientación (solo el tipo de evento) |
| POST | `/api/v1/traces/suggest/` | Propone emoción e intensidad desde la nota (10 palabras o más) con IA; no guarda nada |
| POST | `/api/v1/traces/search/` | HU12: huellas parecidas por significado a `query` (3 a 200 caracteres, en el cuerpo), de la más a la menos parecida, con `similarity` y `level` (`high`, `medium`, `low`). `mode`: `meaning` (IA) o `words` (respaldo por palabras); `pending`: huellas que la IA aún no ha preparado; `risk`: la frase tiene palabras de riesgo y no se buscó. 30 búsquedas por minuto |
| GET/POST | `/api/v1/traces/` | Lista (la más reciente primero; filtros `?sensory_type=`, `?emotion=` y `?date=AAAA-MM-DD`) o crea huellas del usuario |
| POST | `/api/v1/traces/with-voice/` | HU16: crea una huella con su nota de voz (formulario: `data` con los campos en JSON, la nota escrita opcional; `audio` WebM/Ogg/MP4 de hasta 60 s y 1,5 MB; `duration` en segundos) |
| GET | `/api/v1/traces/{id}/voice/` | HU16: el audio de la nota de voz de una huella propia (404 si es de otra persona o no tiene). Cada huella trae `voice_duration` |
| GET | `/api/v1/traces/catalog/` | Tipos sensoriales y emociones válidos, con su etiqueta |
| GET | `/api/v1/traces/stats/?period=month|all` | HU13: huellas por tipo con su ánimo promedio, y los 5 elementos más frecuentes (`top_elements`) de los últimos 30 días o en total. Con menos de 10 huellas, `ready: false` y `missing` (cuántas faltan). No llama a la IA; `pending`: huellas cuyo elemento aún no se reconoce |
| POST | `/api/v1/traces/stats/elements/` | HU13: la IA reconoce el elemento de las huellas que aún no lo tienen (80 por vez). `status`: `ok` o `unavailable`; `pending`: cuántas faltan. 10 pedidos por minuto |
| GET | `/api/v1/traces/mood/?period=week|month` | Gráfica de ánimo: un punto por huella de los últimos 7 o 30 días con su `mood` (ánimo) e `intensity`, y el promedio del ánimo |
| GET | `/api/v1/traces/calendar/?month=AAAA-MM` | Calendario: por día, la emoción dominante, la intensidad promedio y cuántas huellas hay |
| GET/PATCH/DELETE | `/api/v1/traces/{id}/` | Consulta, modifica o elimina una huella propia |
| GET | `/api/v1/memories/` | Mapa de recuerdos como grafo (HU10): `nodes` (recuerdos aceptados con emoción dominante, número de huellas y `match`) y `edges` (`source`, `target`, `score` de 0 a 1 y `reason`). Filtros `?sensory_type=` y `?emotion=`: los nodos que no coinciden llegan con `match: false` y las aristas se calculan solo entre los que coinciden |
| GET | `/api/v1/memories/{id}/` | Un recuerdo propio con sus huellas, de la más reciente a la más antigua |
| GET | `/api/v1/memories/suggestions/` | HU9: recuerdos sugeridos por la IA sin revisar, cuántas huellas hay y si vale la pena pedir más (`can_suggest`) |
| POST | `/api/v1/memories/suggest/` | HU9: la IA agrupa las huellas que no están en ningún recuerdo y crea sugerencias (máximo 5 por llamada; 5 llamadas por minuto). Responde `reason`: `ok`, `too_few_traces`, `all_grouped`, `unavailable` o `none` |
| POST | `/api/v1/memories/{id}/accept/` | Acepta la sugerencia (opcional `name`): pasa al mapa |
| PATCH | `/api/v1/memories/{id}/` | Renombra un recuerdo sugerido o aceptado (`name`) |
| DELETE | `/api/v1/memories/{id}/traces/{trace_id}/` | Separa una huella de la sugerencia (la última no: se descarta) |
| POST | `/api/v1/memories/{id}/discard/` | Descarta la sugerencia; sus huellas quedan libres para otra |
| POST | `/api/v1/memories/{id}/central/` | HU11: marca (`{"central": true}`) o desmarca (`false`) un recuerdo del mapa como central. Máximo 5: el sexto responde 400 con `code: central_limit`. El mapa trae `central`, `central_at`, `central_count` y `max_central` |
| GET/POST | `/api/v1/diary/notebooks/` | HU17: mis cuadernos (con `page_count`) o un cuaderno nuevo (`title`, `cover`, `paper`). PATCH y DELETE en `/api/v1/diary/notebooks/{id}/` |
| GET/POST | `/api/v1/diary/notebooks/{id}/pages/` | HU17: las páginas del cuaderno o una página nueva (de hoy si no se indica `day`) |
| GET/PATCH/DELETE | `/api/v1/diary/pages/{id}/` | HU17: una página: `content` (documento del editor), `text`, `paper`, `font`, `ink`, `day` y `day_emotion` (emoción dominante de las huellas de ese día) |
| POST | `/api/v1/diary/pages/{id}/evoke/` | HU18: la IA lee la página y propone huellas agrupadas en recuerdos sugeridos. Responde `{status, page}` con `status` `ok`, `too_short`, `risk` o `unavailable`; la página trae `evocation` (`memories`, `highlights`). Máximo 5 por minuto |
| POST | `/api/v1/diary/pages/{id}/evocation/{n}/accept/` | HU18: acepta el recuerdo sugerido `n` (opcional `name` y `traces`, los índices de las huellas que se quedan); crea las huellas y el recuerdo. Responde `{memory_id, page}` |
| POST | `/api/v1/diary/pages/{id}/evocation/{n}/discard/` | HU18: descarta la sugerencia `n` (no guarda nada; cuenta para la tasa de aceptación) |
| GET/POST | `/api/v1/diary/letters/` | HU19: mis cartas a mi yo del futuro (`opens_on`, `ready`, `opened_at`; sin `content` mientras sigan selladas) o una carta nueva (`content`, `opens_on` desde mañana y hasta 10 años, `font`, `ink`). No se editan ni se borran |
| GET | `/api/v1/diary/letters/{id}/` | HU19: una carta; trae `content` solo si ya se abrió |
| POST | `/api/v1/diary/letters/{id}/open/` | HU19: abre el sobre si ya llegó su fecha y devuelve la carta; antes responde 403 sin contenido |
| GET | `/api/v1/weekly-summary/` | HU14: resumen de la semana pasada (lunes a domingo). `status`: `disabled`, `too_few` (menos de 5 huellas; `missing`), `pending` (aún no se prepara), `unavailable` o `ready` con `patterns` (`text`, `trace_count` y `traces` con fecha, tipo, emoción, intensidad, ánimo y nota). No llama a la IA |
| POST | `/api/v1/weekly-summary/generate/` | HU14: prepara el resumen con la IA si hace falta (una sola vez por semana; 5 pedidos por minuto) y responde lo mismo que el GET |
| GET/PUT | `/api/v1/weekly-summary/settings/` | HU14: si la persona recibe el resumen semanal (`enabled`, activo por defecto) |
| GET | `/api/v1/islands/` | HU15: mis islas. `status`: `too_few` (menos de 15 recuerdos; `missing`), `pending` (aún no se calculan), `unavailable` o `ready`, con `islands` visibles (nombre, `ai_name`, `renamed`, `explanation`, `weight` en %, `trace_count` y `memories`) y `hidden`. `outdated`: los recuerdos cambiaron desde el último cálculo. No llama a la IA |
| POST | `/api/v1/islands/calculate/` | HU15: la IA calcula o vuelve a calcular las islas (5 por minuto). Los nombres cambiados y las islas ocultas se conservan |
| PATCH | `/api/v1/islands/{id}/` | HU15: renombrar (`name`; vacío vuelve al de la IA) u ocultar / mostrar (`hidden`) una isla |
| DELETE | `/api/v1/memories/{id}/` | HU11: borra un recuerdo del mapa (sus huellas no se borran); si era central, libera su lugar. Una sugerencia no se borra: se descarta |

### Búsqueda por significado (HU12)

En **Mis huellas**, «Buscar por significado» encuentra huellas parecidas a una frase aunque no
usen las mismas palabras («olor a lluvia» trae «olor a tierra mojada»). Cada huella se convierte
una vez en un vector de significado con Gemini (`EVOCA_AI_EMBEDDING_MODEL`, por defecto
`gemini-embedding-2`, 768 dimensiones) y se guarda en `TraceEmbedding`; solo se recalcula si
cambian su nota, tipo, emoción o etiquetas. Al buscar, la frase se convierte en otro vector y se
compara con los de la persona (`apps/traces/search.py`).

- Una huella es resultado si su similitud llega a `EVOCA_SEARCH_MIN_SIMILARITY` (0,6) y está a
  menos de `EVOCA_SEARCH_SPREAD` (0,1) de la mejor; como mucho 10. Se calibró con datos reales:
  frases con sentido dan 0,67 o más y frases ajenas («astronautas en Marte») 0,55 o menos.
- El plan gratuito de Gemini permite **100 vectores por minuto**: cada búsqueda prepara como
  mucho `EVOCA_SEARCH_EMBED_PER_REQUEST` (40) huellas nuevas y la app avisa cuántas faltan.
  Para dejar una cuenta lista de una vez: `python manage.py embed_traces [--email ...]` (va por
  lotes y espera entre uno y otro).
- Sin clave, con error o con el límite agotado, la búsqueda sigue **por palabras** (sin tildes ni
  mayúsculas) y la app lo dice. La frase va en el cuerpo de la petición (no en la URL) y no se
  guarda ni se registra.
- **Palabras de riesgo (HU6):** si la frase tiene una («suicidio», «matarse», «quiero morir»…),
  se abre de inmediato la pantalla de ayuda, como al escribir una nota, y la búsqueda no se hace:
  ni la app ni el servidor la envían a la IA (`apps/support/risk.py`, misma regla en los dos).

### Estadísticas de mis sensaciones (HU13)

En **Ánimo**, la sección «Mis sensaciones» muestra cuántas huellas registra la persona de cada
tipo (gráfica de barras con Recharts) y los 5 elementos que más registra, con su ánimo promedio,
en los últimos 30 días o en total (`apps/traces/stats.py`). Al tocar un tipo se ve su ánimo
promedio comparado con el general, como observación y no como diagnóstico, y sus elementos.

- **Elementos:** la huella no guarda el elemento concreto (qué aroma, qué canción, qué lugar), así
  que la IA lo saca de la nota una vez («El olor del café recién molido…» → «café») y se guarda en
  `TraceElement`; se vuelve a pedir solo si cambian el tipo, la nota, el modelo o las
  instrucciones. La IA recibe solo el tipo y la nota (40 notas por llamada). Si la nota no nombra
  un elemento claro, queda vacío y no cuenta en los elementos.
- **Sin esperar a la IA:** abrir las estadísticas no llama a la IA. Si hay huellas sin elemento,
  la app pide `POST traces/stats/elements/` (como mucho `EVOCA_STATS_EXTRACT_PER_REQUEST`, 80, por
  vez) y muestra «Estamos reconociendo los elementos…». Si la IA falla, los tipos y el ánimo
  siguen completos y la app lo dice. Para dejar una cuenta lista de una vez:
  `python manage.py extract_elements [--email ...]`.
- **Ánimo:** el de HU4 y HU6 (emoción + intensidad, ver «Ánimo de una huella»).
- **Menos de 10 huellas:** no hay estadísticas; la app dice cuántas faltan.
- **Palabras de riesgo (HU6):** una nota que las tiene no se envía a la IA; cuenta en su tipo y en
  el ánimo, pero no tiene elemento.

### Ánimo de una huella (HU4, HU6)

La intensidad dice qué tan fuerte fue una emoción, no qué tan bien estaba la persona. Por eso el
ánimo de una huella (1 a 5) combina las dos cosas (`apps/traces/mood.py`):

| Emoción | Ánimo |
| --- | --- |
| Alegría, calma, gratitud | Igual a la intensidad (5 = muy bien, 1 = mal) |
| Tristeza, ansiedad, enojo, miedo | 6 − intensidad (5 = muy mal, 1 = bien) |
| Nostalgia | Neutro (3), sea cual sea la intensidad |

Lo usan la orientación de HU6 (un día es bajo si el promedio del ánimo de sus huellas es 2 o
menos) y la gráfica de HU4. El calendario de HU7 sigue mostrando la intensidad promedio, que sí
es intensidad.

### Mi Cuadernillo (HU17)

La pestaña **Cuadernillo** es un diario: una estantería de cuadernos (portada de tela con su
color, título y cinta marcador) y, dentro, páginas de papel crema rayado, cuadriculado, de puntos
o liso. Se escribe directo sobre la hoja con letra manuscrita (Caveat, Patrick Hand, Kalam o
Indie Flower, guardadas en la app) y el color de tinta elegido; al seleccionar texto aparece una
barra discreta para resaltar, subrayar o cambiar la tinta (editor TipTap). Lo escrito se guarda
solo. La cinta de cada página toma el color de la emoción dominante de las huellas de ese día,
con su nombre en texto (o un marcador neutro si ese día no hay huellas). Si aparece una palabra
de riesgo, se abre de inmediato la ayuda de HU6. En modo oscuro el papel es «nocturno» (azul
grisáceo) y la tinta, clara.

- **Cifrado:** las páginas se guardan cifradas con Fernet (`apps/diary/crypto.py`) además del
  cifrado en disco de Neon. La clave es `EVOCA_DIARY_KEY` (obligatoria en producción; en
  desarrollo se deriva de `DJANGO_SECRET_KEY`). Sin clave, el Cuadernillo responde 503 sin datos.
- El Cuadernillo entra en la exportación de datos y se borra con la cuenta (Ley 1581).
- En la demo, María tiene «Mi diario» con 3 páginas recientes y «Viajes» vacío.

### Evocar recuerdos desde el Cuadernillo (HU18)

En una página, **Evocar** envía solo el texto de la página a Gemini (desde el backend), que
propone huellas (tipo, emoción, intensidad y la frase exacta de donde salió) agrupadas en
recuerdos sugeridos con nombre y explicación. Las frases se iluminan en la hoja con el color de
su emoción y unas luces viajan hasta «Recuerdos». Cada sugerencia (borde punteado) se acepta,
se renombra, se le quitan huellas o se descarta: solo lo aceptado se guarda como huellas y
recuerdo del mapa. Las palabras de un recuerdo aceptado llevan a él, y el panel del recuerdo
tiene «Abrir la página donde nació».

- La respuesta de la IA se valida (tipos y emociones del catálogo, intensidad 1–5, frase que
  exista en el texto) y se descartan términos clínicos. La sugerencia se guarda cifrada.
- Páginas con menos de 8 palabras o con palabras de riesgo no se envían; si la IA falla, el
  Cuadernillo sigue igual y lo dice. En los registros no queda texto de la persona.
- Descartar crea un recuerdo descartado solo para la tasa de aceptación (`suggestion_stats`).

### Cartas a mi yo del futuro (HU19)

En el **Cuadernillo**, «Escribir una carta» abre una hoja con letra manuscrita y tinta a
elegir, y la fecha en que se abre (desde mañana y hasta 10 años). Al sellarla, la solapa del
sobre se cierra y cae un sello de cera; desde ahí no se puede leer ni cambiar. El Cuadernillo
muestra cuántas cartas hay y cuándo se abre cada una, sin su contenido. Cuando llega la
fecha, Inicio muestra un aviso amable («Llegó una carta de tu yo del pasado») y la carta se
abre con su sobre.

- **El servidor nunca entrega el contenido antes de la fecha** (ni en la lista, ni en el
  detalle, ni al intentar abrirla: 403). La fecha es la local del servidor (`TIME_ZONE`).
- Las cartas se guardan cifradas como las páginas (`EVOCA_DIARY_KEY`), entran **completas**
  en la exportación de datos, también las selladas (decisión del equipo, Ley 1581), y se borran
  con la cuenta. Las palabras de riesgo abren la ayuda mientras se escribe.
- Como el recordatorio de HU5, el aviso aparece al abrir la app, no con la app cerrada.
- En la demo, a María le llega hoy una carta escrita hace tres meses y tiene otra sellada.

### Nota de voz (HU16)

En **Nueva huella**, «Grabar nota de voz» graba hasta 60 segundos con MediaRecorder (se detiene
sola) y deja escucharla antes de guardar; con una nota de voz, la nota escrita es opcional. Si
no hay permiso para el micrófono, la app explica para qué lo necesita y ofrece escribir la nota.
El audio se guarda en la misma base (tabla `VoiceNote`, migración `traces/0009_voice_note`),
porque Render no tiene disco persistente: se graba en Opus a 64 kbps (60 s ocupan ~480 KB). Se
pide el micrófono sin supresión de ruido ni cancelación de eco (cortaban la voz baja), con
control de volumen. El servidor revisa la
firma del archivo (WebM, Ogg o MP4/AAC de iPhone), la duración y el tamaño
(`EVOCA_VOICE_MAX_BYTES`, 1,5 MB), y solo lo entrega a su dueño. En el detalle de la huella hay
un reproductor; en las listas, «Nota de voz · 0:42». La voz no se transcribe: la búsqueda por
significado, las estadísticas y las palabras de riesgo solo ven la nota escrita.

### Mis islas y significado en el mapa (HU15)

- **Significado en el mapa:** la afinidad de HU10 suma una cuarta parte, *significado parecido*,
  con los vectores de HU12 ya guardados (el promedio de los de las huellas de cada recuerdo).
  Pesos: sensaciones 0,4 · emoción 0,25 · etiquetas 0,1 · significado 0,25. La similitud se
  escala entre `EVOCA_MAP_MEANING_LOW` (0,78) y `EVOCA_MAP_MEANING_HIGH` (0,90), calibrado con
  los recuerdos de María; desde la mitad el motivo dice «hablan de cosas parecidas». Abrir el
  mapa no llama a la IA (María: 174 ms con 40 recuerdos). Si a un recuerdo le faltan vectores,
  esa parte no cuenta.
- **Mis islas** (pestaña en **Recuerdos**, `apps/traces/islands.py`): con 15 recuerdos o más, la
  IA los agrupa en 2 a 6 grandes temas con nombre y explicación. El peso de cada isla es la parte
  de huellas que reúnen sus recuerdos entre las islas visibles (suman 100 %). La IA recibe el
  nombre, la emoción, las sensaciones, las etiquetas, las huellas, la explicación y los recuerdos
  afines de cada uno, nunca las notas. Se calculan la primera vez que se abre la pestaña y
  quedan guardadas; si los recuerdos cambian, la vista lo avisa y ofrece «Volver a calcular».
  Al recalcular, cada isla nueva se empareja con la anterior que comparte al menos la mitad de
  sus recuerdos: así se conservan los nombres cambiados y las islas ocultas.

### Patrones de mi semana (HU14)

Desde el lunes, **Inicio** muestra «Tu semana»: de 1 a 3 patrones entre las huellas y el ánimo
de la semana anterior (lunes a domingo), si tuvo al menos 5 huellas (`apps/traces/weekly.py`).
La IA (Gemini, solo desde el servidor) lo prepara una sola vez por semana y queda guardado en
`WeeklySummary`; abrir Inicio no llama a la IA si ya está. Cada patrón está escrito como
observación (sin diagnósticos ni consejos) y dice con qué huellas se calculó: se pueden ver y
abrir. La IA recibe día y hora, tipo, emoción, intensidad, ánimo (HU4/HU6), etiquetas y nota;
las notas con palabras de riesgo (HU6) no se envían. Con menos de 5 huellas dice cuántas
faltaron. Se desactiva en **Ajustes → Resumen semanal** y deja de aparecer.

### Recuerdos centrales (HU11)

Los recuerdos que más definen a la persona. Desde el panel de un recuerdo del mapa se marca o
desmarca como central (como mucho `Memory.MAX_CENTRAL`, 5; el servidor lo controla aunque
lleguen dos pedidos a la vez). Los centrales se destacan con una estrella y un anillo dorado,
siempre muestran su nombre en el mapa y aparecen en «Mis recuerdos centrales», encima del mapa,
del primero que se marcó al último. Borrar un recuerdo («Borrar recuerdo», con confirmación) no
borra sus huellas y, si era central, libera su lugar. Un recuerdo que se quedó sin huellas no
ocupa lugar. En la demo, María tiene 3 centrales.

### Recuerdos sugeridos con IA (HU9)

Con 5 huellas o más, al abrir **Recuerdos** la app le pide a Gemini (solo desde el backend,
`apps/traces/memory_ai.py`) que agrupe las huellas que aún no están en ningún recuerdo: hasta
las 60 más recientes, con tipo, emoción, intensidad, fecha, etiquetas y nota. La IA propone de
1 a 5 recuerdos de 2 a 6 huellas, cada uno con nombre y una explicación de por qué van juntas.
Se validan (números existentes, sin repetir huellas, con nombre y explicación) y se guardan
como `suggested`. La persona los **acepta** (pasan al mapa), los **renombra**, **separa**
huellas o los **descarta**; nada entra al mapa sin aceptarlo. La app pide sugerencias sola una
vez por sesión y después con el botón «Buscar sugerencias». `EVOCA_AI_MEMORY_TIMEOUT` (15 s)
es la espera máxima. `python manage.py suggestion_stats` imprime la tasa de aceptación
(escenario 3), sin datos personales.

### Afinidad del mapa de recuerdos (HU10)

Las conexiones del mapa se calculan en el servidor con reglas fijas, sin IA
(`apps/traces/memory_map.py`). La afinidad de dos recuerdos va de 0 a 1:

| Parte | Peso | Cómo se mide |
| --- | --- | --- |
| Sensaciones compartidas | 0,5 | Coincidencia entre sus tipos sensoriales (compartidos / distintos) |
| Emoción dominante | 0,3 | La misma vale completo; otra del mismo tono (luminoso, melancólico o tenso), la mitad |
| Etiquetas de sus huellas | 0,2 | Coincidencia entre sus etiquetas. Si ninguno tiene, no cuenta y el puntaje se calcula sobre las otras dos |

Se descartan los pares bajo `EVOCA_MAP_MIN_AFFINITY` (0,4) y las aristas se agregan de mayor a
menor afinidad, sin pasar de `EVOCA_MAP_MAX_LINKS` (4) conexiones por recuerdo. Un recuerdo sin
afinidad suficiente queda solo. Las dos variables se cambian en el entorno, sin tocar código.

Para rutas privadas, envía:

```text
Authorization: Token <token>
```

Ejemplo de una huella:

```json
{
  "sensory_type": "aroma",
  "note": "Café recién hecho",
  "emotion": "calma",
  "mood_intensity": 4,
  "tags": ["casa", "mañana"]
}
```

Los valores de `sensory_type` son `aroma`, `color`, `song`, `flavor`, `texture` y `place`; los de
`emotion`, `alegria`, `calma`, `gratitud`, `nostalgia`, `tristeza`, `ansiedad`, `enojo` y `miedo`.
`mood_intensity` va de 1 a 5.

## Verificación antes de subir cambios

Las pruebas usan SQLite en memoria aunque exista un `.env`, por lo que nunca escriben en
Neon:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test --settings=config.settings_test
```

Y en el frontend:

```powershell
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
npm run build-storybook
```

Pruebas en el navegador (Playwright) sobre la versión compilada, con la API simulada. La
primera vez descarga el navegador con `npx playwright install chromium`, o usa el Chrome
instalado con `$env:PLAYWRIGHT_CHANNEL = "chrome"`:

```powershell
npm run test:e2e
```

La prueba de rendimiento del mapa (HU10) simula un teléfono de gama media con la CPU 4 veces más
lenta y compara la mediana de tres aperturas con los 3 s del criterio. Si el equipo está ocupado
(por ejemplo, sincronizando OneDrive o con el servidor de Vite abierto), `$env:E2E_CPU_RATE = "1"`
quita esa simulación.

## Migraciones automáticas al integrar en `dev`

El workflow `.github/workflows/ci.yml` ejecuta las pruebas del backend (Python 3.10 y 3.14) y
el job del frontend (lint, tipos, pruebas, build y Storybook) en cada push y pull request. Cuando
el commit llega a `dev` y todas las pruebas pasan, también aplica las migraciones pendientes a
la rama `development` de Neon.

Configuración única en GitHub:

1. Abre **Settings > Secrets and variables > Actions** en el repositorio.
2. Selecciona **New repository secret**.
3. Usa el nombre `NEON_DEVELOPMENT_DATABASE_URL_UNPOOLED`.
4. Como valor, pega la cadena directa de la rama `development` de Neon, con
   **Connection pooling desactivado**.

No agregues comillas ni guardes esta URL en el workflow. Después de configurar el secreto, un
merge en `dev` seguirá el flujo `pruebas -> migración`. Si no hay migraciones pendientes,
Django termina correctamente sin modificar el esquema.

Las ramas de funcionalidad no migran la base compartida: solo ejecutan pruebas aisladas. Para
producción se debe crear otro entorno y otro secreto; nunca se debe reutilizar la credencial de
`development`.

Consulta [docs/SPRINT1.md](docs/SPRINT1.md) para el alcance, los criterios de aceptación y la
evidencia por historia, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para las decisiones
técnicas, [frontend/README.md](frontend/README.md) para la estructura del cliente y
[CREDITS.md](CREDITS.md) para las piezas externas usadas.


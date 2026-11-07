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
| `maria.demo@example.com` | 30, en 3 meses | **HU2/HU3**: lista, filtros por tipo y emoción, editar y borrar. **HU4**: gráfica semanal y mensual. **HU7**: calendario de colores con meses anteriores. Ya registró hoy, así que el recordatorio no avisa (HU5 · escenario 3) |
| `mateo.demo@example.com` | 18 | **HU6**: ánimo bajo 15 de los últimos 21 días, así que al abrir aparece la orientación («Ver opciones de ayuda» o «Ahora no»). **HU5**: recordatorio «cada hora» y sin huella hoy, así que avisa al abrir |
| `juliana.demo@example.com` | 16 | **HU5**: sin huella hoy y recordatorio diario a las 8:00, así que avisa al abrir. Buena cuenta para registrar en vivo: **HU2**, **HU8** (sugerencia de la IA) y **HU6** (pantalla de ayuda al escribir, por ejemplo, «quiero morir») |
| `valentina.demo@example.com` | 19 | **HU6**: segunda cuenta para la orientación. Tiene ánimo 1 o 2 en **16 días distintos** de los últimos 21 (la regla cuenta días distintos: 14 huellas de un mismo día no sirven) y el mensaje sin mostrar, así que al abrir aparece «Aquí hay apoyo si lo necesitas». No tiene recordatorio, para que nada se interponga. Sirve cuando la orientación de Mateo ya se mostró o se descartó |
| `santiago.demo@example.com` | 17 | **HU6**: tercera cuenta para la orientación, igual que la de Valentina pero con **15 días distintos** de ánimo 1 o 2 en los últimos 21 y sin recordatorio. Al abrir aparece «Aquí hay apoyo si lo necesitas». Sirve para mostrarla varias veces sin recargar con `--reset` |

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
| GET | `/api/v1/support/orientation/` | Si toca mostrar la orientación (ánimo de 2 o menos en 14 de los últimos 21 días) |
| POST | `/api/v1/support/events/` | Registra qué hizo la persona con la orientación (solo el tipo de evento) |
| POST | `/api/v1/traces/suggest/` | Propone emoción e intensidad desde la nota (10 palabras o más) con IA; no guarda nada |
| GET/POST | `/api/v1/traces/` | Lista (la más reciente primero; filtros `?sensory_type=`, `?emotion=` y `?date=AAAA-MM-DD`) o crea huellas del usuario |
| GET | `/api/v1/traces/catalog/` | Tipos sensoriales y emociones válidos, con su etiqueta |
| GET | `/api/v1/traces/mood/?period=week|month` | Gráfica de ánimo: un punto por huella de los últimos 7 o 30 días y el promedio |
| GET | `/api/v1/traces/calendar/?month=AAAA-MM` | Calendario: por día, la emoción dominante, la intensidad promedio y cuántas huellas hay |
| GET/PATCH/DELETE | `/api/v1/traces/{id}/` | Consulta, modifica o elimina una huella propia |

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


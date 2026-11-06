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
| GET/POST | `/api/v1/traces/` | Lista (la más reciente primero; filtros `?sensory_type=` y `?emotion=`) o crea huellas del usuario |
| GET | `/api/v1/traces/catalog/` | Tipos sensoriales y emociones válidos, con su etiqueta |
| GET | `/api/v1/traces/mood/?period=week|month` | Gráfica de ánimo: un punto por huella de los últimos 7 o 30 días y el promedio |
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


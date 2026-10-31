# Evoca - backend base del Sprint 1

API en Django para iniciar el MVP de Evoca. Este repositorio cubre la base técnica del
primer sprint: cuentas de personas adultas, consentimientos versionados, autenticación por
token y CRUD privado de huellas sensoriales.

La app móvil Android/iOS no se construye con Django. Django es el backend; una app Flutter
u otro cliente móvil consumirá esta API en los siguientes sprints.

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

## Inicio rápido en Windows (PowerShell)

Desde la raíz del repositorio:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

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

## API del Sprint 1

| Método | Ruta | Función |
| --- | --- | --- |
| POST | `/api/v1/auth/register/` | Crea una cuenta adulta y registra tres consentimientos |
| POST | `/api/v1/auth/login/` | Devuelve un token |
| POST | `/api/v1/auth/logout/` | Revoca el token actual |
| GET | `/api/v1/auth/me/` | Devuelve el perfil autenticado |
| GET/POST | `/api/v1/traces/` | Lista o crea huellas del usuario |
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

Los valores de `sensory_type` son `aroma`, `color`, `song`, `flavor`, `texture` y `place`.

## Verificación antes de subir cambios

Las pruebas usan SQLite en memoria aunque exista un `.env`, por lo que nunca escriben en
Neon:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test --settings=config.settings_test
```

Consulta [docs/SPRINT1.md](docs/SPRINT1.md) para el alcance y los criterios de aceptación, y
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para las decisiones técnicas.


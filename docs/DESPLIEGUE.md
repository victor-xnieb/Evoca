# Despliegue en Render

Evoca se publica en [Render](https://render.com) con dos servicios que salen de la rama `dev`
y se describen en [`render.yaml`](../render.yaml):

| Servicio | Qué es | Dirección esperada |
| --- | --- | --- |
| `evoca-naranja-api` | Backend Django con gunicorn | `https://evoca-naranja-api.onrender.com` |
| `evoca-naranja-web` | Frontend (PWA) como sitio estático | `https://evoca-naranja-web.onrender.com` |

La base de datos es **la misma de Neon** que ya usa el equipo (rama `development`). No se crea
nada nuevo en Neon ni en Render.

## Cómo funciona

- **Migraciones:** Render **no** migra. Las aplica el CI de GitHub sobre Neon al integrar en
  `dev` (job «Migrar Neon development»). Por eso conviene esperar a que ese job termine en
  verde antes de desplegar un cambio con migraciones nuevas.
- **Datos de demostración:** se cargan con `EVOCA_SEED_DEMO` (ver el paso 5).
- **Archivos estáticos del administrador:** los sirve WhiteNoise; no hace falta otro servidor.
- **Dependencias nuevas** (versiones fijas en `requirements.txt`): `gunicorn` (servidor de
  producción; Django no debe usarse con `runserver` en un sitio público) y `whitenoise` (sirve
  los estáticos del administrador).

## Antes de empezar

1. **El CI de `dev` pasó.** En GitHub → pestaña *Actions*, la última ejecución sobre `dev` debe
   estar en verde, incluido «Migrar Neon development». Así Neon tiene las tablas de HU5, HU6
   y HU8.
2. **La cadena de Neon con `-pooler`.** En Neon, proyecto `evoca_db`, rama `development` →
   *Connect* → *Connection pooling* **activado**. Es la que va en `DATABASE_URL`. Pégala solo en
   Render; no la compartas por chat ni la subas a Git.
3. **La clave de Gemini** (`EVOCA_AI_API_KEY`), la misma de tu `.env`.
4. **Una contraseña y un PIN de 4 dígitos para las cuentas demo.** No uses los del código:
   están en el repositorio. Elige otros.

## Pasos

### 1. Crear los servicios desde el Blueprint

1. En Render: **New → Blueprint** y conecta el repositorio de Evoca.
2. Elige la rama **`dev`**. Render lee `render.yaml` y propone los dos servicios.
3. Te pide los valores marcados como secretos. Complétalos así:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | La cadena de Neon **con `-pooler`** |
| `EVOCA_AI_API_KEY` | La clave de Gemini |
| `EVOCA_DEMO_PASSWORD` | La contraseña que elegiste para las cuentas demo |
| `EVOCA_DEMO_PIN` | El PIN de 4 dígitos |

4. Pulsa **Apply**. Render construye los dos servicios; la primera vez tarda unos minutos.

### 2. Confirmar las direcciones

Render asigna a cada servicio una dirección `https://<nombre>.onrender.com`. Si el nombre está
libre, es exactamente la de la tabla de arriba y no hay que cambiar nada.

Si Render agregó un sufijo (por ejemplo `evoca-naranja-api-x1y2.onrender.com`), corrige y vuelve
a desplegar:

- En **`evoca-naranja-api`** → *Environment*: `DJANGO_CORS_ALLOWED_ORIGINS` = la dirección real
  del frontend (sin barra final).
- En **`evoca-naranja-web`** → *Environment*: `VITE_API_URL` = la dirección real de la API
  terminada en `/api/v1`. Como el valor se incrusta al compilar, después hay que usar
  **Manual Deploy → Clear build cache & deploy**.

### 3. Comprobar la API

Abre `https://evoca-naranja-api.onrender.com/api/v1/`. Debe mostrar un JSON con
`"service": "evoca-api"`. Si te sale un error:

| Síntoma | Causa probable |
| --- | --- |
| `Bad Request (400)` | El dominio no está autorizado. Render lo agrega solo (`RENDER_EXTERNAL_HOSTNAME`); revisa que el servicio sea el correcto |
| 502 o «Application failed to respond» | Mira los *Logs* del servicio. Lo más común: `DATABASE_URL` mal copiada |
| La página tarda ~1 minuto | El plan gratuito duerme tras 15 minutos sin uso; la primera visita lo despierta |

### 4. Abrir la app

Entra a `https://evoca-naranja-web.onrender.com`. Si al iniciar sesión ves el mensaje «No
pudimos conectar con Evoca», casi siempre es `DJANGO_CORS_ALLOWED_ORIGINS` (debe ser la
dirección exacta del frontend) o `VITE_API_URL` (ver el paso 2).

### 5. Cargar las cuentas de demostración

El plan gratuito no tiene terminal, así que se hace con una variable:

1. En **`evoca-naranja-api`** → *Environment*: cambia `EVOCA_SEED_DEMO` a **`true`** y guarda
   (Render reinicia el servicio).
2. En los *Logs* verás `maria.demo@example.com: 125 huellas, 40 recuerdos`, y lo mismo para Mateo, Juliana, Valentina y Santiago.
3. Entra con `maria.demo@example.com`, `mateo.demo@example.com`, `juliana.demo@example.com` o
   `valentina.demo@example.com` o `santiago.demo@example.com`, con
   la contraseña y el PIN que pusiste. La guía de qué mostrar con cada cuenta está en el
   [README](../README.md#datos-de-demostración).

Con `true`, solo se crean las cuentas que falten. Para dejarlas **como nuevas** antes de una
presentación (por ejemplo, tras tocar «Ahora no» en la orientación de Mateo), cambia la
variable a **`reset`**, espera el reinicio y vuelve a ponerla en `true`: con `reset` se
recrean en cada arranque.

Si cambias `EVOCA_DEMO_PASSWORD` o `EVOCA_DEMO_PIN` después, las cuentas ya creadas conservan los
valores anteriores: usa `reset` una vez para que tomen los nuevos.

### Cuando se agrega o cambia una cuenta demo en el código

Después de mezclar el cambio en `dev`, Render redespliega solo, pero **las cuentas nuevas no
aparecen hasta que se cargan** (el despliegue no toca los datos):

1. Espera a que `evoca-naranja-api` vuelva a estar **Live** con el commit nuevo.
2. En **Environment**, revisa `EVOCA_SEED_DEMO`: como está definida en `render.yaml`, Render puede
   haberla devuelto a `false` al sincronizar. Ponla en **`true`** y guarda (el servicio se reinicia).
   `true` solo crea las cuentas que falten: las demás no se tocan.
3. En los *Logs*, mira las líneas `· <cuenta>: N huellas` de las cuentas nuevas. Las que ya
   existían dicen `ya existe`.
4. Si el cambio agrega datos a cuentas que **ya existen** (por ejemplo, los recuerdos de HU10
   para María, Mateo y Juliana), usa `reset` una vez: `true` no toca las cuentas existentes.
5. Si además quieres que todas las cuentas vuelvan a su estado inicial (por ejemplo, la
   orientación de Mateo ya se mostró), usa `reset` en lugar de `true`.

Las cuentas nuevas toman la contraseña y el PIN que ya tienes en `EVOCA_DEMO_PASSWORD` y
`EVOCA_DEMO_PIN`.

## Cosas a tener en cuenta

- **Plan gratuito:** el backend duerme tras 15 minutos sin uso y la primera visita tarda en
  responder. Antes de una presentación, abre la app unos minutos antes. La base de Neon también
  se suspende y se reactiva sola.
- **Notificaciones y PWA:** funcionan porque Render sirve todo por HTTPS. El aviso del
  recordatorio sigue llegando solo con la app abierta o en segundo plano (HU5, parcial).
- **IA (HU8 y HU9):** sin `EVOCA_AI_API_KEY` la app funciona igual, sin sugerencia de emoción ni
  recuerdos sugeridos (Valentina conserva sus dos sugerencias de la demo). Con la clave, las
  notas viajan a Google: en el plan gratuito de Gemini pueden usarse para mejorar sus productos.
  Úsalo solo con datos de ejemplo.
- **Datos compartidos:** como la base es la rama `development` de Neon, las cuentas que se creen
  en Render aparecen también para el equipo. Las cuentas demo no afectan a otras: `reset` solo
  borra y recrea las cinco.
- **Seguridad:** `DEBUG` está apagado y `DJANGO_SECRET_KEY` la genera Render. HSTS y la
  redirección SSL de Django no se activan: Render ya redirige HTTP a HTTPS en su borde.
- **Versión de Python:** `PYTHON_VERSION` en `render.yaml` es 3.13.5. Si Render no la ofrece, usa
  otra 3.12 a 3.14 (el proyecto acepta de 3.10 a 3.14).

## Despliegues siguientes

Con `autoDeployTrigger: commit`, cada `push` a `dev` redespliega los dos servicios. Para
desplegar a mano, o cuando cambies `VITE_API_URL`, usa *Manual Deploy* en cada servicio.

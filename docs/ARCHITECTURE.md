# Arquitectura

## Componentes

```text
PWA (React + TypeScript, Vite) — navegador del celular o escritorio, instalable
          |
          | HTTPS + Authorization: Token <token>  (CORS con orígenes explícitos)
          v
Django REST Framework
  - accounts: identidad y consentimientos
  - traces: huellas y estructura de recuerdos
  - core: salud operativa
          |
          | psycopg 3
          v
Neon PostgreSQL, rama development
```

## Decisiones

### Stack acordado por el equipo

| Capa | Tecnología | Motivo |
| --- | --- | --- |
| Backend | Django + DRF, PostgreSQL en Neon | Ya existía; reglas, autenticación y datos sensibles viven en el servidor |
| Cliente | React + TypeScript con Vite, en `frontend/` | Una sola base de código para escritorio y celular |
| Móvil | PWA instalable (manifest + service worker con `vite-plugin-pwa`) | Cubre Android e iOS sin app nativa ni tiendas |
| Interfaz | Tailwind CSS v4 + shadcn/ui (Radix) + catálogo propio en `components/evoca/` | Accesibilidad de Radix y una identidad visual propia |
| Animación | Motion (y Lottie para 2 ilustraciones) | Animaciones con intención que respetan movimiento reducido |
| Gráficas | Recharts | Gráfica de ánimo (HU4), cargada bajo demanda |
| Pruebas | `manage.py test` (backend), Vitest + Testing Library (frontend) | Cada escenario Gherkin tiene una prueba automatizada |
| Documentación de UI | Storybook (solo desarrollo) | Catálogo de componentes con sus estados |
| IA (HU8) | IA generativa llamada solo desde el backend | El prompt y la clave nunca llegan al cliente |

### Django es el backend; el móvil es la PWA

El caso de negocio requiere Android e iOS. Django administra reglas, autenticación y datos;
la PWA implementa la experiencia móvil: bloqueo con PIN (y WebAuthn como opción), modo
claro/oscuro y notificaciones. Las reglas de seguridad (por ejemplo, el bloqueo tras intentos
fallidos) se aplican siempre en el servidor, no solo en el cliente. No se construye una app
nativa ni con Flutter.

### Frontend separado que consume la API

El frontend es un proyecto independiente en `frontend/` que habla con `/api/v1/` usando el
token en la cabecera `Authorization`. Por eso Django habilita CORS (`django-cors-headers`)
solo para los orígenes listados en `DJANGO_CORS_ALLOWED_ORIGINS`, sin comodines y sin
cookies entre sitios. El service worker nunca guarda respuestas de la API en caché.

### Sistema de diseño centralizado

`frontend/src/styles/tokens.css` es la única fuente de colores (incluida la paleta de
emociones), radios, sombras, tipografía y curvas de animación. Tailwind los expone como
utilidades. La lista de emociones válida la define el backend; el frontend solo asocia a cada
una su color e ícono. El color nunca es la única señal: siempre va con ícono o texto.

### Usuario personalizado desde la primera migración

Cambiar `AUTH_USER_MODEL` después de crear tablas es costoso. Por eso se usa correo como
identificador y UUID como llave desde el comienzo. La fecha de nacimiento soporta la
restricción de mayores de 18 años.

### Consentimientos como registros, no casillas en el usuario

Cada consentimiento conserva tipo, versión y fecha. Cuando cambie un texto legal se crea una
nueva versión en lugar de sobrescribir la evidencia anterior. Los valores `draft-v1` deben ser
reemplazados tras revisión jurídica.

### Separación de conexiones de Neon

- `DATABASE_URL`: host con `-pooler`, para consultas normales.
- `DATABASE_URL_UNPOOLED`: host directo, para migraciones y tareas de administración.
- `USE_UNPOOLED_DATABASE=True`: selección explícita de la conexión directa.

Con el pooler se desactivan cursores del lado del servidor, porque PgBouncer en modo
transacción no garantiza que dos operaciones consecutivas usen la misma conexión física.

### Pruebas aisladas

`config.settings_test` reemplaza cualquier URL remota por SQLite en memoria. Esto evita que
una prueba borre o contamine datos de la rama compartida.

### Datos sensibles

La API aplica aislamiento por propietario y transporte TLS mediante Neon. Esto no sustituye
una evaluación legal o de seguridad. Antes de producción se requieren, como mínimo, revisión
de permisos, rotación de secretos, límites de intentos, política de retención/borrado, copias
de seguridad, auditoría y prueba de penetración.

## Evolución prevista

1. Agregar servicios y endpoints de agrupación explicable sobre `Memory` y `MemoryTrace`.
2. Definir el protocolo de bienestar como reglas versionadas aprobadas por el asesor clínico.
3. Añadir un esquema de autenticación móvil con expiración/rotación de tokens.
4. Completar las pantallas de la PWA historia por historia (HU1 a HU8).
5. Crear ramas Neon por funcionalidad o pull request antes de aplicar migraciones a
   `development`.


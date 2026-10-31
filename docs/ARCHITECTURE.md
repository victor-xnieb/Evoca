# Arquitectura inicial

## Componentes

```text
App móvil futura (Flutter)
          |
          | HTTPS + Token
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

### Django es el backend, no la app móvil

El caso de negocio requiere Android e iOS. Django administra reglas, autenticación y datos;
Flutter u otro framework multiplataforma debe implementar PIN/biometría, experiencia móvil,
notificaciones y almacenamiento seguro del token.

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
4. Construir el cliente Flutter contra `/api/v1/`.
5. Crear ramas Neon por funcionalidad o pull request antes de aplicar migraciones a
   `development`.


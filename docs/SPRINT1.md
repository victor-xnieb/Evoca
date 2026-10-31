# Sprint 1 - base segura y registro de huellas

## Objetivo

Dejar una API ejecutable sobre Neon que permita demostrar el flujo mínimo de una persona
adulta: crear una cuenta con consentimientos, autenticarse y administrar sus propias huellas
sensoriales sin acceder a las de otros usuarios.

El caso de negocio define un MVP de cuatro meses, pero no divide historias por sprint. Esta
propuesta acota el primer sprint para un equipo pequeño y deja una base comprobable para el
cliente móvil.

## Historias incluidas

### HU-01 - Registro y consentimiento

Como persona mayor de edad, quiero crear mi cuenta aceptando términos, privacidad y
tratamiento de datos sensibles, para usar Evoca de manera informada.

Criterios de aceptación:

- El correo es único.
- La contraseña pasa los validadores de Django.
- Una persona menor de 18 años es rechazada.
- Los tres consentimientos son obligatorios y quedan registrados con versión y fecha.

### HU-02 - Autenticación

Como usuario, quiero iniciar y cerrar sesión mediante un token, para consumir la API desde
un cliente móvil.

Criterios de aceptación:

- Credenciales válidas devuelven un token.
- El token permite consultar el perfil propio.
- Cerrar sesión revoca ese token.

### HU-03 - Registro de huellas

Como usuario, quiero crear una huella con tipo sensorial, nota, emoción, ánimo y etiquetas,
para capturar rápidamente lo que estoy sintiendo.

Criterios de aceptación:

- Se admiten los seis tipos del caso: aroma, color, canción, sabor, textura y lugar.
- El ánimo está entre 1 y 5.
- Se aceptan hasta 10 etiquetas; se normalizan a minúsculas y se eliminan duplicados.
- El usuario puede listar, editar y eliminar sus huellas.

### HU-04 - Privacidad entre usuarios

Como usuario, quiero que solo yo pueda consultar y modificar mis huellas, para proteger mis
datos sensibles.

Criterios de aceptación:

- Las consultas se filtran por el usuario autenticado.
- El identificador de una huella ajena responde 404 y no revela su existencia.
- Las pruebas automatizadas cubren creación, validación y aislamiento.

### HU-05 - Entorno reproducible

Como integrante del equipo, quiero ejecutar la misma base con distintas versiones compatibles
de Python, para colaborar sin afectar otros proyectos.

Criterios de aceptación:

- El entorno virtual queda fuera de Git.
- Python 3.10-3.11 usa Django 5.2 LTS y Python 3.12-3.14 usa Django 6.1.1.
- Las pruebas no usan Neon accidentalmente.
- La URL con pooling se usa para la app y la directa para migraciones.

## Fuera del Sprint 1

- Aplicación móvil en Flutter y publicación en tiendas.
- Regla de agrupación y endpoints del mapa de recuerdos. El modelo relacional inicial ya está
  preparado, pero la regla requiere criterios de aceptación propios.
- Protocolo de bienestar, palabras de riesgo y líneas oficiales. No deben liberarse hasta que
  el psicólogo asesor apruebe textos, casos de prueba y procedimiento de actualización.
- Biometría/PIN, cifrado del dispositivo y notificaciones, que pertenecen al cliente móvil.
- Suscripciones, plan Empresas, reportes, notas de voz y exportación PDF.

## Definición de terminado

- `manage.py check` no reporta problemas.
- No hay migraciones pendientes.
- Todas las pruebas pasan en los dos perfiles de CI.
- No hay secretos en Git.
- Un integrante distinto puede seguir el README desde cero.
- Las rutas privadas requieren autenticación y aplican aislamiento por propietario.


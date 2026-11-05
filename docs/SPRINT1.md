# Sprint 1 · Evoca

Este documento es la evidencia del Sprint 1 para la revisión: por cada historia de usuario
(HU) del Jira (proyecto SCRUM) muestra la historia, sus 3 escenarios, las 3 subtareas y la
prueba o pantalla que demuestra cada escenario. Se actualiza en cada rama.

> La versión anterior de este archivo usaba otra numeración (HU-01 a HU-05) escrita antes de
> definir las historias con el equipo. La fuente de verdad son las HU1 a HU8 del Jira.
> Lo que ya existía en la base (registro con consentimientos, autenticación por token y CRUD
> privado de huellas) se reutiliza dentro de HU1, HU2 y HU3.

## Objetivo

Una PWA en la que una persona adulta crea su cuenta con autorización expresa de datos
sensibles, protege su acceso, registra huellas sensoriales con emoción e intensidad, ve su
ánimo en una gráfica y en un calendario de colores, recibe un recordatorio diario, es
orientada hacia ayuda profesional cuando corresponde y puede recibir una sugerencia de
emoción hecha por IA.

## Historias y subtareas

Cada HU tiene tres subtareas en Jira: **Desarrollo** (backend), **Interfaz** (pantallas) y
**Pruebas** (pruebas automatizadas de los escenarios).

| Orden | HU | Jira | Pts | Prioridad | Épica | Desarrollo | Interfaz | Pruebas | Rama | Estado en el repo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HU1 · Crear cuenta y proteger mi acceso | SCRUM-10 | 8 | Highest | Cuenta y privacidad | SCRUM-27 | SCRUM-28 | SCRUM-29 | `feature/hu1-cuenta-y-pin` | Pendiente |
| 2 | HU2 · Registrar una huella sensorial | SCRUM-15 | 5 | Highest | Registro de huellas | SCRUM-30 | SCRUM-31 | SCRUM-32 | `feature/hu2-registrar-huella` | Pendiente |
| 3 | HU3 · Ver y editar mis huellas | SCRUM-12 | 5 | High | Registro de huellas | SCRUM-33 | SCRUM-34 | SCRUM-35 | `feature/hu3-ver-editar-huellas` | Pendiente |
| 4 | HU4 · Ver mi gráfica de ánimo | SCRUM-13 | 3 | High | Seguimiento del ánimo | SCRUM-36 | SCRUM-37 | SCRUM-38 | `feature/hu4-grafica-animo` | Pendiente |
| 5 | HU7 · Ver mi calendario de ánimo por colores | SCRUM-17 | 3 | High | Seguimiento del ánimo | SCRUM-45 | SCRUM-46 | SCRUM-47 | `feature/hu7-calendario-animo` | Pendiente |
| 6 | HU5 · Recibir un recordatorio diario | SCRUM-14 | 2 | Medium | Registro de huellas | SCRUM-39 | SCRUM-40 | SCRUM-41 | `feature/hu5-recordatorio-diario` | Pendiente |
| 7 | HU6 · Recibir orientación hacia ayuda profesional | SCRUM-16 | 5 | High | Seguimiento del ánimo | SCRUM-42 | SCRUM-43 | SCRUM-44 | `feature/hu6-orientacion-ayuda` | Pendiente |
| 8 | HU8 · Sugerir la emoción con IA desde mi nota | SCRUM-18 | 5 | Medium | Registro de huellas | SCRUM-48 | SCRUM-49 | SCRUM-50 | `feature/hu8-sugerencia-emocion-ia` | Pendiente |

El orden respeta dependencias: la gráfica y el calendario necesitan huellas; la IA va al
final porque es la de más riesgo.

---

## Base técnica (rama `chore/frontend-base`)

No es una HU: prepara el terreno para todas.

| Entregable | Dónde | Evidencia |
| --- | --- | --- |
| Frontend React + TS (Vite) con router, cliente de API con token y pantalla de inicio | `frontend/src/app/`, `frontend/src/lib/api.ts`, `frontend/src/pages/HomePage.tsx` | `frontend/src/app/app.test.tsx`, `frontend/src/lib/api.test.ts` |
| PWA instalable (manifest, service worker, íconos) | `frontend/vite.config.ts`, `frontend/public/` | `npm run build` genera `manifest.webmanifest` y `sw.js` |
| Sistema de diseño: tokens, modo claro/oscuro, movimiento reducido | `frontend/src/styles/tokens.css`, `frontend/src/providers/` | `frontend/src/hooks/use-reduced-motion.test.tsx` |
| Catálogo de componentes propios con historias | `frontend/src/components/evoca/` | `npm run storybook`; pruebas en `pickers.test.tsx`, `PinPad.test.tsx`, `display.test.tsx` |
| CORS con orígenes explícitos | `config/settings.py` | `apps/core/tests.py` (`CorsTests`) |
| CI de frontend (lint, tipos, pruebas, build, Storybook) | `.github/workflows/ci.yml` (job `frontend`) | GitHub Actions |
| Créditos de piezas externas | `CREDITS.md` | — |

Capturas de la pantalla de inicio: [móvil, modo claro](capturas/base-inicio-claro.jpg),
[móvil, modo oscuro](capturas/base-inicio-oscuro.jpg) y [escritorio](capturas/base-inicio-escritorio.png).

---

## HU1 · Crear cuenta y proteger mi acceso (SCRUM-10)

**Historia.** Como persona mayor de 18 años, quiero crear mi cuenta aceptando de forma
expresa el uso de mis datos sensibles y protegerla con un PIN o con mi huella o rostro, para
que nadie más vea mis recuerdos y poder llevarme o borrar mis datos cuando quiera.

**Escenarios**

1. Dado que estoy en el registro, cuando ingreso una fecha de nacimiento de menor de 18 años
   o no marco la autorización de datos sensibles, entonces no puedo crear la cuenta y la app me
   explica el motivo, y al autorizar siendo mayor de edad la autorización se guarda con fecha
   y versión.
2. Dado que tengo la cuenta creada y un PIN de 4 dígitos activo, cuando abro la app o vuelvo
   a ella desde segundo plano, entonces la app me pide el PIN (o mi huella o rostro, si lo
   activé), y tras 5 intentos fallidos el acceso se bloquea por 5 minutos.
3. Dado que estoy en ajustes, cuando elijo exportar mis datos o eliminar mi cuenta y confirmo,
   entonces recibo mis datos en un archivo, o mi cuenta se elimina y mis datos dejan de existir.

**Subtareas:** Desarrollo SCRUM-27 · Interfaz SCRUM-28 · Pruebas SCRUM-29.

**Evidencia:** pendiente (se completa en `feature/hu1-cuenta-y-pin`).

## HU2 · Registrar una huella sensorial (SCRUM-15)

**Historia.** Como usuario, quiero registrar una huella (aroma, color, canción, sabor,
textura o lugar) con una nota corta, mi emoción y una intensidad de 1 a 5, y que la primera
vez la app me guíe con un ejemplo, para guardar en segundos lo que hace valioso un recuerdo.

**Escenarios**

1. Dado que abro «Nueva huella», cuando elijo uno de los 6 tipos y escribo una nota corta,
   entonces la app los acepta, y si es mi primera vez, antes veo un ejemplo guiado que puedo
   omitir.
2. Dado que no he elegido una emoción o una intensidad, cuando intento guardar la huella,
   entonces la app me indica qué falta y no guarda.
3. Dado que completé tipo, emoción e intensidad de 1 a 5, cuando guardo la huella, entonces la
   huella aparece en mi lista y todo el registro tomó menos de 30 segundos.

**Subtareas:** Desarrollo SCRUM-30 · Interfaz SCRUM-31 · Pruebas SCRUM-32.

**Evidencia:** pendiente.

## HU3 · Ver y editar mis huellas (SCRUM-12)

**Historia.** Como usuario, quiero ver la lista de mis huellas, filtrarlas por tipo o
emoción, y editar o borrar una, para mantener mi registro al día y corregir errores.

**Escenarios**

1. Dado que tengo huellas guardadas, cuando abro «Mis huellas» y filtro por tipo o emoción,
   entonces veo solo las que coinciden, de la más reciente a la más antigua.
2. Dado que abro una huella, cuando cambio la nota, la emoción o la intensidad y guardo,
   entonces el cambio se refleja en mi gráfica y en mi calendario.
3. Dado que elijo borrar una huella, cuando confirmo la acción, entonces la huella desaparece
   de mi lista y de los recuerdos que la incluían.

**Subtareas:** Desarrollo SCRUM-33 · Interfaz SCRUM-34 · Pruebas SCRUM-35.

**Evidencia:** pendiente.

## HU4 · Ver mi gráfica de ánimo (SCRUM-13)

**Historia.** Como usuario, quiero ver cómo evoluciona mi ánimo por semana y por mes, para
notar patrones que de otro modo pasarían inadvertidos.

**Escenarios**

1. Dado que tengo registros de ánimo, cuando alterno entre la vista semanal y la mensual,
   entonces cada punto de la gráfica corresponde a un registro real.
2. Dado que no tengo registros en el periodo, cuando abro la gráfica, entonces veo un mensaje
   que me invita a registrar mi primera huella.
3. Dado que tengo hasta 90 días de datos, cuando abro la gráfica, entonces veo el promedio del
   periodo y la gráfica carga en menos de 2 segundos.

**Subtareas:** Desarrollo SCRUM-36 · Interfaz SCRUM-37 · Pruebas SCRUM-38.

**Evidencia:** pendiente.

## HU5 · Recibir un recordatorio diario (SCRUM-14)

**Historia.** Como usuario, quiero programar un recordatorio a la hora que elija, para crear
el hábito de registrar mi ánimo sin tener que acordarme.

**Escenarios**

1. Dado que estoy en ajustes, cuando activo el recordatorio y elijo una hora, entonces la app
   guarda la hora y puedo desactivarlo cuando quiera.
2. Dado que el recordatorio está activo y hoy no he registrado una huella, cuando llega la hora
   elegida, entonces recibo la notificación y, al tocarla, se abre «Nueva huella».
3. Dado que ya registré una huella hoy, cuando llega la hora del recordatorio, entonces no
   recibo la notificación.

**Subtareas:** Desarrollo SCRUM-39 · Interfaz SCRUM-40 · Pruebas SCRUM-41.

**Evidencia:** pendiente.

## HU6 · Recibir orientación hacia ayuda profesional (SCRUM-16)

**Historia.** Como usuario, quiero recibir un mensaje de orientación si mi ánimo se mantiene
bajo y una pantalla inmediata con líneas de ayuda si escribo palabras de riesgo, para saber
cuándo y cómo buscar apoyo profesional sin recibir diagnósticos.

**Escenarios**

1. Dado que mi ánimo fue 2 o menos en 14 de los últimos 21 días, cuando abro la app, entonces
   veo un mensaje de orientación cálido y sin diagnóstico, y puedo cerrarlo con «Ahora no», y
   la app registra si abrí la ruta de ayuda.
2. Dado que estoy escribiendo una nota, cuando escribo una palabra de riesgo, entonces aparece
   de inmediato una pantalla con líneas oficiales de ayuda, sin pasos intermedios.
3. Dado que el psicólogo asesor aprobó los textos y la lista de palabras, cuando se actualizan,
   entonces la app usa la nueva versión sin publicar una nueva versión de la app.

**Subtareas:** Desarrollo SCRUM-42 · Interfaz SCRUM-43 · Pruebas SCRUM-44.

**Evidencia:** pendiente.

## HU7 · Ver mi calendario de ánimo por colores (SCRUM-17)

**Historia.** Como usuario, quiero ver un calendario donde cada día toma el color de mi
emoción dominante, para reconocer de un vistazo cómo ha sido mi mes.

**Escenarios**

1. Dado que tengo registros de ánimo, cuando abro el calendario, entonces cada día tiene el
   color de mi emoción dominante y puedo pasar a meses anteriores.
2. Dado que veo el calendario, cuando toco un día, entonces veo la emoción, la intensidad
   promedio y las huellas de ese día.
3. Dado que un día no tiene registros, cuando veo el calendario, entonces ese día se muestra en
   un color neutro, sin juicio ni alertas.

**Subtareas:** Desarrollo SCRUM-45 · Interfaz SCRUM-46 · Pruebas SCRUM-47.

**Evidencia:** pendiente.

## HU8 · Sugerir la emoción con IA desde mi nota (SCRUM-18)

**Historia.** Como usuario, quiero que la IA lea mi nota y me proponga una emoción e
intensidad, para registrar más rápido y con más precisión, pudiendo cambiar la sugerencia.

**Escenarios**

1. Dado que escribí una nota de 10 palabras o más, cuando termino de escribirla, entonces la
   app me propone una emoción y una intensidad en menos de 3 segundos.
2. Dado que veo una sugerencia de la IA, cuando la acepto o la cambio, entonces se guarda mi
   elección y no la de la IA.
3. Dado que la IA no está disponible o no tiene confianza suficiente, cuando registro una
   huella, entonces el registro funciona sin sugerencia.

**Subtareas:** Desarrollo SCRUM-48 · Interfaz SCRUM-49 · Pruebas SCRUM-50.

**Evidencia:** pendiente.

---

## Definición de terminado (por HU)

- Los 3 escenarios tienen al menos una prueba automatizada que verifica la medida concreta
  del criterio (30 s, 2 s, 3 s, 5 intentos, 5 minutos, 14 de 21 días, 10 palabras) y funcionan
  a mano en la interfaz.
- Las 3 subtareas (Desarrollo, Interfaz, Pruebas) están cubiertas.
- Pasan `manage.py check`, `makemigrations --check --dry-run`, las pruebas del backend y, en el
  frontend, `lint`, `typecheck`, `test`, `build` y `build-storybook`, en Python 3.10 y 3.14.
- No hay secretos en Git ni datos personales o notas en los logs.
- Las rutas privadas requieren autenticación y filtran por el usuario autenticado.
- Cualquier criterio parcial se marca como «parcial» con su razón; nunca como cumplido.

## Resumen final del Sprint

Se completa al cerrar la HU8.

| HU | Escenarios cumplidos | Subtareas cubiertas | Parciales |
| --- | --- | --- | --- |
| HU1 | — | — | — |
| HU2 | — | — | — |
| HU3 | — | — | — |
| HU4 | — | — | — |
| HU5 | — | — | — |
| HU6 | — | — | — |
| HU7 | — | — | — |
| HU8 | — | — | — |

## Fuera del Sprint 1

- Agrupación de huellas en recuerdos (`Memory`, `MemoryTrace`): Sprint 2.
- App nativa, publicación en tiendas y despliegue en producción.
- Suscripciones, plan Empresas, reportes, notas de voz y exportación PDF.

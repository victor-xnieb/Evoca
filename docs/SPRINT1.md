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
| 1 | HU1 · Crear cuenta y proteger mi acceso | SCRUM-10 | 8 | Highest | Cuenta y privacidad | SCRUM-27 | SCRUM-28 | SCRUM-29 | `feature/hu1-cuenta-y-pin` | En dev (parcial: biometría) |
| 2 | HU2 · Registrar una huella sensorial | SCRUM-15 | 5 | Highest | Registro de huellas | SCRUM-30 | SCRUM-31 | SCRUM-32 | `feature/hu2-registrar-huella` | En dev |
| 3 | HU3 · Ver y editar mis huellas | SCRUM-12 | 5 | High | Registro de huellas | SCRUM-33 | SCRUM-34 | SCRUM-35 | `feature/hu3-ver-editar-huellas` | En dev (completa con HU7) |
| 4 | HU4 · Ver mi gráfica de ánimo | SCRUM-13 | 3 | High | Seguimiento del ánimo | SCRUM-36 | SCRUM-37 | SCRUM-38 | `feature/hu4-grafica-animo` | En dev |
| 5 | HU7 · Ver mi calendario de ánimo por colores | SCRUM-17 | 3 | High | Seguimiento del ánimo | SCRUM-45 | SCRUM-46 | SCRUM-47 | `feature/hu7-calendario-animo` | En dev |
| 6 | HU5 · Recibir un recordatorio diario | SCRUM-14 | 2 | Medium | Registro de huellas | SCRUM-39 | SCRUM-40 | SCRUM-41 | `feature/hu5-recordatorio-diario` | En dev (parcial: app cerrada) |
| 7 | HU6 · Recibir orientación hacia ayuda profesional | SCRUM-16 | 5 | High | Seguimiento del ánimo | SCRUM-42 | SCRUM-43 | SCRUM-44 | `feature/hu6-orientacion-ayuda` | En dev |
| 8 | HU8 · Sugerir la emoción con IA desde mi nota | SCRUM-18 | 5 | Medium | Registro de huellas | SCRUM-48 | SCRUM-49 | SCRUM-50 | `feature/hu8-sugerencia-emocion-ia` | En revisión |

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

**Evidencia** (rama `feature/hu1-cuenta-y-pin`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · Menor de 18 o sin autorización: no se crea la cuenta y se explica el motivo | 18 años cumplidos (hoy sí, mañana no) | `apps/accounts/tests.py` (`RegistrationTests`: `test_accepts_person_who_turns_18_today`, `test_rejects_person_who_turns_18_tomorrow_and_explains_why`, `test_requires_sensitive_data_consent_and_explains_why`); `frontend/src/app/hu1.test.tsx` (escenario 1) | `/registro` ([captura](capturas/hu1-registro-rechazo.jpg)) | Cumplido |
| 1 · La autorización se guarda con fecha y versión | `accepted_at` y `document_version` | `test_sensitive_data_consent_is_saved_with_date_and_version`, `test_lists_own_consents`; en Ajustes se muestra la fecha y la versión | `/ajustes` ([captura](capturas/hu1-ajustes.jpg)) | Cumplido |
| 2 · Al abrir la app o volver desde segundo plano pide el PIN | PIN de 4 dígitos | `PinTests.test_pin_must_have_exactly_four_digits`; `hu1.test.tsx`: «al abrir la app…», «vuelve a pedir el PIN al regresar desde segundo plano» | Pantalla de bloqueo ([captura](capturas/hu1-crear-pin.jpg)) | Cumplido |
| 2 · Tras 5 intentos fallidos, bloqueo de 5 minutos | 5 intentos, 5 min (4:59 sigue bloqueado; a los 5:00 se libera) | `test_four_failures_do_not_lock`, `test_fifth_failure_locks_for_five_minutes`, `test_locked_rejects_even_the_correct_pin_until_five_minutes_pass`, `test_after_lock_expires_attempts_start_from_zero`; `hu1.test.tsx`: cuenta regresiva 5:00 | Bloqueo con cuenta regresiva ([captura](capturas/hu1-bloqueado.jpg)) | Cumplido |
| 2 · «O mi huella o rostro, si lo activé» | — | Sin prueba automática: jsdom y Chrome sin ventana no tienen lector biométrico | Se ofrece tras crear el PIN y en Ajustes | **Parcial** (ver nota) |
| 3 · Exportar: recibo mis datos en un archivo | Archivo `evoca-mis-datos-AAAA-MM-DD.json` | `DataRightsTests.test_export_returns_a_file_with_only_my_data`; `hu1.test.tsx`: «exportar descarga un archivo» | `/ajustes` | Cumplido |
| 3 · Eliminar: la cuenta se elimina y los datos dejan de existir | Usuario, huellas, memorias, consentimientos, PIN y token borrados | `test_delete_requires_password`, `test_delete_removes_the_account_and_all_its_data`, `test_deleted_token_no_longer_works`; `hu1.test.tsx`: «eliminar pide confirmación…» | Diálogo de confirmación | Cumplido |

Recorrido completo contra el backend real (SQLite temporal) con Playwright: registro rechazado
y luego aceptado, creación del PIN, bloqueo al abrir, 5 fallos → «espera 5:00», tras recargar
sigue bloqueado (4:59), «¿Olvidaste tu PIN?» → entrar con contraseña, exportación del archivo y
eliminación de la cuenta (después, «Correo o contraseña incorrectos»).

> **Nota sobre la huella o el rostro (parcial).** Se implementó con WebAuthn y el autenticador
> del dispositivo (Windows Hello, Touch ID, huella de Android). La verificación es local: el
> navegador confirma a la persona y la app se desbloquea. El servidor no valida la firma, así
> que protege frente a quien toma el celular desbloqueado, igual que el PIN de la interfaz,
> pero no es un segundo factor del servidor. Falta probarlo en un celular real.

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

**Evidencia** (rama `feature/hu2-registrar-huella`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · Elijo uno de los 6 tipos y escribo una nota corta: la app los acepta | 6 tipos; nota de hasta 500 caracteres | `apps/traces/tests.py` (`RegisterTraceTests`: `test_accepts_each_of_the_six_sensory_types`, `test_note_is_required_and_short`, `test_catalog_lists_six_types_and_eight_emotions`); `frontend/src/app/hu2.test.tsx` («ofrece los 6 tipos…») | `/nueva-huella` ([captura](capturas/hu2-formulario.jpg)) | Cumplido |
| 1 · La primera vez veo un ejemplo guiado que puedo omitir | Sin huellas y sin haberlo visto en el dispositivo | `hu2.test.tsx`: «la primera vez muestra un ejemplo guiado que se puede omitir», «…hasta el final», «si ya tiene huellas no muestra el ejemplo» | Ejemplo guiado ([captura](capturas/hu2-ejemplo.jpg)) | Cumplido |
| 2 · Sin emoción o intensidad: la app dice qué falta y no guarda | Cada campo que falta, con su mensaje | `test_without_emotion_says_what_is_missing_and_does_not_save`, `test_without_intensity_…`, `test_reports_both_missing_fields_at_once`; `hu2.test.tsx` (escenario 2: no se envía nada) | Resumen «Para guardar falta» ([captura](capturas/hu2-falta.jpg)) | Cumplido |
| 3 · Guardo tipo, emoción e intensidad de 1 a 5 y la huella aparece en mi lista | Intensidad 1 a 5; la más reciente primero | `test_intensity_goes_from_one_to_five`, `test_emotion_must_be_one_of_the_eight`, `test_saved_trace_appears_first_in_my_list`; `hu2.test.tsx`: «guarda… y la huella aparece en mi lista» | Inicio, «Tus huellas recientes» ([captura](capturas/hu2-lista.jpg)) | Cumplido |
| 3 · Todo el registro tomó menos de 30 segundos | < 30 s | `hu2.test.tsx`: una sola pantalla con 4 decisiones (tipo, nota, emoción, intensidad). Recorrido con Playwright contra el backend real, a ritmo humano de celular (300 ms por letra y 1,5 s para decidir cada elección): **23,1 s** la primera vez (incluye omitir el ejemplo) y **17,4 s** las siguientes | — | Cumplido |

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

**Evidencia** (rama `feature/hu3-ver-editar-huellas`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · Filtro por tipo o emoción y veo solo las que coinciden, de la más reciente a la más antigua | Orden por `created_at` descendente; `?sensory_type=` y `?emotion=` combinables | `apps/traces/tests.py` (`ManageTracesTests`: `test_lists_only_my_traces_newest_first`, `test_filters_by_sensory_type_newest_first`, `test_filters_by_emotion_newest_first`, `test_combines_type_and_emotion`, `test_filter_without_matches_returns_empty_list`, `test_rejects_unknown_filter_values`); `frontend/src/app/hu3.test.tsx` (escenario 1) | `/mis-huellas` ([lista](capturas/hu3-lista.jpg), [filtros](capturas/hu3-filtros.jpg)) | Cumplido |
| 2 · Cambio la nota, la emoción o la intensidad y guardo | Se guarda y la lista ya trae el cambio | `test_edits_note_emotion_and_intensity`, `test_edit_validates_like_create`, `test_cannot_edit_or_delete_another_persons_trace`; `hu3.test.tsx` (escenario 2) | `/mis-huellas/:id` ([captura](capturas/hu3-editar.jpg)) | Cumplido |
| 2 · El cambio se refleja en mi gráfica y en mi calendario | — | Gráfica: `MoodChartTests.test_editing_a_trace_is_reflected_in_the_chart` y el recorrido de HU4 (el punto editado cambia). Calendario: `MoodCalendarTests.test_editing_a_trace_changes_the_color_of_its_day` y el recorrido de HU7 (tras editar desde el detalle del día, el día pasa de Calma a Nostalgia) | `/animo` | Cumplido (completado en HU4 y HU7) |
| 3 · Confirmo borrar y la huella desaparece de mi lista y de los recuerdos que la incluían | Confirmación previa; borrado en el servidor; la relación con las memorias se elimina | `test_delete_removes_it_from_my_list_and_from_memories`; `hu3.test.tsx`: «cancelar no borra nada», «al confirmar, la huella desaparece de mi lista» | Diálogo de confirmación ([captura](capturas/hu3-borrar.jpg)) | Cumplido |

Recorrido completo contra el backend real con Playwright:

- 4 huellas en orden, de la más reciente a la más antigua.
- Con el filtro «Aroma» quedan 2; con «Aroma + Calma», 1. Los filtros quedan en la URL y se conservan al volver.
- La edición queda guardada en el servidor (nota, gratitud, 5).
- Tras borrar, quedan 3 huellas, tanto en la lista como en el servidor.

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

**Evidencia** (rama `feature/hu4-grafica-animo`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · Al alternar entre la vista semanal y la mensual, cada punto corresponde a un registro real | Semana = últimos 7 días; mes = últimos 30; un punto por huella, sin agrupar | `apps/traces/tests.py` (`MoodChartTests`: `test_week_has_one_point_per_real_trace_of_the_last_7_days`, `test_month_includes_the_last_30_days`, `test_uses_when_it_happened_if_given`, `test_never_includes_other_peoples_traces`); `frontend/src/app/hu4.test.tsx` (escenario 1) | `/animo` ([semana](capturas/hu4-semana.jpg), [mes en oscuro](capturas/hu4-mes-oscuro.jpg)) | Cumplido |
| 2 · Sin registros en el periodo veo un mensaje que me invita a registrar mi primera huella | Mensaje y botón «Registrar mi primera huella» | `test_empty_period_has_no_points_and_no_average`; `hu4.test.tsx` (escenario 2) | Estado vacío ([captura](capturas/hu4-vacio.jpg)) | Cumplido |
| 3 · Con hasta 90 días de datos veo el promedio del periodo | Promedio con un decimal | `test_average_of_the_period`; `hu4.test.tsx`: «muestra el promedio del periodo» | Resumen sobre la gráfica | Cumplido |
| 3 · …y la gráfica carga en menos de 2 segundos | < 2 s | `test_ninety_days_of_data_load_in_under_two_seconds` (360 huellas en 90 días; 2 consultas). Recorrido con Playwright contra el backend real y el build de producción: semana **1,04 s** (primera apertura, incluye bajar el código de la gráfica), mes **0,21 s**, recarga completa desde el PIN **1,06 s** | — | Cumplido |

El recorrido con Playwright también confirmó dos cosas:

- La gráfica de la semana tiene los mismos 28 puntos que reporta el servidor.
- Al editar una huella desde la app, el punto cambia en la gráfica: los puntos «Enojo, 1 de 5» pasaron de 3 a 4, y el servidor confirma el valor editado. Esto completa la parte de la gráfica del escenario 2 de HU3.

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

**Evidencia** (rama `feature/hu5-recordatorio-diario`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · En ajustes activo el recordatorio, elijo una hora y la app la guarda; puedo desactivarlo | Hora `HH:MM` (por defecto 20:00) | `apps/accounts/tests.py` (`DailyReminderTests`: `test_starts_disabled_at_eight_pm`, `test_saves_the_chosen_time_and_can_be_disabled`, `test_rejects_invalid_time`); `frontend/src/app/hu5.test.tsx` (escenario 1: pide permiso, guarda, cambia la hora y desactiva) | `/ajustes`, «Recordatorio diario» ([captura](capturas/hu5-ajustes.jpg)) | Cumplido |
| 2 · Activo y sin huella hoy: al llegar la hora recibo la notificación | Exacta: a las 19:59:59 todavía no, a las 20:00 sí; una vez al día | `test_is_due_exactly_when_the_chosen_time_arrives`, `test_only_once_per_day_after_the_app_shows_it`, `test_a_trace_from_yesterday_does_not_stop_todays_reminder`; `hu5.test.tsx`: `msUntil` exacto y notificación al llegar la hora | Notificación «Evoca · ¿Cómo te sentiste hoy?…» | **Parcial** (ver nota) |
| 2 · …y al tocarla se abre «Nueva huella» | — | `hu5.test.tsx`: «al tocar la notificación se abre Nueva huella» y el manejador del service worker (`public/notification-click.js`) abre `/nueva-huella` | — | Cumplido |
| 3 · Si ya registré una huella hoy, no recibo la notificación | Huella del mismo día, en hora de Bogotá | `test_not_due_if_a_trace_was_registered_today`; `hu5.test.tsx` (escenario 3: no se muestra ni se marca) | — | Cumplido |

**Opción «cada hora»** (pedida por el equipo en la revisión): además de «una vez al día» a la
hora elegida, el recordatorio puede avisar cada hora en punto, de 8:00 a 21:00, hasta que se
registre una huella ese día ([captura](capturas/hu5-ajustes-cada-hora.jpg)). Pruebas:
`test_starts_once_a_day_and_can_switch_to_every_hour`, `test_rejects_unknown_frequency`,
`test_every_hour_until_a_trace_is_registered` (7:59:59 todavía no, 8:00 sí, una vez por hora,
se detiene con la huella), `test_every_hour_stops_after_nine_pm`; en `hu5.test.tsx`, el cambio
de modo en Ajustes, la espera hasta la siguiente hora en punto y el aviso al cambiar de hora.

Recorrido completo con Playwright, con el build de producción y su service worker:

- Desde Ajustes se activó el recordatorio para un minuto después, y la hora quedó guardada en el servidor.
- A esa hora, la cuenta sin huellas hoy recibió la notificación (`tag: evoca-recordatorio`, con enlace a `/nueva-huella`), y el servidor la marcó como avisada.
- Otra cuenta con la misma hora, pero con una huella hoy, no recibió ninguna.
- Tras un aviso, al elegir una hora más tarde el mismo día llegó un segundo aviso a la nueva
  hora (04:54 y 04:55). Una hora más temprana no repite el aviso
  (`test_choosing_a_later_time_after_a_reminder_notifies_again`,
  `test_choosing_an_earlier_time_after_a_reminder_does_not_repeat_it`).

> **Nota sobre el escenario 2 (parcial).** La notificación la lanza la app mientras Evoca está
> abierta o en segundo plano en el dispositivo (también como PWA instalada en segundo plano).
> Con la app totalmente cerrada no llega. Para eso hace falta Web Push:
>
> - un proceso del servidor que envíe a la hora elegida o cada hora (cron);
> - claves VAPID, que son secretos y no se agregan desde esta rama;
> - la dependencia `pywebpush`.
>
> El backend ya decide quién debe recibirla (`DailyReminder.status`), así que ese envío se
> puede agregar sin cambiar la regla.

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

**Evidencia** (rama `feature/hu6-orientacion-ayuda`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · Con ánimo de 2 o menos en 14 de los últimos 21 días, al abrir la app veo un mensaje de orientación cálido y sin diagnóstico | Ánimo del día = promedio de la intensidad de sus huellas; 14 días bajos sí, 13 no; ventana de 21 días en hora de Bogotá; los días sin huellas no cuentan | `apps/support/tests.py` (`OrientationTests`: `test_shows_with_fourteen_low_days_in_the_last_twenty_one`, `test_thirteen_low_days_are_not_enough`, `test_a_day_is_low_when_its_average_is_two_or_less`, `test_only_the_last_twenty_one_days_count`, `test_days_without_traces_do_not_count_as_low`, `test_never_counts_other_peoples_traces`); `frontend/src/app/hu6.test.tsx` (escenario 1: sin palabras de diagnóstico; sin mensaje si no se cumple la regla) | Inicio ([captura](capturas/hu6-orientacion.jpg)) | Cumplido |
| 1 · …puedo cerrarlo con «Ahora no» y la app registra si abrí la ruta de ayuda | Eventos `orientation_shown`, `orientation_dismissed` y `help_opened`, sin texto; tras responder no vuelve a aparecer en 7 días | `test_now_not_closes_it_for_seven_days`, `test_records_when_the_help_route_is_opened`, `test_events_only_store_the_kind_never_text`, `test_export_includes_and_account_deletion_removes_the_events`; `hu6.test.tsx` («Ahora no» y ruta de ayuda) | `/ayuda` ([captura](capturas/hu6-ruta-ayuda.jpg)) | Cumplido |
| 2 · Al escribir una palabra de riesgo aparece de inmediato una pantalla con líneas oficiales, sin pasos intermedios | Se abre con la letra que completa la frase, sin guardar ni enviar la nota; las líneas se llaman con un toque (`tel:`) y el foco va a la primera; sin importar mayúsculas, tildes ni signos, y no dentro de otras palabras | `hu6.test.tsx` (escenario 2: al completar la frase; no se reabre por la misma frase pero sí por una nueva; al editar, lo ya escrito no la abre; normalización) | Pantalla completa ([claro](capturas/hu6-ayuda-inmediata.jpg), [oscuro](capturas/hu6-ayuda-oscuro.jpg)) | Cumplido |
| 3 · Cuando el psicólogo asesor aprueba y actualiza textos y palabras, la app usa la nueva versión sin publicarse de nuevo | La app pide el contenido al servidor cada vez que lo usa; se sirve la versión aprobada más reciente; un borrador nuevo no reemplaza a la aprobada | `SupportContentTests` (`test_an_approved_version_replaces_the_previous_one`, `test_a_newer_draft_does_not_replace_the_approved_version`, `test_approval_needs_who_approved_it`, `test_each_line_needs_a_name_and_a_phone`); `hu6.test.tsx` (escenario 3: palabra y texto nuevos; sin conexión usa la última versión) | Administrador de Django, «Contenidos de orientación» | Cumplido |

Recorrido completo con Playwright contra el backend real:

- Una cuenta con 14 días de ánimo 1 o 2 vio el mensaje al abrir la app. Al tocar «Ver opciones de ayuda» llegó a `/ayuda` con las líneas `tel:192`, `tel:106` y `tel:123`. Quedaron registrados `orientation_shown → help_opened`, y el servidor dejó de mostrar el mensaje.
- Otra cuenta en la misma situación tocó «Ahora no»: el mensaje se cerró y no volvió a aparecer al abrir de nuevo la app.
- Al escribir «Hoy siento que quiero morir» a ritmo humano, la pantalla de ayuda apareció **43 ms** después de la última letra (57 ms en escritorio oscuro). El foco quedó en la primera línea y, al tocar «Volver a mi nota», volvió a la nota con el texto intacto. Solo se registró `risk_screen_shown`, sin la nota ni la palabra.
- Se aprobó una versión 2 en el servidor, con un título y una frase nuevos. Sin recompilar la app, la frase nueva abrió la pantalla en 44 ms con el título nuevo y sin la marca de provisional.

> **Contenido en borrador.** Los textos, las líneas (192 opción 4, 106 y 123) y la lista de
> palabras se cargaron como versión 1 **sin aprobar**: la app los muestra con la marca
> «Contenido provisional · pendiente de revisión profesional». El psicólogo asesor debe
> revisarlos y aprobarlos en el administrador («Contenidos de orientación»).

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

**Evidencia** (rama `feature/hu7-calendario-animo`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · Cada día tiene el color de mi emoción dominante | Emoción más frecuente; en empate, la de mayor intensidad sumada y luego la más reciente; días en hora de Bogotá | `apps/traces/tests.py` (`MoodCalendarTests`: `test_each_day_takes_its_dominant_emotion`, `test_tie_goes_to_higher_total_intensity_then_most_recent`, `test_month_limits_use_local_time`, `test_never_includes_other_peoples_traces`); `frontend/src/app/hu7.test.tsx` («pinta cada día…») | `/animo`, «Tu calendario» ([celular](capturas/hu7-mes.jpg), [oscuro](capturas/hu7-oscuro.jpg)) | Cumplido |
| 1 · …y puedo pasar a meses anteriores | Hasta el primer mes con datos o el mes en que se creó la cuenta; no más allá del mes actual | `test_previous_months_can_be_opened`, `test_rejects_bad_month`; `hu7.test.tsx` («se puede pasar al mes anterior…») | Botones «Mes anterior» y «Mes siguiente» | Cumplido |
| 2 · Al tocar un día veo la emoción, la intensidad promedio y las huellas de ese día | Intensidad promedio con un decimal | `test_list_filters_the_traces_of_a_day`; `hu7.test.tsx` (escenario 2) | Detalle del día ([captura](capturas/hu7-detalle.jpg)) | Cumplido |
| 3 · Un día sin registros se ve en un color neutro, sin juicio ni alertas | Tono `--evoca-day-empty`, sin ícono ni alertas | `test_days_without_records_are_not_sent`, `test_deleting_the_only_trace_leaves_the_day_neutral`; `hu7.test.tsx` (escenario 3: sin `role="alert"`) | Días beige; al tocarlos: «Este día no tiene registros.» | Cumplido |

Recorrido completo con Playwright contra el backend real:

- Este mes: el día 1 es Calma (2 de sus 3 huellas, intensidad promedio 4,0), el 2 es Tristeza y el 4 es Gratitud; los otros 27 días son neutros.
- Al tocar el día 1 aparecen sus 3 huellas.
- En el mes anterior, el 10 es Alegría y el 20 es Enojo. «Mes anterior» se desactiva en el primer mes y «Mes siguiente» en el mes actual.
- Al tocar un día sin registros, no aparece ninguna alerta.

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

**Evidencia** (rama `feature/hu8-sugerencia-emocion-ia`):

| Escenario | Medida | Prueba automática | Pantalla | Estado |
| --- | --- | --- | --- | --- |
| 1 · Con una nota de 10 palabras o más, al terminar de escribirla la app propone emoción e intensidad en menos de 3 s | 10 palabras sí, 9 no; «terminar» = 0,6 s sin escribir; espera máxima 0,6 s + 2,3 s < 3 s (el servidor corta la IA a los 2 s) | `apps/traces/tests.py` (`SuggestEmotionTests`: `test_suggests_from_ten_words`, `test_nine_words_are_not_enough_and_the_ai_is_not_called`, `test_gemini_request_keeps_the_key_in_the_server_and_waits_at_most_the_timeout`); `frontend/src/app/hu8.test.tsx` (escenario 1: espera máxima, conteo de palabras, sugerencia en < 3 s, una sola petición, la sugerencia anterior desaparece si la nota cambia) | «Nueva huella» ([claro](capturas/hu8-sugerencia.jpg), [oscuro](capturas/hu8-oscuro.jpg)) | Cumplido |
| 2 · Si acepto o cambio la sugerencia, se guarda mi elección y no la de la IA | Sugerir no guarda nada; se guarda lo elegido en el formulario | `test_suggesting_saves_nothing_and_the_trace_keeps_the_persons_choice`; `hu8.test.tsx` (escenario 2: aceptar, aceptar y cambiar, no usarla) | «Usar sugerencia» → «En uso: puedes cambiarla abajo» ([captura](capturas/hu8-en-uso.jpg)) | Cumplido |
| 3 · Sin IA disponible o sin confianza suficiente, el registro funciona sin sugerencia | Sin clave, error, 503, espera agotada, respuesta inválida (emoción fuera de la lista, intensidad fuera de 1 a 5) o confianza < 0,6 | `test_without_a_key_there_is_no_suggestion`, `test_errors_and_timeouts_answer_without_suggestion_and_never_log_the_note`, `test_invalid_answers_are_discarded`, `test_low_confidence_gives_no_suggestion`; `hu8.test.tsx` (escenario 3: no disponible, baja confianza, error del servidor y espera agotada antes de 3 s) | Sin tarjeta; se guarda igual | Cumplido |

Recorrido completo con Playwright y **Gemini real** (`gemini-3.5-flash-lite`), con notas inventadas escritas a ritmo humano:

- 5 de 5 sugerencias llegaron en menos de 3 s desde la última letra: entre **1,85 s y 2,4 s**, incluida la pausa de 0,6 s. Propuso calma, alegría, ansiedad, tristeza y gratitud, coherentes con cada nota.
- Al tocar «Usar sugerencia» quedaron elegidas Calma e intensidad 4, y la huella se guardó así. En otra, la sugerencia fue Alegría, se cambió a mano a Gratitud 2 y se guardó Gratitud 2.
- Con el backend sin clave, el servidor respondió `unavailable`, no apareció tarjeta y la huella se guardó con lo elegido.
- En los logs del servidor no aparece ninguna nota: solo el tipo de error cuando la IA falla.

> **Privacidad.** La nota viaja a Google solo para sugerir; no se guarda en Evoca nada de la
> IA. En el plan gratuito de Gemini, Google puede usar lo enviado para mejorar sus productos:
> sirve para la demo con notas de ejemplo, pero con usuarios reales hay que usar el plan pago
> (o cambiar de proveedor) y mencionar este envío en el texto de autorización de datos.

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
| HU1 | 3 de 3 con PIN; huella o rostro parcial | SCRUM-27, SCRUM-28 y SCRUM-29 cubiertas | Huella o rostro: verificación local, sin prueba en un dispositivo real |
| HU2 | 3 de 3 | SCRUM-30, SCRUM-31 y SCRUM-32 cubiertas | — |
| HU3 | 3 de 3 | SCRUM-33, SCRUM-34 y SCRUM-35 cubiertas | — (el escenario 2 se completó con HU4 y HU7) |
| HU4 | 3 de 3 | SCRUM-36, SCRUM-37 y SCRUM-38 cubiertas | — |
| HU5 | 1 y 3 completos; 2 parcial | SCRUM-39, SCRUM-40 y SCRUM-41 cubiertas | Escenario 2: la notificación llega con la app abierta o en segundo plano; con la app cerrada requiere Web Push |
| HU6 | 3 de 3 | SCRUM-42, SCRUM-43 y SCRUM-44 cubiertas | — (los textos, las líneas y las palabras son un borrador hasta que los apruebe el psicólogo asesor) |
| HU7 | 3 de 3 | SCRUM-45, SCRUM-46 y SCRUM-47 cubiertas | — |
| HU8 | 3 de 3 | SCRUM-48, SCRUM-49 y SCRUM-50 cubiertas | — |

## Fuera del Sprint 1

- Agrupación de huellas en recuerdos (`Memory`, `MemoryTrace`): Sprint 2.
- App nativa, publicación en tiendas y despliegue en producción.
- Suscripciones, plan Empresas, reportes, notas de voz y exportación PDF.

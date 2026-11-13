# Sprint 2 · Evoca

Evidencia del Sprint 2: por cada historia de usuario (HU) del Jira (proyecto SCRUM) muestra la
historia, sus 3 escenarios, las 3 subtareas y la prueba o pantalla que demuestra cada escenario.
Cada sección se agrega cuando el equipo aprueba la HU y se mezcla en `dev`.

## Historias y subtareas

Cada HU tiene tres subtareas en Jira: **Backend**, **Interfaz** y **Pruebas**. El orden de
trabajo sigue la prioridad del Jira.

| Orden | HU | Jira | Prioridad | Backend | Interfaz | Pruebas | Rama | Estado en el repo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HU10 · Explorar mi mapa de recuerdos con esferas de color | SCRUM-20 | Highest | SCRUM-54 | SCRUM-55 | SCRUM-56 | `feature/hu10-mapa-esferas` | En dev |
| 2 | HU9 · Recibir recuerdos sugeridos por IA | SCRUM-19 | High | SCRUM-51 | SCRUM-52 | SCRUM-53 | `feature/hu9-recuerdos-sugeridos-ia` | En dev |
| 3 | HU12 · Buscar recuerdos por significado con IA | SCRUM-22 | Medium | SCRUM-60 | SCRUM-61 | SCRUM-62 | `feature/hu12-busqueda-significado-ia` | Pendiente |
| 4 | HU13 · Ver estadísticas de mis sensaciones | SCRUM-23 | Medium | SCRUM-63 | SCRUM-64 | SCRUM-65 | `feature/hu13-estadisticas-sensaciones` | Pendiente |
| 5 | HU11 · Marcar mis recuerdos centrales | SCRUM-21 | Low | SCRUM-57 | SCRUM-58 | SCRUM-59 | `feature/hu11-recuerdos-centrales` | Pendiente |
| 6 | HU14 · Ver patrones de mi semana con IA | SCRUM-24 | Low | SCRUM-66 | SCRUM-67 | SCRUM-68 | `feature/hu14-patrones-semana-ia` | Pendiente |
| 7 | HU15 · Descubrir mis islas | SCRUM-25 | Low | SCRUM-69 | SCRUM-70 | SCRUM-71 | `feature/hu15-islas` | Pendiente |
| 8 | HU16 · Grabar una nota de voz en la huella | SCRUM-26 | Lowest | SCRUM-72 | SCRUM-73 | SCRUM-74 | `feature/hu16-nota-de-voz` | Pendiente |

---

## HU10 · Explorar mi mapa de recuerdos con esferas de color (SCRUM-20)

**Historia.** Como usuario, quiero ver mis recuerdos como esferas del color de su emoción en un
mapa sin orden cronológico, para encontrarlos por lo que sentí y no por la fecha.

**Escenarios**

1. Dado que tengo recuerdos, cuando abro el mapa, entonces los veo como esferas sin orden
   cronológico, y el color es el de su emoción y el tamaño depende de la cantidad de huellas.
2. Dado que veo el mapa, cuando toco una esfera o aplico un filtro por sensación o emoción,
   entonces veo las huellas del recuerdo, o solo las esferas que coinciden con el filtro.
3. Dado que tengo hasta 200 recuerdos, cuando abro el mapa, entonces abre en menos de 3 segundos.

**Interpretación del equipo.** El mapa es un **grafo**: cada recuerdo es un nodo (esfera) y los
recuerdos afines se unen con líneas. La afinidad se calcula sin IA, con reglas fijas.

**Subtareas:** Backend SCRUM-54 · Interfaz SCRUM-55 · Pruebas SCRUM-56.

### Qué se hizo

- **Backend** (`apps/traces/memory_map.py`, `MemoryViewSet` en `apps/traces/views.py`):
  - Cada recuerdo aceptado es un nodo. Su color es la emoción dominante de sus huellas (la misma
    regla del calendario de HU7) y su tamaño, cuántas huellas tiene.
  - La afinidad entre dos recuerdos va de 0 a 1:

    | Parte | Peso | Cómo se mide |
    | --- | --- | --- |
    | Sensaciones compartidas | 0,5 | Compartidas / distintas entre los dos |
    | Emoción dominante | 0,3 | La misma vale completo; otra del mismo tono (luminoso, melancólico o tenso), la mitad |
    | Etiquetas de sus huellas | 0,2 | Compartidas / distintas. Si ninguno tiene, no cuenta y el puntaje se calcula sobre las otras dos partes |

  - Se descartan los pares bajo `EVOCA_MAP_MIN_AFFINITY` (0,4). Las aristas se agregan de mayor
    a menor afinidad, sin pasar de `EVOCA_MAP_MAX_LINKS` (4) por recuerdo. Un recuerdo sin
    afinidad suficiente queda solo.
  - Cada arista lleva su motivo legible, por ejemplo «Comparten aromas, sabores, un tono luminoso
    y la etiqueta «familia»».
  - Con filtros llegan todos los nodos, con `match`, y las aristas se calculan solo entre los que
    coinciden. Siempre son 2 consultas a la base, sin importar cuántos recuerdos haya.
- **Interfaz** (`MemoryGraph`, `MemorySphere`, `MemoriesPage`, `MemoryPanel`, `lib/force-layout.ts`):
  - Pestaña nueva **Recuerdos** (`/recuerdos`).
  - Disposición orgánica con una simulación de fuerzas propia y determinística (sin librerías).
    Se calcula una vez por conjunto de recuerdos: filtrar no la mueve.
  - Líneas sutiles cuyo grosor y opacidad dependen del puntaje. Tocar una línea, o pasar el
    mouse, muestra su motivo.
  - Tocar una esfera resalta sus conexiones y abre un panel con sus conexiones y sus huellas.
  - Arrastrar el fondo desplaza; pellizcar, Ctrl + rueda o los botones acercan; arrastrar una
    esfera la mueve. Los nombres compensan el zoom para seguir legibles.
  - Estados de carga, vacío («Aún no tienes recuerdos»), sin coincidencias y error con reintento.
- **Datos demo** (`seed_demo`): María (40 recuerdos y 77 conexiones, para ver un mapa grande), Mateo y Juliana
  (4 recuerdos y 1 conexión cada uno). Valentina y Santiago muestran el mapa vacío. Los recuerdos
  y sus títulos están escritos a mano en la demo: en la app los creará HU9.

### Endpoints nuevos

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/v1/memories/` | Grafo del mapa: `nodes` (con `match`) y `edges` (`source`, `target`, `score`, `reason`); filtros `?sensory_type=` y `?emotion=` |
| GET | `/api/v1/memories/{id}/` | Un recuerdo propio con sus huellas, de la más reciente a la más antigua |

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Esferas sin orden cronológico, color de su emoción y tamaño por huellas | `apps/traces/tests.py` (`MemoryMapTests`: `test_scenario_1_*`, `test_a_tie_follows_the_calendar_rule`, `test_affine_memories_are_linked_with_score_and_reason`); `MemoryAffinityTests` (pesos, tono, umbral, máximo de 4, recuerdos solos); `frontend/src/app/hu10.test.tsx` (escenario 1); `frontend/src/lib/force-layout.test.ts` | Cumplido |
| 2 · Tocar una esfera muestra sus huellas; el filtro deja solo las que coinciden | `MemoryMapTests` (`test_scenario_2_*`, `test_nobody_else_can_open_my_memory`); `hu10.test.tsx` (escenario 2: esfera, línea, teclado, panel, filtros); `frontend/e2e/hu10-mapa.spec.ts` | Cumplido (los filtros atenúan lo que no coincide) |
| 3 · 200 recuerdos en menos de 3 s | `test_scenario_3_two_hundred_memories_open_in_under_three_seconds` (2 consultas, máximo 4 conexiones); `hu10-mapa.spec.ts` (navegador real, CPU 4 veces más lenta, mediana de 3 aperturas) | Cumplido |

**Rendimiento medido** (200 recuerdos y 400 conexiones): unos 1,0 s en el navegador de un
computador y una mediana de 1,7 a 1,9 s simulando un teléfono de gama media. La primera apertura
en ese teléfono simulado tarda de 2,3 a 3,5 s; unos 2 s son el cambio de pantalla de la app, que
ocurre también con un solo recuerdo.

**Para probarlo:** `python manage.py seed_demo --reset`, entrar con `maria.demo@example.com` y
abrir **Recuerdos**. En Render, después de mezclar, poner `EVOCA_SEED_DEMO=reset` una vez.

---

## HU9 · Recibir recuerdos sugeridos por IA (SCRUM-19)

**Historia.** Como usuario, quiero que la IA agrupe mis huellas afines en recuerdos y me
explique por qué, para revivirlos sin organizarlos a mano y poder aceptar, renombrar o separar
cada sugerencia.

**Escenarios**

1. Dado que tengo 5 o más huellas, cuando abro «Recuerdos», entonces la app me sugiere al menos
   un recuerdo que agrupa huellas afines.
2. Dado que veo una sugerencia de recuerdo, cuando la reviso, entonces veo por qué se agrupó, y
   puedo aceptarla, renombrarla o separarla.
3. Dado que se hacen las pruebas del MVP, cuando se miden las sugerencias, entonces al menos el
   70 % son aceptadas por los usuarios.

**Subtareas:** Backend SCRUM-51 · Interfaz SCRUM-52 · Pruebas SCRUM-53.

### Qué se hizo

- **Backend** (`apps/traces/memory_ai.py`, `MemoryViewSet`, migración `0003`):
  - Gemini recibe las huellas que no están en ningún recuerdo (hasta las 60 más recientes, con
    tipo, emoción, intensidad, fecha, etiquetas y nota) y devuelve de 1 a 5 grupos de 2 a 6
    huellas con nombre y explicación, en JSON con esquema. Se validan y se guardan como
    `suggested` con `suggested_at`.
  - Decidir: `accept` (con nombre opcional), `PATCH` para renombrar, `DELETE traces/<id>/`
    para separar una huella (la última no se separa: se descarta) y `discard`. Aceptar o
    descartar guarda `decided_at`; los descartados quedan con estado `discarded` para medir.
  - Sin clave, error, tiempo agotado (`EVOCA_AI_MEMORY_TIMEOUT`, 15 s) o respuesta inservible no
    hay sugerencias y la app sigue igual; nunca se registran notas en los logs. Límite de 5
    llamadas por minuto por persona.
  - `python manage.py suggestion_stats`: tasa de aceptación (aceptados / decididos) sin datos
    personales.
- **Interfaz** (`SuggestionsSection`, `MemorySuggestionCard`, `use-memory-suggestions`):
  - Encima del mapa, en **Recuerdos**. Al abrir, carga las sugerencias pendientes; si no hay y
    vale la pena (5 huellas o más y al menos dos sueltas), le pide a la IA una vez por sesión.
    Luego, botón «Buscar sugerencias».
  - Cada tarjeta muestra el nombre, «Por qué van juntas», la emoción dominante y la lista de
    huellas, con «Quitar» en cada una; botones «Aceptar recuerdo», «Renombrar» y «Descartar».
  - Al aceptar, el mapa se recarga y aparece la esfera. Mensajes propios para pocas huellas
    (cuántas faltan), todas agrupadas, IA no disponible y «no encontró afinidades».
- **Datos demo**: Valentina tiene dos sugerencias pendientes (sin depender de la IA); Santiago,
  17 huellas sueltas para ver a la IA real proponer.

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Con 5 huellas o más, al abrir «Recuerdos» hay al menos un recuerdo sugerido | `apps/traces/tests.py` (`MemorySuggestionsTests`: `test_with_five_traces_the_ai_suggests_at_least_one_memory`, `test_the_ai_reads_the_ungrouped_traces…`, `test_with_fewer_than_five_traces…`, `test_when_every_trace_is_already_in_a_memory…`, `test_without_a_key_or_with_errors…`, `test_gemini_is_called_with_its_own_schema…`); `MemorySuggestionParsingTests`; `frontend/src/app/hu9.test.tsx` (escenario 1) | Cumplido |
| 2 · Veo por qué se agrupó y puedo aceptar, renombrar o separar | `test_accepting_moves_the_memory_to_the_map`, `test_accepting_with_another_name…`, `test_renaming…`, `test_separating_a_trace…`, `test_the_last_trace_cannot_be_separated…`, `test_discarding…`, `test_nobody_else_can_see_or_decide…`; `hu9.test.tsx` (escenario 2) | Cumplido |
| 3 · Al menos el 70 % de las sugerencias son aceptadas en las pruebas del MVP | `test_acceptance_rate_counts_only_ai_suggestions` y `suggestion_stats` | Medible; el valor sale de las pruebas con personas |

**Prueba con Gemini real** (cuenta de Santiago, 17 huellas): 3 recuerdos en 1,7 s, con nombres
y explicaciones coherentes («Ecos de la memoria familiar», «Nostalgia de lo que ya no está»,
«Instantes de calma y alivio»).

---

## Notas para próximas HU (acordadas con el equipo)

### HU9 · Recuerdos sugeridos por IA

El equipo aprobó este enfoque:

- Gemini (solo desde el backend) lee las huellas de la persona y propone grupos con **título** y
  **explicación** de por qué se agruparon. Se guardan como `Memory` con `status = suggested`.
- En **Recuerdos**, la persona revisa cada sugerencia y puede **aceptarla, renombrarla o
  separarla**. Al aceptarla pasa a `accepted` y aparece como esfera en el mapa de HU10, que la
  conecta sola según su afinidad.
- Los recuerdos escritos a mano en `seed_demo` son un ejemplo de lo que la IA debería proponer.
- El escenario 3 (70 % de sugerencias aceptadas) no se cumple con código: se propone registrar
  cada aceptación, cambio de nombre o separación para medir la tasa en las pruebas del MVP.

### HU15 · Islas: sumar la similitud por significado a la afinidad del mapa

Hoy las conexiones de HU10 solo ven coincidencias exactas (mismo tipo de sensación, misma
emoción, misma etiqueta). No saben que «olor a lluvia sobre el pasto» y «la tormenta de anoche»
hablan de lo mismo. Al implementar **HU15** se acordó incluir esto en sus criterios:

- Usar los *embeddings* de las notas que crea **HU12** (se calculan una sola vez, al guardar cada
  huella) para agregar una cuarta parte a la afinidad: **significado parecido**.
- Pesos sugeridos: sensaciones 0,4 · emoción 0,25 · etiquetas 0,1 · significado 0,25.
- El motivo de la conexión lo diría, por ejemplo «Hablan de cosas parecidas».
- Abrir el mapa **no** debe llamar a la IA: solo se comparan números ya guardados, para seguir
  abriendo en menos de 3 s, con resultados estables, explicables y que se puedan probar.
- Las islas de HU15 se pueden formar a partir de estos recuerdos y sus conexiones.

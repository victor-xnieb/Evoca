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
| 3 | HU12 · Buscar recuerdos por significado con IA | SCRUM-22 | Medium | SCRUM-60 | SCRUM-61 | SCRUM-62 | `feature/hu12-busqueda-significado-ia` | En dev |
| 4 | HU13 · Ver estadísticas de mis sensaciones | SCRUM-23 | Medium | SCRUM-63 | SCRUM-64 | SCRUM-65 | `feature/hu13-estadisticas-sensaciones` | En dev |
| 5 | HU11 · Marcar mis recuerdos centrales | SCRUM-21 | Low | SCRUM-57 | SCRUM-58 | SCRUM-59 | `feature/hu11-recuerdos-centrales` | En dev |
| 6 | HU14 · Ver patrones de mi semana con IA | SCRUM-24 | Low | SCRUM-66 | SCRUM-67 | SCRUM-68 | `feature/hu14-patrones-semana-ia` | En dev |
| 7 | HU15 · Descubrir mis islas | SCRUM-25 | Low | SCRUM-69 | SCRUM-70 | SCRUM-71 | `feature/hu15-islas` | En dev |
| 8 | HU16 · Grabar una nota de voz en la huella | SCRUM-26 | Lowest | SCRUM-72 | SCRUM-73 | SCRUM-74 | `feature/hu16-nota-de-voz` | En dev |

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

## HU12 · Buscar recuerdos por significado con IA (SCRUM-22)

**Historia.** Como usuario, quiero escribir una frase como «olor a lluvia» y encontrar huellas
parecidas aunque no usen esas palabras, para recuperar un recuerdo sin acordarme de la fecha.

**Escenarios**

1. Dado que tengo huellas guardadas, cuando escribo una frase como «olor a lluvia», entonces
   obtengo huellas relacionadas por significado, no solo por palabras idénticas.
2. Dado que la búsqueda tiene resultados, cuando los veo, entonces aparecen ordenados por
   relevancia, y cada uno indica qué tan parecido es.
3. Dado que la búsqueda no tiene resultados, cuando termina la búsqueda, entonces la app me lo
   dice y me propone registrar una nueva huella.

**Subtareas:** Backend SCRUM-60 · Interfaz SCRUM-61 · Pruebas SCRUM-62.

### Qué se hizo

- **Backend** (`apps/traces/search.py`, `TraceEmbedding`, migración `0004`, acción `search`):
  - Vectores de significado con `gemini-embedding-2` (768 dimensiones, normalizados) por huella,
    con tipo, emoción, etiquetas y nota; guardados y recalculados solo si cambia la huella o el
    modelo. Se borran con la huella.
  - `POST /api/v1/traces/search/` con la frase en el cuerpo: similitud de coseno contra las
    huellas de la persona, mínimo 0,6 y a 0,1 del mejor, máximo 10 resultados, con nivel
    `high` (≥ 0,70), `medium` (≥ 0,65) o `low`.
  - Límite gratuito de 100 vectores por minuto: 40 huellas nuevas por búsqueda y `pending`
    con las que faltan; `manage.py embed_traces` prepara todo por lotes.
  - Respaldo por palabras (sin tildes) si la IA no está, falla o llega al límite. La frase no se
    guarda ni se registra; 30 búsquedas por minuto por persona.
  - **Palabras de riesgo (corrección pedida al revisar):** una frase como «suicidio» o «matarse»
    no se busca ni se envía a la IA (`apps/support/risk.py`, misma regla que la app) y responde
    `risk`. La migración `support/0003` agrega al **borrador** de HU6 «matarse», «suicidarse»,
    «me voy a matar» y otras formas; las versiones aprobadas por el asesor no se tocan.
- **Interfaz** (`MeaningSearch`, `SimilarityMeter`, `use-meaning-search`):
  - Barra «Buscar por significado» en **Mis huellas**; los resultados reemplazan la lista
    mientras hay búsqueda y se conservan al abrir una huella y volver.
  - Cada resultado: medidor de tres barras con «Muy parecida», «Parecida» o «Algo parecida».
  - Sin resultados: «No encontramos huellas parecidas a «…»» y «Registrar una huella», que abre
    **Nueva huella** con la frase en la nota.
  - Avisos de búsqueda por palabras y de huellas por preparar; error con reintento.
  - Al escribir una palabra de riesgo se abre de inmediato la pantalla de ayuda de HU6 («Volver a
    la búsqueda»); al buscarla aparece «Estamos aquí contigo» con «Ver líneas de ayuda», sin
    llamar al servidor.

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Huellas relacionadas por significado, no solo por palabras | `apps/traces/tests.py` (`MeaningSearchTests`: `test_scenario_1_*`, `test_vectors_are_stored_and_reused…`, `test_the_vector_describes…`, `test_each_search_prepares_at_most_the_limit…`, `test_gemini_request_uses_the_embedding_model…`, `test_only_my_traces_are_searched`); `frontend/src/app/hu12.test.tsx` (escenario 1) | Cumplido |
| 2 · Ordenadas por relevancia y con qué tan parecidas son | `test_scenario_2_*`, `test_only_traces_close_to_the_best_one…`; `hu12.test.tsx` (escenario 2) | Cumplido |
| 3 · Sin resultados, lo dice y propone registrar una huella | `test_scenario_3_*`, `test_without_traces…`; `hu12.test.tsx` (escenario 3: lleva a Nueva huella con la frase) | Cumplido |
| Palabras de riesgo (HU6) en la búsqueda | `test_a_phrase_with_risk_words_is_neither_searched_nor_sent_to_the_ai`, `test_risk_words_are_matched_whole…`; `apps/support/tests.py` (`test_the_draft_includes_more_ways_of_saying_it`, `test_the_server_finds_risk_words_like_the_app`); `hu12.test.tsx` (HU12 con HU6) | Cumplido |
| Errores de la IA (subtarea de pruebas) | `test_when_the_ai_fails_it_searches_by_words…` (tiempo agotado, sin red, 429), `test_without_a_key…`, `test_vectors_of_the_wrong_size…`, `test_limits_searches_per_person` | Cumplido |

**Prueba con Gemini real** (María, 125 huellas): «olor a lluvia» → 7 resultados en 1,1 s, todos
de lluvia o humedad («Olor a tierra mojada…» primero); «nervios antes de algo importante» → «El
olor a hospital en la cita médica me puso nerviosa»; «astronautas en Marte» → sin resultados.

---

## HU13 · Ver estadísticas de mis sensaciones (SCRUM-23)

**Historia.** Como usuario, quiero ver qué aromas, canciones o lugares registro más y con qué
ánimo, para descubrir qué cosas de mi entorno me afectan más.

**Escenarios**

1. Dado que tengo 10 o más huellas, cuando abro las estadísticas, entonces veo cuántas huellas
   registro por tipo y los 5 elementos más frecuentes, en los últimos 30 días o en total.
2. Dado que veo un tipo de sensación, cuando reviso su detalle, entonces veo el ánimo promedio
   asociado, presentado como observación y no como diagnóstico.
3. Dado que tengo menos de 10 huellas, cuando abro las estadísticas, entonces veo un mensaje que
   me dice cuántas huellas faltan.

**Subtareas:** Backend SCRUM-63 · Interfaz SCRUM-64 · Pruebas SCRUM-65.

**Decisiones del equipo.** La huella no guarda el elemento concreto (solo tipo, nota, emoción,
intensidad y etiquetas), así que «elemento» era ambiguo. El equipo eligió que la IA lo saque de
la nota (por ejemplo «café», «salsa», «parque») y se guarde. Las estadísticas van como sección
«Mis sensaciones» en **Ánimo**, sin botón nuevo en la barra.

### Qué se hizo

- **Backend (SCRUM-63):**
  - `TraceElement` (migración `traces/0005_trace_element`): el elemento de cada huella, con un
    resumen del tipo, la nota, el modelo y las instrucciones para saber cuándo volver a pedirlo.
  - `apps/traces/stats.py`: la IA (Gemini, solo desde el servidor) recibe solo el tipo y la nota,
    40 por llamada, y responde un elemento corto por huella; la respuesta se valida y se limpia
    (minúsculas, sin artículo, máximo 40 caracteres). Las notas con palabras de riesgo (HU6) no
    se envían.
  - `GET /api/v1/traces/stats/?period=month|all`: huellas por tipo (los seis, de más a menos),
    ánimo promedio de cada tipo y general (`mood_score`, emoción + intensidad), y los 5 elementos
    más frecuentes del periodo y de cada tipo. Un elemento es el mismo con o sin tildes y
    mayúsculas, pero «café» aroma y «café» sabor son dos. Empates: primero el más reciente. No
    llama a la IA. Con menos de 10 huellas: `ready: false` y `missing`.
  - `POST /api/v1/traces/stats/elements/`: reconoce hasta 80 huellas pendientes por pedido (las
    más recientes primero), 10 pedidos por minuto por persona; si la IA falla responde
    `unavailable` y no registra notas en los logs. Comando `extract_elements` para dejar una
    cuenta lista de una vez.
  - `seed_demo`: 12 huellas recientes de María que repiten café, lluvia, salsa, parque, cobija y
    arepa (sin recuerdo y con ánimo agradable o neutro: no cambian el mapa ni la orientación).
- **Interfaz (SCRUM-64):**
  - Sección «Mis sensaciones» en Ánimo, con pestañas «30 días» y «Total».
  - Gráfica de barras (Recharts) de huellas por tipo y, debajo, un botón por tipo con su número
    (accesible por teclado y lector de pantalla). Al tocarlo se abre su detalle: «En tus huellas
    de aroma, tu ánimo promedio fue 4,1 de 5, parecido a tu promedio general (4,0). Es
    una observación de tus registros, no un diagnóstico.» y sus elementos.
  - «Lo que más registras»: los 5 elementos con su tipo, cuántas huellas y su ánimo.
  - Mientras la IA reconoce: «Estamos reconociendo los elementos de N huellas…». Si falla: aviso
    con «Intentar de nuevo»; los tipos y el ánimo siguen completos.
  - Con menos de 10 huellas: «Te faltan N huellas para ver tus estadísticas» con «Registrar una
    huella». Sin huellas en 30 días: invita a ver el total. Error de carga con reintento.
  - Componente `SensationBars` con su historia en Storybook.

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Huellas por tipo y 5 elementos más frecuentes, en 30 días o en total | `apps/traces/tests.py` (`SensationStatsTests`: `test_scenario_1_*`, `test_every_type_appears…`, `test_the_same_element_is_grouped…`, `test_the_same_name_in_two_types…`, `test_only_my_traces…`, `test_opening_the_stats_does_not_call_the_ai`); `frontend/src/app/hu13.test.tsx` (escenario 1) | Cumplido |
| 2 · Ánimo promedio de un tipo, como observación y no diagnóstico | `test_scenario_2_*` (ánimo con emoción + intensidad); `hu13.test.tsx` (escenario 2: más alto, más bajo o parecido al general; siempre «no un diagnóstico») | Cumplido |
| 3 · Con menos de 10 huellas dice cuántas faltan | `test_scenario_3_*` (7, 0 y 10 huellas; sin gastar IA); `hu13.test.tsx` (escenario 3, plural y singular) | Cumplido |
| Exactitud de cálculos y errores de la IA (subtarea de pruebas) | `test_elements_are_stored_and_not_asked_again`, `test_editing_the_note_asks_again…`, `test_the_ai_reads_only_the_type_and_the_note`, `test_notes_with_risk_words_are_not_sent_to_the_ai`, `test_each_request_recognizes_at_most_the_limit…`, `test_big_requests_go_in_batches_of_40`, `test_when_the_ai_fails…` (sin red, tiempo agotado, 429), `test_unreadable_answers…`, `test_limits_extraction_requests_per_person`, `test_stats_of_200_traces_use_few_queries`, `ElementParsingTests`; `hu13.test.tsx` (reconociendo, IA no disponible, error) | Cumplido |

**Prueba con Gemini real** (María, 137 huellas): las 137 notas se reconocen en dos pedidos (unos
13 s en total, una sola vez). En 30 días: 32 huellas, ánimo 4,0; lo que más registra es café (4),
salsa, lluvia, cobija y parque (3). Valentina (sin elementos aún) ve «Estamos reconociendo los
elementos de 17 huellas…» y en unos 2 s aparecen sus elementos.

---

## HU11 · Marcar mis recuerdos centrales (SCRUM-21)

**Historia.** Como usuario, quiero marcar los recuerdos que más me definen como centrales, para
tenerlos a la mano y que la app los destaque en mi mapa.

**Escenarios**

1. Dado que veo un recuerdo, cuando lo marco o lo desmarco como central, entonces el cambio se
   guarda, hasta un máximo de 5 recuerdos centrales.
2. Dado que tengo recuerdos centrales, cuando abro el mapa o mi sección de centrales, entonces
   los veo destacados.
3. Dado que tengo un recuerdo central, cuando lo borro, entonces deja de aparecer en la sección
   y se libera su lugar.

**Subtareas:** Backend SCRUM-57 · Interfaz SCRUM-58 · Pruebas SCRUM-59.

**Decisión.** El escenario 3 dice «lo borro», pero hasta ahora un recuerdo del mapa no se podía
borrar. Se agregó «Borrar recuerdo» (con confirmación): borra el recuerdo, no sus huellas.

### Qué se hizo

- **Backend (SCRUM-57):**
  - `Memory.is_central` y `Memory.central_at` (migración `traces/0006_memory_central`).
  - `POST /api/v1/memories/{id}/central/` con `{"central": true|false}`: solo recuerdos del
    mapa; como mucho 5 por persona (el sexto responde 400 `central_limit`; la cuenta se hace con
    la persona bloqueada para que dos pedidos a la vez no pasen del máximo). Marcar dos veces
    conserva la fecha. Un recuerdo sin huellas no ocupa lugar.
  - `DELETE /api/v1/memories/{id}/`: borra un recuerdo del mapa y sus vínculos, no sus huellas;
    si era central, libera su lugar. Una sugerencia no se borra (se descarta, HU9).
  - El mapa (`GET /memories/`) y el detalle traen `central` y `central_at`; el mapa además
    `central_count` y `max_central`.
  - `seed_demo`: María tiene 3 recuerdos centrales (le quedan 2 lugares).
- **Interfaz (SCRUM-58):**
  - En el panel de un recuerdo: «Marcar como central» / «Quitar de centrales», con «Llevas N de
    5»; con 5 centrales el botón se desactiva y dice por qué. «Borrar recuerdo» pide
    confirmación y aclara que las huellas no se borran.
  - En el mapa, los centrales llevan una estrella y un anillo dorado, siempre muestran su nombre
    y su nombre accesible termina en «recuerdo central».
  - «Mis recuerdos centrales», encima del mapa: «N de 5» y un botón por central (del primero
    que se marcó al último) que lo abre en el mapa. Sin centrales, explica cómo marcarlos.
  - Historia «Recuerdo central (HU11)» de `MemorySphere` en Storybook.

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Marcar o desmarcar se guarda, hasta 5 | `apps/traces/tests.py` (`CentralMemoryTests`: `test_scenario_1_*`, `test_a_memory_without_traces…`, `test_only_a_memory_of_the_map…`, `test_the_body_must_say…`, `test_i_cannot_mark_or_delete_memories_of_others`, `test_others_central_memories_do_not_count`); `frontend/src/app/hu11.test.tsx` (escenario 1, límite y error) | Cumplido |
| 2 · Destacados en el mapa y en su sección | `test_scenario_2_*`; `apps/accounts/tests.py` (`test_maria_has_three_central_memories`); `hu11.test.tsx` (escenario 2: sección en orden, estrella y anillo, nombre accesible) | Cumplido |
| 3 · Al borrarlo deja de aparecer y libera su lugar | `test_scenario_3_*` (sus huellas siguen; una sugerencia no se borra); `hu11.test.tsx` (escenario 3: confirmación, cancelar) | Cumplido |

---

## HU14 · Ver patrones de mi semana con IA (SCRUM-24)

**Historia.** Como usuario, quiero un resumen semanal con patrones entre mis huellas y mi ánimo,
para entender qué me hace sentir mejor o peor.

**Escenarios**

1. Dado que tengo al menos 5 registros en la semana, cuando llega el resumen semanal, entonces
   recibo de 1 a 3 patrones entre mis huellas y mi ánimo.
2. Dado que veo un patrón, cuando lo reviso, entonces está escrito como observación y indica con
   qué registros se calculó.
3. Dado que estoy en ajustes, cuando desactivo el resumen semanal, entonces dejo de recibirlo.

**Subtareas:** Backend SCRUM-66 · Interfaz SCRUM-67 · Pruebas SCRUM-68.

**Decisiones del equipo.** La app no tiene correo ni notificaciones en segundo plano, así que el
resumen «llega» como tarjeta en **Inicio**. Resume la semana anterior completa (lunes a domingo):
desde el lunes se ve el mismo resumen toda la semana, preparado una sola vez.

### Qué se hizo

- **Backend (SCRUM-66):**
  - `WeeklySummary` (un resumen por persona y semana, con sus patrones y los id de las huellas de
    cada uno) y `WeeklySummaryPreference` (activo por defecto); migración `traces/0007_weekly_summary`.
  - `apps/traces/weekly.py`: la IA recibe las huellas de la semana numeradas (día y hora, tipo,
    emoción, intensidad, ánimo, etiquetas y nota; sin las notas con palabras de riesgo) y responde
    de 1 a 3 patrones con los números de sus huellas. Se valida todo: como mucho 3, cada uno con
    al menos 2 huellas reales, sin repetidos y de hasta 240 caracteres; si no queda ninguno válido
    no se guarda nada.
  - `GET /api/v1/weekly-summary/` (no llama a la IA), `POST /api/v1/weekly-summary/generate/` (5
    por minuto) y `GET/PUT /api/v1/weekly-summary/settings/`.
- **Interfaz (SCRUM-67):**
  - Tarjeta «Tu semana» en Inicio: rango de fechas y número de registros; los patrones; «Calculado
    con N registros» despliega esas huellas (fecha, tipo, emoción, intensidad y ánimo) y cada una
    abre su detalle. Aclara que son observaciones, no diagnósticos, y enlaza a Ajustes.
  - Estados: preparando, menos de 5 registros («faltó 1»), IA no disponible con «Intentar de
    nuevo», y sin tarjeta si está desactivado o no se puede consultar.
  - **Ajustes → Resumen semanal**: interruptor como el del recordatorio.

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Con 5 registros o más llegan de 1 a 3 patrones | `apps/traces/tests.py` (`WeeklySummaryTests`: `test_scenario_1_*`, `test_with_fewer_than_5_traces…`, `test_only_my_traces…`; `LastWeekTests`); `frontend/src/app/hu14.test.tsx` (escenario 1) | Cumplido |
| 2 · Escrito como observación y con sus registros | `test_scenario_2_*`, `test_notes_with_risk_words…`; `hu14.test.tsx` (escenario 2) | Cumplido |
| 3 · Al desactivarlo deja de llegar | `test_scenario_3_*`; `hu14.test.tsx` (escenario 3: Inicio sin tarjeta, interruptor en Ajustes) | Cumplido |
| Semana con pocos datos y fallo de la IA (subtarea de pruebas) | `test_with_fewer_than_5_traces…`, `test_when_the_ai_fails…` (sin red, tiempo agotado, 429), `test_without_a_key…`, `test_scenario_1_without_valid_patterns…`, `test_limits_generation_requests_per_person`; `hu14.test.tsx` (pocos registros, IA no disponible, error) | Cumplido |

**Prueba con Gemini real** (semana del 16 al 22 de noviembre): María (9 huellas) recibe 2 patrones
en 1,1 s; Mateo (7) recibe «Las noches en que registraste texturas o colores asociados a la
tristeza tu ánimo fue muy bajo», calculado con 3 registros; una cuenta con 4 huellas ve que faltó 1.

---

## HU15 · Descubrir mis islas (SCRUM-25)

**Historia.** Como usuario, quiero que la IA agrupe mis recuerdos en grandes temas y me muestre
cuáles pesan más, para entender qué es lo que más me define.

**Escenarios**

1. Dado que tengo 15 o más recuerdos, cuando abro «Mis islas», entonces la IA propone entre 2 y 6
   islas, y cada una tiene nombre y porcentaje de peso.
2. Dado que veo una isla, cuando la toco, entonces veo los recuerdos que la forman y por qué se
   agruparon.
3. Dado que renombré u oculté una isla, cuando la IA vuelve a calcular mis islas, entonces mi
   cambio se conserva.

**Subtareas:** Backend SCRUM-69 · Interfaz SCRUM-70 · Pruebas SCRUM-71.

**Decisiones del equipo.** El peso de una isla es la parte de **huellas** que reúnen sus recuerdos
(entre las islas visibles). Las islas se calculan la primera vez y después **a pedido**: si los
recuerdos cambian, la vista lo avisa. «Mis islas» es una **pestaña en Recuerdos**. Además se
cumplió lo acordado en HU10: el significado parecido (HU12) suma a la afinidad del mapa.

### Qué se hizo

- **Backend (SCRUM-69):**
  - Afinidad del mapa con cuatro partes (sensaciones 0,4 · emoción 0,25 · etiquetas 0,1 ·
    significado 0,25). El vector de cada recuerdo es el promedio de los de sus huellas (HU12),
    leído de la base: abrir el mapa no llama a la IA. Motivo «hablan de cosas parecidas».
  - `Island` (nombre de la IA, nombre propio, explicación, oculta, recuerdos) e
    `IslandsCalculation` (cuándo y con qué recuerdos se calcularon); migración `traces/0008_islands`.
  - `apps/traces/islands.py`: la IA recibe los recuerdos numerados (nombre, emoción, sensaciones,
    etiquetas, huellas, explicación y afines) y las islas actuales, y responde de 2 a 6 islas.
    Se valida todo (cada isla con 2 recuerdos o más, sin repetidos, nombres de hasta 60
    caracteres); si quedan menos de 2, no se guarda nada y se conservan las anteriores.
  - Emparejamiento al recalcular: cada isla nueva actualiza la anterior con al menos la mitad de
    recuerdos en común, conservando su nombre propio y si está oculta.
  - `GET /api/v1/islands/`, `POST /api/v1/islands/calculate/` (5 por minuto) y
    `PATCH /api/v1/islands/{id}/`.
- **Interfaz (SCRUM-70):**
  - Pestañas «Mapa» y «Mis islas» en Recuerdos (`?vista=islas`).
  - Cada isla: nombre, porcentaje grande con barra, esferas de sus recuerdos y cuántas huellas.
    Al tocarla: «Por qué se agruparon», sus recuerdos (cada uno se abre en el mapa) y los botones
    Renombrar, Volver al nombre de la IA y Ocultar / Mostrar. Las ocultas quedan en «Islas
    ocultas (N)».
  - Estados: la IA buscando las islas, menos de 15 recuerdos («Te faltan N recuerdos»), aviso de
    recuerdos cambiados con «Volver a calcular», IA no disponible (se siguen viendo las de antes).

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Con 15 recuerdos, de 2 a 6 islas con nombre y peso | `apps/traces/tests.py` (`IslandsTests`: `test_scenario_1_*`, `test_with_fewer_than_15_memories…`, `test_invalid_islands_are_dropped…`, `test_the_ai_reads_memories_but_not_notes`, `test_only_my_memories`; `IslandWeightTests`); `frontend/src/app/hu15.test.tsx` (escenario 1) | Cumplido |
| 2 · Al tocarla, sus recuerdos y por qué se agruparon | `test_scenario_2_*`; `hu15.test.tsx` (escenario 2: abre el recuerdo en el mapa) | Cumplido |
| 3 · Nombre cambiado o isla oculta se conservan al recalcular | `test_scenario_3_*`, `test_an_island_that_changes_a_lot…`, `test_an_empty_name…`, `test_it_warns_when_memories_changed…`; `hu15.test.tsx` (escenario 3) | Cumplido |
| Significado en el mapa (acordado) | `MemoryMeaningAffinityTests` (pesos, escala, motivo, sin vectores, el mapa no llama a la IA) y los pesos nuevos en `MemoryAffinityTests` | Cumplido |
| Pocos recuerdos y fallos de la IA (subtarea de pruebas) | `test_with_fewer_than_15_memories…`, `test_when_the_ai_fails…` (sin red, tiempo agotado, 429), `test_without_a_key…`, `test_limits_calculations_per_person`; `hu15.test.tsx` | Cumplido |

**Prueba con Gemini real** (María, 40 recuerdos, 8,4 s): Momentos de calma 26 %, Amigos y
celebraciones 25 %, La familia y el hogar 23 %, Retos y nervios 14 %, Despedidas y nostalgia
12 % (3 recuerdos quedan sin isla). En el mapa, 36 de 71 conexiones dicen «hablan de cosas
parecidas», por ejemplo «Tardes de lluvia en Bogotá» con «Días de calma».

---

## HU16 · Grabar una nota de voz en la huella (SCRUM-26)

**Historia.** Como usuario, quiero grabar una nota de voz en lugar de escribir, para registrar una
huella cuando no puedo teclear.

**Escenarios**

1. Dado que estoy en «Nueva huella», cuando grabo una nota de voz de hasta 60 segundos, entonces
   puedo escucharla antes de guardar.
2. Dado que grabé una nota de voz, cuando guardo, entonces se guarda como una huella con su tipo,
   emoción e intensidad.
3. Dado que no he dado permiso al micrófono, cuando intento grabar, entonces la app me explica
   por qué lo necesita y me deja escribir la nota.

**Subtareas:** Backend SCRUM-72 · Interfaz SCRUM-73 · Pruebas SCRUM-74.

**Decisiones del equipo.** El audio se guarda en la **misma base de Neon** (tabla nueva, sin
crear nada nuevo en Neon ni agregar librerías), porque Render no tiene disco persistente. Con una
nota de voz, la **nota escrita es opcional**. La voz no se transcribe (no está en la HU).

### Qué se hizo

- **Backend (SCRUM-72):**
  - `VoiceNote` (audio, tipo, duración y tamaño; se borra con la huella); migración
    `traces/0009_voice_note`.
  - `POST /api/v1/traces/with-voice/`: crea la huella y su nota de voz en una sola transacción.
    Se valida la huella como siempre, la firma del archivo (WebM, Ogg u MP4/AAC), la duración
    (hasta 60 s) y el tamaño (1,5 MB).
  - `GET /api/v1/traces/{id}/voice/`: el audio, solo para su dueño y con caché privada.
  - Cada huella trae `voice_duration` (las listas la anotan sin cargar el audio). Sin voz, la
    nota escrita sigue siendo obligatoria. Las huellas con solo voz cuentan en las estadísticas
    (HU13) y en el resumen semanal (HU14), pero sin texto que mandar a la IA.
- **Interfaz (SCRUM-73):**
  - `VoiceRecorderPanel` en Nueva huella: «Grabar nota de voz», contador «Grabando 0:12 de 1:00»
    con barra, «Detener», reproductor para escucharla, «Volver a grabar» y «Quitar la nota de
    voz». Se detiene sola a los 60 s y suelta el micrófono al terminar.
  - Calidad de la voz (ajuste tras la prueba del equipo, que se oía entrecortada): el micrófono
    se pide sin supresión de ruido ni cancelación de eco, que cortaban la voz baja, con control de
    volumen y una sola pista, y se graba a 64 kbps (~480 KB por minuto).
  - Sin permiso: «Para grabar, Evoca necesita permiso para usar tu micrófono: así guarda tu voz
    en esta huella, solo para ti…» con «Escribir la nota» (lleva al campo de la nota) e
    «Intentar de nuevo». Sin micrófono o en un navegador sin grabación, también lo dice.
  - `VoicePlayer` en el detalle de la huella (pide el audio con la sesión) y «Nota de voz · 0:42»
    en las tarjetas. Historias de la grabadora en Storybook.

### Evidencia

| Escenario | Prueba automática | Estado |
| --- | --- | --- |
| 1 · Grabar hasta 60 s y escucharla antes de guardar | `frontend/src/app/hu16.test.tsx` (escenario 1: graba, se detiene, reproductor, suelta el micrófono; se detiene sola a los 60 s); `apps/traces/tests.py` (`VoiceNoteTests`: `test_only_real_audio_of_up_to_60_seconds`, `test_scenario_1_only_the_owner_can_listen_to_it`) | Cumplido |
| 2 · Se guarda como huella con tipo, emoción e intensidad | `test_scenario_2_*`, `test_iphone_recordings_are_accepted_too`, `test_the_list_brings_the_duration…`, `test_deleting_the_trace_deletes_its_voice`; `hu16.test.tsx` (escenario 2: guarda sin nota escrita y se escucha en el detalle) | Cumplido |
| 3 · Sin permiso del micrófono explica por qué y deja escribir | `hu16.test.tsx` (escenario 3: permiso negado, sin micrófono, navegador sin grabación); `test_scenario_3_without_voice_the_written_note_is_required` | Cumplido |
| Permisos, duración máxima y reproducción (subtarea de pruebas) | Las anteriores, más la prueba de punta a punta en Chrome con un micrófono simulado: graba 3,5 s, se escucha, se guarda (201) sin nota escrita, se reproduce en el detalle y otra cuenta recibe 404 | Cumplido |

---

## Corrección del Sprint 1 hecha en este sprint: el ánimo según la emoción

La profesora señaló que la intensidad no es el ánimo: una tristeza de intensidad 2 no es un mal
día, pero una de 5 sí, y con la alegría es al revés. Desde la rama `fix/animo-segun-emocion` el
ánimo de una huella (`apps/traces/mood.py`) es la intensidad en alegría, calma y gratitud;
6 − intensidad en tristeza, ansiedad, enojo y miedo; y 3 (neutro) en nostalgia. Lo usan la
orientación de HU6 y la gráfica de HU4. El detalle y sus pruebas están en `docs/SPRINT1.md`
(«Corrección posterior»). Las HU de este sprint que hablen de ánimo usan `mood_score`.

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

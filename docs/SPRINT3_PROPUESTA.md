# Propuesta Sprint 3 · Mi Cuadernillo

Borrador para revisar con el equipo antes de crear las historias en Jira (proyecto SCRUM). Sigue
el formato del Sprint 2: historia, tres escenarios Dado/Cuando/Entonces y tres subtareas
(Backend, Interfaz, Pruebas). Las notas técnicas explican qué se reutiliza y qué decisiones
faltan; no son criterios de aceptación.

**Idea central.** Evoca guarda lo que sentiste (huellas) y el Cuadernillo guarda cómo lo cuentas.
Lo que la persona escribe puede convertirse en recuerdos, y cada recuerdo nacido del diario puede
volver a abrir su página.

**Épica nueva:** «Cuadernillo».

| Orden | HU | Prioridad | Puntos (estimado) | Depende de |
| --- | --- | --- | --- | --- |
| 1 | HU17 · Escribir en mi Cuadernillo | Highest | 5 | — |
| 2 | HU18 · Evocar recuerdos a partir de lo que escribo | High | 8 | HU17, HU9 |
| 3 | HU19 · Escribir cartas a mi yo del futuro | Medium | 3 | HU17 |
| 4 | HU20 · Pegar la canción del día en mi página | Low | 3 | HU17 |
| 5 | HU21 · Dibujar y pintar en mi página | Low | 8 | HU17 |

El núcleo (HU17, HU18 y HU19) cabe en un sprint y ya cumple la idea central. HU20 y HU21 entran
si hay tiempo; si no, pasan al siguiente.

**Fuera de este sprint (backlog):** hoja que se dobla como papel real con sonido, acuarela que se
mezcla, stickers y washi tape, fotos pegadas con gestos de dos dedos, playlists por emoción,
descarga en PDF y página guiada de gratitud.

---

## HU17 · Escribir en mi Cuadernillo

**Historia.** Como usuario, quiero un cuadernillo donde escribir cómo me siento, que se vea y se
sienta como un cuaderno de papel, para contar con mis palabras lo que vivo.

**Criterios de aceptación**

**Escenario 1**

- **Dado que** abro la pestaña «Cuadernillo»
- **Cuando** creo un cuaderno con título, color de portada y tipo de papel (rayado, cuadriculado, de puntos o liso)
- **Entonces** aparece en mi estantería y puedo abrirlo y escribir en sus páginas con letra manuscrita y el color de tinta que elija

**Escenario 2**

- **Dado que** escribí en una página
- **Cuando** salgo y vuelvo a abrirla
- **Entonces** el texto, el tipo de papel y la tinta se conservan
- **Y** la página muestra la emoción dominante de ese día con su color y su nombre (o un marcador neutro si ese día no hay huellas)

**Escenario 3**

- **Dado que** escribo en una página
- **Cuando** aparece una palabra de riesgo de la lista aprobada
- **Entonces** se muestra de inmediato la pantalla con líneas de ayuda, igual que al registrar una huella

**Subtareas**

- **Backend:** modelos Cuaderno y Página, API con los datos de la persona autenticada, página incluida en la exportación y el borrado de la cuenta.
- **Interfaz:** pestaña «Cuadernillo», estantería con portadas, cuaderno abierto con páginas, papeles, 3 o 4 tipografías manuscritas (16 px o más), color de tinta, resaltador y subrayado, modo oscuro con «papel nocturno».
- **Pruebas:** crear, escribir y conservar; aislamiento entre personas; palabras de riesgo; acceso solo con PIN; exportación y borrado.

**Notas técnicas**

- Reutiliza: PIN y bloqueo, palabras de riesgo (HU6), emoción dominante del día (HU7), exportación y borrado (Sprint 1).
- Al pasar de página: deslizamiento con sombra suave. El doblez realista queda en el backlog.
- Resaltar y subrayar requiere un editor de texto enriquecido (propuesta: TipTap). **Es una librería nueva: hay que aprobarla.**
- Las fuentes manuscritas se guardan dentro de la app (por ejemplo Caveat, Patrick Hand, Kalam); no se cargan de Google en cada visita.
- **Decisión pendiente:** ¿cifrar el texto de las páginas dentro de la app? Neon ya cifra en disco; cifrar además en la app requiere la librería `cryptography` y una clave en Render.

---

## HU18 · Evocar recuerdos a partir de lo que escribo

**Historia.** Como usuario, quiero que la IA lea lo que escribí en mi cuadernillo y me sugiera
huellas y recuerdos, para que lo que cuento se convierta en recuerdos sin organizarlos a mano.

**Criterios de aceptación**

**Escenario 1**

- **Dado que** escribí en una página
- **Cuando** toco «Evocar»
- **Entonces** la IA propone huellas sacadas del texto (tipo, emoción e intensidad) agrupadas en uno o varios recuerdos sugeridos, cada uno con nombre y explicación de por qué se agruparon
- **Y** las palabras de donde salió cada huella se iluminan en la página con el color de su emoción

**Escenario 2**

- **Dado que** veo un recuerdo sugerido desde mi página
- **Cuando** lo acepto, lo renombro, quito una de sus huellas o lo descarto
- **Entonces** solo se guarda lo que acepto, y aparece como esfera en mi mapa

**Escenario 3**

- **Dado que** acepté un recuerdo que nació de una página
- **Cuando** toco su esfera en el mapa
- **Entonces** puedo abrir la página donde nació
- **Y** desde la página, las palabras iluminadas me llevan al recuerdo

**Subtareas**

- **Backend:** envío del texto a Gemini (solo desde el servidor) con respuesta en JSON validado; huellas y recuerdos sugeridos vinculados a la página; filtro de términos de diagnóstico.
- **Interfaz:** botón «Evocar», palabras iluminadas, animación de luces hacia «Recuerdos» con la esfera sugerida (borde punteado), revisión de la sugerencia como en HU9 y enlaces página ↔ recuerdo.
- **Pruebas:** validación del formato, sin diagnósticos, fallo o lentitud de la IA (el diario sigue igual), aislamiento entre personas y medición de aceptación.

**Notas técnicas**

- Reutiliza el flujo de HU9 (sugerir, aceptar, renombrar, separar, descartar) y el registro de aceptación para la meta del 70 %.
- «Evocar» es un botón y no algo automático al cerrar la página: la persona decide qué texto sale hacia la IA.
- Si la página tiene palabras de riesgo, no se envía a la IA (como en HU12 y HU13).
- La IA nunca diagnostica ni recomienda tratamientos. El servidor descarta cualquier sugerencia con términos de diagnóstico.
- **Privacidad:** en el plan gratuito, Google puede usar lo que se envía a Gemini. Durante el proyecto solo se usan datos de ejemplo.
- Animación con Motion; con «reducir movimiento» activado se muestra sin desplazamientos.
- «Esto se parece a tu recuerdo…» (relacionar páginas nuevas con recuerdos existentes) puede ir en esta HU o en una posterior.

---

## HU19 · Escribir cartas a mi yo del futuro

**Historia.** Como usuario, quiero escribir una carta que solo pueda abrir en una fecha que yo
elija, para reencontrarme con lo que sentía.

**Criterios de aceptación**

**Escenario 1**

- **Dado que** estoy en mi cuadernillo
- **Cuando** escribo una carta y elijo una fecha futura de apertura
- **Entonces** la carta queda sellada (un sobre con sello de cera) y no puedo leer su contenido antes de esa fecha

**Escenario 2**

- **Dado que** llegó la fecha de una carta
- **Cuando** abro la app
- **Entonces** veo un aviso amable en Inicio y puedo abrir el sobre para leerla

**Escenario 3**

- **Dado que** tengo cartas selladas
- **Cuando** veo mi cuadernillo
- **Entonces** veo cuántas cartas tengo y cuándo se abre cada una, sin ver su contenido

**Subtareas**

- **Backend:** modelo Carta con fecha de apertura; el servidor no entrega el contenido antes de esa fecha; incluida en la exportación y el borrado.
- **Interfaz:** página especial de carta, sobre sellado con animación de apertura y aviso en Inicio.
- **Pruebas:** no se puede leer antes de tiempo (ni por la API), se abre el día indicado, palabras de riesgo y aislamiento entre personas.

**Notas técnicas**

- Como el recordatorio de HU5, el aviso llega al abrir la app, no con la app cerrada.
- **Decisión pendiente:** si la exportación de datos (Ley 1581) incluye el contenido de las cartas aún selladas (recomendado: sí, porque son datos de la persona).

---

## HU20 · Pegar la canción del día en mi página

**Historia.** Como usuario, quiero pegar en mi página una canción de Spotify o YouTube, para que
mi día también tenga su música.

**Criterios de aceptación**

**Escenario 1**

- **Dado que** estoy escribiendo una página
- **Cuando** pego un enlace de Spotify o de YouTube
- **Entonces** queda pegado como una cinta o casete con su portada y su título

**Escenario 2**

- **Dado que** abro una página con canción
- **Cuando** la página carga
- **Entonces** la canción no suena sola: suena solo cuando toco reproducir, y puedo pausarla

**Escenario 3**

- **Dado que** pego un enlace que no es de Spotify ni de YouTube, o que no existe
- **Cuando** intento guardarlo
- **Entonces** la app me dice que no lo reconoce y la página sigue igual

**Subtareas**

- **Backend:** validar el enlace (solo dominios de Spotify y YouTube) y obtener portada y título (oEmbed); se guarda solo el enlace.
- **Interfaz:** casete pegado en la página y reproductor oficial incrustado al tocarlo.
- **Pruebas:** enlaces válidos e inválidos, sin reproducción automática.

**Notas técnicas**

- Derechos de autor: no se sube ni se guarda música, solo el enlace y el reproductor oficial.
- Atar la canción a una huella o a un recuerdo, y las playlists por emoción, quedan para una HU posterior.

---

## HU21 · Dibujar y pintar en mi página

**Historia.** Como usuario, quiero dibujar y pintar sobre mi página con el dedo o un lápiz táctil,
para expresar lo que no sé decir con palabras.

**Criterios de aceptación**

**Escenario 1**

- **Dado que** estoy en una página
- **Cuando** toco el lápiz y dibujo con lápiz, pincel o borrador, con los colores de Evoca u otros
- **Entonces** el trazo aparece sobre la misma página, junto al texto, de forma fluida

**Escenario 2**

- **Dado que** dibujé algo
- **Cuando** toco deshacer o rehacer
- **Entonces** el dibujo vuelve atrás o adelante paso a paso

**Escenario 3**

- **Dado que** dibujé en una página
- **Cuando** la cierro y la vuelvo a abrir
- **Entonces** el dibujo se conserva tal como lo dejé

**Subtareas**

- **Backend:** guardar los trazos de la página como datos vectoriales (no como imagen), con un límite de tamaño.
- **Interfaz:** modo dibujo, herramientas, paleta con los colores de las emociones, deshacer y rehacer, soporte de dedo y lápiz táctil.
- **Pruebas:** guardar y volver a abrir, deshacer y rehacer, y rendimiento en celular.

**Notas técnicas**

- Propuesta: canvas con la librería `perfect-freehand` para trazos naturales. **Es una librería nueva: hay que aprobarla.**
- La acuarela que se mezcla y la mancha de fondo quedan en el backlog: es lo más costoso de toda la propuesta.

---

## Decisiones pendientes del equipo

1. **Librerías nuevas:** un editor de texto enriquecido (TipTap) para HU17 y `perfect-freehand` para HU21.
2. **Cifrado de las páginas dentro de la app**, además del cifrado en disco de Neon (librería `cryptography` y una clave en Render).
3. **Cartas selladas en la exportación de datos:** ¿se incluyen?
4. **Orden y alcance del sprint:** confirmar que el núcleo es HU17, HU18 y HU19.

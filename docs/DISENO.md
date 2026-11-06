# Recursos visuales de Evoca

Esferas de emociones y fondos (estático y animados) que generó el equipo con IA. Este
documento dice qué hay, dónde vive cada versión, cómo se usa y qué reglas de legibilidad
hay que respetar.

## Inventario y rutas

El material fuente está en `diseno/` (raíz del repositorio). **No se modifica y no se sirve
en producción.** La app usa versiones optimizadas que genera `npm run assets` (desde
`frontend/`, con [sharp](https://sharp.pixelplumbing.com) como herramienta de desarrollo).

| Fuente en `diseno/` | Qué es | Versión en la app | Peso fuente → app |
| --- | --- | --- | --- |
| `Bola_amarilla.png` | Esfera de alegría (miel dorada) | `frontend/src/assets/orbs/orb-alegria.webp` (+ `-sm`) | 157 KB → 14,0 KB + 2,9 KB |
| `Bola_calma.png` | Esfera de calma (vidrio esmerilado verde agua) | `orb-calma.webp` (+ `-sm`) | 88 KB → 8,1 KB + 2,6 KB |
| `Bola_gratitud.png` | Esfera de gratitud (pétalos rosa) | `orb-gratitud.webp` (+ `-sm`) | 148 KB → 11,8 KB + 3,3 KB |
| `Bola_nostalgia.png` | Esfera de nostalgia (papel envejecido) | `orb-nostalgia.webp` (+ `-sm`) | 125 KB → 11,8 KB + 2,8 KB |
| `Bola_azul.png` | Esfera de tristeza (gota con remolino) | `orb-tristeza.webp` (+ `-sm`) | 140 KB → 12,0 KB + 3,1 KB |
| `Bola_naranja.png` | Esfera de ansiedad (ovillo de hilos) | `orb-ansiedad.webp` (+ `-sm`) | 226 KB → 30,4 KB + 4,2 KB |
| `Bola_roja.png` | Esfera de enojo (roca volcánica) | `orb-enojo.webp` (+ `-sm`) | 181 KB → 16,8 KB + 3,6 KB |
| `Bola_morado.png` | Esfera de miedo (niebla violeta) | `orb-miedo.webp` (+ `-sm`) | 135 KB → 11,1 KB + 3,0 KB |
| `Fondo_estatico.jpg` | Fondo claro con grano de papel (EXIF 6: se ve horizontal) | `frontend/src/assets/backgrounds/bg-claro-estatico.webp` (1920×1072) | 2,4 MB → 24 KB |
| `fondo_claro_suave_vertical.mp4` y `.webm` | Fondo claro suave (pasteles desenfocados, centro casi crema), 720×1280, 11 s | `frontend/public/media/bg-claro-vertical.webm` / `.mp4` (+ `-poster.webp`) | 73 KB WebM / 498 KB MP4 + 6,2 KB |
| `fondo_claro_suave_horizontal.mp4` y `.webm` | Fondo claro suave, 1280×720, 11 s | `frontend/public/media/bg-claro-horizontal.webm` / `.mp4` (+ `-poster.webp`) | 80 KB WebM / 505 KB MP4 + 6,4 KB |
| `fondo_claro_vertical.mp4`, `fondo_claro_loop.mp4` | Fondos claros anteriores (círculos de borde duro) | Ya no se usan; quedan como material fuente | — |
| `fondo_oscuro_vertical.mp4` | Fondo oscuro animado, 720×1280, 9 s | `frontend/public/media/bg-oscuro-vertical.mp4` (+ `-poster.webp`) | 605 KB → igual + 35,7 KB |
| `fondo_oscuro_horizontal.mp4` | Fondo oscuro animado, 1280×720, 9 s | `frontend/public/media/bg-oscuro-horizontal.mp4` (+ `-poster.webp`) | 617 KB → igual + 36,8 KB |

- Las esferas conservan 500×500 px (no se amplían); la versión `-sm` mide 128×128 px.
  La esfera ocupa cerca de dos tercios de la imagen: el margen transparente deja espacio
  al resplandor.
- El fondo estático se gira según su EXIF al convertirlo: los píxeles quedan horizontales.
- Los videos se copian sin recodificar, con su WebM si viene en `diseno/` (el claro sí; el
  oscuro no). Si hay `ffmpeg` (en el `PATH` o en la variable `FFMPEG`), el script genera el
  WebM que falte (VP9, `-crf 38`) y los posters. En `frontend/src/lib/backgrounds.ts` el WebM
  se ofrece primero y el MP4 queda de respaldo (`video(nombre, { webm: true })`).
- Los posters son el primer fotograma de cada video (a 0,05 s): así el cambio de la imagen
  al video no se nota.
- En modo claro el video suave se ve tal cual, sin atenuar (solo un leve tinte de la emoción
  reciente arriba a la derecha). Los anillos del hero de Inicio aparecen en los dos modos.

### Cambiar una esfera

Basta con reemplazar el PNG en `diseno/` (mismo nombre) y ejecutar `npm run assets`. El único
lugar del código que referencia las imágenes es `frontend/src/lib/emotionOrbs.ts`; ningún
componente cambia. Sirve, por ejemplo, para regenerar la esfera de alegría, que quedó en un
ámbar (#E4A64D aprox.) más oscuro que el token de alegría (#FFC93C).

## Mapa de emociones

Las claves son las de `frontend/src/lib/emotions.ts`.

| Clave | Archivo fuente | Texto alternativo |
| --- | --- | --- |
| `alegria` | `Bola_amarilla.png` | Esfera de alegría |
| `calma` | `Bola_calma.png` | Esfera de calma |
| `gratitud` | `Bola_gratitud.png` | Esfera de gratitud |
| `nostalgia` | `Bola_nostalgia.png` | Esfera de nostalgia |
| `tristeza` | `Bola_azul.png` | Esfera de tristeza |
| `ansiedad` | `Bola_naranja.png` | Esfera de ansiedad |
| `enojo` | `Bola_roja.png` | Esfera de enojo |
| `miedo` | `Bola_morado.png` | Esfera de miedo |

**Las esferas son decoración.** Los colores de chips, gráfica y calendario siguen saliendo
de los tokens de `frontend/src/styles/tokens.css`; no se derivan tokens de las imágenes.

## Componentes

- `EmotionOrb`: una esfera (`emotion`, `size` = `sm` | `md` | `lg` | número, `animated`,
  `decorative`, `priority`). Usa la imagen de 128 px hasta 64 px de lado, define `width` y
  `height` (sin saltos de diseño) y carga diferida salvo `priority`. El resplandor usa el
  color del token, más fuerte en modo oscuro. La flotación (Motion, solo `transform`) tiene
  fases y duraciones distintas por esfera y se apaga con movimiento reducido (ver
  «Interacción»).
- `EmotionOrbCluster`: las cinco esferas de la tarjeta «Aún no tienes huellas».
- `AnimatedBackground`: fondo de toda la app, montado por `AppShell`.
  - Elige el video por tema (el del interruptor) y orientación (`matchMedia`, hook
    `useOrientation`).
  - Muestra primero la imagen fija y monta el video cuando el navegador está ocioso
    (`requestIdleCallback`).
  - Con movimiento reducido, ahorro de datos (`navigator.connection.saveData`) o
    `variant="static"` no descarga video: en claro usa `bg-claro-estatico.webp`; en oscuro,
    el poster del video oscuro.
  - Pausa el video con la pestaña oculta y al salir del fundido entre temas (nunca hay dos
    reproduciéndose).
  - `AppShell` acepta `background="static"` para pantallas calmadas.

## Reglas de legibilidad

Los videos tienen zonas de color. Por eso:

1. **Ningún texto va directamente sobre el video.** El contenido va en `GlassCard`: vidrio
   translúcido (64 % de `--card` en claro, 55 % en oscuro) con `blur(20px) saturate(1.3)`. El
   desenfoque fuerte borra el detalle del video que queda detrás; eso es lo que permite la
   transparencia sin perder contraste.
2. En oscuro, encima del video hay una capa marrón al 45 % (`.evoca-video-scrim`) y un
   degradado detrás del interruptor de tema. En claro no hay capa: el video se ve completo.
3. El encabezado ya no lleva la marca: «evoca.» (`EvocaWordmark`) vive en el hero de Inicio,
   con el color del texto del tema y el punto pasando por los colores de las emociones.
4. **Contraste ≥ 4,5:1 contra el fondo renderizado** (3:1 para texto grande). Si algún punto
   del video lo baja, se sube la opacidad o el desenfoque de esa tarjeta; nunca se oscurece
   el texto.
5. Cómo se mide: con Playwright se pausa el video en 3 momentos (15, 45 y 75 % del bucle),
   se registra cada texto visible, se vuelve transparente y se captura lo que queda detrás.
   Luego se compara el color del texto con esos píxeles (percentil 2, para ignorar bordes
   sueltos). Se descarta el texto tapado (por ejemplo, por la barra inferior).

Peor contraste medido en Inicio (texto de cada tarjeta contra su fondo real, en los 3
momentos):

| Tema · tamaño | Tarjeta «Buenas noches» | Tarjeta «Aún no tienes huellas» | Tarjetas de pasos | Navegación |
| --- | --- | --- | --- | --- |
| Claro · escritorio | 5,2:1 | 6,2:1 | 5,0:1 | 6,4:1 |
| Claro · celular | 5,3:1 | 5,3:1 | 5,5:1 | 5,9:1 |
| Oscuro · escritorio | 5,5:1 | 5,1:1 | 5,6:1 | 7,0:1 |
| Oscuro · celular | 5,6:1 | 5,5:1 | 5,4:1 | 6,5:1 |

Las demás pantallas (Ajustes, «Muy pronto», 404) siguen con tarjetas casi opacas
(`bg-card/92`) y halo `bg-background/75` en los títulos. Pasarán a `GlassCard` cuando se
construyan en su HU.

## Interacción

La inspiración es el tipo de interacción: cursor que se transforma, tarjetas que
reaccionan, objetos que flotan. Todo usa la paleta, los tokens y las esferas de Evoca.

### GlassCard

Base de todas las tarjetas (`components/evoca/GlassCard.tsx`, estilos `.evoca-glass` en
`index.css`).

- **Aspecto:** vidrio translúcido con desenfoque, borde fino con degradado (más claro
  arriba a la izquierda), sombra suave y esquinas muy redondeadas.
- **Con mouse** (`(pointer: fine) and (hover: hover)`):
  - se eleva 4 px y su sombra crece;
  - un foco de luz del color de acento sigue al puntero (variables `--mx` y `--my`, escritas
    en `pointermove` sin re-renderizar React);
  - se inclina hasta ±5° con un resorte de Motion;
  - el borde se ilumina con el acento (`accent="calma"` o cualquier color CSS);
  - lo marcado con `.evoca-parallax` (íconos, esferas) se mueve hasta 6 px en sentido
    contrario.

  Al presionar se hunde (`scale(0.98)`). Con foco de teclado también se eleva y se ilumina.
- **En táctil:** sin inclinación ni foco de luz; al tocar, leve hundimiento y un destello
  del color de acento.
- **Con movimiento reducido:** sin inclinación, elevación ni paralaje; solo cambia el borde
  al pasar el mouse o con foco.
- **Clicable:** con `to` es un enlace (`<a>`) y con `onClick` un `<button>`, ambos con foco
  visible. Sin ninguno de los dos es un contenedor (`as="div" | "section" | "article" | "li"`).
- **Respaldo casi sólido (94 %):** sin `backdrop-filter`, con `prefers-reduced-transparency`
  o en equipos con 2 GB de memoria o menos, o con 2 núcleos o menos (`data-glass="solid"`,
  `lib/device.ts`).

### InteractiveCursor

Seguidor decorativo del mouse, montado una vez en `AppShell`
(`components/evoca/InteractiveCursor.tsx`, reglas en `lib/cursor.ts`).

- **Cuándo existe:** solo con puntero fino y sin movimiento reducido.
- **Qué es:** un punto y un anillo que lo sigue con retraso de resorte. El cursor del sistema
  sigue visible; el seguidor se suma.
- **Accesibilidad:** es `aria-hidden`, no recibe clics (`pointer-events: none`) y no
  reemplaza el foco del teclado.
- **Cómo cambia según lo que hay debajo** (gana el elemento más cercano):

  | Debajo | Estado | Cómo se ve |
  | --- | --- | --- |
  | `GlassCard` (`data-cursor="card"`) | `card` | Burbuja blanda del color de acento, un poco adaptada al tamaño de la tarjeta |
  | Enlace, botón, interruptor o pestaña | `link` | Burbuja del acento heredado (`--cursor-accent`) |
  | Elemento con `data-cursor-label="Ver"` | `link` o `card` | Muestra la etiqueta dentro de la burbuja |
  | Esfera animada (`data-cursor="orb"`) | `orb` | Grande y cálido, con el color de la emoción |
  | Texto o campo de formulario | `text` | Desaparece para no estorbar |

- **Al presionar:** se contrae.
- **Rendimiento:**
  - un solo manejador global para `pointermove`, `pointerdown`, `pointerup` y `pointerout`;
  - la posición se actualiza con `requestAnimationFrame` y `transform`;
  - el estado va en atributos `data-state`, así que React nunca se re-renderiza al mover el
    mouse.

### Esferas vivas

- **Flotación** (`EmotionOrb animated`):
  - 8 a 14 px de subida, deriva horizontal de 3 a 6 px, giro de ±3° y respiración de escala
    de 1 a 1,03;
  - cada propiedad tiene su propia duración (ciclo base de 5 a 9 s según la esfera) y un
    punto de partida distinto;
  - se crea con `animate()` de Motion. La prop `animate` no servía: el
    `AnimatePresence initial={false}` de las rutas salta las animaciones de montaje;
  - se pausa fuera de la pantalla (`IntersectionObserver`) y con la pestaña oculta.
- **Magnetismo** (solo con mouse): cuando el puntero está cerca, la esfera se acerca hasta
  10 px.
- **Dentro de una `GlassCard`:** las esferas del conjunto se separan un poco al entrar el
  mouse y vuelven al salir.
- **Al tocarla:** rebota (aumenta y vuelve) y deja una onda del color de su emoción.
- **En celular:** flota, pero sin magnetismo.
- **Con movimiento reducido:** queda quieta.
- **Rendimiento:** solo se animan `transform` y `opacity`. El resplandor (`drop-shadow`) es
  fijo y no se anima.

## Para las HU de los siguientes pasos

Preparado y documentado; **no implementado en esta rama**.

| HU | Uso previsto |
| --- | --- |
| HU1 | **Hecho.** La pantalla de bloqueo (`LockScreen`) y las de entrar, registrarse y crear el PIN (`AuthLayout`) usan el mismo `AnimatedBackground`, con el teclado y los formularios en una `GlassCard` |
| HU2 | **Hecho.** `EmotionChip` usa la esfera pequeña como ícono de cada emoción y `EmotionPicker` muestra las 8 emociones como un conjunto de esferas |
| HU3 | **Hecho.** `TraceCard` muestra la esfera pequeña de la emoción de cada huella (vía `EmotionChip`) en «Mis huellas» y en Inicio |
| HU4 | La leyenda de la gráfica usa esferas pequeñas; las líneas y puntos siguen usando los tokens de color, no las imágenes |
| HU5 | La ilustración del recordatorio puede usar una esfera con animación suave (`animated`) |
| HU6 | Fondo estático y calmado: `AppShell background="static"` (o `AnimatedBackground variant="static"`), sin video ni esferas en movimiento |
| HU7 | El calendario usa colores de los tokens, no imágenes; las esferas solo aparecen en el detalle del día, en tamaño pequeño |
| HU8 | La emoción sugerida por la IA aparece con su esfera pequeña, con una entrada animada breve |

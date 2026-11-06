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
| `fondo_claro_vertical.mp4` | Fondo claro animado, 720×1280, 8 s | `frontend/public/media/bg-claro-vertical.mp4` (+ `-poster.webp`) | 1,01 MB → igual + 9,5 KB |
| `fondo_claro_loop.mp4` | Fondo claro animado, 1280×720, 8 s | `frontend/public/media/bg-claro-horizontal.mp4` (+ `-poster.webp`) | 901 KB → igual + 9,5 KB |
| `fondo_oscuro_vertical.mp4` | Fondo oscuro animado, 720×1280, 9 s | `frontend/public/media/bg-oscuro-vertical.mp4` (+ `-poster.webp`) | 605 KB → igual + 35,7 KB |
| `fondo_oscuro_horizontal.mp4` | Fondo oscuro animado, 1280×720, 9 s | `frontend/public/media/bg-oscuro-horizontal.mp4` (+ `-poster.webp`) | 617 KB → igual + 36,8 KB |

- Las esferas conservan 500×500 px (no se amplían); la versión `-sm` mide 128×128 px.
  La esfera ocupa cerca de dos tercios de la imagen: el margen transparente deja espacio
  al resplandor.
- El fondo estático se gira según su EXIF al convertirlo: los píxeles quedan horizontales.
- Los videos se copian sin recodificar. Si hay `ffmpeg` (en el `PATH` o en la variable
  `FFMPEG`), el script además genera WebM (VP9, `-crf 38`) y los posters; hay que añadir
  la fuente WebM en `frontend/src/lib/backgrounds.ts` (está comentado dónde).
- Los posters son el primer fotograma de cada video: así el cambio de la imagen al video
  no se nota.

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
  fases y duraciones distintas por esfera y se apaga con movimiento reducido.
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

Los videos tienen zonas de color fuerte. Por eso:

1. **Ningún texto va directamente sobre el video.** El contenido va en tarjetas casi opacas:
   `bg-card/92` con `backdrop-blur-sm`.
2. Encima del video hay una capa de refuerzo: crema al 35 % en claro y marrón al 45 % en
   oscuro (`.evoca-video-scrim`). Detrás del encabezado hay un degradado extra para el logo.
3. El texto suelto (saludo del hero, títulos de página) lleva un halo `bg-background/75` con
   desenfoque.
4. Contraste medido en el peor píxel de cada fondo con esas capas encima. En los videos se
   revisó un fotograma cada 0,5 s de todo el bucle (17 a 19 fotogramas). Mínimo exigido:
   4,5:1.

| Fondo | Texto en tarjeta | Texto secundario en tarjeta | Texto secundario con halo | Logo bajo el degradado del encabezado | Texto suelto sin tarjeta ni halo |
| --- | --- | --- | --- | --- | --- |
| Claro vertical (video) | 15,0:1 | 6,3:1 | 5,0:1 | 11,0:1 | 4,0:1; secundario 1,7:1 (no permitido) |
| Claro horizontal (video) | 15,0:1 | 6,3:1 | 5,0:1 | 10,0:1 | 4,0:1; secundario 1,7:1 (no permitido) |
| Claro estático | 15,8:1 | 6,7:1 | 5,9:1 | 10,1:1 o más | 10,1:1; secundario 4,3:1 (no permitido) |
| Oscuro vertical (video) | 13,9:1 | 7,9:1 | 6,8:1 | 10,7:1 | 3,7:1; secundario 2,1:1 (no permitido) |
| Oscuro horizontal (video) | 13,9:1 | 7,9:1 | 6,8:1 | 10,6:1 | 3,7:1; secundario 2,1:1 (no permitido) |

La última columna muestra por qué se exige tarjeta o halo: sin ellos ningún tema llega a
4,5:1 en todo el bucle.

## Para las HU de los siguientes pasos

Preparado y documentado; **no implementado en esta rama**.

| HU | Uso previsto |
| --- | --- |
| HU1 | La pantalla del PIN y la de bloqueo usan el mismo `AnimatedBackground` (dentro de `AppShell` o directamente), con la tarjeta del teclado opaca encima |
| HU2 | `EmotionChip` usa la esfera pequeña (`EmotionOrb size="sm" decorative`) como ícono de cada emoción; el selector de 8 emociones se ve como un conjunto de esferas |
| HU3 | `TraceCard` muestra la esfera pequeña de la emoción de cada huella |
| HU4 | La leyenda de la gráfica usa esferas pequeñas; las líneas y puntos siguen usando los tokens de color, no las imágenes |
| HU5 | La ilustración del recordatorio puede usar una esfera con animación suave (`animated`) |
| HU6 | Fondo estático y calmado: `AppShell background="static"` (o `AnimatedBackground variant="static"`), sin video ni esferas en movimiento |
| HU7 | El calendario usa colores de los tokens, no imágenes; las esferas solo aparecen en el detalle del día, en tamaño pequeño |
| HU8 | La emoción sugerida por la IA aparece con su esfera pequeña, con una entrada animada breve |

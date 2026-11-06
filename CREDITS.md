# Créditos y piezas externas

Evoca reutiliza algunas piezas de terceros. Antes de copiar cada una se revisaron sus
condiciones de uso; todas se adaptaron a los tokens de `frontend/src/styles/tokens.css`
para que la interfaz se vea como una sola familia.

## Componentes y estilos copiados al proyecto

| Pieza | Autor o fuente | Licencia (verificada) | Enlace | Archivo en Evoca | Adaptación |
| --- | --- | --- | --- | --- | --- |
| Aurora Text | Magic UI | MIT ([LICENSE.md](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md)) | https://magicui.design/docs/components/aurora-text | `frontend/src/components/evoca/AuroraText.tsx` | Paleta de emociones; fundido de capas con opacidad en lugar de animar `background-position` |
| Ripple | Magic UI | MIT ([LICENSE.md](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md)) | https://magicui.design/docs/components/ripple | `frontend/src/components/evoca/Ripple.tsx` | Ondas con colores de emoción, menos ondas, respeta movimiento reducido |
| Loader «new-sloth-45» | Javierrocadev en Uiverse.io | MIT ([uiverse.io](https://uiverse.io), [repo galaxy](https://github.com/uiverse-io/galaxy/blob/main/LICENSE)) | https://uiverse.io/Javierrocadev/new-sloth-45 | `frontend/src/components/evoca/EvocaLoader.tsx` | Puntos con colores de emoción, curva de Evoca, etiqueta accesible |
| Switch «rotten-rat-40» | AmIt-DasIT en Uiverse.io | MIT ([uiverse.io](https://uiverse.io), [repo galaxy](https://github.com/uiverse-io/galaxy/blob/main/LICENSE)) | https://uiverse.io/AmIt-DasIT/rotten-rat-40 | `frontend/src/components/evoca/ThemeSwitch.tsx` | React con `role="switch"`, colores de tokens, conectado al tema |
| Variantes CSS de shadcn/ui | shadcn | MIT | https://github.com/shadcn-ui/ui | `frontend/src/styles/shadcn-variants.css` | Copia parcial de `shadcn@4.23.0/dist/tailwind.css` para no instalar la CLI |
| Componentes base (Button, Dialog, Tabs, Input, Label, Checkbox) | shadcn/ui (sobre Radix UI) | MIT | https://ui.shadcn.com | `frontend/src/components/ui/` | Generados con la CLI de shadcn; toman los colores de los tokens de Evoca |

## Ilustraciones

| Pieza | Fuente | Archivo |
| --- | --- | --- |
| «Orbes» y «Florecer» (Lottie) | Creación propia del equipo, generadas en código a partir de los tokens de color | `frontend/src/components/evoca/lottie/animations.ts` |
| Ícono de la app y favicon | Creación propia del equipo | `frontend/public/` |

## Recursos visuales generados con IA

Los generó el equipo con herramientas de inteligencia artificial generativa. El material
fuente está en `diseno/` y no se sirve en producción; las versiones que usa la app se
obtienen con `npm run assets` (sharp) y se describen en [docs/DISENO.md](docs/DISENO.md).

| Recurso | Archivo fuente | Archivo en la app | Herramienta de generación | Procesado |
| --- | --- | --- | --- | --- |
| Esferas de las 8 emociones | `diseno/Bola_*.png` | `frontend/src/assets/orbs/orb-<emoción>.webp` y `-sm.webp` | IA generativa; herramienta exacta: por completar por el equipo | sharp (WebP) |
| Fondo claro estático | `diseno/Fondo_estatico.jpg` | `frontend/src/assets/backgrounds/bg-claro-estatico.webp` | IA generativa; herramienta exacta: por completar por el equipo | sharp (rotación EXIF, 1920 px, WebP) |
| Fondos claros suaves (vertical y horizontal) | `diseno/fondo_claro_suave_*.mp4` y `.webm` | `frontend/public/media/bg-claro-*.webm` / `.mp4` | IA generativa; herramienta exacta: por completar por el equipo | Entregados ya optimizados por el equipo (MP4 y WebM); posters extraídos del primer fotograma |
| Fondos oscuros animados (vertical y horizontal) | `diseno/fondo_oscuro_*.mp4` | `frontend/public/media/bg-oscuro-*.mp4` | IA generativa; herramienta exacta: por completar por el equipo | Copia sin recodificar (ffmpeg no estaba disponible); posters extraídos del primer fotograma |

## Tipografías

| Fuente | Autor | Licencia | Enlace |
| --- | --- | --- | --- |
| Fraunces | Undercase Type (Phaedra Charles y Flavia Zimbardi) | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Fraunces |
| Figtree | Erik Kennedy | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Figtree |

Se sirven desde el propio proyecto con los paquetes de Fontsource (`@fontsource-variable/*`),
que redistribuyen los archivos de Google Fonts.

## Íconos

[Lucide](https://lucide.dev) (licencia ISC), mediante el paquete `lucide-react`.

## Fuentes evaluadas y no usadas

| Fuente | Motivo |
| --- | --- |
| Skiper UI | Sus [Términos](https://skiper-ui.com/docs/terms-of-service) (revisados el 2026-11-05) prohíben reproducir, copiar o redistribuir material del sitio y no publican una licencia para los componentes gratuitos. Como no se pudo confirmar el permiso, no se copió ninguna pieza. |
| React Bits | No se necesitó en esta entrega (su licencia MIT + Commons Clause debe revisarse antes de usarlo). |

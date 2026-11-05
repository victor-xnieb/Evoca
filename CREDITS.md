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

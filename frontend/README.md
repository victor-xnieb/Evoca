# Evoca · frontend

PWA en React + TypeScript (Vite) que consume la API de Django en `/api/v1/`.
Las instrucciones completas para levantar backend y frontend están en el
[README principal](../README.md).

## Comandos

| Comando | Para qué sirve |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run lint` | Oxlint (falla con cualquier advertencia) |
| `npm run typecheck` | Verificación de tipos con TypeScript |
| `npm test` | Pruebas con Vitest + Testing Library |
| `npm run build` | Paquete de producción (incluye service worker y manifest de la PWA) |
| `npm run storybook` | Catálogo de componentes en http://localhost:6006 |
| `npm run build-storybook` | Versión estática del catálogo (`storybook-static/`) |
| `npm run assets` | Regenera esferas, fondo estático y videos desde `../diseno/` (ver [docs/DISENO.md](../docs/DISENO.md)) |

## Estructura

```text
src/
  app/                 rutas, layout raíz y proveedores globales
  assets/              esferas y fondo estático optimizados (los genera npm run assets)
  components/evoca/    catálogo propio de Evoca (cada componente con su historia)
  components/ui/       componentes base de shadcn/ui (Radix)
  hooks/               useReducedMotion, useTheme, useOrientation, useSaveData
  lib/                 cliente de API, emociones, esferas (emotionOrbs), fondos, formato, movimiento
  pages/               pantallas
  providers/           ThemeProvider, MotionPreferenceProvider
  styles/tokens.css    ÚNICA fuente de los tokens de diseño
  mocks/               datos de ejemplo para Storybook y pruebas
public/media/          videos de fondo y sus posters (fuera del paquete de JavaScript)
```

## Reglas del sistema de diseño

- Colores, radios, sombras, tipografía y curvas de animación salen de `src/styles/tokens.css`.
  Tailwind los expone desde `src/index.css` (`bg-emotion-calma`, `font-display`, `shadow-soft`…).
- El color nunca va solo: chips, días del calendario y puntos de la gráfica llevan ícono o texto.
- Las animaciones usan Motion y solo animan opacidad y transformaciones. Todas respetan
  `useReducedMotion()`; en Storybook se puede forzar desde la barra («Movimiento»).
- La orientación hacia ayuda (`SupportCard`) es sobria: sin animación ni colores de alarma.
- Cada componente nuevo o modificado de `components/evoca/` actualiza su historia.
- Ningún texto va directamente sobre el fondo animado: el contenido va en tarjetas casi
  opacas (`bg-card/92` con `backdrop-blur-sm`) y el texto suelto lleva un halo
  (`bg-background/75`). Las esferas son decoración; los colores salen de los tokens.

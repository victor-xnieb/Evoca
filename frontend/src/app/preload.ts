/** «Recuerdos» (el mapa, HU10) es la pantalla más pesada: se carga una sola vez y se puede precargar. */
export const loadMemoriesPage = () => import("@/pages/MemoriesPage")

/** Precarga «Recuerdos» cuando el navegador está libre, para que el mapa abra rápido. */
export function preloadMemoriesPage() {
  void loadMemoriesPage()
}

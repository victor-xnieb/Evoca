/**
 * Pistas del dispositivo que se aplican antes del primer pintado. En equipos con muy poca
 * memoria o pocos núcleos el desenfoque del vidrio cuesta caro: las tarjetas pasan a un
 * fondo casi sólido (`data-glass="solid"` en <html>, ver index.css).
 */
export function applyDeviceHints() {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory <= 2
  const fewCores = nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2
  if (lowMemory || fewCores) document.documentElement.dataset.glass = "solid"
}

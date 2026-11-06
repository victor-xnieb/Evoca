/*
 * Se importa dentro del service worker de la PWA (vite.config.ts, workbox.importScripts).
 * Al tocar la notificación del recordatorio diario (HU5) se abre «Nueva huella»: si Evoca ya
 * está abierta, se enfoca esa ventana y se lleva allí; si no, se abre una nueva.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const path = (event.notification.data && event.notification.data.url) || "/nueva-huella"
  const url = new URL(path, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin))
      if (open) {
        return open.focus().then((focused) => (focused || open).navigate(url))
      }
      return self.clients.openWindow(url)
    }),
  )
})

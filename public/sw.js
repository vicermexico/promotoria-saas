// Service worker del panel del chofer: recibe los avisos (push) y abre la app al tocarlos.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
// Requerido por algunos navegadores para poder instalar la app. No guarda nada en cache.
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Promotoria'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/chofer2-192.png',
      badge: '/icons/chofer2-192.png',
      data: { link: data.link || '/chofer/ruta' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/chofer/ruta'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(link)
          return c.focus()
        }
      }
      return self.clients.openWindow(link)
    })
  )
})

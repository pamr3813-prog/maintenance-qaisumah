/* عامل الخدمة — تخزين مؤقت للأصول الثابتة حتى يعمل التطبيق كـ PWA قابل للتثبيت */
const CACHE = 'qaisumah-maint-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return
  // بيانات حية واتصال المزامنة — لا تُخزن أبداً
  if (url.pathname.startsWith('/api') || url.pathname === '/ws') return

  // صفحات التطبيق: الشبكة أولاً، والمخزن احتياطاً عند انقطاع الاتصال
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
    )
    return
  }

  // الأصول الثابتة (JS/CSS/صور/أيقونات): المخزن أولاً ثم تحديثه من الشبكة
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy))
          }
          return res
        })
        .catch(() => hit)
      return hit || net
    }),
  )
})

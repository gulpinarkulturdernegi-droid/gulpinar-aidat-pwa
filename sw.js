// Güncelleme sonrası eski uygulama kabuğunu temizle; API yanıtları önbelleğe alınmaz.
const CACHE_NAME = 'gulpinar-aidat-shell-v7';
self.addEventListener('install', event => {
  event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));await self.skipWaiting();})());
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url=new URL(event.request.url);
  if(event.request.method!=='GET' || url.hostname==='script.google.com') return;
  if(url.origin===self.location.origin) {
    event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
  }
});

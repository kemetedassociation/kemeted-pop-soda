/* ============================================================
   KEMETED SAVEUR — service worker (installabilité PWA + cache léger)

   Ce site change souvent (nouveaux visuels, nouvelles pages, bugs
   corrigés) — la priorité absolue est de NE JAMAIS servir une version
   périmée du HTML/CSS/JS. Donc : réseau en priorité pour le code,
   cache seulement en secours (offline) ou pour accélérer les médias
   qui changent rarement une fois publiés.
   ============================================================ */
const CACHE = 'kemeted-v1';
const APP_SHELL = [
  './index.html',
  './pop/pop-styles.css',
  './pop/pop-script.js',
  './pop/pop-products.js',
  './pop/pop-cart.js',
  './pop/pop-account.js',
  './pop/pop-widgets.js',
  './assets/logo.png',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase/Stripe/CDN — laisser passer, jamais mis en cache

  const isCode = req.mode === 'navigate' || /\.(html|css|js|json)$/.test(url.pathname);

  if (isCode) {
    // réseau d'abord : le site à jour prime toujours sur le cache
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
  } else {
    // images/vidéos/polices : cache d'abord pour la vitesse, mise à jour
    // en tâche de fond pour ne pas rester bloqué sur un vieux fichier
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

const CACHE = 'zunda-kaimono-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './stores.json', './icon-180.png', './icon-192.png', './icon-512.png', './dela.woff2', './zun-normal.png', './zun-smile.png', './zun-surprise.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 開くときはまず端末に置いた版をすぐ出し、裏でサーバーの新しい版を取って置き換える（次に開いたときに新しくなる）。
// 画像・書体・アイコンはキャッシュ優先（変えるときはキャッシュ名を上げる）
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const isPage = r.mode === 'navigate' || /(^|\/)(index\.html)?$/.test(u.pathname) || u.pathname.endsWith('.webmanifest') || u.pathname.endsWith('/stores.json');
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = await c.match(r, { ignoreSearch: true });
    if (!isPage) {
      if (cached) return cached;
      const res = await fetch(r);
      c.put(r, res.clone());
      return res;
    }
    const net = fetch(r, { cache: 'no-cache' }).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    e.waitUntil(net);
    return cached || (await net) || (await c.match('./index.html'));
  })());
});

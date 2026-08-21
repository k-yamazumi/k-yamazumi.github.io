const CACHE_NAME = 'marathon-rx-v20260821';
const urlsToCache = [
  './marathon-rx.html',
  './manifest_marathon-rx.json',
  './icon_marathon-rx.png',
  './icon_marathon-rx_192.png'
];

// インストール時に指定したファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// リクエスト時にキャッシュがあればそれを返し、なければネットワークから取得
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
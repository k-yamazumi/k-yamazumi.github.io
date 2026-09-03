const CACHE_NAME = 'marathon-rx-v20260903-3';
const urlsToCache = [
  './marathon-rx.html',
  './manifest_marathon-rx.json',
  './icon_marathon-rx.png',
  './icon_marathon-rx_192.png',
  './style_marathon-rx.css'
];

// インストール時: 指定したファイルをキャッシュし、即座に新しいサービスワーカーを待機状態から抜ける
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  // 新しいバージョンを即座に有効にする
  self.skipWaiting();
});

// アクティベート時: 古いキャッシュを削除し、即座にクライアントのコントロールを開始する
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 現在のCACHE_NAMEと異なるキャッシュをすべて削除する
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 開いているすべてのページですぐに新しいサービスワーカーを適用する
  self.clients.claim();
});

// リクエスト時: キャッシュがあればそれを返し、なければネットワークから取得
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

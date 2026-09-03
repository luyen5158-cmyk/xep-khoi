/* sw.js — Cho phép chơi khi mất mạng.
 *
 * Chiến lược: mạng trước, cache sau. Nghĩa là luôn lấy bản mới nhất khi có
 * mạng, và chỉ rơi về bản đã lưu khi mất mạng. Đây là cách tránh cái bẫy kinh
 * điển của service worker: người chơi kẹt mãi ở bản cũ dù bạn đã sửa code.
 *
 * Đổi số trong CACHE mỗi lần phát hành để dọn sạch bản cũ.
 */
const CACHE = "xep-khoi-v1";

const ASSETS = [
  ".", "index.html", "css/style.css", "manifest.webmanifest",
  "js/game.js", "js/board.js", "js/drag.js", "js/fx.js", "js/audio.js",
  "js/grid.js", "js/tray.js", "js/score.js", "js/level.js",
  "js/shapes.js", "js/rng.js", "js/replay.js", "js/sim.js", "js/storage.js",
  "icon/icon-192.png", "icon/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});

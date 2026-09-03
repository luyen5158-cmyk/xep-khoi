/* sw.js — Cho phép chơi khi mất mạng.
 *
 * Chiến lược: mạng trước, cache sau. Nghĩa là luôn lấy bản mới nhất khi có
 * mạng, và chỉ rơi về bản đã lưu khi mất mạng. Đây là cách tránh cái bẫy kinh
 * điển của service worker: người chơi kẹt mãi ở bản cũ dù bạn đã sửa code.
 *
 * Đổi số trong CACHE mỗi lần phát hành để dọn sạch bản cũ.
 */
const CACHE = "xep-khoi-v3";

const ASSETS = [
  ".", "index.html", "css/style.css", "manifest.webmanifest",
  "js/game.js", "js/board.js", "js/drag.js", "js/fx.js", "js/audio.js",
  "js/grid.js", "js/tray.js", "js/score.js", "js/level.js",
  "js/shapes.js", "js/rng.js", "js/replay.js", "js/sim.js", "js/storage.js",
  "js/config.js", "js/auth.js", "js/net.js", "js/leaderboard.js",
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

/* Chỉ đụng vào file của CHÍNH trang này.
 *
 * Vì sao dòng kiểm tra origin ở dưới là bắt buộc: nếu không có nó, service
 * worker sẽ chặn cả những yêu cầu gửi đi Supabase rồi lưu luôn câu trả lời vào
 * cache. Hậu quả: bảng xếp hạng đứng yên mãi ở bản cũ, và khi mất mạng thì lời
 * gọi API nhận về... một trang HTML, khiến code vỡ ngay tại chỗ.
 * Yêu cầu ra ngoài phải để trình duyệt tự lo, service worker không xen vào.
 */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // Supabase, Google… — không xen vào

  // Địa chỉ có ?code=... là lần quay về sau khi đăng nhập Google. Không lưu.
  const cacheable = url.search === "";

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (cacheable && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(r => r || caches.match("index.html"))
      )
  );
});

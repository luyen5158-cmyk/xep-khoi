/* net.js — Mọi lời gọi tới Supabase đều đi qua đây.
 *
 * Quy ước của cả file: KHÔNG CÓ LỜI GỌI NÀO ĐƯỢC LÀM SẬP GAME. Hỏng mạng,
 * Supabase ngủ đông, hết lượt — tất cả đều ném ra một Error có .code, và nơi
 * gọi chỉ việc hiện "tạm thời không dùng được" rồi chơi tiếp. Bảng xếp hạng là
 * phần thêm vào, không phải điều kiện để chơi.
 */
"use strict";

import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured, NET_TIMEOUT_MS } from "./config.js";
import { auth } from "./auth.js";

/** Bảng xếp hạng có dùng được lúc này không. Không có mạng thì khỏi thử. */
export function online() {
  return isConfigured() && navigator.onLine !== false;
}

/** Ván này có tính xếp hạng không: phải vừa đăng nhập vừa có mạng. */
export function canRank() {
  return online() && auth.signedIn;
}

/* ---------- Đọc: ai cũng gọi được, không cần đăng nhập ---------- */

/** Top 50 kèm số hạng tính sẵn. */
export function topScores(limit = 50) {
  return rpc("leaderboard_top", { p_limit: limit });
}

/** Hạng của một người. Trả về null nếu người đó chưa có điểm nào. */
export async function playerRank(userId) {
  const rows = await rpc("player_rank", { p_user: userId });
  return rows.length ? rows[0] : null;
}

/** Biệt danh của chính mình, hoặc null nếu chưa đặt. */
export async function myNickname(userId) {
  const rows = await rest("/rest/v1/profiles?select=nickname&id=eq." + encodeURIComponent(userId));
  return rows.length ? rows[0].nickname : null;
}

/* ---------- Ghi: đều phải đăng nhập, đều qua Edge Function ---------- */

export function issueSeed()                { return fn("issue-seed", {}); }
export function submitScore(seedId, replay){ return fn("submit-score", { seedId, replay }); }
export function setNickname(nickname)      { return fn("profile", { action: "set-nickname", nickname }); }
export function deleteAccount()            { return fn("profile", { action: "delete-account" }); }

/* ---------- Bên trong ---------- */

async function rpc(name, args) {
  return rest("/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
}

async function rest(path, options = {}) {
  if (!isConfigured()) throw err("not_configured", "Chưa cấu hình bảng xếp hạng");
  /* Chỉ gửi `apikey`, KHÔNG gửi kèm Authorization.
     Supabase có hai đời khoá công khai: `anon` (JWT đời cũ) và
     `sb_publishable_...` (đời mới). Khoá cũ dùng được ở cả hai header, khoá mới
     thì chỗ của nó là `apikey`. Gửi mỗi `apikey` là đúng với cả hai đời, và
     PostgREST vẫn biết đây là vai "anon" để áp khoá quyền. */
  const res = await timed(SUPABASE_URL + path, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw err("server", (data && data.message) || "Máy chủ trả về lỗi " + res.status);
  return data;
}

/** Gọi một Edge Function bằng danh tính của người đang đăng nhập. */
async function fn(name, body) {
  if (!isConfigured()) throw err("not_configured", "Chưa cấu hình bảng xếp hạng");
  const token = await auth.accessToken();
  if (!token) throw err("unauthorized", "Cần đăng nhập");

  const res = await timed(SUPABASE_URL + "/functions/v1/" + name, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw err(data.error || "server", data.message || "Máy chủ trả về lỗi " + res.status);
  return data;
}

/* Không có mức chờ này thì Supabase đang ngủ đông sẽ khiến người chơi ngồi
   nhìn nút "Chơi lại" quay mãi. Thà bỏ cuộc sau 8 giây và chuyển sang ván
   luyện tập. */
function timed(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NET_TIMEOUT_MS);
  return fetch(url, { ...options, signal: ctrl.signal })
    .catch(e => { throw err(e.name === "AbortError" ? "timeout" : "offline", "Không kết nối được"); })
    .finally(() => clearTimeout(timer));
}

function err(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

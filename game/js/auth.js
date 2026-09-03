/* auth.js — Đăng nhập Google, viết tay bằng fetch, không dùng thư viện.
 *
 * Vì sao không dùng supabase-js: dự án đã quyết định không có bước đóng gói
 * (INFRA.md mục 2). Kéo thư viện từ CDN thì trang phụ thuộc vào một máy chủ
 * khác, và service worker phải lo thêm một thứ nữa khi mất mạng. Luồng đăng
 * nhập PKCE chỉ khoảng tám chục dòng, viết thẳng ra là kiểm soát được hết.
 *
 * PKCE hoạt động thế nào, nói ngắn gọn:
 *   1. máy tạo một chuỗi bí mật ngẫu nhiên (verifier), giữ lại trong máy
 *   2. gửi cho Google bản băm SHA-256 của chuỗi đó (challenge)
 *   3. quay về với một mã đổi lấy phiên (code)
 *   4. đổi code + verifier lấy token — kẻ chặn được code mà không có verifier
 *      thì cầm code cũng vô dụng
 */
"use strict";

import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured, NET_TIMEOUT_MS } from "./config.js";
import { store } from "./storage.js";

let session = store.session();     // { access_token, refresh_token, expires_at, user_id }

/* ---------- Trạng thái ---------- */

export const auth = {
  get signedIn() { return !!session; },
  get userId()   { return session ? session.user_id : null; },

  signIn:  startGoogleSignIn,
  signOut,
  finishRedirect,
  accessToken
};

/* ---------- Đăng nhập ---------- */

async function startGoogleSignIn() {
  if (!isConfigured()) throw new Error("chưa cấu hình Supabase");

  const verifier  = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  store.setVerifier(verifier);

  const url = new URL(SUPABASE_URL + "/auth/v1/authorize");
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTarget());
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "s256");
  location.assign(url.toString());
}

/* Gọi một lần lúc trang mở. Nếu địa chỉ có ?code=... nghĩa là vừa từ Google
   quay về. Trả về true khi vừa đăng nhập xong. */
async function finishRedirect() {
  if (!isConfigured()) return false;

  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const err  = params.get("error_description") || params.get("error");
  if (!code && !err) return false;

  cleanUrl();          // xoá ?code=... khỏi thanh địa chỉ NGAY, xem ghi chú bên dưới
  if (err) throw new Error(err);

  const verifier = store.verifier();
  store.setVerifier(null);
  if (!verifier) throw new Error("thiếu mã xác thực trong máy");

  const data = await postToken("pkce", { auth_code: code, code_verifier: verifier });
  saveSession(data);
  return true;
}

/* Xoá ?code=... khỏi thanh địa chỉ.
   Vì sao bắt buộc: mã đó đổi được lấy phiên đăng nhập. Không xoá thì người
   chơi sao chép địa chỉ gửi cho bạn bè là gửi kèm luôn chìa khoá tài khoản
   mình — mà họ hoàn toàn không biết. */
function cleanUrl() {
  history.replaceState(null, "", location.pathname);
}

async function signOut() {
  const token = session && session.access_token;
  session = null;
  store.setSession(null);
  if (!token) return;
  try {
    await fetch(SUPABASE_URL + "/auth/v1/logout", {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + token }
    });
  } catch (e) { /* đăng xuất phía máy đã xong rồi, phần này hỏng cũng không sao */ }
}

/* ---------- Token ---------- */

/** Trả về access token còn hạn, tự gia hạn khi cần. null nếu chưa đăng nhập. */
async function accessToken() {
  if (!session) return null;

  // Gia hạn sớm 60 giây, đừng đợi hết hạn rồi mới xin.
  if (Date.now() < session.expires_at - 60_000) return session.access_token;

  try {
    const data = await postToken("refresh_token", { refresh_token: session.refresh_token });
    saveSession(data);
    return session.access_token;
  } catch (e) {
    // Refresh token hỏng hoặc bị thu hồi → coi như đã đăng xuất.
    session = null;
    store.setSession(null);
    return null;
  }
}

async function postToken(grantType, body) {
  const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/token?grant_type=" + grantType, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || "đăng nhập thất bại");
  return data;
}

function saveSession(data) {
  session = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Date.now() + (data.expires_in || 3600) * 1000,
    user_id:       data.user && data.user.id
  };
  store.setSession(session);
}

/* ---------- Công cụ nhỏ ---------- */

/* Địa chỉ quay về sau khi đăng nhập. Chuỗi này phải khớp TỪNG KÝ TỰ với một
   dòng trong Supabase → Authentication → URL Configuration → Redirect URLs.
   Sai một dấu gạch chéo là đăng nhập xong nhảy vào trang lỗi. */
function redirectTarget() {
  return location.origin + location.pathname;
}

function randomString(n) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return base64url(bytes);
}

async function sha256Base64Url(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return base64url(new Uint8Array(digest));
}

function base64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fetchWithTimeout(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NET_TIMEOUT_MS);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

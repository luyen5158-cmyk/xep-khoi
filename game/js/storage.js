/* storage.js — Mọi thứ ghi xuống máy người chơi đều đi qua đây.
 *
 * Gói trong try/catch vì localStorage ném lỗi ở chế độ ẩn danh trên vài trình
 * duyệt, và mất kỷ lục thì không đáng để làm sập cả ván chơi.
 * Giữ nguyên khoá "bp_best" của bản demo cũ để người chơi không mất kỷ lục.
 */
"use strict";

const KEY_BEST     = "bp_best";
const KEY_MUTED    = "bp_muted";
const KEY_REPLAY   = "bp_last_replay";
const KEY_SESSION  = "xk_session";
const KEY_VERIFIER = "xk_pkce_verifier";

function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (e) { return fallback; }
}

function set(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* không sao, bỏ qua */ }
}

function remove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* không sao, bỏ qua */ }
}

export const store = {
  best:      () => parseInt(get(KEY_BEST, "0"), 10) || 0,
  setBest:   v  => set(KEY_BEST, String(v)),
  muted:     () => get(KEY_MUTED, "0") === "1",
  setMuted:  v  => set(KEY_MUTED, v ? "1" : "0"),
  /* Replay ván gần nhất — hiện chỉ nằm trong máy. Ngày nào có bảng xếp hạng
     thì đây đúng là gói dữ liệu đem gửi lên máy chủ. */
  saveReplay: r => set(KEY_REPLAY, JSON.stringify(r)),
  lastReplay: () => { try { return JSON.parse(get(KEY_REPLAY, "null")); } catch (e) { return null; } },

  /* Phiên đăng nhập. Để ở localStorage chứ không phải sessionStorage: người
     chơi cài game vào màn hình chính rồi mở lại hôm sau vẫn phải còn đăng nhập. */
  session:    () => { try { return JSON.parse(get(KEY_SESSION, "null")); } catch (e) { return null; } },
  setSession: s  => s ? set(KEY_SESSION, JSON.stringify(s)) : remove(KEY_SESSION),

  /* Chuỗi bí mật của luồng PKCE, chỉ sống từ lúc bấm "đăng nhập" tới lúc quay
     về. Phải là localStorage: trên vài trình duyệt, chuyến đi vòng qua Google
     mở lại trang trong một ngữ cảnh mới và sessionStorage đã trống trơn. */
  verifier:    () => get(KEY_VERIFIER, null),
  setVerifier: v  => v ? set(KEY_VERIFIER, v) : remove(KEY_VERIFIER)
};

/* storage.js — Mọi thứ ghi xuống máy người chơi đều đi qua đây.
 *
 * Gói trong try/catch vì localStorage ném lỗi ở chế độ ẩn danh trên vài trình
 * duyệt, và mất kỷ lục thì không đáng để làm sập cả ván chơi.
 * Giữ nguyên khoá "bp_best" của bản demo cũ để người chơi không mất kỷ lục.
 */
"use strict";

const KEY_BEST   = "bp_best";
const KEY_MUTED  = "bp_muted";
const KEY_REPLAY = "bp_last_replay";

function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (e) { return fallback; }
}

function set(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* không sao, bỏ qua */ }
}

export const store = {
  best:      () => parseInt(get(KEY_BEST, "0"), 10) || 0,
  setBest:   v  => set(KEY_BEST, String(v)),
  muted:     () => get(KEY_MUTED, "0") === "1",
  setMuted:  v  => set(KEY_MUTED, v ? "1" : "0"),
  /* Replay ván gần nhất — hiện chỉ nằm trong máy. Ngày nào có bảng xếp hạng
     thì đây đúng là gói dữ liệu đem gửi lên máy chủ. */
  saveReplay: r => set(KEY_REPLAY, JSON.stringify(r)),
  lastReplay: () => { try { return JSON.parse(get(KEY_REPLAY, "null")); } catch (e) { return null; } }
};

/* level.js — Đổi điểm thành level, và cấp bảng trọng số bốc khối cho khay.
 * Level chỉ tăng, không bao giờ giảm (luật R9). Không đụng tới trình duyệt.
 */
"use strict";

import { SHAPES } from "./shapes.js";

export const MAX_LEVEL   = 6;
export const POINTS_PER_LEVEL = 700;

/** Level = 1 + floor(điểm / 700), chặn trên ở 6. */
export function levelFromScore(score) {
  return Math.min(MAX_LEVEL, 1 + Math.floor(score / POINTS_PER_LEVEL));
}

/* Cách tăng độ khó ngầm: level cao không chỉ mở khối mới mà còn tăng xác suất
   bốc trúng khối to. Khối nhỏ vẫn xuất hiện — nếu chặn hẳn, người chơi sẽ thua
   một cách oan ức thay vì vì đánh dở. */
export function shapePool(level) {
  const pool = [];
  for (const s of SHAPES) {
    if (s.lv > level) continue;
    const w = 1
      + Math.max(0, level - s.lv) * 0.35
      + (level >= 4 ? s.cells.length * 0.15 : 0);
    const copies = Math.ceil(w * 2);
    for (let i = 0; i < copies; i++) pool.push(s);
  }
  return pool;
}

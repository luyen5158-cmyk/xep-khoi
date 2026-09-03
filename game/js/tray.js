/* tray.js — Khay 3 khối: bốc khối theo trọng số của level, nạp lại khi hết cả ba.
 * Mọi số ngẫu nhiên đều lấy từ rng truyền vào, không dùng Math.random —
 * nhờ vậy cùng seed sẽ cho cùng dãy khối. Không đụng tới trình duyệt.
 */
"use strict";

import { COLORS } from "./shapes.js";
import { shapePool } from "./level.js";
import { pick } from "./rng.js";

export const TRAY_SIZE = 3;

export function randomPiece(rng, level) {
  const shape = pick(rng, shapePool(level));
  const color = pick(rng, COLORS);
  return { shapeId: shape.id, cells: shape.cells, color };
}

export class Tray {
  constructor(rng) {
    this.rng = rng;
    this.slots = new Array(TRAY_SIZE).fill(null);
  }

  /** Luật R4: chỉ nạp bộ mới khi đã dùng hết cả ba. */
  refill(level) {
    for (let i = 0; i < TRAY_SIZE; i++) this.slots[i] = randomPiece(this.rng, level);
  }

  take(index) {
    const piece = this.slots[index];
    this.slots[index] = null;
    return piece;
  }

  isEmpty() {
    return this.slots.every(p => !p);
  }

  pieces() {
    return this.slots.filter(Boolean);
  }
}

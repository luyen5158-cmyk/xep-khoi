/* rng.js — Bộ sinh số ngẫu nhiên có hạt giống (seed).
 *
 * Vì sao không dùng Math.random()?
 * Math.random() không lặp lại được. Với RNG có seed, cùng một seed sẽ cho ra
 * đúng cùng một dãy khối. Nhờ vậy chỉ cần lưu seed + danh sách nước đi là
 * dựng lại được nguyên ván chơi — đó là nền móng cho bảng xếp hạng chống gian
 * lận sau này (xem sim.js). Toàn bộ file này không đụng tới trình duyệt.
 */
"use strict";

/** Sinh một seed mới, dạng số nguyên 32 bit không dấu. */
export function newSeed() {
  return (Math.random() * 0x100000000) >>> 0;
}

/** mulberry32 — nhỏ, nhanh, chất lượng đủ tốt cho game. Trả về hàm () => [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bốc một phần tử bất kỳ trong mảng. */
export function pick(rng, arr) {
  return arr[(rng() * arr.length) | 0];
}

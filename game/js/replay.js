/* replay.js — Ghi lại nguyên một ván chơi.
 *
 * Đây là phần "chừa đường" cho bảng xếp hạng. Ván chơi này hoàn toàn tất định:
 * không đồng hồ, không vật lý, không ngẫu nhiên ngoài bộ RNG có seed. Nên chỉ
 * cần seed + danh sách nước đi là dựng lại được y hệt ván đấu.
 *
 * Ngày nào muốn có bảng xếp hạng toàn cầu, client gửi lên object này thay vì
 * gửi con số điểm. Máy chủ chạy sim.js để tự tính điểm — sửa số ở client thành
 * vô ích, vì máy chủ không tin con số nào do client gửi.
 */
"use strict";

export const REPLAY_VERSION = 1;

export class Replay {
  constructor(seed) {
    this.seed = seed;
    this.moves = [];
    this.startedAt = Date.now();
  }

  /** Một nước đi = chọn ô nào trong khay, đặt vào hàng nào, cột nào. */
  record(slotIndex, row, col) {
    this.moves.push([slotIndex, row, col]);
  }

  toJSON() {
    return {
      v: REPLAY_VERSION,
      seed: this.seed,
      moves: this.moves,
      startedAt: this.startedAt
    };
  }
}

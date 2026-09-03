/* score.js — Công thức điểm, combo và level.
 *
 * Công thức thưởng đậm cho việc xoá nhiều hàng cùng lúc, để khuyến khích người
 * chơi nhịn — xếp dồn rồi ăn lớn, thay vì xoá lắt nhắt từng hàng.
 * Không giữ kỷ lục ở đây: kỷ lục là việc của trình duyệt (localStorage), còn
 * file này phải chạy được cả trên máy chủ khi xác minh replay.
 */
"use strict";

import { levelFromScore } from "./level.js";

export class Score {
  constructor() {
    this.value = 0;
    this.combo = 0;
    this.level = 1;
  }

  reset() {
    this.value = 0;
    this.combo = 0;
    this.level = 1;
  }

  /** Cộng điểm và tính lại level. Trả về true nếu vừa lên level. */
  _add(n) {
    this.value += n;
    const next = levelFromScore(this.value);
    if (next > this.level) { this.level = next; return true; }
    return false;
  }

  /** Đặt khối: +1 điểm mỗi ô. */
  gainPlace(cellCount) {
    return this._add(cellCount);
  }

  /* Xoá hàng: số_ô_xoá × 10 × số_hàng, cộng thưởng combo từ combo 2 trở lên.
     Nhân với số_hàng chính là chỗ tạo ra phần thưởng phi tuyến:
     1 hàng → 8×10×1 = 80, nhưng 2 hàng → 15×10×2 = 300. */
  gainClear(clearedCells, lineCount) {
    this.combo++;
    const bonus = this.combo > 1 ? this.combo * 25 : 0;
    const gained = clearedCells * 10 * lineCount + bonus;
    const leveledUp = this._add(gained);
    return { gained, leveledUp, combo: this.combo };
  }

  /** Luật R8: combo reset về 0 ngay khi có một lượt đặt mà không xoá được gì. */
  breakCombo() {
    this.combo = 0;
  }
}

/* grid.js — Nguồn sự thật duy nhất về lưới 8×8.
 *
 * Biết: ô nào trống, đặt được hay không, hàng/cột nào đã đầy, xoá ô.
 * Không biết: chạm, kéo, điểm, hiệu ứng, trình duyệt. Đừng thêm gì vào đây.
 */
"use strict";

export const W = 8;
export const H = 8;

export class Grid {
  constructor() {
    this.cells = Array.from({ length: H }, () => Array(W).fill(null));
  }

  /** Đặt lại lưới về trống trơn. */
  reset() {
    for (let r = 0; r < H; r++) this.cells[r].fill(null);
  }

  /** Luật R5: hợp lệ khi và chỉ khi MỌI ô đều nằm trong lưới và đang trống. */
  canPlace(cells, row, col) {
    for (const [dr, dc] of cells) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= H || c < 0 || c >= W) return false;
      if (this.cells[r][c]) return false;
    }
    return true;
  }

  /** Luật R10: dò đủ 64 vị trí để biết hình này còn đặt được chỗ nào không. */
  anyPlacement(cells) {
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++)
        if (this.canPlace(cells, r, c)) return true;
    return false;
  }

  place(cells, row, col, color) {
    for (const [dr, dc] of cells) this.cells[row + dr][col + dc] = color;
  }

  /** Luật R6: quét toàn bộ 8 hàng và 8 cột sau mỗi lần đặt. */
  findFullLines() {
    const rows = [], cols = [];
    for (let r = 0; r < H; r++) {
      let full = true;
      for (let c = 0; c < W; c++) if (!this.cells[r][c]) { full = false; break; }
      if (full) rows.push(r);
    }
    for (let c = 0; c < W; c++) {
      let full = true;
      for (let r = 0; r < H; r++) if (!this.cells[r][c]) { full = false; break; }
      if (full) cols.push(c);
    }
    return { rows, cols };
  }

  /* Luật R7: ô nằm ở giao điểm hàng-cột chỉ được tính một lần, nên gom vào Set
     thay vì cộng dồn số ô của từng hàng. */
  lineTargets(rows, cols) {
    const targets = new Set();
    for (const r of rows) for (let c = 0; c < W; c++) targets.add(r * W + c);
    for (const c of cols) for (let r = 0; r < H; r++) targets.add(r * W + c);
    return targets;
  }

  colorAt(key) {
    return this.cells[(key / W) | 0][key % W];
  }

  clearTargets(targets) {
    for (const key of targets) this.cells[(key / W) | 0][key % W] = null;
  }
}

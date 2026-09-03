/* board.js — Vẽ lưới và khay lên màn hình, và tính kích thước ô theo máy.
 *
 * Chỉ biết vẽ. Không giữ luật chơi, không tính điểm, không xử lý chạm.
 */
"use strict";

import { W, H } from "./grid.js";
import { shapeBounds } from "./shapes.js";

/* Kích thước dùng chung cho cả kéo-thả. Đây là object sống: board.js sửa giá
   trị bên trong, drag.js đọc được ngay mà không cần truyền qua lại. */
export const layout = { CELL: 38, GAP: 4, STEP: 42 };

export class Board {
  constructor(boardEl, trayEl) {
    this.boardEl = boardEl;
    this.trayEl  = trayEl;
    this.cellEls = [];
    this.build();
  }

  build() {
    this.boardEl.innerHTML = "";
    this.cellEls = [];
    for (let r = 0; r < H; r++) {
      const row = [];
      for (let c = 0; c < W; c++) {
        const el = document.createElement("div");
        el.className = "cell";
        this.boardEl.appendChild(el);
        row.push(el);
      }
      this.cellEls.push(row);
    }
  }

  /* Cạnh ô = (min(rộng, cao_khả_dụng) − khe×7 − đệm) / 8, kẹp trong 24–44 px
     để vừa từ máy nhỏ nhất tới máy to nhất mà lưới vẫn luôn là hình vuông. */
  resize() {
    const maxW = Math.min(window.innerWidth - 24, 380);
    const maxH = window.innerHeight - 260;
    let cell = Math.floor((Math.min(maxW, maxH) - layout.GAP * (W - 1) - 14) / W);
    cell = Math.max(24, Math.min(cell, 44));

    layout.CELL = cell;
    layout.STEP = cell + layout.GAP;

    this.boardEl.style.gridTemplateColumns = `repeat(${W}, ${cell}px)`;
    this.boardEl.style.gridTemplateRows    = `repeat(${H}, ${cell}px)`;
    for (const row of this.cellEls) for (const el of row) {
      el.style.width  = cell + "px";
      el.style.height = cell + "px";
    }
  }

  render(grid) {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const el = this.cellEls[r][c];
      const v  = grid.cells[r][c];
      el.className = "cell" + (v ? " filled" : "");
      el.style.backgroundColor = v || "";
      el.style.color = v || "";     // để currentColor trong hiệu ứng nổ lấy đúng màu
    }
  }

  /** Ô lưới nằm ở góc trên-trái, dùng làm gốc toạ độ khi tính chỗ bám lưới. */
  originRect() {
    return this.cellEls[0][0].getBoundingClientRect();
  }

  centerOf(r, c) {
    const box = this.cellEls[r][c].getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  clearPreview() {
    for (const row of this.cellEls) for (const el of row) el.classList.remove("preview", "invalid");
  }

  /* Sáng trắng nếu đặt được, đỏ nếu không — người chơi biết kết quả TRƯỚC khi
     thả tay, không bao giờ phải thử rồi hối hận. */
  showPreview(cells, row, col, ok) {
    this.clearPreview();
    for (const [dr, dc] of cells) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < H && c >= 0 && c < W)
        this.cellEls[r][c].classList.add(ok ? "preview" : "invalid");
    }
  }

  markClearing(targets) {
    for (const key of targets) this.cellEls[(key / W) | 0][key % W].classList.add("clearing");
  }

  renderTray(tray) {
    const slots = this.trayEl.querySelectorAll(".slot");
    const size  = Math.round(layout.CELL * 0.62);   // đủ nhỏ để xếp vừa 3 khối
    slots.forEach((slot, i) => {
      slot.innerHTML = "";
      const piece = tray.slots[i];
      if (!piece) return;
      const el = makePieceEl(piece, size);
      el.dataset.index = i;
      slot.appendChild(el);
    });
  }
}

/** Dựng một khối thành phần tử DOM, mỗi ô có cạnh `size` px. */
export function makePieceEl(piece, size) {
  const b  = shapeBounds(piece.cells);
  const el = document.createElement("div");
  el.className = "piece";
  el.style.gridTemplateColumns = `repeat(${b.cols}, ${size}px)`;
  el.style.gridTemplateRows    = `repeat(${b.rows}, ${size}px)`;

  const filled = new Set(piece.cells.map(([r, c]) => r + "," + c));
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
    const d = document.createElement("div");
    if (filled.has(r + "," + c)) {
      d.className = "blk";
      d.style.background = piece.color;
    }
    d.style.width  = size + "px";
    d.style.height = size + "px";
    el.appendChild(d);
  }
  return el;
}

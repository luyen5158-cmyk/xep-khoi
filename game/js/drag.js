/* drag.js — Kéo và thả: bóng mờ bám ngón tay, ô xem trước, quy tắc bám lưới.
 *
 * Toàn bộ game chỉ có một thao tác duy nhất, nên gần hết chất lượng trò chơi
 * nằm trong file này. Hỏi lưới "đặt được không" chứ không tự quyết.
 */
"use strict";

import { layout, makePieceEl } from "./board.js";
import { shapeBounds } from "./shapes.js";

/** Khối được nhấc cao hơn điểm chạm 1.3 ô, nếu không ngón tay che mất khối. */
const LIFT = 1.3;

export function initDrag({ board, getTray, canPlace, isBusy, onDrop }) {
  const trayEl = board.trayEl;
  let drag = null;

  trayEl.addEventListener("pointerdown", e => {
    if (isBusy()) return;
    const pieceEl = e.target.closest(".piece");
    if (!pieceEl) return;

    const index = +pieceEl.dataset.index;
    const piece = getTray().slots[index];
    if (!piece) return;

    const rect = pieceEl.getBoundingClientRect();
    const b    = shapeBounds(piece.cells);
    const fullW = b.cols * layout.STEP - layout.GAP;
    const fullH = b.rows * layout.STEP - layout.GAP;

    // Giữ đúng vị trí tương đối của ngón tay trên khối, rồi phóng to về cỡ lưới
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top)  / rect.height;

    const ghost = makePieceEl(piece, layout.CELL);
    ghost.id = "ghost";
    document.body.appendChild(ghost);

    drag = {
      index, piece, ghost, srcEl: pieceEl,
      offX: fx * fullW,
      offY: fy * fullH + layout.CELL * LIFT
    };
    pieceEl.classList.add("dragging");
    trayEl.setPointerCapture(e.pointerId);
    move(e.clientX, e.clientY);
    e.preventDefault();
  });

  trayEl.addEventListener("pointermove", e => {
    if (!drag) return;
    move(e.clientX, e.clientY);
    e.preventDefault();
  });

  trayEl.addEventListener("pointerup",     () => end());
  trayEl.addEventListener("pointercancel", () => cancel());

  /* Quy tắc bám lưới: ô đích tính từ GÓC TRÊN-TRÁI của khối, không phải từ vị
     trí ngón tay. Dùng round chứ không phải floor — nhờ vậy khối tự hút về ô
     gần nhất và người chơi không cần nhắm chính xác. */
  function anchor() {
    const origin = board.originRect();
    const gx = parseFloat(drag.ghost.style.left);
    const gy = parseFloat(drag.ghost.style.top);
    return {
      row: Math.round((gy - origin.top)  / layout.STEP),
      col: Math.round((gx - origin.left) / layout.STEP)
    };
  }

  function move(x, y) {
    drag.ghost.style.left = (x - drag.offX) + "px";
    drag.ghost.style.top  = (y - drag.offY) + "px";
    const { row, col } = anchor();
    board.showPreview(drag.piece.cells, row, col, canPlace(drag.piece.cells, row, col));
  }

  function teardown() {
    drag.ghost.remove();
    drag.srcEl.classList.remove("dragging");
    board.clearPreview();
    const d = drag;
    drag = null;
    return d;
  }

  /* Thả không hợp lệ: khối biến mất, khối trong khay sáng lại như cũ.
     Không phạt, không báo lỗi. */
  function end() {
    if (!drag) return;
    const { row, col } = anchor();
    const ok = canPlace(drag.piece.cells, row, col);
    const d = teardown();
    if (ok) onDrop(d.index, row, col);
  }

  function cancel() {
    if (drag) teardown();
  }
}

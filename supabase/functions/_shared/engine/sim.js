/* sim.js — Chạy lại một replay và tự tính điểm, không cần trình duyệt.
 *
 * File này chỉ nhập grid/tray/score/rng — toàn bộ đều là logic thuần — nên nó
 * chạy được y nguyên trong Cloudflare Worker, Node, hay Deno. Đó chính là thứ
 * biến bảng xếp hạng từ "ai cũng sửa được" thành "không sửa được": máy chủ
 * nhận replay, gọi simulate(), và chỉ tin con số do chính nó tính ra.
 *
 * Trong trình duyệt, hàm này còn dùng để tự kiểm tra: điểm mô phỏng phải khớp
 * tuyệt đối với điểm hiển thị. Lệch một điểm nghĩa là có bug trong luật chơi.
 */
"use strict";

import { mulberry32 } from "./rng.js";
import { Grid } from "./grid.js";
import { Tray } from "./tray.js";
import { Score } from "./score.js";

/**
 * @param {{seed:number, moves:Array<[number,number,number]>}} replay
 * @returns {{score:number, level:number, moves:number, valid:boolean, reason:string|null}}
 */
export function simulate(replay) {
  const rng   = mulberry32(replay.seed);
  const grid  = new Grid();
  const score = new Score();
  const tray  = new Tray(rng);
  tray.refill(score.level);

  let applied = 0;

  for (const [index, row, col] of replay.moves) {
    const piece = tray.slots[index];
    if (!piece) return fail(score, applied, "ô khay số " + index + " trống");
    if (!grid.canPlace(piece.cells, row, col))
      return fail(score, applied, "nước đi " + applied + " đặt vào chỗ không hợp lệ");

    grid.place(piece.cells, row, col, piece.color);
    tray.take(index);
    score.gainPlace(piece.cells.length);

    const { rows, cols } = grid.findFullLines();
    const lineCount = rows.length + cols.length;
    if (lineCount > 0) {
      const targets = grid.lineTargets(rows, cols);
      score.gainClear(targets.size, lineCount);
      grid.clearTargets(targets);
    } else {
      score.breakCombo();
    }

    if (tray.isEmpty()) tray.refill(score.level);
    applied++;
  }

  // Ván chỉ kết thúc hợp lệ khi thật sự hết nước đi.
  const alive = tray.pieces().some(p => grid.anyPlacement(p.cells));
  return {
    score:  score.value,
    level:  score.level,
    moves:  applied,
    valid:  true,
    ended:  !alive,
    reason: null
  };
}

function fail(score, applied, reason) {
  return { score: score.value, level: score.level, moves: applied, valid: false, ended: false, reason };
}

/* game.js — Điều phối một lượt chơi và nối tất cả các mảnh lại với nhau.
 *
 * Giữ trạng thái ván, khoá thao tác trong lúc hiệu ứng chạy, kiểm tra thua,
 * bật màn kết thúc. Đây là file duy nhất được phép biết về tất cả các file kia.
 */
"use strict";

import { newSeed, mulberry32 } from "./rng.js";
import { Grid, W } from "./grid.js";
import { Tray }    from "./tray.js";
import { Score }   from "./score.js";
import { Replay }  from "./replay.js";
import { simulate } from "./sim.js";
import { Board }   from "./board.js";
import { initDrag } from "./drag.js";
import { Fx }      from "./fx.js";
import { Sfx }     from "./audio.js";
import { store }   from "./storage.js";

/** Tổng thời gian hiệu ứng xoá. Đừng làm nhanh hơn — đây là khoảnh khắc "đã"
 *  nhất của trò chơi. */
const CLEAR_MS = 340;

const el = id => document.getElementById(id);

const board = new Board(el("board"), el("tray"));
const fx    = new Fx(el("fx"));
const sfx   = new Sfx();

let grid, score, tray, rng, replay, busy;
let best = store.best();

sfx.muted = store.muted();
syncMuteButton();

/* ---------- Một ván ---------- */

function reset() {
  const seed = newSeed();
  rng    = mulberry32(seed);
  grid   = new Grid();
  score  = new Score();
  tray   = new Tray(rng);
  replay = new Replay(seed);
  busy   = false;

  tray.refill(score.level);
  board.render(grid);
  board.renderTray(tray);
  el("over").classList.remove("show");
  paintHud();
}

/* Thứ tự trong hàm này là chỗ dễ sai nhất của cả game: chỉ được kiểm tra thua
   SAU KHI hiệu ứng xoá chạy xong và khay đã nạp lại. Kiểm tra sớm hơn sẽ báo
   thua oan, vì hàng sắp bị xoá vẫn đang chiếm chỗ trên lưới. */
function commitMove(index, row, col) {
  const piece = tray.slots[index];
  if (!piece || !grid.canPlace(piece.cells, row, col)) return;

  replay.record(index, row, col);

  grid.place(piece.cells, row, col, piece.color);
  tray.take(index);
  board.render(grid);
  board.renderTray(tray);

  if (score.gainPlace(piece.cells.length)) sfx.levelUp();
  sfx.place();
  paintHud();

  const { rows, cols } = grid.findFullLines();
  const lineCount = rows.length + cols.length;

  if (lineCount === 0) {
    score.breakCombo();
    afterTurn();
    return;
  }

  busy = true;
  const targets = grid.lineTargets(rows, cols);

  // Phát sáng + pháo hoa + tiếng nổ, tất cả trong cùng một nhịp
  board.markClearing(targets);
  for (const key of targets) {
    const p = board.centerOf((key / W) | 0, key % W);
    fx.burst(p.x, p.y, grid.colorAt(key));
  }
  sfx.explode(lineCount);

  const res = score.gainClear(targets.size, lineCount);
  if (res.leveledUp) sfx.levelUp();
  if (lineCount > 1 || res.combo > 1) showCombo(lineCount, res.combo);
  paintHud();

  setTimeout(() => {
    grid.clearTargets(targets);
    board.render(grid);
    busy = false;
    afterTurn();
  }, CLEAR_MS);
}

function afterTurn() {
  if (tray.isEmpty()) {                       // luật R4: hết cả ba mới phát bộ mới
    tray.refill(score.level);
    board.renderTray(tray);
  }
  const alive = tray.pieces().some(p => grid.anyPlacement(p.cells));
  if (!alive) gameOver();
}

function gameOver() {
  const data = replay.toJSON();
  store.saveReplay(data);

  /* Tự kiểm tra: chạy lại nguyên ván bằng logic thuần và so điểm. Lệch một
     điểm nghĩa là có bug trong luật chơi — và cũng là đúng phép tính mà máy
     chủ sẽ làm nếu sau này có bảng xếp hạng. */
  const check = simulate(data);
  if (!check.valid || check.score !== score.value) {
    console.warn("[xep-khoi] điểm mô phỏng lệch điểm thật:", check, "thật =", score.value);
  }

  el("finalScore").textContent = score.value;
  el("over").classList.add("show");
}

/* ---------- Giao diện ---------- */

function paintHud() {
  el("score").textContent = score.value;
  el("level").textContent = score.level;
  if (score.value > best) {
    best = score.value;
    store.setBest(best);
  }
  el("best").textContent = best;
}

function showCombo(lines, combo) {
  const c = el("combo");
  c.textContent = combo > 1 ? "COMBO x" + combo + "!" : lines + " HÀNG!";
  c.classList.remove("show");
  void c.offsetWidth;            // ép trình duyệt chạy lại animation
  c.classList.add("show");
}

function syncMuteButton() {
  const b = el("mute");
  b.textContent = sfx.muted ? "🔇" : "🔊";
  b.setAttribute("aria-label", sfx.muted ? "Bật âm thanh" : "Tắt âm thanh");
}

/* ---------- Nối dây ---------- */

initDrag({
  board,
  getTray:  () => tray,
  canPlace: (cells, row, col) => grid.canPlace(cells, row, col),
  isBusy:   () => busy,
  onDrop:   commitMove
});

el("again").addEventListener("click", reset);
el("mute").addEventListener("click", () => {
  sfx.muted = !sfx.muted;
  store.setMuted(sfx.muted);
  syncMuteButton();
  if (!sfx.muted) sfx.place();
});

document.addEventListener("pointerdown", () => sfx.unlock(), { once: true });
window.addEventListener("resize", () => {
  fx.resize();
  board.resize();
  board.renderTray(tray);
});

reset();
board.resize();
board.renderTray(tray);

/* Cửa sổ nhỏ để soi từ console khi cần gỡ lỗi hoặc kiểm tra replay. */
window.xepKhoi = { get replay() { return replay.toJSON(); }, simulate, store };

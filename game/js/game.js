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
import { auth }    from "./auth.js";
import * as net    from "./net.js";
import { isConfigured } from "./config.js";
import { initLeaderboard, loadIdentity, openLeaderboard, nickname } from "./leaderboard.js";

/** Tổng thời gian hiệu ứng xoá. Đừng làm nhanh hơn — đây là khoảnh khắc "đã"
 *  nhất của trò chơi. */
const CLEAR_MS = 340;

const el = id => document.getElementById(id);

const board = new Board(el("board"), el("tray"));
const fx    = new Fx(el("fx"));
const sfx   = new Sfx();

let grid, score, tray, rng, replay, busy;
let best = store.best();

/* Hạt giống của ván ĐANG chơi. null nghĩa là ván luyện tập — hạt giống do máy
   này tự sinh, nên không có cách nào chứng minh với máy chủ, và không gửi lên.
   Có giá trị nghĩa là ván xếp hạng: hạt giống này do máy chủ cấp riêng cho
   người đang đăng nhập, dùng đúng một lần. */
let currentSeedId = null;

/* Hạt giống của ván SAU, lấy sẵn trong lúc đang chơi ván này. Nhờ vậy bấm
   "Chơi lại" là vào ngay, không có khoảnh khắc chờ mạng nào cả. */
let pendingSeed = null;
let fetchingSeed = false;

sfx.muted = store.muted();
syncMuteButton();

/* ---------- Một ván ---------- */

function reset() {
  /* Ưu tiên hạt giống đã lấy sẵn từ máy chủ. Không có thì tự sinh một cái và
     ván này thành ván luyện tập — game phải luôn mở được, kể cả khi mất mạng,
     chưa đăng nhập, hay Supabase đang ngủ. */
  let seed;
  if (pendingSeed) {
    seed = pendingSeed.seed;
    currentSeedId = pendingSeed.seedId;
    pendingSeed = null;
  } else {
    seed = newSeed();
    currentSeedId = null;
  }

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
  el("submitStatus").textContent = "";
  paintHud();
  paintMode();
  prefetchSeed();
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
  submitScore(data);
}

/* ---------- Bảng xếp hạng ---------- */

/* Gửi BẢN GHI VÁN, không gửi điểm. Máy chủ chạy lại nguyên ván rồi tự tính —
   con số điểm ở máy này có sửa cũng vô nghĩa. */
async function submitScore(data) {
  const status = el("submitStatus");
  if (!currentSeedId) {
    status.textContent = isConfigured() ? "Ván luyện tập — không tính xếp hạng." : "";
    return;
  }

  const seedId = currentSeedId;
  currentSeedId = null;                 // một hạt giống chỉ dùng cho một ván
  status.textContent = "Đang gửi điểm…";

  try {
    const res = await net.submitScore(seedId, data);
    status.textContent = res.isNewBest
      ? "Kỷ lục mới! Hạng " + res.rank + " / " + res.total
      : "Hạng " + res.rank + " / " + res.total + " · kỷ lục của bạn: " + res.best;
  } catch (e) {
    // Không dùng được bảng xếp hạng thì nói thẳng, và ván chơi vẫn nguyên vẹn.
    status.textContent = "Chưa gửi được điểm lên bảng xếp hạng.";
    console.warn("[xep-khoi] gửi điểm thất bại:", e.code, e.message);
  }
}

/* Lấy trước hạt giống cho ván sau. Im lặng khi thất bại: hậu quả duy nhất là
   ván sau thành ván luyện tập, và người chơi đã thấy điều đó ghi trên màn hình. */
async function prefetchSeed() {
  if (pendingSeed || fetchingSeed) return;
  if (!net.canRank() || !nickname()) return;   // chưa có biệt danh thì chưa lên bảng được

  fetchingSeed = true;
  try {
    const s = await net.issueSeed();
    pendingSeed = { seedId: s.seedId, seed: s.seed };
  } catch (e) {
    /* mất mạng, hết lượt, hoặc máy chủ đang ngủ — cứ chơi luyện tập */
  } finally {
    fetchingSeed = false;
  }

  /* Phải nằm NGOÀI khối try/finally ở trên. upgradeIfUntouched() gọi reset(),
     mà reset() lại gọi chính hàm này để lấy hạt giống cho ván sau — nếu còn ở
     trong finally thì fetchingSeed vẫn đang bật và lời gọi đó bị bỏ qua. Hậu
     quả: từ ván thứ hai trở đi lúc nào cũng phải chờ mạng, đúng thứ mà việc
     lấy trước sinh ra để tránh. */
  if (pendingSeed) upgradeIfUntouched();
}

/* Ván đang chơi là ván luyện tập nhưng người chơi CHƯA đi nước nào, mà hạt
   giống vừa về tới. Đổi ngay sang ván xếp hạng — lúc này đổi khay là vô hại.
   Sau nước đi đầu tiên thì tuyệt đối không đụng vào ván đang chơi nữa. */
function upgradeIfUntouched() {
  if (currentSeedId || busy) return;
  if (replay.moves.length > 0) return;
  reset();
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

function paintMode() {
  const m = el("mode");
  if (currentSeedId)      { m.textContent = "Ván xếp hạng"; m.className = "ranked"; return; }
  m.className = "";
  if (!isConfigured())    { m.textContent = ""; }
  else if (!auth.signedIn){ m.textContent = "Ván luyện tập · đăng nhập để lên bảng xếp hạng"; }
  else if (!nickname())   { m.textContent = "Ván luyện tập · hãy đặt biệt danh"; }
  else                    { m.textContent = "Ván luyện tập · không tính xếp hạng"; }
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
el("overRank").addEventListener("click", openLeaderboard);
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

initLeaderboard({
  onIdentityChange: () => { paintMode(); prefetchSeed(); }
});

reset();
board.resize();
board.renderTray(tray);

/* Mất mạng rồi có lại: cập nhật dòng chữ và thử lấy hạt giống cho ván sau. */
addEventListener("online",  () => { paintMode(); prefetchSeed(); });
addEventListener("offline", paintMode);

/* Khởi động phần bảng xếp hạng. Chạy sau khi ván đầu đã hiện ra — người chơi
   kéo được khối ngay, không phải đợi mạng một giây nào. */
(async function connect() {
  try {
    await auth.finishRedirect();        // vừa từ Google quay về thì hoàn tất ở đây
  } catch (e) {
    console.warn("[xep-khoi] đăng nhập thất bại:", e.message);
  }
  await loadIdentity();
  paintMode();
  prefetchSeed();
})();

/* Cửa sổ nhỏ để soi từ console khi cần gỡ lỗi hoặc kiểm tra replay. */
window.xepKhoi = {
  get replay() { return replay.toJSON(); },
  get ranked() { return !!currentSeedId; },
  simulate, store, auth, net
};

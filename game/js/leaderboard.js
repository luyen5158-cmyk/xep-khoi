/* leaderboard.js — Màn hình bảng xếp hạng, đặt biệt danh và quản lý tài khoản.
 *
 * ĐIỀU LUẬT KHÔNG CÓ NGOẠI LỆ TRONG FILE NÀY:
 * biệt danh chỉ được đưa ra màn hình bằng textContent. Không innerHTML, không
 * insertAdjacentHTML, không nối chuỗi HTML. Dự án đã quyết định không lọc nội
 * dung tên, nên người chơi hoàn toàn có thể đặt tên là một đoạn mã — và nếu
 * đoạn mã đó được ghép vào HTML, nó sẽ chạy trên máy của MỌI NGƯỜI mở bảng xếp
 * hạng, đủ để lấy sạch phiên đăng nhập của họ. textContent thì trình duyệt
 * luôn hiểu là chữ, không bao giờ là mã.
 */
"use strict";

import { auth } from "./auth.js";
import * as net from "./net.js";
import { isConfigured } from "./config.js";

const el = id => document.getElementById(id);

let myNickname = null;
let onIdentityChange = () => {};

export function initLeaderboard(opts = {}) {
  onIdentityChange = opts.onIdentityChange || (() => {});

  el("rank").addEventListener("click", openLeaderboard);
  el("lbClose").addEventListener("click", () => el("lb").classList.remove("show"));
  el("signIn").addEventListener("click", () => auth.signIn().catch(e => setStatus(e.message)));
  el("signOut").addEventListener("click", async () => {
    await auth.signOut();
    myNickname = null;
    paintAccount();
    onIdentityChange();
    openLeaderboard();
  });
  el("editNick").addEventListener("click", () => openNickname(false));
  el("deleteAcc").addEventListener("click", removeAccount);
  el("nickSave").addEventListener("click", saveNickname);
  el("nickCancel").addEventListener("click", () => el("nick").classList.remove("show"));
  el("nickInput").addEventListener("keydown", e => { if (e.key === "Enter") saveNickname(); });

  paintAccount();
}

export function nickname() { return myNickname; }

/** Gọi sau khi đăng nhập xong: lấy biệt danh, chưa có thì hỏi ngay. */
export async function loadIdentity() {
  if (!auth.signedIn) { myNickname = null; paintAccount(); return; }
  try {
    myNickname = await net.myNickname(auth.userId);
  } catch (e) {
    myNickname = null;
  }
  paintAccount();
  if (!myNickname) openNickname(true);
}

/* ---------- Bảng xếp hạng ---------- */

export async function openLeaderboard() {
  el("lb").classList.add("show");
  paintAccount();

  const list = el("lbList");
  list.textContent = "";
  el("lbSelf").textContent = "";

  if (!isConfigured()) {
    setStatus("Bảng xếp hạng chưa được bật cho bản này.");
    return;
  }
  setStatus("Đang tải…");

  let rows;
  try {
    rows = await net.topScores(50);
  } catch (e) {
    // Supabase ngủ đông hoặc mất mạng. Nói thẳng ra — để bảng trống trơn mà
    // không giải thích gì là cách tệ nhất, người chơi sẽ tưởng máy mình hỏng.
    setStatus("Bảng xếp hạng tạm thời không dùng được. Game vẫn chơi bình thường.");
    return;
  }

  if (!rows.length) {
    setStatus("Chưa ai lên bảng. Bạn có thể là người đầu tiên.");
  } else {
    setStatus("");
    for (const row of rows) list.appendChild(rowNode(row));
  }

  if (auth.signedIn) showMyRank();
}

/* Dựng một dòng bằng createElement + textContent. Xem lời ghi chú đầu file:
   đây chính là chỗ mà một dòng innerHTML sẽ mở toang cả trang. */
function rowNode(row) {
  const li = document.createElement("li");
  if (myNickname && row.nickname === myNickname) li.className = "me";

  const rank = document.createElement("span");
  rank.className = "r";
  rank.textContent = row.rank;

  const name = document.createElement("span");
  name.className = "n";
  name.textContent = row.nickname;

  const score = document.createElement("span");
  score.className = "s";
  score.textContent = row.score;

  li.append(rank, name, score);
  return li;
}

/* Hạng của chính mình, kể cả khi đứng ngoài top 50. Đây là con số khiến người
   ta bấm "chơi lại": thấy mình hạng 128/340 thì còn có cái để đuổi. */
async function showMyRank() {
  try {
    const mine = await net.playerRank(auth.userId);
    el("lbSelf").textContent = mine
      ? "Bạn: hạng " + mine.rank + " / " + mine.total + " · " + mine.score + " điểm"
      : "Bạn chưa có điểm nào trên bảng.";
  } catch (e) { /* phần phụ, hỏng thì bỏ qua */ }
}

function setStatus(text) {
  el("lbStatus").textContent = text;
}

/* ---------- Tài khoản ---------- */

function paintAccount() {
  const on = auth.signedIn;
  el("signIn").hidden   = on || !isConfigured();
  el("signedIn").hidden = !on;
  el("whoami").textContent = myNickname ? "Bạn là " + myNickname : "Chưa đặt biệt danh";
}

function openNickname(firstTime) {
  el("nickTitle").textContent = firstTime ? "Chọn biệt danh" : "Đổi biệt danh";
  el("nickInput").value = myNickname || "";
  el("nickStatus").textContent = "";
  el("nick").classList.add("show");
  el("nickInput").focus();
}

async function saveNickname() {
  const value = el("nickInput").value.trim();
  el("nickStatus").textContent = "Đang lưu…";
  try {
    const res = await net.setNickname(value);
    myNickname = res.nickname;
    el("nick").classList.remove("show");
    paintAccount();
    onIdentityChange();
  } catch (e) {
    el("nickStatus").textContent = e.message;
  }
}

async function removeAccount() {
  const ok = confirm(
    "Xoá tài khoản sẽ xoá luôn điểm và bản ghi ván của bạn, không lấy lại được.\n\nVẫn xoá?"
  );
  if (!ok) return;
  try {
    await net.deleteAccount();
  } catch (e) {
    setStatus("Không xoá được: " + e.message);
    return;
  }
  await auth.signOut();
  myNickname = null;
  paintAccount();
  onIdentityChange();
  setStatus("Đã xoá tài khoản.");
  el("lbList").textContent = "";
  el("lbSelf").textContent = "";
}

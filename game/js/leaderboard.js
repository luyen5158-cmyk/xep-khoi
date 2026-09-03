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

/* Phải khớp với supabase/functions/profile/index.ts. Lệch nhau là người chơi
   gõ đúng theo màn hình nhưng máy chủ vẫn từ chối. */
const NICK_MIN = 2;
const NICK_MAX = 16;

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
  el("nickInput").addEventListener("input", paintNickRules);

  paintAccount();
}

export function nickname() { return myNickname; }

/** Gọi sau khi đăng nhập xong: lấy biệt danh, chưa có thì hỏi ngay. */
export async function loadIdentity() {
  if (!auth.signedIn) { myNickname = null; paintAccount(); return; }

  /* Phân biệt "hỏi xong, biết chắc là chưa có biệt danh" với "không hỏi được".
     Thiếu chỗ phân biệt này thì người đã đăng nhập mà đang mất mạng sẽ bị hộp
     đặt biệt danh nhảy ra đè lên ván chơi, mà bấm Lưu cũng không lưu được. */
  let answered = false;
  try {
    myNickname = await net.myNickname(auth.userId);
    answered = true;
  } catch (e) {
    myNickname = null;
  }
  paintAccount();
  if (answered && !myNickname) openNickname(true);
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
  setStatusLine("", "");
  paintNickRules();
  el("nick").classList.add("show");
  el("nickInput").focus();
}

/* Đếm ký tự và bật/tắt nút Lưu ngay trong lúc gõ.
   Trước đây ô trống vẫn bấm Lưu được, gửi lên máy chủ rồi mới bị từ chối — mà
   thông báo trả về lại nằm ở chỗ dễ bỏ sót. Giờ luật hiện ngay dưới ô, và nút
   Lưu chỉ sáng khi tên đã hợp lệ, nên không còn kiểu "bấm mà không có gì xảy ra". */
function paintNickRules() {
  const value = clean(el("nickInput").value);
  const len   = [...value].length;
  const count = el("nickCount");

  count.textContent = len + " / " + NICK_MAX;
  count.className = len === 0 ? "" : (len >= NICK_MIN && len <= NICK_MAX ? "ok" : "bad");

  el("nickSave").disabled = !(len >= NICK_MIN && len <= NICK_MAX);
}

/* Dọn giống hệt phía máy chủ để cái người chơi thấy chính là cái được lưu.
   Hai bên lệch nhau là sinh ra loại lỗi khó chịu nhất: đếm đủ 6 ký tự trên màn
   hình nhưng máy chủ lại bảo quá ngắn. */
function clean(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const invisible =
      cp < 0x20 || cp === 0x7f ||
      (cp >= 0x200b && cp <= 0x200f) ||
      (cp >= 0x202a && cp <= 0x202e) ||
      (cp >= 0x2066 && cp <= 0x2069) ||
      cp === 0xfeff;
    if (!invisible) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

function setStatusLine(text, kind) {
  const p = el("nickStatus");
  p.textContent = text;
  p.className = kind ? "muted " + kind : "muted";
}

async function saveNickname() {
  const value = clean(el("nickInput").value);
  const len   = [...value].length;

  // Chặn tại chỗ, không bắt người chơi chờ một vòng mạng để nghe "quá ngắn".
  if (len < NICK_MIN) return setStatusLine("Cần ít nhất " + NICK_MIN + " ký tự.", "err");
  if (len > NICK_MAX) return setStatusLine("Dài quá, tối đa " + NICK_MAX + " ký tự.", "err");
  if (!auth.signedIn)  return setStatusLine("Bạn chưa đăng nhập. Đóng cửa sổ này rồi bấm Đăng nhập bằng Google.", "err");

  el("nickSave").disabled = true;
  setStatusLine("Đang lưu…", "");

  try {
    const res = await net.setNickname(value);
    myNickname = res.nickname;
    setStatusLine("Đã lưu: " + res.nickname, "ok");
    paintAccount();
    onIdentityChange();
    setTimeout(() => el("nick").classList.remove("show"), 700);
  } catch (e) {
    setStatusLine(nickError(e), "err");
    el("nickSave").disabled = false;
  }
}

/* Mã lỗi của máy chủ dịch sang câu người đọc hiểu VÀ biết phải làm gì tiếp.
   "Máy chủ trả về lỗi 409" thì không ai biết phải xử lý ra sao. */
function nickError(e) {
  switch (e.code) {
    case "nickname_taken": return "Tên này có người dùng rồi. Thử thêm số hoặc đổi cách viết.";
    case "bad_nickname":   return "Tên phải dài " + NICK_MIN + "–" + NICK_MAX + " ký tự.";
    case "rate_limited":   return "Hôm nay đổi tên nhiều lần quá. Thử lại vào ngày mai.";
    case "unauthorized":   return "Phiên đăng nhập đã hết hạn. Đăng nhập lại giúp tôi.";
    case "offline":
    case "timeout":        return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
    case "not_configured": return "Bảng xếp hạng chưa được bật cho bản này.";
    default:               return e.message || "Không lưu được, thử lại sau.";
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

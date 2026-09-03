# 待辦清單 / Danh sách việc cần làm

*最後更新 2026-09-03 · 決定的理由寫在 [INFRA.md](INFRA.md)*

打勾 `[x]` 表示做完了。每一項都寫了「為什麼」，這樣隔幾個月回來看還知道在講什麼。

> *Đánh dấu `[x]` là xong. Mỗi việc đều ghi lý do để vài tháng sau quay lại vẫn hiểu.*

---

## A. 已知的 bug（現在不會發作，接上排行榜就會）

> *Lỗi đã biết — bây giờ chưa gây hại, nối Supabase vào là bùng.*

- [ ] **修 `game/sw.js`：只處理自己網站的檔案**
  現在它攔截**所有**網路請求，包括打去 Supabase 的，還把回應存進快取。
  後果：排行榜永遠是舊的；沒網路時去要排行榜資料會拿回一個 HTML 網頁，程式當場壞掉。
  修法：在 `fetch` 事件裡判斷 `new URL(e.request.url).origin !== self.location.origin` 就直接 return。
  *Chỉ xử lý file của chính mình, các yêu cầu gửi ra ngoài thì bỏ qua.*

- [ ] **`.gitignore` 加上 `.env`**
  現在只擋 macOS、iCloud、Unity 的檔案。哪天不小心把 `service_role key` 推上去，那把鑰匙就永遠洩漏了 —— Git 記得每一個版本，刪掉再 commit 也沒用，只能去後台作廢重發。
  *Thêm `.env` vào `.gitignore`. Lỡ đẩy khoá lên là lộ vĩnh viễn.*

---

## B. 四件沒得商量的安全要求

> *Bốn yêu cầu an toàn không thương lượng.*

- [ ] **暱稱一律用純文字輸出，永遠不用 `innerHTML`**
  玩家可以把暱稱設成一段程式碼。輸出方式錯了，那段程式碼會在**每一個看排行榜的人**的瀏覽器上執行，偷走所有人的登入憑證。因為決定不做名字過濾，這一層更不能有例外。
  *Không bao giờ dùng `innerHTML` cho biệt danh.*

- [ ] **每一張資料表都確認權限鎖已開啟**
  Supabase 最常見也最慘的意外。忘記開的話，公開的 anon key 就變成萬能鑰匙，任何人都能讀、能改、能**刪光整張表**。
  *Bật khoá quyền trên mọi bảng.*

- [ ] **Edge Function 限制送進來的資料大小和步數**
  否則有人送「一百萬步」的假對局，伺服器就忙著跑那一百萬步。

- [ ] **次數限制寫進資料庫，不要寫在記憶體**
  Edge Function 每次呼叫都是全新環境，**記憶體裡數次數完全無效**，重開就歸零。第一次做無伺服器最常踩的坑。
  *Giới hạn số lần phải lưu vào cơ sở dữ liệu.*

---

## C. 做排行榜時一定會碰到的

> *Chắc chắn gặp khi làm bảng xếp hạng.*

- [ ] **Edge Function 要自己處理 CORS**
  瀏覽器送資料前會先發一個 `OPTIONS` 試探請求。Edge Function 不會自動回答，要自己寫。忘了 = 分數永遠送不上去，錯誤訊息還非常莫名其妙。最多人卡住的地方。

- [ ] **登入後清掉網址列的 `?code=...`**
  用 `history.replaceState`。不清的話，玩家把網址複製給朋友時會連登入憑證一起送出去。

- [ ] **三個地方的白名單要填對**
  填錯的症狀是「登入後跳到錯誤頁面」，新手最常卡這裡。
  - Supabase → Redirect URLs → `https://luyen5158-cmyk.github.io/xep-khoi/game/`
  - Supabase → Redirect URLs → `http://localhost:8777/game/`（本機測試用）
  - Google Cloud Console → Supabase 給的那個 callback 網址

- [ ] **實機測 PWA + Google 登入**
  裝成 App 後點登入，有時會跳去瀏覽器而且回不來。PWA + OAuth 的老問題，只能實機測。

---

## D. 排行榜的完整工作清單

> *Toàn bộ việc phải làm cho bảng xếp hạng.*

**Supabase 那一半**
- [ ] 開一個 Supabase 專案（只開一個，不分測試和正式）
- [ ] 排行榜表：每人一筆最高分（暱稱、分數）→ **可公開讀**
- [ ] 對局記錄表：每人最高分那一局的下法 → **不公開，只有伺服器讀得到**
- [ ] 種子表：發給誰、用過沒、什麼時候過期
- [ ] 權限設定：所有人可讀排行榜，**沒有人可以直接寫任何表**
- [ ] 打開 Google 登入
- [ ] Edge Function：**發種子**（綁定使用者、單次、會過期）
- [ ] Edge Function：**驗證分數**（收 replay → 確認種子有效且未用過 → 重跑整局算分 → 才寫進資料庫）
- [ ] Edge Function：次數限制、資料大小限制
- [ ] 排程：清掉過期沒用到的種子（否則表會一直長大）
- [ ] 排程：防休眠，每隔幾天連線一次

**遊戲那一半**
- [ ] Google 登入按鈕
- [ ] 第一次登入後請玩家取一個暱稱
- [ ] **預先拿種子** —— 玩這一局時，背景就把下一局的種子拿好。按「再來一局」瞬間開始，沒有等待感
- [ ] **排名局 / 練習局自動判斷** —— 有登入+有網路 = 排名局；否則自動變練習局
- [ ] 練習局時畫面用小字提示「這局不算排名」
- [ ] 排行榜畫面：**前 50 名 + 自己的名次**（排在一百名外也看得到自己第幾名，這是讓人想再玩一局的關鍵）
- [ ] 每局結束後把 replay 送上去
- [ ] 排行榜壞掉時顯示「暫時不能用」，遊戲照常玩
- [ ] 刪除帳號按鈕（按了帳號和成績一起消失）

**把 `sim.js` 搬去 Supabase**
- [ ] `sim.js` 和它用到的 `grid.js`/`tray.js`/`score.js`/`level.js`/`shapes.js` 原封不動搬進 Edge Function
- [ ] ⚠️ 這幾個檔案**永遠不准加入 `document`、`window`、`localStorage`**，加了伺服器端驗證就壞掉

---

## E. 你自己要做的

> *Việc của chủ dự án.*

- [ ] **拿手機實際玩幾局，確認拖放手感**
  目前只用程式模擬觸控測過，幾何計算正確，但「順不順手」測不出來。
  **排行榜做得再好，遊戲不好玩也沒有人會來。**
  *Chơi thử trên điện thoại thật. Bảng xếp hạng làm đẹp mấy mà game không vui thì không ai vào.*

- [ ] **寫隱私權政策**（收 Google 登入資料就必須有，10 項清單在 [INFRA.md](INFRA.md)）

- [ ] **註冊一個 Supabase 帳號**

---

## F. 還沒決定的

- [ ] **要不要買網域** —— 現在是 `luyen5158-cmyk.github.io/xep-khoi/game/`，陌生人記不住。一年約 NT$300–500。不急，隨時能換。
- [ ] **要不要裝訪客統計** —— Cloudflare 的免費、不用 cookie，所以不需要同意彈窗。

---

## G. 已知風險（知情後選擇不處理）

> *Rủi ro đã biết, đã chọn không xử lý.*

這五件不是疏忽，是討論後決定接受的。日後真的發生時不要意外：

1. **改分數公式 = 排行榜要整個清空重來**（因為沒存規則版本號）
2. **總榜久了會固定不動**，新玩家失去動力（因為沒有每日榜、每週榜）
3. **機器人可以合法拿高分，而且擋不住** —— 重跑驗證擋得住改分數，擋不住「真的把遊戲玩得很好」。這個遊戲沒有時間壓力、純排列組合，正是電腦最擅長的。只要有一個人寫了會玩的程式，第一名可能永遠是他
4. **有人用髒話當暱稱**（決定先不做名字過濾。名字有限長度，後台可手動刪）
5. **隱私權政策還沒寫**，但已經決定要收 Google 登入資料

---

## 已完成 / Đã xong

- [x] 基礎設施決定討論完畢，寫進 [INFRA.md](INFRA.md)
- [x] 安全問題討論完畢：三層防作弊、四件沒得商量的安全要求、環境變數怎麼運作
- [x] 遊戲網頁上線可玩：https://luyen5158-cmyk.github.io/xep-khoi/game/
- [x] 程式拆成多個檔案，照設計文件的 8 個 script 分工
- [x] PWA：可安裝、可離線，Service Worker 在正式網址確認已啟動
- [x] 防作弊地基：有種子的亂數、下法記錄、重跑驗證程式
- [x] 自動玩完一整局測試，畫面分數與重跑結果完全一致（1507 = 1507）

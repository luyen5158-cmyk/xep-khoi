# 待辦清單 / Danh sách việc cần làm

*最後更新 2026-09-03 · 決定的理由寫在 [INFRA.md](INFRA.md)　開通步驟寫在 [supabase/README.md](supabase/README.md)*

> **現在卡在哪：** 程式已經全部寫完了。剩下的每一件事都需要 Supabase 帳號，
> 只有專案擁有者能做。在那之前遊戲完全正常，所有對局自動算練習局。

打勾 `[x]` 表示做完了。每一項都寫了「為什麼」，這樣隔幾個月回來看還知道在講什麼。

> *Đánh dấu `[x]` là xong. Mỗi việc đều ghi lý do để vài tháng sau quay lại vẫn hiểu.*

---

## 下一步照這個順序做 / Thứ tự nên làm tiếp

> *Không mở Supabase trước. Việc đầu tiên là cầm điện thoại chơi thử.*

**第一件事不是開 Supabase，是拿手機玩五局。**

不用帳號、五分鐘做得完，卻可能推翻後面所有工作的順序。目前拖放手感只用程式模擬觸控測過 —— 幾何計算正確，但「順不順手」測不出來。如果實際用拇指玩起來卡卡的，該修的是 `game/js/drag.js`，不是趕著開資料庫。開完 Supabase 才發現要改手感，順序就白排了。

> **排行榜做得再好，遊戲不好玩也沒有人會來。**

| 順序 | 做什麼 | 大概要多久 |
|---|---|---|
| ~~1~~ | ~~拿手機實測拖放手感~~ **✅ 2026-09-03 實機測過，手感沒問題** | — |
| ~~2~~ | ~~註冊 Supabase + 跑 SQL~~ **✅ 2026-09-03 專案 `blast!!`（Singapore）建好，migration 已套用，RLS 從外部驗證通過** | — |
| ~~3~~ | ~~Google 登入 + 白名單~~ **✅ 用 `supabase config push` 一次做完，實際登入通過** | — |
| ~~4~~ | ~~部署三個 Edge Function~~ **✅ 三個都上線，CORS 預檢與權限實測通過** | — |
| ~~5~~ | ~~填 `config.js`~~ **✅ 排行榜活了：第一筆成績 `meme` 2714 分** | — |
| **6** | **GitHub Secrets + 防休眠排程（README 步驟 7）← 下一步** | 10 分鐘 |
| 7 | 寫隱私權政策（10 項清單在 [INFRA.md](INFRA.md)） | 給陌生人玩之前必須有 |

**步驟 2 值得單獨切開來做。** SQL 跑完、五張表的 RLS 都亮著，你就知道整條路是通的，心裡有底再去處理 Google 登入那段麻煩事。

**步驟 4 的兩種部署方式不用先選。** 先用一般那行；只有在送分時瀏覽器噴 401、而且訊息看起來跟 CORS 有關，才改用 `--no-verify-jwt`。安全性一樣，那三個函式本來就自己驗 token。

**F 段那兩項現在都不要做**（見下方）：網域隨時能換，訪客統計現在裝了也只會看到自己的訪問。

詳細操作步驟全部在 [supabase/README.md](supabase/README.md)，最後附了十項自我驗收清單。

---

## A. 已知的 bug（現在不會發作，接上排行榜就會）

> *Lỗi đã biết — bây giờ chưa gây hại, nối Supabase vào là bùng.*

- [x] **修 `game/sw.js`：只處理自己網站的檔案**
  原本它攔截**所有**網路請求，包括打去 Supabase 的，還把回應存進快取。
  後果會是：排行榜永遠是舊的；沒網路時去要排行榜資料會拿回一個 HTML 網頁，程式當場壞掉。
  已修：`fetch` 事件裡先比對 origin，不是自己家的就完全不碰。順便把 `CACHE` 版本號改成 `v2`。
  *Chỉ xử lý file của chính mình, các yêu cầu gửi ra ngoài thì bỏ qua.*

- [x] **`.gitignore` 加上 `.env`**
  原本只擋 macOS、iCloud、Unity 的檔案。哪天不小心把 `service_role key` 推上去，那把鑰匙就永遠洩漏了 —— Git 記得每一個版本，刪掉再 commit 也沒用，只能去後台作廢重發。
  已加上 `.env`、`.env.*` 和 Supabase CLI 的暫存資料夾，另附一份 `.env.example` 當範本。
  *Thêm `.env` vào `.gitignore`. Lỡ đẩy khoá lên là lộ vĩnh viễn.*

---

## B. 四件沒得商量的安全要求

> *Bốn yêu cầu an toàn không thương lượng.*

- [x] **暱稱一律用純文字輸出，永遠不用 `innerHTML`**
  玩家可以把暱稱設成一段程式碼。輸出方式錯了，那段程式碼會在**每一個看排行榜的人**的瀏覽器上執行，偷走所有人的登入憑證。因為決定不做名字過濾，這一層更不能有例外。
  *Không bao giờ dùng `innerHTML` cho biệt danh.*

- [x] **每一張資料表都確認權限鎖已開啟**
  2026-09-03 用 `curl` 從外部實測：寫入五張表全部被 `42501 row-level security` 擋下，
  兩個秘密函式回 `permission denied`，排行榜與暱稱讀得到。比後台顯示 enabled 可靠。
  Supabase 最常見也最慘的意外。忘記開的話，公開的 anon key 就變成萬能鑰匙，任何人都能讀、能改、能**刪光整張表**。
  *Bật khoá quyền trên mọi bảng.*

- [x] **Edge Function 限制送進來的資料大小和步數**
  否則有人送「一百萬步」的假對局，伺服器就忙著跑那一百萬步。

- [x] **次數限制寫進資料庫，不要寫在記憶體**
  Edge Function 每次呼叫都是全新環境，**記憶體裡數次數完全無效**，重開就歸零。第一次做無伺服器最常踩的坑。
  *Giới hạn số lần phải lưu vào cơ sở dữ liệu.*

---

## C. 做排行榜時一定會碰到的

> *Chắc chắn gặp khi làm bảng xếp hạng.*

- [x] **Edge Function 要自己處理 CORS**
  瀏覽器送資料前會先發一個 `OPTIONS` 試探請求。Edge Function 不會自動回答，要自己寫。忘了 = 分數永遠送不上去，錯誤訊息還非常莫名其妙。最多人卡住的地方。

- [x] **登入後清掉網址列的 `?code=...`**
  用 `history.replaceState`。不清的話，玩家把網址複製給朋友時會連登入憑證一起送出去。

- [x] **三個地方的白名單要填對**
  Supabase 那兩條寫在 `supabase/config.toml` 的 `additional_redirect_urls`，用 `supabase config push` 送上去 —— 白名單躺在 git 裡，看 repo 就知道。Google 那條是 OAuth client 的 redirect URI。
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
- [x] 開一個 Supabase 專案（只開一個，不分測試和正式）—— `blast!!`，Singapore，Free
- [x] 排行榜表：每人一筆最高分（暱稱、分數）→ **可公開讀**
- [x] 對局記錄表：每人最高分那一局的下法 → **不公開，只有伺服器讀得到**
- [x] 種子表：發給誰、用過沒、什麼時候過期
- [x] 權限設定：所有人可讀排行榜，**沒有人可以直接寫任何表**
- [x] 打開 Google 登入（`supabase config push`，secret 走 `.env` 不進 git）
- [x] Edge Function：**發種子**（綁定使用者、單次、會過期）
- [x] Edge Function：**驗證分數**（收 replay → 確認種子有效且未用過 → 重跑整局算分 → 才寫進資料庫）
- [x] Edge Function：次數限制、資料大小限制
- [x] 排程：清掉過期沒用到的種子（否則表會一直長大）
- [x] 排程：防休眠，每隔幾天連線一次（跟上面同一支，一次做兩件事）

**遊戲那一半**
- [x] Google 登入按鈕
- [x] 第一次登入後請玩家取一個暱稱
- [x] **預先拿種子** —— 玩這一局時，背景就把下一局的種子拿好。按「再來一局」瞬間開始，沒有等待感
- [x] **排名局 / 練習局自動判斷** —— 有登入+有網路 = 排名局；否則自動變練習局
- [x] 練習局時畫面用小字提示「這局不算排名」
- [x] 排行榜畫面：**前 50 名 + 自己的名次**（排在一百名外也看得到自己第幾名，這是讓人想再玩一局的關鍵）
- [x] 每局結束後把 replay 送上去
- [x] 排行榜壞掉時顯示「暫時不能用」，遊戲照常玩
- [x] 刪除帳號按鈕（按了帳號和成績一起消失）

**把 `sim.js` 搬去 Supabase**
- [x] `sim.js` 和它用到的 `grid.js`/`tray.js`/`score.js`/`level.js`/`shapes.js` 原封不動搬進 Edge Function（用 `./tools/sync-engine.sh` 複製，GitHub 排程會擋走鐘）
- [x] ⚠️ 這幾個檔案**永遠不准加入 `document`、`window`、`localStorage`** —— `sync-engine.sh` 現在會自動檢查，加了就擋下來

---

## E. 你自己要做的

> *Việc của chủ dự án.*

- [x] **拿手機實際玩幾局，確認拖放手感**
  2026-09-03 用實機玩過，回報「都 ok」。手感這關過了，可以放心往下做排行榜。
  *Đã chơi thử trên điện thoại thật ngày 2026-09-03, cảm giác kéo thả ổn.*

- [ ] **寫隱私權政策**（收 Google 登入資料就必須有，10 項清單在 [INFRA.md](INFRA.md)）

- [x] **註冊一個 Supabase 帳號**（用 GitHub 登入）

---

## F. 還沒決定的

> **兩項現在都建議不做。** 不是否決，是時機未到 —— 留在這裡等有人玩了再回來看。

- [ ] **要不要買網域** —— 現在是 `luyen5158-cmyk.github.io/xep-khoi/game/`，陌生人記不住。一年約 NT$300–500。不急，隨時能換。
- [ ] **要不要裝訪客統計** —— Cloudflare 的免費、不用 cookie，所以不需要同意彈窗。

---

## G2. 待處理的安全事項

- [ ] **換掉 Google OAuth Client Secret**
  2026-09-03 建立 OAuth client 時，那把 secret 出現在截圖裡，等於進了對話記錄。
  風險低（私人對話，沒有公開），但正確做法是換一把：
  Google Cloud Console → 用戶端 → `xep-khoi web` → 新增一把 secret → 更新 `.env` →
  `supabase config push` → 確認登入還能用 → 刪掉舊的那把。
  **教訓：ID 和金鑰一律從 DOM 取，不要用眼睛讀截圖。** 同一天 Client ID 也讀錯兩個
  字元（`g` 看成 `q`、`m` 看成 `rn`），害登入回 `invalid_client`，查了一輪才發現。
  *Đổi Client Secret. Bài học: lấy ID và khoá từ DOM, đừng đọc bằng mắt từ ảnh chụp.*

- [ ] **把 OAuth 同意畫面從 Testing 改成 Production**
  現在只有列在 Test users 的 email 登得進去（目前只有 `megan@wport.me`）。
  **Google 要求先有隱私權政策網址才准 Publish** —— 所以第 7 項不是「之後再說」，
  它直接卡住對外開放的日子。
  *Google bắt buộc có link chính sách bảo mật mới cho Publish.*

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
- [x] 排行榜的程式全部寫完 —— SQL、三個 Edge Function、登入、暱稱、榜單畫面、
      預先拿種子、刪除帳號、兩支 GitHub 排程
- [x] 用假的 Supabase 在本機跑完整流程：連玩兩局排名局都成功送分，
      按「再來一局」是**瞬間**開始的排名局
- [x] 把伺服器那份引擎搬到 Node 裡跑同一份 replay，分數完全一致（2461 = 2461），
      `valid` 和 `ended` 都成立
- [x] 確認暱稱裡的 HTML 只會顯示成文字，不會變成網頁元素

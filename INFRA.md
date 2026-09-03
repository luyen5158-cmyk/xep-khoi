# 基礎設施決定記錄 / Ghi chép quyết định hạ tầng

*《疊方塊》Xếp Khối — 最後更新 2026-09-03*

這份文件記錄「東西要放哪裡、用什麼做」的決定，以及**為什麼這樣選、否決了什麼**。
遊戲規則、分數公式、美術規格在 [ho-so-thiet-ke.html](ho-so-thiet-ke.html)，兩份不重疊。

> *Tài liệu này ghi lại các quyết định về hạ tầng: đặt ở đâu, dùng cái gì, **tại sao chọn như vậy và đã loại bỏ phương án nào**. Luật chơi và công thức điểm nằm ở [ho-so-thiet-ke.html](ho-so-thiet-ke.html).*

日後想改任何一項之前，先讀這裡的理由 —— 當初否決掉的選項，通常是因為某個到現在還存在的原因。

---

## 一句話總結 / Tóm tắt một câu

**一個公開的、可安裝的網頁遊戲，用 Google 登入，只有一個總排行榜，不放廣告，每月 0 元。**

> *Một game web công khai, cài được vào màn hình chính, đăng nhập bằng Google, chỉ có một bảng xếp hạng tổng, không quảng cáo, 0 đồng mỗi tháng.*

---

## 決定總表 / Bảng quyết định

| 項目 / Mục | 決定 / Quyết định | 狀態 |
|---|---|---|
| 遊戲網頁 / Trang web | GitHub Pages，網址不變 | ✅ 已上線 |
| 程式結構 / Cấu trúc code | 多個 JS 檔，不用打包工具 | ✅ 已完成 |
| 形式 / Hình thức | 可安裝的網頁（PWA） | ✅ 已完成 |
| 排行榜資料 / Dữ liệu | Supabase，只開一個專案 | ⬜ 未開始 |
| 榜單種類 / Loại bảng | 只有總榜 | ⬜ 未開始 |
| 怎麼存 / Cách lưu | 每人只存一筆最高分 | ⬜ 未開始 |
| 名次 / Thứ hạng | 每人只佔一個名次 | ⬜ 未開始 |
| 登入 / Đăng nhập | Google 一鍵，用 Supabase 內建 | ⬜ 未開始 |
| 榜上名字 / Tên hiện trên bảng | 玩家自己取的暱稱 | ⬜ 未開始 |
| 沒登入 / Không đăng nhập | 可以玩，不能上榜 | ⬜ 未開始 |
| 防作弊 / Chống gian lận | 伺服器重跑整局自己算分 | 🟡 客戶端已備妥 |
| 防猜密碼 / Chống dò mật khẩu | 有次數限制 | ⬜ 未開始 |
| 送分時機 / Khi nào gửi điểm | 每局結束都送 | ⬜ 未開始 |
| 壞掉時 / Khi hỏng | 顯示「暫時不能用」，遊戲照玩 | ⬜ 未開始 |
| 對局記錄 / Bản ghi ván đấu | 只留每人最高分那一局 | ⬜ 未開始 |
| 刪除資料 / Xoá dữ liệu | 遊戲裡有刪除按鈕 | ⬜ 未開始 |
| 防休眠 / Chống ngủ | GitHub 自動排程定期連線 | ⬜ 未開始 |
| 規則版本號 / Số phiên bản luật | 不存 | — |
| 賺錢 / Kiếm tiền | 不 | — |
| 網域 / Tên miền | 未定 | ⬜ |
| 隱私權政策 / Chính sách riêng tư | 由專案擁有者自己寫 | ⬜ 未寫 |

---

## 各項決定與理由

### 1. 遊戲網頁 → GitHub Pages

網址 `https://luyen5158-cmyk.github.io/xep-khoi/game/`，推上 `main` 分支就自動更新。

> *Trang web đặt ở GitHub Pages, push lên nhánh `main` là tự cập nhật.*

**為什麼：** 本來就在用，不用搬家，免費，而且遊戲本身是純靜態檔案，它做得到的事已經全部夠用。

**否決了：** *Cloudflare Pages*（在越南比較快，也能直接接後端 —— 但排行榜決定用 Supabase 之後，「同一個後台管到底」的好處就沒了）、*Vercel / Netlify*（免費額度對流量限制較緊）。

**要注意：** GitHub Pages 只能放死檔案，**它永遠不可能自己撐起排行榜**。這不是設定問題，是它本來就不做這件事。

### 2. 程式結構 → 多個 JS 檔，不用打包工具

`game/js/` 底下一個檔案負責一件事，瀏覽器用 `<script type="module">` 自己組起來。

> *Mỗi file lo một việc, trình duyệt tự ghép. Không cần công cụ đóng gói.*

**為什麼：** 拿到了拆檔案的好處（照設計文件的 8 個 script 分工），卻不用裝 Node.js、不用跑 build 指令、不用改變部署方式。

**否決了：** *單一 HTML 檔*（超過 1500 行找東西太痛苦）、*加上 Vite*（要裝 Node.js，而且 **repo 在 iCloud Drive 裡**，`node_modules` 幾萬個小檔案會讓 iCloud 同步崩潰）。

**代價：** 用 ES 模組之後，**直接雙擊 `game/index.html` 是不會動的**。本機測試要開一個小伺服器：

```bash
python3 -m http.server 8777
```

然後開 `http://localhost:8777/game/`。線上沒這個問題。

### 3. 形式 → 可安裝的網頁（PWA）

`manifest.webmanifest` + `sw.js` + icon。手機選「加到主畫面」就有 icon，沒網路也能玩。

> *Chọn "Thêm vào màn hình chính" là có icon như app thật, mất mạng vẫn chơi được.*

**為什麼：** 用零成本換到九成像 App 的體驗。不用付 $25、不用等審核，改版直接 push 就更新。

**否決了：** *上架 Google Play*（要 $25 和審核。真要做的話，用 TWA 或 Capacitor 把現在這個網頁包起來就行，**不需要重寫**）、*用 Unity 重做*（要從頭學，現有程式全部作廢）。

**Service Worker 用「網路優先」：** 有網路時永遠拿最新版，沒網路才用存下來的。這是為了避開最經典的坑 —— 玩家卡在舊版本。發新版時記得改 `sw.js` 裡 `CACHE` 的版本號。

### 4. 排行榜 → Supabase，只開一個專案

**分工：網頁在 GitHub Pages，排行榜資料在 Supabase。** Supabase 是資料庫，不是網站主機。

> *Trang web ở GitHub Pages, dữ liệu bảng xếp hạng ở Supabase. Hai nơi khác nhau.*

**只開一個專案（不分測試和正式）：** 這個規模一個就夠，也不容易搞混。代價是改資料庫結構時是直接動到真的那一個 —— 動之前先備份。

**兩個必須處理的坑：**

**（a）免費專案大約一週沒人用會被自動暫停。** 暫停時排行榜壞掉，但遊戲照常能玩。**解法：用 GitHub 的自動排程每隔幾天連線一次。** 免費，設一次就好。剛上線還沒人玩的那段時間最容易中招。

**（b）給瀏覽器用的金鑰是公開的，任何人看原始碼都拿得到。**
所以 **絕對不能讓瀏覽器直接把分數寫進資料庫**。資料表權限設成「所有人可讀，沒有人可以直接寫」，寫入只能透過 Edge Function。

### 5. 榜單 → 只有總榜，每人只存一筆最高分

**一開始想做「今日榜 + 本週榜 + 總榜」，後來改成只做總榜。**

原因是這兩件事互相矛盾：如果每位玩家只存一筆最高分，今日榜就做不出來。舉例 —— 週一拿 5000 分存起來，週三拿 3000 分因為比較低被丟掉，那週三的今日榜就是空的，即使 3000 分是當天全站最高。

> *Ban đầu định làm bảng hôm nay + tuần này + tổng, sau đổi thành chỉ bảng tổng. Vì chỉ lưu điểm cao nhất mỗi người thì không thể tính được "hôm nay ai cao nhất" — điểm hôm nay thấp hơn kỷ lục cũ đã bị vứt đi rồi.*

在「保留完整歷史以支援多種榜單」和「只存最高分、簡單」之間，選了後者。

**代價（已知情）：** 一兩個月後總榜前十名會固定不動，新玩家看一眼就知道沒希望。之後想加每日榜，必須先改成每局存一筆 —— 而且**改之前的資料補不回來**。

**每人只佔一個名次：** 前十名是十個不同的人。這只是顯示規則，但因為資料本來就一人一筆，所以自動成立。

**時區：** 曾經決定用 UTC。但沒有每日榜之後這題用不到了，等真的要加每日榜再拿出來。

### 6. 防作弊 → 伺服器重跑整局自己算分

**問題：** 公開給陌生人玩之後，只要有人打開開發者工具，就能把分數改成九億分坐在第一名。這是「一定會發生」，不是「可能」。

> *Vấn đề: ai mở công cụ nhà phát triển cũng sửa được điểm thành chín trăm triệu. Đây là chuyện chắc chắn xảy ra.*

**做法：** 客戶端送上去的不是分數，而是**整局的下法**（亂數種子 + 每一步放在哪）。伺服器拿到後從頭跑一遍，自己算出分數再寫進資料庫。客戶端傳來的任何數字都不採信。

**為什麼這個遊戲做得到：** 它沒有計時、沒有物理運算、沒有種子以外的隨機，所以整局可以完整重現。

**已經備妥的部分：**

| 檔案 | 作用 |
|---|---|
| `game/js/rng.js` | 有種子的亂數，取代 `Math.random()` |
| `game/js/replay.js` | 記錄種子和每一步 |
| `game/js/sim.js` | 重跑整局算分 |

`sim.js` 以及它用到的 `grid.js` / `tray.js` / `score.js` / `level.js` / `shapes.js` **完全沒有用到瀏覽器功能**，所以可以原封不動搬進 Supabase Edge Function 當驗證器。動這幾個檔案時千萬別加入任何 `document`、`window`、`localStorage`。

**已驗證：** 自動玩完整一局，畫面顯示 1507 分，用 replay 重跑算出 1507 分，完全一致。

### 7. 玩家身分 → Google 一鍵登入（Supabase 內建）

**這題改過三次，記錄一下為什麼：**

1. 一開始：只輸入暱稱，不用登入 → 但這樣換手機成績就沒了
2. 改成：名字 + 4 位數密碼 → **但 4 位數只有一萬種組合，沒有次數限制的話幾秒就被猜完**
3. 再改成：email 可以重設密碼 → **但這就等於在做帳號系統了**，要寄信服務、要驗證網域、要隱私政策
4. 最後：**既然都要收 email 了，用 Supabase 內建的登入反而更省事也更安全**

> *Đổi ba lần. Cuối cùng: đã phải xin email thì dùng luôn hệ thống đăng nhập có sẵn của Supabase — vừa đỡ việc vừa an toàn hơn tự viết.*

**只用 Google，不做 email + 密碼。** 關鍵差別：email 登入要寄確認信，又繞回寄信服務和網域的問題；**Google 登入完全不用寄任何信**。

**榜上顯示玩家自己取的暱稱**，不是 Google 帳號的名字。真實姓名和 email 永遠不會出現在網頁上。

**沒登入也能玩，只是不能上榜。** 點進來馬上能玩，不會嚇跑新玩家。

**密碼由 Supabase 管，我們完全不碰。** 次數限制也是必要的（防止有人一直試）。

### 8. 送分時機 → 每局結束都送

雖然只存最高分，沒破紀錄的送上去等於白送，但這樣程式最單純。配合次數限制就不會被人用程式燒光免費額度。

> *Ván nào cũng gửi. Có giới hạn số lần nên không sợ bị đốt hết gói miễn phí.*

### 9. 排行榜壞掉時 → 顯示「暫時不能用」

跟玩家說一聲，遊戲照常玩。**最差的做法是什麼都不說讓榜單一片空白** —— 玩家會以為是自己手機壞了。

> *Báo cho người chơi biết, game vẫn chơi bình thường. Tệ nhất là để bảng trống trơn không nói gì.*

### 10. 對局記錄 → 只留每人最高分那一局

佔的空間極小。以後懷疑有人作弊可以拿出來重跑，甚至能做「播放最高分那一局」的功能。

### 11. 刪除資料 → 遊戲裡給一個按鈕

玩家自己按，帳號和成績一起消失。你不用管，也符合各地法規。

> *Người chơi tự bấm, tài khoản và điểm cùng biến mất.*

### 12. 規則版本號 → 不存

**已知後果：哪天改分數公式，排行榜必須整個清空重來。** 因為舊的 replay 用新公式重跑會算出不同分數，再也驗證不了。這是知情後的決定。

> *Hậu quả đã biết: ngày nào sửa công thức tính điểm thì phải xoá sạch bảng xếp hạng làm lại.*

### 13. 賺錢 → 不做

純興趣。沒有廣告，體驗最乾淨，也不用處理稅務。若之後改變主意：網頁廣告收入極低，要包成 App 放 AdMob 才划算。

### 14. 網域 → 未定

目前是 `luyen5158-cmyk.github.io/xep-khoi/game/`。買一個大約一年台幣 300–500 元。**不急，隨時能換。**

---

## 隱私權政策清單 / Danh sách cần viết

**由專案擁有者自己寫。** 收了 Google 登入資料就必須有這份文件。必須寫到：

1. **收什麼** —— Google 帳號的 email 和使用者代碼、玩家自取的暱稱、分數、最高分那局的記錄
2. **為什麼收** —— 辨識身分、顯示排行榜、驗證分數是真的
3. **公開什麼** —— 只有暱稱和分數。email 和真實姓名永遠不公開
4. **存多久** —— 帳號存在期間
5. **怎麼刪** —— 遊戲裡的刪除按鈕，按了全部消失
6. **給誰看** —— 只放在 Supabase，不賣、不給第三方
7. **廣告和追蹤** —— 沒有廣告，訪客統計不用 cookie
8. **聯絡方式** —— 一個 email 或 GitHub 連結
9. **未成年玩家** —— 通常需要一句說明
10. **最後更新日期**

> *Phải viết đủ 10 mục: thu gì · tại sao thu · công khai gì · giữ bao lâu · xoá thế nào · ai xem được · quảng cáo và theo dõi · cách liên hệ · người chơi chưa đủ tuổi · ngày cập nhật.*

---

## 費用 / Chi phí

**每月 0 元。** 需要註冊的新帳號只有 **Supabase** 一個。

| 項目 | 費用 |
|---|---|
| GitHub Pages | 0 |
| Supabase 免費方案 | 0 |
| 網域（可選，未買） | 約 NT$300–500 / 年 |

**但有一個看不見的成本：** 排行榜上線後就是一個要一直維護的東西。它壞掉時玩家會看到錯誤，你得去修。純靜態網頁沒有這個問題。

---

## 已知風險 / Rủi ro đã biết

這三件事都是知情後選的，不是疏忽：

1. **改分數公式 = 排行榜要整個清空**（沒存版本號）
2. **總榜久了會固定不動**，新玩家失去動力（沒有每日榜）
3. **隱私權政策還沒寫**，但已經決定要收 Google 登入資料

---

## 目前進度 / Tiến độ

**已完成**
- 遊戲網頁上線可玩：https://luyen5158-cmyk.github.io/xep-khoi/game/
- 21 個檔案，按設計文件的 8 個 script 分工拆好
- PWA 可安裝、可離線，Service Worker 在正式網址確認已啟動
- 防作弊地基：有種子的亂數、下法記錄、重跑驗證程式
- 自動玩完整一局測試通過，分數與重跑結果完全一致

**還沒做**
- Supabase 專案、資料表、Google 登入設定
- 暱稱設定介面、排行榜畫面、刪除帳號按鈕
- Edge Function 驗證分數、次數限制
- 防休眠排程
- 隱私權政策
- 網域

**還沒驗證**
- 真人用手指在實機上拖放的手感。目前只用程式模擬觸控測過，幾何計算正確，但「順不順手」測不出來。

---

## 動手之前先看這裡 / Đọc trước khi sửa code

- 改 `sim.js` 及它引用的檔案時，**不要加入任何瀏覽器 API**，否則伺服器端驗證會壞掉。
- 資料表權限必須是「所有人可讀，沒有人可以直接寫」。寫入只能透過 Edge Function。
- 發佈新版時記得改 `game/sw.js` 裡 `CACHE` 的版本號，否則玩家會拿到舊檔案。
- **repo 放在 iCloud Drive 裡。** 不要在這裡產生 `node_modules` 或 build 輸出。
- 分數公式、等級門檻等所有數字以 [ho-so-thiet-ke.html](ho-so-thiet-ke.html) 為準。

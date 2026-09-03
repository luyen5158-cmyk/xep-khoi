# 排行榜開通步驟 / Các bước bật bảng xếp hạng

*程式碼全部寫好了。這份文件是「只有帳號擁有者才能做」的那幾步。*

> *Toàn bộ code đã viết xong. Tài liệu này chỉ liệt kê những bước mà chỉ chủ tài khoản làm được.*

決定的理由在 [INFRA.md](../INFRA.md)，待辦清單在 [TASK.md](../TASK.md)。

**在做完這些之前，遊戲一切正常** —— `game/js/config.js` 兩個值是空的，所有對局自動變成練習局，排行榜畫面會寫「尚未開放」。

---

## 1. 開一個 Supabase 專案

只開一個，不分測試和正式（理由見 INFRA.md 第 4 節）。記下地區選離越南近的（Singapore）。

## 2. 建資料表和權限鎖

結構寫成 migration，放在 [`migrations/20260903000000_leaderboard.sql`](migrations/20260903000000_leaderboard.sql)。有版本編號，以後要改結構是**加一個新檔案**，不是改舊的那個。

**做法 A —— 用 CLI（建議，之後部署 Edge Function 也是同一套工具）：**

```bash
supabase login
supabase link --project-ref 你的專案代號
supabase db push
```

`link` 會問資料庫密碼，就是開專案時按 Generate 那組。

**做法 B —— 手貼：** Supabase → **SQL Editor** → 把那個 migration 檔整份貼進去 → Run。

跑完去 **Table Editor** 確認五張表都在，而且每一張的 **RLS 都顯示已啟用**。
這一步是整個專案最容易出人命的地方：忘記開，公開的 anon key 就變成萬能鑰匙。

> *Dán cả file schema.sql vào SQL Editor rồi Run. Sau đó kiểm tra bằng mắt: cả năm bảng đều phải hiện "RLS enabled".*

## 3. 打開 Google 登入

**Google Cloud Console** → 建立 OAuth client ID（類型選 Web application）。

**Supabase** → Authentication → Providers → Google → 貼上 Client ID 和 Secret，然後把 Supabase 顯示的那個 callback 網址複製回 Google Cloud Console 的 *Authorized redirect URIs*。

## 4. 填三個白名單

填錯的症狀是「登入完跳到錯誤頁面」，這是新手最常卡住的地方。

Supabase → Authentication → **URL Configuration** → Redirect URLs，加這兩條：

```
https://luyen5158-cmyk.github.io/xep-khoi/game/
http://localhost:8777/game/
```

第三條是上一步已經填好的 Google Cloud Console callback。

**結尾的斜線不能少。** 程式送出的是 `location.origin + location.pathname`，要一字不差。

## 5. 部署三個 Edge Function

需要 [Supabase CLI](https://supabase.com/docs/guides/cli)。**不要在這個資料夾裡裝 Node 套件** —— repo 在 iCloud Drive，`node_modules` 會讓同步崩潰（INFRA.md 第 2 節）。用 Homebrew 裝：

```bash
brew install supabase/tap/supabase
```

然後在專案根目錄：

```bash
supabase login
supabase link --project-ref 你的專案代號
supabase functions deploy issue-seed submit-score profile
```

`service_role key` 不用手動設定，Supabase 自動注入給 Edge Function。

**如果送分時瀏覽器出現 401 而且錯誤訊息看起來跟 CORS 有關**，改用這行重新部署：

```bash
supabase functions deploy issue-seed submit-score profile --no-verify-jwt
```

安全性不變 —— 這三個函式本來就自己驗證 token（`_shared/api.ts` 的 `currentUser`），閘道那層只是重複做一次。

## 6. 把兩個值填進遊戲

Supabase → Project Settings → API，複製 **Project URL** 和 **anon public**，填進 [`game/js/config.js`](../game/js/config.js)。

**anon key 寫死在原始碼裡是正確的，不是疏忽。** 它不是密碼，保護資料的是第 2 步的權限鎖。

改完記得把 `game/sw.js` 裡 `CACHE` 的版本號 +1，否則玩家拿到的還是舊檔案。

## 7. 設定防休眠排程

GitHub repo → Settings → Secrets and variables → Actions，加兩個 secret：

| 名稱 | 值 |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** |

然後去 Actions 分頁，手動跑一次「Đánh thức Supabase」確認會綠燈。之後每 3 天自動跑，順便清掉過期種子。

**`service_role key` 只能出現在這裡和 Edge Function。永遠不准進 `game/` 資料夾。**

---

## 開完之後自己驗一遍

- [ ] 五張表的 RLS 都是啟用狀態
- [ ] 沒登入時能玩，畫面寫「練習局」
- [ ] 用 Google 登入 → 會被要求取暱稱
- [ ] 取完暱稱後，畫面變成「排名局」（藍字）
- [ ] 玩完一局 → 結束畫面顯示名次
- [ ] 按「再來一局」**是瞬間開始的排名局**，不是先練習局再變
- [ ] 網址列沒有殘留 `?code=`
- [ ] 排行榜看得到自己那一行是亮的
- [ ] 手機上裝成 App 後再登入一次（PWA + Google 登入有時會跳出去回不來，只能實機測）
- [ ] 按刪除帳號 → 排行榜上真的消失

> *Danh sách tự kiểm sau khi bật xong — làm hết mười mục này rồi mới yên tâm.*

# 正經工班工作工具

LINE 圖文選單第三格「工作工具」連到[工作工具首頁](https://line-work-tools.b10102230.workers.dev/)。首頁依 `tools.json` 列出工具，目前收錄木工設計與房間模擬器。試用中的工具會列在日常工具前面，各區依清單順序排列。

| 網址路徑 | 主要檔案 | 用途 |
| --- | --- | --- |
| `/` | `tools.json`、`scripts/render-home.mjs`、`public/styles.css` | 產生靜態工具首頁 |
| `/woodcraft/` | `public/woodcraft/index.html` | 3D 組裝構件、編輯圖紙、估算採購與裁切用量 |
| `/room-space/` | `public/room-space/index.html` | 繪製房間、配置樑柱與檢視 3D 空間 |

兩個工具分別在瀏覽器中儲存自己的進度。換裝置前可先匯出專案 JSON，再用相同工具匯入。木工工具的採購數量和小計只包含可裁切的材料，超出庫存規格的構件會另外列出。

## 加入一個 AI 做的小工具

### 一個指令上架

在這個專案的資料夾開啟終端機。這台電腦需要 Node.js 22 以上、Git、已登入的 GitHub CLI 和本庫的推送權限。以下任選一種來源。

```powershell
node scripts/publish-app.mjs 備料清單 "$env:USERPROFILE\Downloads\備料清單.html"
node scripts/publish-app.mjs 放樣計算 "$env:USERPROFILE\Downloads\放樣計算\dist"
node scripts/publish-app.mjs 現場筆記 "https://example.org/site-notes/"
```

第一個參數是固定的工具代號，預設也用作首頁名稱；可加 `--name "顯示名稱"` 或 `--description "一句用途"`。同一代號配上新版檔案就會更新原入口。想並排比較兩版，給它們不同代號即可。新工具會出現在「試用中」。

指令會從 GitHub 最新的 `main` 建立暫存副本，產生首頁、執行測試並以普通 Git 推送觸發 Cloudflare 部署。它會等到 Cloudflare 回報成功，核對正式首頁與站內工具的入口檔案，再印出網址。重跑相同內容會檢查部署。遇到其他人同時更新 `main` 而被 Git 拒絕時，重跑即可。若只想預演，可在指令最後加 `--check`，使用本機最新提交測試。

單檔 HTML 應能獨立開啟。多檔網站請傳入已建置、含 `index.html` 的發布資料夾，圖片和腳本使用相對路徑，或以工具的 `/apps/<代號>/` 為基底。ZIP 先解壓縮。只放準備公開的網站檔案。需要伺服器或資料庫的應用可先部署在原服務，再把 HTTPS 網址加入首頁。

### 從 GitHub 編輯清單

1. 如果 AI 給你單檔 HTML，將它存成 `public/apps/<工具代號>/index.html`，並用 `/apps/<工具代號>/` 當網址。如果工具已經部署在別處，直接使用它的 HTTPS 網址。
2. 在根目錄的 `tools.json` 陣列中加一筆。例如下面這個試用工具。封面可省略。

   ```json
   {
     "name": "五金備料清單",
     "description": "出門前逐項勾選要帶的五金。",
     "url": "/apps/hardware-list/",
     "stage": "trial"
   }
   ```

3. 執行 `node scripts/render-home.mjs` 更新 `public/index.html`，再執行 `node --test`。將工具、清單和產生的首頁一起提交。沿用原網址更新工具時，只要替換該工具的內容即可。

日常使用後，將 `stage` 改成 `active` 就會移到「日常工具」；改成 `archived` 會從首頁收起。狀態變更後要重新產生首頁。保留工具檔案時，舊連結仍可開啟。想比較兩個操作方式，可用不同代號各放一版。工具若有本機存檔，請使用專屬的儲存鍵；同一工具改版時應能讀回先前的資料。

## 開發與測試

直接修改對應路徑的檔案。兩個工具各自是包含 HTML、CSS 和 JavaScript 的單檔應用。房間模擬器的場景圖以連成一體的 RC 樑、柱與牆面呈現。

在儲存庫根目錄執行 `node --test`。使用 `npx --yes wrangler@4.153.0 dev` 預覽網站，從終端機顯示的網址進入首頁，點開兩個工具。修改木工介面時可在手機寬度確認「3D 組裝」、「設計圖紙」和「圖紙＋3D」三個分頁都能切換。

## 部署與 LINE

Cloudflare Workers Builds 已連接這個儲存庫。推送或合併到 `main` 後，Cloudflare 會先執行 `node --test`，通過後執行 `npx --yes wrangler@4.153.0 deploy`。`wrangler.jsonc` 指定 Worker `line-work-tools` 和發布目錄 `public/`。每次部署的結果可在 GitHub 對應提交的 Cloudflare 檢查中查看。

LINE 圖文選單第三格固定連到首頁。日後修改任一工具或從首頁增加入口，只要更新本庫並合併到 `main` 即可。LINE 後台使用的三格選單圖片存放於 `line/rich-menu.png`。

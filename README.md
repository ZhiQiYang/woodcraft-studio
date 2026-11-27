# 正經工班工作工具

LINE 圖文選單第三格「工作工具」連到[工作工具首頁](https://line-work-tools.b10102230.workers.dev/)。首頁依 `tools.json` 列出工具，目前收錄木工設計與房間模擬器。試用中的工具會列在日常工具前面，各區依清單順序排列。

| 網址路徑 | 主要檔案 | 用途 |
| --- | --- | --- |
| `/` | `tools.json`、`scripts/render-home.mjs`、`public/styles.css` | 產生靜態工具首頁 |
| `/woodcraft/` | `public/woodcraft/index.html` | 3D 組裝構件、編輯圖紙、估算採購與裁切用量 |
| `/room-space/` | `public/room-space/index.html` | 繪製房間、配置樑柱與檢視 3D 空間 |

兩個工具分別在瀏覽器中儲存自己的進度。換裝置前可先匯出專案 JSON，再用相同工具匯入。木工工具的採購數量和小計只包含可裁切的材料，超出庫存規格的構件會另外列出。

## 加入一個 AI 做的小工具

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

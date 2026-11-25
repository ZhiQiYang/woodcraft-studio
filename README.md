# 正經工班工作工具

LINE 圖文選單第三格「工作工具」連到[工作工具首頁](https://line-work-tools.b10102230.workers.dev/)。首頁提供木工設計工具與房間模擬器，三個頁面的發布原始碼都在這個儲存庫。

| 網址路徑 | 主要檔案 | 用途 |
| --- | --- | --- |
| `/` | `public/index.html`、`public/styles.css`、`public/images/` | 選擇工具 |
| `/woodcraft/` | `public/woodcraft/index.html` | 3D 組裝構件、編輯圖紙、估算採購與裁切用量 |
| `/room-space/` | `public/room-space/index.html` | 繪製房間、配置樑柱與檢視 3D 空間 |

兩個工具分別在瀏覽器中儲存自己的進度。換裝置前可先匯出專案 JSON，再用相同工具匯入。木工工具的採購數量和小計只包含可裁切的材料，超出庫存規格的構件會另外列出。

## 開發與測試

直接修改對應路徑的檔案。兩個工具各自是包含 HTML、CSS 和 JavaScript 的單檔應用。房間模擬器的場景圖以連成一體的 RC 樑、柱與牆面呈現。

在儲存庫根目錄執行 `node --test`。使用 `npx wrangler dev` 預覽網站，從終端機顯示的網址進入首頁，點開兩個工具。修改木工介面時可在手機寬度確認「3D 組裝」、「設計圖紙」和「圖紙＋3D」三個分頁都能切換。

## 部署與 LINE

`wrangler.jsonc` 指向 Cloudflare Worker `line-work-tools`，直接發布 `public/` 下的靜態檔案。工具更新或增加時，LINE 第三格繼續使用首頁網址。LINE 後台使用的三格選單圖片存放於 `line/rich-menu.png`。

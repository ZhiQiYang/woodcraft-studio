# 正經工班 工具系統 — 套用說明(給實作的人或 coding agent)

把 `public/woodcraft/index.html`、`public/room-space/index.html`、`public/index.html` 三個頁面改成同一套介面系統。這個資料夾是唯一的依據:樣式照 `gongban.css`,畫面照 `screens/`,規則照 `DESIGN.md` 與 `components/`。

## 這包裡有什麼

| 檔案 | 用途 |
| --- | --- |
| `gongban.css` | 要貼進三個頁面的樣式:前半是 token(CSS 變數、字級 class、`@font-face`),後半是元件。**不要改裡面的值**;要改就改這一份,再同步到三個頁面。 |
| `tokens.json` | token 的原始資料(含每個 token 的用途說明、日間與夜間兩個主題的值)。 |
| `fonts/` | 數字字體 Barlow Semi Condensed 500、600(SIL OFL 授權,見 `fonts/LICENSE`)。 |
| `DESIGN.md` | 設計規則:三個顏色的分工、字、文字寫法、尺寸、版面骨架、圖示。 |
| `components/<名稱>.md`、`.html` | 16 個元件各自的 HTML 結構、用法與禁忌,附一個可直接打開的範例。 |
| `screens/*.html` | 五張完成後的畫面,純 HTML 加 `gongban.css`,沒有自己的樣式。**結構與 class 直接照抄。** |
| `screens/png/*.png` | 同五張畫面的截圖,用來比對結果。 |

五張畫面:

| 檔案 | 尺寸 | 內容 |
| --- | --- | --- |
| `Sys-Wood-Phone` | 390 × 844 | 木工設計,3D 組裝,選中「下橫料」 |
| `Sys-Wood-Phone-Edit` | 390 × 844 | 同上,打開構件設定的底部抽屜 |
| `Sys-Room-Phone` | 390 × 844 | 房間模擬器,平面圖,選中「柱 01」 |
| `Sys-Wood-Desktop` | 1440 × 900 | 木工設計桌機版:左清單、右設定 |
| `Sys-Room-Desktop` | 1440 × 900 | 房間模擬器桌機版:雙視圖 |

## 不能破壞的東西

1. **兩個工具都是單一 HTML 檔**,可以離線開。不要改成外連 `.css` 或 `.js`;`gongban.css` 的內容貼進各自的 `<style>`。
2. **`node --test` 必須全過。** 現有測試依賴這些事:
   - `tests/test-bom.mjs`、`tests/test-import.mjs` 用正規表示式從木工的單一 `<script>` 抓函式(`^  function 名稱(` 到 `^  }`),並比對輸出文字(例如「預估總計（只計入可裁切構件）」「尚無採購估算」)。**不要改這些函式的縮排、名稱與輸出字串,不要把 `<script>` 拆成多個。**
   - `tests/test-launcher.mjs` 要求木工頁的 `<title>` 含「木工」、房間頁含「房間」,首頁有 `/woodcraft/` 與 `/room-space/` 兩個連結、至少一個 `/….css` 樣式表與兩張封面圖。
3. **保留所有 `id` 與 `data-*`**(木工的 JS 用 `getElementById` 綁事件,例如 `projectNameInput`、`saveStatusPill`、`navPage3D`、`btnExportJson`、`btnImportJson`、`btnCopyBom`、`btnPrint`、`templateSelect`、`sceneCanvas`)。只換 class 與外層結構,不改行為。
4. **房間模擬器的離線匯出**:`<script id="room-space-source">` 開頭的 `CANONICAL_OFFLINE_TEMPLATE` 會用 `OFFLINE_SOURCES` 把樣式與程式塞回去。改完樣式後確認匯出的離線檔也帶著新樣式。該檔案前段是壓縮過的 React 與 Three.js,**不要動**;只改後段可讀的應用程式碼裡的 `className` 字串,以及 `<style id="room-space-style">`。
5. **專案資料格式不變**:localStorage 的鍵、匯出匯入的 JSON 結構都不要碰。
6. 兩個工具的功能一個都不能少。畫面稿沒畫到的功能(設計圖紙頁、剖面、採購與裁切、建材規格、對話框)用同一組元件依規則重排,不是刪掉。

## 做法與順序

分五步,每一步都能獨立提交、獨立驗收。

### 1. 放進樣式與字體(三個頁面,畫面先不變)

- 把 `fonts/*.woff2` 放到 `public/fonts/`。`gongban.css` 裡 `@font-face` 的網址改成 `/fonts/…`。離線開啟時抓不到字體會退回系統字,版面不會壞;這是可接受的。
- 把 `gongban.css` 全文貼進三個頁面的 `<style>` 最前面,前後加上標記:

  ```css
  /* gb:start — 正經工班 工具系統,與 design/gongban.css 同步,不要在這裡手改 */
  …
  /* gb:end */
  ```

- 把這個資料夾提交到 repo 的 `design/`。新增 `tests/test-design-system.mjs`:讀三個頁面 `gb:start` 到 `gb:end` 之間的內容,斷言三份完全相同、且與 `design/gongban.css`(字體網址替換後)相同。
- 所有新 class 以 `gb-` 開頭、變數以 `--gb-` 或 `--mat-` 開頭,不會撞到現有樣式,所以這一步畫面不會變。
- 三個頁面的 `<html>` 都是 `lang="zh-Hant"`,最外層容器加 `class="gb"`。

### 2. 木工設計:換元件

照下面的對照表把舊 class 換成新元件,一次換一種元件。換完一種就刪掉舊的 CSS 規則。完成後 `<style>` 裡除了 `gb:` 區塊,只剩畫布與列印專用的規則。

### 3. 木工設計:換外殼

現在是「滿版畫布加浮動卡片」,改成 `gb-app` 骨架(照 `Sys-Wood-Phone.html` 與 `Sys-Wood-Desktop.html`):

- 頁首 `gb-appbar`:標記(連回 `/`)、工具名「木工設計」、專案名稱、儲存狀態、(桌機)檢視切換、復原/重做、檔案。
- 範本、匯出、匯入、複製採購清單、列印施工單全部收進「檔案」選單(桌機 `gb-menu`,手機 `gb-sheet`)。
- 桌機(1080px 以上):左 `gb-panel--left` 放構件清單與台尺換算,右 `gb-panel--right` 放構件設定;面板貼邊、不透明、不浮在畫布上。
- 手機:畫布佔滿;頁首下一排 `gb-viewbar` 放檢視切換;底部 `gb-actionbar` 三顆(構件/新增/設定),各自打開 `gb-sheet`。
- 畫布上只留兩條 `gb-dock`,放在底部中央:視角(等角/正視/俯視/側視)與工具(磁吸、顯示尺寸、爆炸圖、縮放)。
- 斷點只留 1080px 一個,刪掉原本的 760px 與 1180px。

### 4. 房間模擬器:換元件與外殼

骨架原本就接近,主要是換 class(見對照表)與三個結構上的改動:

- 頁首的品牌文字從「空間工坊」改成標記加「房間模擬器」,標記連回 `/`。
- 左欄底部的六顆快速新增按鈕拿掉,改成標題列一顆「新增」打開選單(柱、樑、隔間、門、窗、入口)。
- 手機的檢視切換從頁首的下拉選單改成頁首下方一排 `gb-seg gb-seg--block`。
- 斷點改成 1080px 一個(原本 600px 與 1100px,以及 `pointer: coarse` 的放大規則都可以刪:新元件預設就是 44px)。

### 5. 首頁、標題與收尾

- `public/index.html` 與 `public/styles.css`:底色 `--gb-ground`,文字 `--gb-ink`,卡片 `--gb-surface` 加 1px `--gb-line-strong` 外框與 `--gb-radius-md` 圓角,箭頭圓鈕改成 44px 的墨色方鈕(`gb-radius-sm`)。標題字級與版面維持。`styles.css` 仍要存在(測試會檢查)。
- `<title>`:`木工設計｜正經工班`、`房間模擬器｜正經工班`、`工作工具｜正經工班`。不寫版本號。
- `<meta name="theme-color">`:兩個工具 `#ffffff`(頁首的顏色),首頁 `#eef0ec`。
- 木工補上 `aria-label`(所有只有圖示的按鈕)、`aria-pressed`(開關與分頁)、`role="status"`(儲存狀態)。文字符號按鈕(＋ － ◀ ▶ ✕ ☰ ▾)全部換成內嵌 SVG 圖示,圖示路徑可以從 `screens/*.html` 複製。

## 畫布(canvas / SVG / WebGL)裡的顏色

元件只管 DOM。畫布裡自己畫的東西要改用同一組值,建議啟動時用 `getComputedStyle(document.documentElement).getPropertyValue('--gb-select')` 讀變數,不要再寫死色碼:

| 畫的東西 | 值 |
| --- | --- |
| 3D 背景 | `--gb-ground` `#eef0ec` |
| 平面圖的圖紙 | `--gb-surface` `#ffffff` |
| 格線 | `--gb-line` `#d2d8d1` |
| 選中的外框 | 3px `--gb-select` `#1b4fd8`,外側 1.5px `--gb-surface` 光暈 |
| 選中構件的名稱標籤 | 底 `--gb-select`、字 `--gb-on-select`,13px / 600 |
| 尺寸標籤 | 底 `--gb-measure` `#ffd53d`、字 `--gb-on-measure` `#10271f`、1px 邊 `--gb-measure-edge` `#8a6d00`、圓角 3px、字 600 13px Barlow Semi Condensed |
| 編輯中的尺寸標籤 | 底 `#10271f`、字與邊 `#ffd53d` |
| 尺寸線、投影線 | 1px `--gb-ink-2` `#3f5047`(上方投影用虛線 5 4) |
| 木料:正面/頂面/側面與邊線 | `--mat-wood` `#c8915a` / `--mat-wood-light` `#dcb485` / `--mat-wood-dark` `#a3703f` |
| RC:正面/頂面與地坪/側面 | `--mat-concrete` `#b9beb6` / `--mat-concrete-light` `#d5d9d2` / `--mat-concrete-dark` `#8f968f` |
| 平面圖中被剖切的柱與牆 | `--mat-cut` `#3f5047` |
| 轉角控制點 | 半徑 4px,填 `--gb-surface`,1.5px `--gb-ink` 邊 |

能用 DOM 疊在畫布上的標籤(尺寸、名稱)優先用 `gb-dim`、`gb-tag` 加 `gb-canvas__chip` 定位,像畫面稿那樣;一定要畫在 canvas 裡的才用上表。

## 對照表:木工設計

| 現在 | 換成 |
| --- | --- |
| `.app` | `.gb.gb-app`,裡面是 `.gb-app__top`、`.gb-app__body`、`.gb-actionbar` |
| `.hud-top-bar`、`.hud-top-left`、`.hud-top-right` | 一個 `.gb-appbar` |
| `.brand-icon` | `a.gb-appbar__home[href="/"]` 裡放 `.gb-mark` |
| `.project-name-input` | `.gb-appbar__project`(可以維持 `<input>`,保留 `id`) |
| `.save-pill`、`.save-pill.err` | `.gb-status`、`.gb-status--saving`、`.gb-status--error`;手機也要顯示 |
| `.page-switch`、`.page-switch-btn`、`.active` | `.gb-seg`、`.gb-seg__item`、`aria-pressed="true"`。桌機放 `.gb-appbar__center`,手機放 `.gb-viewbar` |
| `.file-menu-inline`、`.file-menu-toggle`、`.file-menu-dropdown`、`#templateSelect` | 一顆「檔案」按鈕加 `.gb-menu`;項目順序見 `components/Menu.md` |
| `.hud-center-dock`、`.dock-sep` | 兩條 `.gb-dock` 放在 `.gb-canvas__bc`,`.gb-dock__sep`。復原與重做移到頁首 |
| `.btn` | `.gb-btn` |
| `.btn-primary` | `.gb-btn--primary`(一個畫面一顆) |
| `.btn-ghost` | `.gb-btn--quiet`;只有圖示的改 `.gb-iconbtn` |
| `.btn-soft`、`.btn-blue` | 一般的 `.gb-btn`,不再用顏色分種類 |
| `.btn-danger` | `.gb-btn--danger` |
| `.btn.active`、`.btn-ghost.active` | `aria-pressed="true"` |
| `.btn-sm`、`.btn-xs` | 拿掉;桌機側欄的容器加 `.gb-dense` |
| 全域的 `select`、`input` 樣式 | 包成 `.gb-field` 加 `.gb-input`(`__control`、`__unit`)或 `.gb-select` |
| `.form-field`、`.form-grid` | `.gb-field`、`.gb-grid-2` |
| `.nudge-row`(X -1、X +1…) | 各欄位裡的 `.gb-input__step` 加減鈕,或桌機直接輸入 |
| `.float-card`、`.float-card-head`、`.float-card-body` | 桌機 `.gb-panel`、`__head`、`__body`;手機 `.gb-sheet` |
| `.drawer-3d-left`、`.drawer-3d-right` | `.gb-app__side.gb-panel.gb-panel--left`、`--right` |
| `.drawer-collapsed-pill-left`、`-right` | 拿掉 |
| `.parts-list`、`.part-item`、`.part-title`、`.part-meta`、`.part-sub`、`.mat-dot` | `.gb-list`、`.gb-row`、`__name`、`__meta`(兩行併成一行)、`__swatch` |
| `.part-actions`(每列的複製、✕) | 拿掉;複製與刪除放在設定面板底部 `.gb-panel__foot` |
| `.tabs`、`.tab-btn` | `.gb-seg.gb-seg--block` |
| `.section-box`、`.section-title` | `.gb-section`、`.gb-section__title` |
| `.kpi-grid`、`.kpi-card`、`.kpi-label`、`.kpi-val`、`.kpi-sub` | `.gb-stat`、`__label`、`__value`,補充文字用 `.gb-caption` |
| `.data-table`、`.num`、`.price-input` | `.gb-table`、`.gb-num`、`.gb-input` |
| `.alert-box`、`.alert-warn`、`.alert-danger`、`.alert-info` | `.gb-notice`、(預設即警示)、`--danger`;一般資訊改成內文 |
| `.pill-status`、`.pill-ok`、`.pill-danger`、`.collision-tag` | 依用途:狀態用 `.gb-status`,需要說明的用 `.gb-notice` |
| `.hud-3d-bottom` | 外廓讀數放 `.gb-canvas__tr` 的 `.gb-canvas__label`;爆炸圖是工具列的開關,開著時滑桿出現在 `.gb-canvas__bl` |
| `.conv-box`、`.conv-row` | 左側面板底部的 `.gb-section`,兩個 `.gb-input` |
| `.modal-backdrop`、`.modal-card`、`.modal-head`、`.modal-body` | `.gb-scrim` 加 `.gb-sheet` 的結構;桌機置中、四角都用 `--gb-radius-md` |
| `.toast` | `.gb-notice.gb-notice--ok`,固定在畫布上方中央 |
| `.split-container`、`.split-pane*`、`.split-divider` | `.gb-split`,兩個 `.gb-canvas` |
| `.bp-*`、`.sheet-tab-chip`、`.ref-*`(設計圖紙頁) | 版面照舊,控制項換成上面的元件;圖紙分頁用 `.gb-seg` |
| `.cut-card`、`.bar-*`(裁切圖) | 木料段填 `--mat-wood`,餘料填 `--gb-sunken`,標籤用 `.gb-num` |
| `.catalog-card`、`.catalog-*` | `.gb-row`(不可選的列) |

## 對照表:房間模擬器

| 現在 | 換成 |
| --- | --- |
| `.app-shell` | `.gb.gb-app` |
| `.app-header`、`.header-left`、`.header-right` | `.gb-appbar`、`.gb-appbar__titles`、`.gb-appbar__actions` |
| `.brand`(「空間工坊」) | `a.gb-appbar__home[href="/"]` 加 `.gb-appbar__tool`「房間模擬器」 |
| `.project-identity`、`.project-name` | `.gb-appbar__project` |
| `.save-pill`、`.saving`、`.failed`、`.save-dot` | `.gb-status`、`--saving`、`--error`(圓點由 CSS 畫,不用 `.save-dot`) |
| `.save-warning` | 頁首下方的 `.gb-notice.gb-notice--danger`,帶「匯出專案」按鈕 |
| `.view-segment` | `.gb-seg`;手機改放 `.gb-viewbar` |
| `.btn`、`.btn.primary`、`.btn.quiet`、`.btn.danger` | `.gb-btn`、`--primary`、`--quiet`、`--danger` |
| `.btn.selected`、`.icon-btn.active`、`.icon-btn.locked-on` | `aria-pressed="true"` |
| `.btn.amber` | 一般 `.gb-btn`,前面放警示圖示 |
| `.icon-btn` | `.gb-iconbtn` |
| `.dropdown-menu`、裡面的 `button`、`hr`、`.dropdown-menu-heading` | `.gb-menu`、`__item`、`__sep`、`__label` |
| `.structure-panel`、`.inspector-panel` | `.gb-app__side.gb-panel.gb-panel--left`、`--right`,都加 `.gb-dense` |
| `.panel-header` | `.gb-panel__head`、`.gb-panel__title` |
| `.filter-pills` | `.gb-seg.gb-seg--block` |
| `.structure-list`、`.structure-row`、`.structure-item`、`.structure-name`、`.structure-meta small` | `.gb-list`、`.gb-row`、`__main`、`__name`、`__meta` |
| `.structure-row.selected`、`.is-hidden`、`.row-warning` | `aria-selected="true"`、`.is-hidden`、`__end` 裡的警示圖示 |
| `.structure-issues*` | `.gb-notice`,一則一條 |
| `.structure-quick-add`、`.quick-add-grid` | 拿掉;改成標題列的「新增」加 `.gb-menu` |
| `.area-summary-card`、`.area-card-*` | `.gb-stat` 加一行 `.gb-caption` |
| `.canvas-caption-pill`、`.canvas-caption-meta` | `.gb-canvas__label`,放在 `.gb-canvas__tl`、`__tr` |
| `.input-wrap`、裡面的單位 `span` | `.gb-input`、`.gb-input__unit` |
| `.number-field`、`.invalid`、`.is-disabled` | `.gb-field`、`data-invalid="true"`、`.gb-input[data-readonly="true"]` |
| `.inspector-fields`、`.inspector-subheading`、`.section-title` | `.gb-section`、`.gb-section__title` |
| `.inspector-actions`、`.dialog-actions` | `.gb-panel__foot` |
| `.inspector-note`、`.measurement-note`、`.scope-note` | `.gb-field__hint`,獨立段落用 `.gb-caption` |
| `.inspector-select`、`.three-view-select` | `.gb-select` |
| `.split-divider` | `.gb-split` 的分隔線;拖曳調整的行為保留 |
| `.panel-reopen` | `.gb-iconbtn.gb-iconbtn--outline`,放在 `.gb-canvas__tl` 或 `__tr` |
| 平面圖底部的工具列、`.three-view-tools`、`.three-zoom-buttons`、`.three-wall-toggle` | `.gb-dock`,裡面是 `.gb-iconbtn` |
| 手機底部的三顆按鈕、`.mobile-quick-add-sheet` 等抽屜 | `.gb-actionbar`、`.gb-sheet` |
| `.modal` | `.gb-scrim` 加 `.gb-sheet` 的結構 |
| `.dimension-label`、`.clearance-label`(SVG) | 尺寸標籤的值(見上一節);可行的話改成疊在上面的 `.gb-dim` |
| `.vertex-handle`、`.legend-cut` | `.gb-handle`、填 `--mat-cut` |

表上沒有的 class:依用途找最接近的元件。**不要新增顏色、字級、圓角或陰影;** 真的缺元件時,用現有 token 組一個新的 `gb-` class,加進 `gongban.css` 並同步三個頁面。

## 驗收

1. `node --test` 全過,包含新增的 `tests/test-design-system.mjs`。
2. 用 390 × 844 與 1440 × 900 開兩個工具,和 `screens/png/` 並排比對:頁首、清單、設定面板、底部操作列、工具列的位置與樣式一致。
3. 兩個工具的頁首結構相同;「檔案」選單的項目順序相同;手機底部三顆按鈕的意義相同。
4. 兩個工具除了 `gb:start`–`gb:end` 區塊與畫布、列印專用規則外,沒有其他色碼與 `font-size`。用 `grep -c '#[0-9a-fA-F]\{3,8\}'` 檢查區塊外的樣式。
5. 所有可以按的東西在手機上至少 44 × 44px;用 Tab 鍵走一遍,每個控制項都看得到藍色焦點框。
6. 木工:3D 組裝、設計圖紙、圖紙+3D 三個檢視都能切換;匯出再匯入專案後內容不變;列印施工單的版面沒壞。
7. 房間:平面、3D、雙視圖、剖面都能切換;匯出的離線檔打開後是新樣式。
8. 首頁兩張卡片能進到兩個工具,兩個工具左上角的標記能回首頁。

## 這一版沒有做的

- 夜間主題的值已經在 `gongban.css` 裡(`<html data-theme="dark">`),但畫面稿只畫了日間。要開放夜間主題,畫布裡的顏色必須先改成讀 CSS 變數。這一輪可以不做。
- 首頁、設計圖紙頁、剖面、採購與裁切、建材規格、對話框沒有畫面稿,依 `DESIGN.md` 與元件說明套用。
- 圖示路徑是照 Lucide 的畫法手寫的近似版,可以整批換成 Lucide 官方的 SVG。

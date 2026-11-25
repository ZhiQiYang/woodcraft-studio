# Field

一個標籤加一個輸入欄;兩個工具最常用的元件,大多數時候裝的是尺寸數字。

結構:`gb-field` 包住 `gb-field__label`、`gb-input`、可選的 `gb-field__hint`。`gb-input` 裡依序放可選的 `gb-input__prefix`(X、Y、Z)、`gb-input__control`、可選的 `gb-input__unit`、可選的兩顆 `gb-input__step`。

- **數值**:輸入框加 `gb-num`,數字以 18px 的 Barlow Semi Condensed 顯示。加 `inputmode="decimal"` 或 `"numeric"`,手機才會跳出數字鍵盤。
- **單位放在欄位右側**,不寫進標籤:標籤寫「裁切長度」,右側寫 `cm`。木工用 cm、房間用 mm,各自保留,但位置一致。
- **加減鈕**:需要一次微調一個單位的欄位(座標、長度)才加,取代木工原本另外排一列的「X -1 / X +1」按鈕。
- **唯讀**:在 `gb-input` 加 `data-readonly="true"`,底色變灰。
- **錯誤**:在 `gb-field` 加 `data-invalid="true"`,輸入框加 `aria-invalid="true"`,提示文字前放警示圖示。錯誤訊息寫出正確範圍(「高度至少 1,800 mm」),不要只寫「格式錯誤」。

你要提供:標籤文字、目前的值、單位;提示文字只在真的能幫上忙時才放(換算結果、量測方式)。

輸入框的字不要小於 16px,否則 iOS 聚焦時會自動放大整個頁面。

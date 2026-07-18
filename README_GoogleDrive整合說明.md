# 浩德堂網站 ｜ Google Drive 資料整合說明

客戶於「隨喜護持」頁填寫的植福田／供養登記，會寫入你的 **Google Drive（Google 試算表）**，
對應《浩德堂_植福田與供養月結系統.xlsx》的「明細紀錄」工作表，後續可直接用原 Excel 的
月結公式做自動結算與公布。

整體架構為 **純前端網站 + Google Apps Script 中間層**（免伺服器、免費）：

```
客戶填表（index.html）
   │  fetch POST（JSON）
   ▼
Google Apps Script Web App（你部署一次）
   │  append 一列
   ▼
你的 Google 試算表（在 Google Drive 中）
   │  內建月結公式
   ▼
月結總覽 / 供養名單 / 每月公布摘要
```

---

## 第一步：建立 Google 試算表

1. 開啟 [Google 試算表](https://sheets.new) 新建一份。
2. 將第一個工作表命名為 `明細紀錄`。
3. 在第一列（標題列）填入以下欄位（順序需一致）：

   | A | B | C | D | E | F | G | H | I | J | K |
   |---|---|---|---|---|---|---|---|---|---|---|
   | 日期 | 月份 | 姓名／稱呼 | 聯絡方式 | 方向 | 項目 | 單位數 | 單位金額 | 本筆金額 | 備註 | 是否已匯款 |

4. （選用）將《浩德堂_植福田與供養月結系統.xlsx》中的「月結總覽」「供養名單」
   「每月公布摘要」三個工作表複製進來，即可自動統計。
5. 記下這份試算表的 **試算表 ID**（網址 `https://docs.google.com/spreadsheets/d/【這段】/edit` 中括號處）。

---

## 第二步：部署 Google Apps Script

1. 在該試算表中：擴充功能 → Apps Script。
2. 刪除預設程式碼，貼上下方 **GAS 腳本範本**。
3. 將 `試算表 ID` 改成你自己的（或保留 `SpreadsheetApp.getActive()` 由綁定試算表自動取得）。
4. 點「部署」→「新增部署」→ 選擇「網頁應用程式」：
   - 執行身分：**我（你的帳號）**
   - 存取權：**任何人**（這樣訪客表單才能寫入）
5. 部署後複製產生的 **Web App 網址**。

### GAS 腳本範本

```javascript
// 浩德堂 植福田/供養 資料接收端
// 部署為「網頁應用程式」，存取權設為「任何人」
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName("明細紀錄");
    const data = JSON.parse(e.postData.contents);

    const row = [
      data["日期"]        || "",
      data["月份"]        || "",
      data["姓名／稱呼"]  || "",
      data["聯絡方式"]    || "",
      data["方向"]        || "",
      data["項目"]        || "",
      data["單位數"]      || "",
      data["單位金額"]    || "",
      data["本筆金額"]    || "",
      data["備註"]        || "",
      data["是否已匯款"]  || "否"
    ];
    sheet.appendRow(row);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "ok" })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// 預防直接在瀏覽器開啟時報錯
function doGet(e) {
  return ContentService.createTextOutput("浩德堂接收端已啟用。");
}
```

> 注意：`mode: "no-cors"` 的前端 POST 不會收到 JSON 回應，但 `appendRow` 仍會成功執行。
> 若你想確認回應，可將前端 `postToGAS` 改為一般 `fetch`（去掉 `no-cors`），但需將 GAS
> 部署的「存取權」保持為「任何人」，且前端可能需處理 CORS。當前設定以「穩定寫入」為優先。

---

## 第三步：填入網站設定

開啟 `js/config.js`，將網址貼到：

```javascript
GAS_URL: "https://script.google.com/macros/s/【你的部署網址】/exec",
```

若 `GAS_URL` 留空，表單送出時會改為**本機暫存（localStorage）**並提示尚未連接，
網站仍可正常運作與展示。

---

## 其他可調設定（js/config.js）

- `CONTACT`：聯絡電話、LINE、Email，顯示於「聯絡承接」頁。
- `REMIT`：匯款銀行、帳號、戶名，顯示於「隨喜護持」表單。
- `PRICING`：各項目金額規則（禮敬上香隨喜、供花/供果/供燈各 500、銅瓦每單位 500）。
  若未來調整金額，只需改這裡，表單會自動帶出新金額。

---

## 隱私與資料原則

- 表單只收取承接所需的基本資料（稱呼、聯絡方式、方向、項目、金額、備註）。
- 預設「是否已匯款＝否」，由管理者日後在試算表中更新。
- 供養名單不公開；如需公布，請使用「每月公布摘要」產生的彙總文字，勿直接公開個資。

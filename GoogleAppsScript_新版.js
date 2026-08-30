/* =========================================================
   浩德堂 資料接收端（Google Apps Script）
   ---------------------------------------------------------
   用途：接收網站後端送來的「供養登記」與「綠界付款結果」，
        寫入 Google 試算表。

   部署方式：
     1. 開啟你的 Google 試算表 → 擴充功能 → Apps Script
     2. 刪除原本的程式碼，整段貼上這一份
     3. 點「部署」→「管理部署」→ 編輯現有部署 → 版本選「建立新版本」
        （這樣網址不會變；若選「新增部署」會拿到新網址）
     4. 執行身分：我　　存取權：任何人
   ========================================================= */

/* ---------- 工作表設定 ---------- */
var SHEET_NAME = "明細紀錄";      // 工作表名稱

/* 明細紀錄的欄位順序（A~L），請確認試算表第一列標題與此一致：
   A 日期  B 月份  C 姓名／稱呼  D 聯絡方式  E 方向  F 項目
   G 單位數  H 單位金額  I 本筆金額  J 備註  K 是否已匯款  L 訂單編號
   另外 M 付款時間、N 付款方式 由付款通知更新（標題請自行補上）      */

/* ---------- 主程式 ---------- */
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.getActive().insertSheet(SHEET_NAME);
      sheet.appendRow(["日期","月份","姓名／稱呼","聯絡方式","方向","項目",
                       "單位數","單位金額","本筆金額","備註","是否已匯款","訂單編號",
                       "付款時間","付款方式"]);
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || "create";

    if (action === "pay") {
      return ContentService
        .createTextOutput(JSON.stringify(updatePayment(sheet, data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify(createRecord(sheet, data)))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    writeDebug("失敗", (e && e.postData && e.postData.contents) || "(無)", String(err));
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("浩德堂接收端已啟用。");
}

/* ---------- 新增一筆供養登記 ---------- */
function createRecord(sheet, d) {
  var now = new Date();
  var row = [
    d["日期"]        || Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd"),
    d["月份"]        || Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM"),
    d["姓名／稱呼"]  || "",
    d["聯絡方式"]    || "",
    d["方向"]        || "",
    d["項目"]        || "",
    toNum(d["單位數"]),
    toNum(d["單位金額"]),
    toNum(d["本筆金額"]),
    d["備註"]        || "",
    d["是否已匯款"]  || "待付款",
    d["訂單編號"]    || ""
  ];
  sheet.appendRow(row);

  // 金額欄位設為千分位格式，方便閱讀
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 9).setNumberFormat("#,##0");

  writeDebug("新增登記", JSON.stringify(d), "");
  return { status: "ok", row: lastRow };
}

/* ---------- 更新付款狀態（綠界通知） ---------- */
function updatePayment(sheet, d) {
  var tradeNo = String(d["訂單編號"] || "").trim();
  if (!tradeNo) return { status: "error", message: "缺少訂單編號" };

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { status: "error", message: "尚無資料" };

  // L 欄（第 12 欄）是訂單編號，找出對應的列
  var col = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim() === tradeNo) { targetRow = i + 2; break; }
  }

  if (targetRow < 0) {
    writeDebug("找不到訂單", tradeNo, "綠界通知的訂單編號不在表中");
    return { status: "error", message: "找不到訂單：" + tradeNo };
  }

  // K 是否已匯款 / M 付款時間 / N 付款方式
  sheet.getRange(targetRow, 11).setValue(d["付款狀態"] || "已付款");
  sheet.getRange(targetRow, 13).setValue(d["付款時間"] || "");
  sheet.getRange(targetRow, 14).setValue(d["付款方式"] || "");

  writeDebug("更新付款", JSON.stringify(d), "");
  return { status: "ok", row: targetRow };
}

/* ---------- 工具 ---------- */
function toNum(v) {
  if (v === "" || v === null || v === undefined) return "";
  var n = Number(v);
  return isNaN(n) ? v : n;   // 轉數字，否則 SUMIFS 加總不到
}

function writeDebug(status, raw, errMsg) {
  try {
    var ss = SpreadsheetApp.getActive();
    var d = ss.getSheetByName("偵錯紀錄");
    if (!d) {
      d = ss.insertSheet("偵錯紀錄");
      d.appendRow(["時間", "狀態", "收到的資料", "錯誤訊息"]);
    }
    d.appendRow([new Date(), status, raw, errMsg]);
  } catch (_) {}
}

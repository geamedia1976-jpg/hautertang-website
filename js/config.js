/* =========================================================
   浩德堂 網站設定檔
   使用者只需修改下方設定，即可啟用各項功能。
   ========================================================= */

const SITE_CONFIG = {
  /* ---------- Google Drive 整合（Google Apps Script 中間層） ----------
     請將你部署的 Google Apps Script Web App 網址貼到下方。
     部署方式詳見《README_GoogleDrive整合說明.md》。
     若留空（""），表單送出時會改為本機暫存並提示尚未連接。 */
  GAS_URL: "https://script.google.com/macros/s/AKfycbzFd32uIuHvePr5aFP4V5ujBUdUUTH0P38RCChwq_K60k6peMqIfRBQJELUelOPQut_/exec",

  /* ---------- 聯絡方式（顯示於「聯絡承接」頁） ---------- */
  CONTACT: {
    phone: "",          // 例如：0912-345-678
    line: "",           // 例如：@haodetang
    email: "",          // 例如：hello@haodetang.org
    note: "（待使用者填寫：電話／LINE／Email／表單連結）"
  },

  /* ---------- 匯款資訊（顯示於「隨喜護持」表單） ---------- */
  REMIT: {
    bank: "",           // 銀行名稱
    account: "",        // 帳號
    name: "",           // 戶名
    note: "匯款資訊由浩德堂後續承接提供"
  },

  /* ---------- 金額規則（與月結系統對應） ---------- */
  PRICING: {
    "浩德堂植福田": {
      "禮敬上香": { type: "free", label: "隨喜（無固定金額）" },
      "供花":     { type: "fixed", amount: 500 },
      "供果":     { type: "fixed", amount: 500 },
      "供燈":     { type: "fixed", amount: 500 }
    },
    "太素觀供養銅瓦": {
      "供養銅瓦": { type: "unit", unitAmount: 500, unitLabel: "每單位 500 元（1 片 = 4 單位 = 2000 元）" }
    }
  }
};

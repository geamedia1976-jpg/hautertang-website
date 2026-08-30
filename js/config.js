/* =========================================================
   浩德堂 網站設定檔
   使用者只需修改下方設定，即可啟用各項功能。
   ========================================================= */

const SITE_CONFIG = {

  /* ---------- 網站基本資料 ---------- */
  SITE: {
    name: "浩德堂",
    url: "https://hautertang-website.vercel.app/",   // 網站正式網址（用於分享與 QR Code）
    desc: "浩德堂 ｜ 讓敬心有處安住，讓善念有路可回。",
    qrCode: "assets/images/site-qr.png"              // 網站 QR Code 圖片
  },

  /* ---------- Google Drive 整合（Google Apps Script 中間層） ----------
     請將你部署的 Google Apps Script Web App 網址貼到下方。
     若留空（""），表單送出時會改為本機暫存並提示尚未連接。 */
  GAS_URL: "https://script.google.com/macros/s/AKfycbzFd32uIuHvePr5aFP4V5ujBUdUUTH0P38RCChwq_K60k6peMqIfRBQJELUelOPQut_/exec",

  /* ---------- 聯絡方式（顯示於「聯絡承接」頁） ---------- */
  CONTACT: {
    phone: "",          // 例如：0912-345-678
    line: "",           // 例如：@haodetang
    lineUrl: "https://line.me/ti/g2/dNEAqN1iJPr5z3tfA7ZyvOL-gULQYNEGC6QaDw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default", // LINE 社群邀請連結
    lineQrCode: "assets/images/line-qr.jpg", // LINE QR Code 圖片路徑
    email: "",          // 例如：hello@haodetang.org
    note: "歡迎與浩德堂聯絡，我們會盡快回應你的來信與疑問。"
  },

  /* ---------- 綠界 ECPay 收款 ----------
     ⚠️ 綠界的 HashKey / HashIV 只存放在後端環境變數，前端拿不到。
     訪客送出登記後，前端會呼叫 /api/create-order 建立訂單，
     後端算出金額並簽章，再把訪客導向綠界付款頁。 */
  ECPAY: {
    enabled: true,
    apiUrl: "/api/create-order",
    label: "綠界支付",
    note: "送出登記後會導向綠界支付頁面，可選擇信用卡、ATM、超商代碼等方式完成護持。"
  },

  /* ---------- 可複選供養項目 ----------
     項目定義統一放在 lib/items.js（前後端共用同一份），
     要增減項目或調整金額，請改 lib/items.js。 */
  ITEMS: (typeof DONATE_ITEMS !== "undefined" && DONATE_ITEMS.ITEMS) ? DONATE_ITEMS.ITEMS : [],

  /* ---------- 付款方式（只列出綠界後台已開通的） ----------
     要新增 ATM 虛擬帳號、超商代碼等，
     請先到綠界後台申請開通，再把 lib/items.js 裡該項目的
     enabled 改成 true，網站就會自動出現，不必改程式。 */
  PAYMENT_METHODS: (typeof DONATE_ITEMS !== "undefined" && DONATE_ITEMS.AVAILABLE_PAYMENTS)
    ? DONATE_ITEMS.AVAILABLE_PAYMENTS
    : [],

  /* ---------- 分享設定 ---------- */
  SHARE: {
    facebook: true,
    line: true,
    instagram: true,
    copyLink: true,
    qrCode: true
  }
};

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
     ⚠️ 綠界的 HashKey / HashIV 絕對不能放在前端（會被看光），
        一定要由後端（伺服器或 Google Apps Script）產生訂單與檢查碼。
     目前先用「綠界收款連結」：到 綠界後台 → 收款連結 產生一組網址，
     貼到下方 paymentUrl，訪客登記後即可直接點選前往付款。
     若要改成自動帶金額的整合式金流，請提供以下資料再進行串接：
       - 特店編號 MerchantID
       - HashKey / HashIV
       - 測試或正式環境
       - 欲啟用的付款方式（信用卡／ATM／超商代碼／LINE Pay…）
       - 付款完成後要導回的頁面網址 */
  ECPAY: {
    enabled: true,
    paymentUrl: "",     // 例如：https://payment.ecpay.com.tw/...（綠界後台產生的收款連結）
    label: "綠界支付",
    note: "送出登記後，可點選按鈕前往綠界支付完成護持；付款完成請保留綠界提供的交易序號，以利後續核對。"
  },

  /* ---------- 可複選供養項目 ----------
     訪客可同時勾選多項（例如：供養銅瓦 4 片 + 供花），系統會自動加總。
     type 說明：
       fixed = 固定金額（amount）
       free  = 隨喜（訪客自行輸入金額）
       unit  = 以單位計價（unitAmount 為每單位金額；unitPerSet 為每「片」的單位數） */
  ITEMS: [
    {
      id: "taisu-tile",
      group: "太素觀供養銅瓦",
      name: "供養銅瓦",
      type: "unit",
      unitAmount: 500,
      unitPerSet: 4,
      desc: "每單位 500 元，1 片 = 4 單位 = 2,000 元"
    },
    {
      id: "incense",
      group: "浩德堂植福田",
      name: "禮敬上香",
      type: "free",
      desc: "隨喜發心，金額由您自行填寫"
    },
    {
      id: "flower",
      group: "浩德堂植福田",
      name: "供花",
      type: "fixed",
      amount: 500,
      desc: "每份 500 元"
    },
    {
      id: "fruit",
      group: "浩德堂植福田",
      name: "供果",
      type: "fixed",
      amount: 500,
      desc: "每份 500 元"
    },
    {
      id: "lamp",
      group: "浩德堂植福田",
      name: "供燈",
      type: "fixed",
      amount: 500,
      desc: "每份 500 元"
    }
  ],

  /* ---------- 分享設定 ---------- */
  SHARE: {
    facebook: true,
    line: true,
    instagram: true,
    copyLink: true,
    qrCode: true
  }
};

/* =========================================================
   綠界 ECPay 全方位金流 — CheckMacValue 核心
   ---------------------------------------------------------
   這個檔案只在「後端」執行（Vercel Serverless 或自己的 Node server）。
   HashKey / HashIV 絕對不能送到前端，否則任何人都能偽造訂單金額。

   搬移到自己的 server 時，本檔可直接複製使用，不需要修改。
   ========================================================= */

const crypto = require("crypto");

/**
 * 綠界專用的 URL Encode（對齊 PHP urlencode + .NET 規則）
 * 差異處理：~ 與 ' 要編碼；空白要轉成 +；hex 用小寫
 */
function ecpayUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/~/g, "%7e")
    .replace(/'/g, "%27")
    .replace(/%20/g, "+")
    .toLowerCase();
}

/**
 * 產生 CheckMacValue（SHA256）
 * @param {Object} params  綠界參數（不含 CheckMacValue）
 * @param {string} hashKey
 * @param {string} hashIV
 * @returns {string} 大寫 SHA256 字串
 */
function generateCheckMacValue(params, hashKey, hashIV) {
  const sorted = Object.keys(params)
    .filter((k) => k !== "CheckMacValue" && params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
  return crypto.createHash("sha256").update(ecpayUrlEncode(raw)).digest("hex").toUpperCase();
}

/**
 * 驗證綠界回傳資料的 CheckMacValue
 * @param {Object} params  綠界 POST 回來的參數（含 CheckMacValue）
 * @param {string} hashKey
 * @param {string} hashIV
 * @returns {boolean}
 */
function verifyCheckMacValue(params, hashKey, hashIV) {
  const received = (params.CheckMacValue || "").toString();
  const computed = generateCheckMacValue(params, hashKey, hashIV);
  return received !== "" && received.toUpperCase() === computed;
}

/** 產生訂單編號：HDT + yyyyMMddHHmmss + 3 碼隨機（最長 20 碼，綠界限制） */
function makeTradeNo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp =
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds());
  const rand = Math.floor(Math.random() * 900 + 100); // 100-999
  return `HDT${stamp}${rand}`;
}

/** 綠界要求的交易時間格式：yyyy/MM/dd HH:mm:ss */
function tradeDate(d) {
  const dt = d || new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}/${p(dt.getMonth() + 1)}/${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

/**
 * 建立導向綠界的訂單參數（含 CheckMacValue）
 * @param {Object} opt
 * @param {string} opt.merchantId
 * @param {string} opt.hashKey
 * @param {string} opt.hashIV
 * @param {number} opt.totalAmount
 * @param {string} opt.itemName     多項以 # 分隔
 * @param {string} opt.tradeDesc
 * @param {string} opt.tradeNo
 * @param {string} opt.returnURL    綠界 Server 端回傳（付款結果通知）
 * @param {string} opt.orderResultURL  綠界導回瀏覽器的頁面
 * @param {string} opt.clientBackURL   消費者取消時導回的頁面
 * @param {string} opt.choosePayment   預設 ALL
 * @returns {Object} 完整表單參數（可直接組成 form POST 到綠界）
 */
function buildOrder(opt) {
  const params = {
    MerchantID: opt.merchantId,
    MerchantTradeNo: opt.tradeNo,
    MerchantTradeDate: opt.tradeDate || tradeDate(),
    PaymentType: "aio",
    TotalAmount: String(Math.round(opt.totalAmount)),
    TradeDesc: opt.tradeDesc || "浩德堂護持",
    ItemName: opt.itemName || "浩德堂護持",
    ReturnURL: opt.returnURL,
    ChoosePayment: opt.choosePayment || "ALL",
    EncryptType: "1",
    OrderResultURL: opt.orderResultURL || "",
    ClientBackURL: opt.clientBackURL || ""
  };

  // 移除空值，避免影響 CheckMacValue
  Object.keys(params).forEach((k) => {
    if (params[k] === "" || params[k] === undefined || params[k] === null) delete params[k];
  });

  params.CheckMacValue = generateCheckMacValue(params, opt.hashKey, opt.hashIV);
  return params;
}

/** 綠界收款端點（正式 / 測試） */
const ENDPOINT = {
  production: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
  stage: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
};

/** 依環境模式取得對應端點（未知模式一律視為正式，避免誤導向測試環境） */
function endpoint(mode) {
  return mode === "stage" ? ENDPOINT.stage : ENDPOINT.production;
}

module.exports = {
  ecpayUrlEncode,
  generateCheckMacValue,
  verifyCheckMacValue,
  makeTradeNo,
  tradeDate,
  buildOrder,
  endpoint,
  ENDPOINT
};

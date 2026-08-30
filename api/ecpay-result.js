/* =========================================================
   POST /api/ecpay-result   （綠界 OrderResultURL）
   ---------------------------------------------------------
   消費者在綠界付款頁完成/取消付款後，綠界會把表單資料 POST 到這裡。
   因本站是靜態 SPA，前端無法直接讀取 POST body，
   所以這支 API 負責：
     1. 驗證 CheckMacValue（防偽造）
     2. 把交易結果轉成 query string
     3. 重定向到前端 #payresult，讓訪客看到明確狀態
   ========================================================= */

const ecpay = require("../lib/ecpay.js");
const getEnv = require("./_env.js");

const FIELDS = [
  "RtnCode", "RtnMsg", "MerchantTradeNo", "TradeNo", "TradeAmt",
  "PaymentDate", "PaymentType", "PaymentTypeChargeFee",
  "vAccount", "BankCode", "ExpireDate",
  "PaymentNo", "Barcode1", "Barcode2", "Barcode3"
];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    if (res.redirect) return res.redirect(302, "/#payresult?status=method_not_allowed");
    res.statusCode = 302;
    res.setHeader("Location", "/#payresult?status=method_not_allowed");
    return res.end();
  }

  const env = getEnv();

  let data = req.body;
  if (typeof data === "string") {
    const qs = new URLSearchParams(data);
    data = Object.fromEntries(qs.entries());
  }
  data = data || {};

  // 驗證來源
  const valid = env.missing.length === 0 && ecpay.verifyCheckMacValue(data, env.hashKey, env.hashIV);
  if (!valid) {
    console.warn("[ecpay-result] CheckMacValue 驗證失敗", data.MerchantTradeNo);
    if (res.redirect) return res.redirect(302, "/#payresult?status=invalid");
    res.statusCode = 302;
    res.setHeader("Location", "/#payresult?status=invalid");
    return res.end();
  }

  // 轉成 query string
  const params = new URLSearchParams();
  for (const key of FIELDS) {
    const val = data[key];
    if (val !== undefined && val !== null && String(val) !== "") {
      params.append(key, String(val));
    }
  }
  // 保留一個 status 旗標方便前端判斷
  if (!params.has("RtnCode")) params.append("RtnCode", "0");

  const target = "/#payresult?" + params.toString();

  if (res.redirect) return res.redirect(302, target);
  res.statusCode = 302;
  res.setHeader("Location", target);
  res.end();
};

/* =========================================================
   POST /api/ecpay-notify   （綠界 ReturnURL）
   ---------------------------------------------------------
   綠界在消費者付款完成後，由「綠界的伺服器」主動 POST 到這裡。
   本支 API 會：
     1. 驗證 CheckMacValue，確認資料確實來自綠界（不是別人偽造）
     2. 寫入 Google 試算表，標記該筆訂單已付款
     3. 回傳 "1|OK" 給綠界（不回傳這個格式，綠界會重複發送通知）
   ========================================================= */

const ecpay = require("../lib/ecpay.js");
const getEnv = require("./_env.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end("0|Method Not Allowed");
    return;
  }

  const env = getEnv();

  // 綠界以 application/x-www-form-urlencoded 傳送
  let data = req.body;
  if (typeof data === "string") {
    const qs = new URLSearchParams(data);
    data = Object.fromEntries(qs.entries());
  }
  data = data || {};

  const tradeNo = data.MerchantTradeNo || "";
  const rtnCode = data.RtnCode || "";
  const rtnMsg = data.RtnMsg || "";
  const amount = data.TradeAmt || "";
  const paymentType = data.PaymentType || "";
  const tradeDate = data.ProcessDate || data.PaymentDate || "";

  // 1. 驗證來源
  const valid = env.missing.length === 0 && ecpay.verifyCheckMacValue(data, env.hashKey, env.hashIV);
  if (!valid) {
    console.warn("[ecpay-notify] CheckMacValue 驗證失敗", { tradeNo, rtnCode });
    res.status(200).end("0|CheckMacValue Error");
    return;
  }

  // 2. 只有 RtnCode = 1 才算付款成功
  const paid = String(rtnCode) === "1";

  // 3. 寫入 Google 試算表（失敗仍要回 1|OK，避免綠界無限重送）
  let sheetMsg = "未設定 GAS_URL";
  if (env.gasUrl) {
    try {
      await fetch(env.gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          訂單編號: tradeNo,
          付款狀態: paid ? "已付款" : "未付款",
          綠界回傳碼: String(rtnCode),
          綠界訊息: rtnMsg,
          實付金額: amount,
          付款方式: paymentType,
          付款時間: tradeDate
        })
      });
      sheetMsg = "ok";
    } catch (err) {
      sheetMsg = String(err && err.message || err);
    }
  }

  console.log("[ecpay-notify]", JSON.stringify({ tradeNo, rtnCode, rtnMsg, amount, paid, sheetMsg }));

  // 4. 必須回傳 1|OK
  res.status(200).end("1|OK");
};

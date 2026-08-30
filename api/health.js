/* =========================================================
   設定健檢（GET /api/health）
   ---------------------------------------------------------
   用途：快速確認綠界環境變數是否已在主機上正確設定。
   安全：金鑰不會完整回傳，只回傳長度與前後遮罩，
         確認「有沒有設定」與「設得對不對」，但不會外洩。
   ========================================================= */

const getEnv = require("./_env");
const ecpay = require("../lib/ecpay.js");

function mask(v) {
  if (!v) return null;
  if (v.length <= 4) return "●".repeat(v.length);
  return v.slice(0, 2) + "●".repeat(Math.max(v.length - 4, 1)) + v.slice(-2);
}

module.exports = async function handler(req, res) {
  const env = getEnv();

  // 用一組固定參數產生簽章，驗證雜湊演算法在主機環境可正常運作
  let signOk = false;
  try {
    const probe = {
      MerchantID: env.merchantId || "0000000",
      MerchantTradeNo: "HEALTHCHECK",
      MerchantTradeDate: "2024/01/01 00:00:00",
      TotalAmount: 1
    };
    const cmv = ecpay.generateCheckMacValue(probe, env.hashKey, env.hashIV);
    signOk = /^[0-9A-F]{64}$/.test(cmv);
  } catch (e) {
    signOk = false;
  }

  // 試算表連線測試（用 GET 探測，不會寫入任何資料）
  let gasState = "未設定（訂單不會寫入試算表）";
  if (env.gasUrl) {
    try {
      const r = await fetch(env.gasUrl, { method: "GET", redirect: "follow" });
      const text = await r.text();
      if (/Script function not found: doGet/i.test(text)) {
        gasState = "連線正常（此腳本未定義 doGet，屬正常現象）";
      } else if (r.ok) {
        gasState = "連線正常";
      } else {
        gasState = "連線異常：HTTP " + r.status;
      }
    } catch (err) {
      gasState = "連線失敗：" + String((err && err.message) || err);
    }
  }

  const ok = env.missing.length === 0 && signOk;

  res.status(ok ? 200 : 503).json({
    ok,
    商店代號: env.merchantId ? mask(env.merchantId) : null,
    HashKey: env.hashKey ? mask(env.hashKey) : null,
    HashIV: env.hashIV ? mask(env.hashIV) : null,
    環境: env.mode === "stage" ? "測試環境 (stage)" : "正式環境 (production)",
    綠界端點: ecpay.endpoint(env.mode),
    網站網址: env.siteUrl || null,
    試算表: gasState,
    簽章演算法: signOk ? "正常" : "異常",
    缺少的環境變數: env.missing
  });
};

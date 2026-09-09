/* =========================================================
   環境變數讀取（只有後端會用到）
   ---------------------------------------------------------
   Vercel：在專案後台 Settings → Environment Variables 設定
   自己的 server：用 .env 檔或系統環境變數，讀取方式完全相同
   ========================================================= */

module.exports = function getEnv() {
  const cfg = {
    merchantId: (process.env.ECPAY_MERCHANT_ID || "").trim(),
    hashKey: (process.env.ECPAY_HASH_KEY || "").trim(),
    hashIV: (process.env.ECPAY_HASH_IV || "").trim(),
    mode: (process.env.ECPAY_MODE || "production").trim(),   // production | stage
    gasUrl: (process.env.GAS_URL || "").trim(),
    siteUrl: (process.env.SITE_URL || "").trim()
  };

  // 沒設定環境變數時，退回正式網址（2026-09 換網域後的預設值）
  // ⚠️ 換網域時請一併更新這裡，並在 Vercel 後台設定 SITE_URL 環境變數
  const DEFAULT_SITE_URL = "https://www.hauterglobal.com";

  if (!cfg.siteUrl) {
    cfg.siteUrl = DEFAULT_SITE_URL;
  }

  cfg.missing = [];
  if (!cfg.merchantId) cfg.missing.push("ECPAY_MERCHANT_ID");
  if (!cfg.hashKey) cfg.missing.push("ECPAY_HASH_KEY");
  if (!cfg.hashIV) cfg.missing.push("ECPAY_HASH_IV");

  return cfg;
};

/* =========================================================
   POST /api/create-order
   ---------------------------------------------------------
   前端送出「供養登記」後呼叫本支 API：
     1. 依項目定義重新計算金額（不採信前端傳來的金額，避免被竄改）
     2. 產生訂單編號，先把明細寫入 Google 試算表（狀態：待付款）
     3. 回傳綠界所需的表單參數（含 CheckMacValue），由前端自動導向綠界
   ========================================================= */

const ecpay = require("../lib/ecpay.js");
const { ITEMS, computeSelection, resolveEcpayCode } = require("../lib/items.js");
const getEnv = require("./_env.js");

module.exports = async function handler(req, res) {
  // 允許OPTIONS（本機開發用）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "請使用 POST" });

  const env = getEnv();
  if (env.missing.length) {
    return res.status(500).json({
      ok: false,
      message: "尚未完成綠界環境設定：" + env.missing.join("、"),
      hint: "請在 Vercel 專案後台 Settings → Environment Variables 設定後重新部署。"
    });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  const picked = Array.isArray(body.picked) ? body.picked : [];
  const name = String(body.name || "").trim();
  const contact = String(body.contact || "").trim();
  const note = String(body.note || "").trim();

  if (!picked.length) return res.status(400).json({ ok: false, message: "請至少勾選一項供養項目。" });
  if (!name) return res.status(400).json({ ok: false, message: "請填寫姓名或稱呼。" });
  if (!contact) return res.status(400).json({ ok: false, message: "請填寫聯絡方式。" });

  // 以「項目定義」重新計算，前端傳來的金額一律不採信
  const calc = computeSelection(picked);
  if (!calc.lines.length) return res.status(400).json({ ok: false, message: "勾選的項目無效，請重新選擇。" });
  if (calc.total < 1) {
    return res.status(400).json({
      ok: false,
      message: "合計金額為 0 元。若只勾選「禮敬上香（隨喜）」，請填寫隨喜金額。"
    });
  }
  if (calc.total > 2000000) {
    return res.status(400).json({ ok: false, message: "單筆金額超過上限，請分次登記或與浩德堂聯絡。" });
  }

  const tradeNo = ecpay.makeTradeNo();
  const now = new Date();
  const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const ymd = ym + "-" + String(now.getDate()).padStart(2, "0");

  const detailText = calc.lines
    .map((l) => `${l.name}｜${l.qtyText}｜${l.amount.toLocaleString("en-US")} 元`)
    .join("；");

  // 寫入 Google 試算表（失敗不阻斷付款流程）
  let sheetOk = false, sheetMsg = "";
  if (env.gasUrl) {
    const detailRow = {
      action: "create",
      日期: ymd,
      月份: ym,
      "姓名／稱呼": name,
      聯絡方式: contact,
      方向: calc.groups,
      項目: calc.lines.map((l) => l.name).join("、"),
      單位數: "",
      單位金額: "",
      "本筆金額": calc.total,
      備註: [note, `【明細】${detailText}`, "【付款】綠界支付"].filter(Boolean).join("　"),
      是否已匯款: "待付款",
      訂單編號: tradeNo
    };
    try {
      const r = await fetch(env.gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detailRow)
      });
      sheetOk = true;
      sheetMsg = "ok";
    } catch (err) {
      sheetMsg = String(err && err.message || err);
    }
  } else {
    sheetMsg = "未設定 GAS_URL，略過寫入";
  }

  // 訪客在站內選的付款方式 → 轉成綠界代碼，綠界會直接開對應的付款頁
  const choosePayment = resolveEcpayCode(String(body.payment || "").trim());

  const base = env.siteUrl.replace(/\/+$/, "");
  const params = ecpay.buildOrder({
    merchantId: env.merchantId,
    hashKey: env.hashKey,
    hashIV: env.hashIV,
    tradeNo,
    totalAmount: calc.total,
    itemName: calc.itemName.slice(0, 200),
    tradeDesc: ("浩德堂 " + calc.groups).slice(0, 200),
    returnURL: `${base}/api/ecpay-notify`,
    orderResultURL: `${base}/api/ecpay-result`,
    clientBackURL: `${base}/#donate`,
    choosePayment
  });

  return res.status(200).json({
    ok: true,
    action: ecpay.ENDPOINT[env.mode] || ecpay.ENDPOINT.production,
    params,
    tradeNo,
    total: calc.total,
    lines: calc.lines,
    payment: choosePayment,
    sheet: { written: sheetOk, message: sheetMsg }
  });
};

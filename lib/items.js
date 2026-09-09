/* =========================================================
   供養項目定義（前後端共用的單一來源）
   ---------------------------------------------------------
   - 瀏覽器：<script src="lib/items.js"></script> → 全域 DONATE_ITEMS
   - Node.js：require("./items.js")

   要增減項目或調整金額，只需要改這個檔案，
   前端畫面與後端的金額驗證會同時生效。
   ========================================================= */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DONATE_ITEMS = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ⚠️ 太素觀暫時收起（2026-09）
     本檔前後端共用（後端 api/create-order.js 也會 require），
     所以開關必須寫在這裡，不能讀 js/config.js（Node 環境拿不到）。
     恢復方式：把 ENABLE_TAISU 改回 true，供瓦片就會同時回到前端與後端。 */
  const ENABLE_TAISU = false;

  /* type 說明：
       fixed = 固定金額（amount）
       free  = 隨喜（由訪客自行填寫金額 freeAmount）
       unit  = 單位計價（unitAmount 每單位金額，unitPerSet 每「片」的單位數） */
  const ALL_ITEMS = [
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
  ];

  /* 收起期間：過濾掉「太素觀供養銅瓦」整組。
     因為 ITEM_MAP 是由 ITEMS 建立，過濾後後端的 computeSelection()
     也找不到 taisu-tile，等於前後端同時失效，不會有漏算金額的風險。 */
  const ITEMS = ENABLE_TAISU
    ? ALL_ITEMS
    : ALL_ITEMS.filter((it) => it.group !== "太素觀供養銅瓦");

  const ITEM_MAP = ITEMS.reduce((m, it) => (m[it.id] = it, m), {});

  /* ---------- 付款方式 ----------
     ecpayCode 對應綠界 AIO 的 ChoosePayment 參數。
     ⚠️ enabled 必須與綠界後台「已開通」的付款方式一致，
        若開了後台沒開通的項目，訪客點下去綠界會顯示錯誤。

     目前浩德堂已開通：信用卡（Credit）、Apple Pay（ApplePay）
     若要增加 ATM 虛擬帳號 / 超商代碼，需先到綠界後台申請開通，
     再把 enabled 改成 true 即可，網站不用改程式。 */
  const PAYMENT_METHODS = [
    {
      id: "Credit",
      name: "信用卡",
      desc: "VISA / MasterCard / JCB，可一次付清或分期",
      enabled: true,
      ecpayCode: "Credit"
    },
    {
      id: "ApplePay",
      name: "Apple Pay",
      desc: "iPhone、iPad、Mac 快速付款",
      enabled: true,
      ecpayCode: "ApplePay"
    },
    {
      id: "ATM",
      name: "ATM 虛擬帳號",
      desc: "取得專屬帳號後轉帳或臨櫃繳費",
      enabled: false,
      ecpayCode: "ATM"
    },
    {
      id: "CVS",
      name: "超商代碼",
      desc: "7-11、全家、萊爾富、OK 繳費",
      enabled: false,
      ecpayCode: "CVS"
    },
    {
      id: "BARCODE",
      name: "超商條碼",
      desc: "列印或顯示條碼，超商機台掃描繳費",
      enabled: false,
      ecpayCode: "BARCODE"
    }
  ];

  const AVAILABLE_PAYMENTS = PAYMENT_METHODS.filter((m) => m.enabled);

  /** 把前端傳來的付款方式轉成綠界代碼；不在清單內就回傳 ALL（由綠界顯示全部） */
  function resolveEcpayCode(paymentId) {
    const m = AVAILABLE_PAYMENTS.find((x) => x.id === paymentId);
    return m ? m.ecpayCode : "ALL";
  }

  /**
   * 計算勾選項目（前端顯示與後端驗證都用同一套邏輯）
   * @param {Object[]} picked  [{ id, units?, freeAmount? }]
   * @returns {{ lines:Array, total:number, itemName:string, groups:string }}
   */
  function computeSelection(picked) {
    const lines = [];
    let total = 0;

    (picked || []).forEach((p) => {
      const it = ITEM_MAP[p.id];
      if (!it) return;

      let amount = 0, units = 1, qtyText = "";

      if (it.type === "fixed") {
        amount = it.amount || 0;
        qtyText = "1 份";
      } else if (it.type === "unit") {
        units = Math.max(1, parseInt(p.units, 10) || (it.unitPerSet || 1));
        amount = (it.unitAmount || 0) * units;
        const per = it.unitPerSet || 1;
        const sets = units / per;
        qtyText = Number.isInteger(sets) && sets >= 1 ? `${units} 單位（${sets} 片）` : `${units} 單位`;
      } else if (it.type === "free") {
        amount = Math.max(0, parseInt(p.freeAmount, 10) || 0);
        qtyText = amount > 0 ? `隨喜 ${amount.toLocaleString()} 元` : "隨喜（未填金額）";
      }

      total += amount;
      lines.push({ id: it.id, name: it.name, group: it.group, type: it.type, units, amount, qtyText });
    });

    const groups = [...new Set(lines.map((l) => l.group).filter(Boolean))].join("、");
    const itemName = lines.map((l) => l.name).join("#") || "浩德堂護持";

    return { lines, total, itemName, groups };
  }

  return { ITEMS, ITEM_MAP, PAYMENT_METHODS, AVAILABLE_PAYMENTS, resolveEcpayCode, computeSelection };
});

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

  /* type 說明：
       fixed = 固定金額（amount）
       free  = 隨喜（由訪客自行填寫金額 freeAmount）
       unit  = 單位計價（unitAmount 每單位金額，unitPerSet 每「片」的單位數） */
  const ITEMS = [
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

  const ITEM_MAP = ITEMS.reduce((m, it) => (m[it.id] = it, m), {});

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

  return { ITEMS, ITEM_MAP, computeSelection };
});

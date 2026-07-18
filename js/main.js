/* =========================================================
   浩德堂 網站主邏輯
   - 單頁應用路由（hash 切換）
   - 分頁（tabs）切換
   - 隨喜護持表單：金額自動帶出 + 送出至 Google Drive
   - 最新消息渲染、聯絡資訊綁定
   ========================================================= */

(function () {
  "use strict";

  /* ---------- 路由 ---------- */
  const routes = ["home", "about", "taisu", "online", "donate", "news", "contact"];
  const pages = {};
  routes.forEach((r) => (pages[r] = document.getElementById("page-" + r)));

  function showRoute(route) {
    if (!routes.includes(route)) route = "home";
    routes.forEach((r) => {
      if (pages[r]) pages[r].hidden = r !== route;
    });
    // 導覽高亮
    document.querySelectorAll(".site-nav a, .footer-nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.route === route);
    });
    // 關閉手機選單
    closeNav();
    // 滾動至頂
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  window.addEventListener("hashchange", () => showRoute(getRoute()));
  function getRoute() {
    const h = location.hash.replace("#", "");
    return routes.includes(h) ? h : "home";
  }

  // 內部連結（data-route）攔截，確保 hash 一致
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-route]");
    if (link) {
      e.preventDefault();
      const r = link.dataset.route;
      if (location.hash.replace("#", "") === r) {
        showRoute(r);
      } else {
        location.hash = r;
      }
    }
  });

  /* ---------- 手機選單 ---------- */
  const navToggle = document.getElementById("navToggle");
  const siteNav = document.getElementById("siteNav");
  function closeNav() {
    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
  navToggle.addEventListener("click", () => {
    const open = siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  /* ---------- 分頁（tabs） ---------- */
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    const group = tab.closest("[data-tabs]");
    const name = tab.dataset.tab;
    group.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    const section = group.closest(".page");
    section.querySelectorAll('.tab-panel').forEach((p) => {
      p.hidden = p.dataset.panel !== name;
      p.classList.toggle("active", p.dataset.panel === name);
    });
  });

  /* ---------- 聯絡資訊綁定 ---------- */
  function bindContact() {
    const c = SITE_CONFIG.CONTACT;
    const el = document.getElementById("contactInfo");
    if (!el) return;
    const parts = [];
    if (c.phone) parts.push("電話：" + c.phone);
    if (c.line) parts.push("LINE：" + c.line);
    if (c.email) parts.push("Email：" + c.email);
    el.textContent = parts.length ? parts.join("　｜　") : c.note;

    // 匯款資訊
    const r = SITE_CONFIG.REMIT;
    const payField = document.querySelector('.field .inline-note');
    if (payField) {
      const info = [r.bank, r.account, r.name].filter(Boolean).join("　");
      payField.textContent = info ? "匯款｜" + info : r.note;
    }
  }

  /* ---------- 最新消息渲染 ---------- */
  function renderNews() {
    const list = document.getElementById("newsList");
    if (!list) return;
    if (!NEWS_DATA.length) {
      list.innerHTML = '<p class="news-empty">目前尚無消息，敬請期待。</p>';
      return;
    }
    list.innerHTML = NEWS_DATA.map((n) => {
      const date = n.date ? `<span style="color:var(--gold);font-size:.82rem;">${n.date}</span>` : "";
      return `<article class="news-item">
        <span class="tag">${n.tag}</span>
        ${date}
        <h3>${n.title}</h3>
        <p>${n.body}</p>
      </article>`;
    }).join("");
  }

  /* ---------- 隨喜護持 表單 ---------- */
  const form = document.getElementById("donateForm");
  const directionSel = document.getElementById("direction");
  const projectSel = document.getElementById("project");
  const unitsField = document.getElementById("unitsField");
  const unitsInput = document.getElementById("units");
  const amountInput = document.getElementById("amount");
  const nameInput = document.getElementById("name");

  function refreshProjects() {
    const dir = directionSel.value;
    projectSel.innerHTML = '<option value="">請選擇項目</option>';
    if (!dir || !SITE_CONFIG.PRICING[dir]) {
      projectSel.disabled = true;
      unitsField.hidden = true;
      updateAmount();
      return;
    }
    projectSel.disabled = false;
    Object.keys(SITE_CONFIG.PRICING[dir]).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      projectSel.appendChild(opt);
    });
    unitsField.hidden = dir !== "太素觀供養銅瓦";
    updateAmount();
  }

  function updateAmount() {
    const dir = directionSel.value;
    const proj = projectSel.value;
    let text = "依項目自動帶出";
    if (dir && proj) {
      const rule = SITE_CONFIG.PRICING[dir][proj];
      if (rule) {
        if (rule.type === "fixed") {
          text = rule.amount.toLocaleString() + " 元";
        } else if (rule.type === "free") {
          text = "隨喜（請於送出前備註金額，或匯款後回填）";
        } else if (rule.type === "unit") {
          const u = Math.max(1, parseInt(unitsInput.value || "1", 10));
          const total = rule.unitAmount * u;
          text = `${u} 單位 × ${rule.unitAmount} = ${total.toLocaleString()} 元`;
        }
      }
    }
    amountInput.value = text;
    updateSummary();
  }

  function updateSummary() {
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val || "—"; };
    set("sumDirection", directionSel.value);
    set("sumProject", projectSel.value);
    set("sumAmount", amountInput.value && amountInput.value !== "依項目自動帶出" ? amountInput.value : "—");
    set("sumName", nameInput.value.trim());
  }

  if (form) {
    directionSel.addEventListener("change", refreshProjects);
    projectSel.addEventListener("change", updateAmount);
    unitsInput.addEventListener("input", updateAmount);
    nameInput.addEventListener("input", updateSummary);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const hint = document.getElementById("formHint");
      hint.className = "form-hint";
      hint.textContent = "";

      // 驗證
      const dir = directionSel.value;
      const proj = projectSel.value;
      const name = nameInput.value.trim();
      const contact = document.getElementById("contact").value.trim();
      if (!dir || !proj || !name || !contact) {
        hint.className = "form-hint error";
        hint.textContent = "請填寫方向、項目、稱呼與聯絡方式。";
        return;
      }

      // 組裝資料（對應月結系統「明細紀錄」欄位）
      const now = new Date();
      const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
      const ymd = ym + "-" + String(now.getDate()).padStart(2, "0");

      let unitAmount = "", units = "", amount = "", noteExtra = "";
      const rule = SITE_CONFIG.PRICING[dir][proj];
      if (rule.type === "fixed") {
        unitAmount = rule.amount; units = 1; amount = rule.amount;
      } else if (rule.type === "free") {
        unitAmount = ""; units = 1;
        const freeAmt = prompt("禮敬上香為隨喜，請輸入本次金額（元，僅供紀錄）：", "");
        if (freeAmt !== null && freeAmt.trim() !== "") {
          amount = freeAmt.trim();            // 純數字，便於月結統計
          noteExtra = "（隨喜）";
        } else {
          amount = "0";
          noteExtra = "（隨喜，未填金額）";
        }
      } else if (rule.type === "unit") {
        const u = Math.max(1, parseInt(unitsInput.value || "1", 10));
        units = u; unitAmount = rule.unitAmount; amount = rule.unitAmount * u;
      }

      const payload = {
        日期: ymd,
        月份: ym,
        "姓名／稱呼": name,
        聯絡方式: contact,
        方向: dir,
        項目: proj,
        單位數: units,
        單位金額: unitAmount,
        "本筆金額": amount,
        備註: (document.getElementById("note").value.trim() + " " + noteExtra).trim(),
        是否已匯款: "否"
      };

      // 嘗試上傳 Google Drive；失敗則本機暫存
      const gasUrl = (SITE_CONFIG.GAS_URL || "").trim();
      if (!gasUrl) {
        saveLocal(payload);
        showToast("已暫存本機（尚未連接 Google Drive）。請於 config.js 填入 GAS_URL。", "err");
        form.reset(); refreshProjects();
        return;
      }

      try {
        await postToGAS(gasUrl, payload);
        showToast("登記已送出，感謝您的發心。資料已進入浩德堂月結系統。", "ok");
        form.reset(); refreshProjects();
      } catch (err) {
        saveLocal(payload);
        showToast("線路上傳失敗，已改為本機暫存。錯誤：" + err.message, "err");
        form.reset(); refreshProjects();
      }
    });
  }

  async function postToGAS(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res;
  }

  function saveLocal(payload) {
    try {
      const key = "haodetang_donate_local";
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push(payload);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function showToast(msg, type) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast show " + (type || "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => (t.hidden = true), 320);
    }, 4200);
  }

  /* ---------- 初始化 ---------- */
  bindContact();
  renderNews();
  if (form) refreshProjects();
  showRoute(getRoute());
})();

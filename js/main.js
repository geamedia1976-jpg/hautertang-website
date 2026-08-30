/* =========================================================
   浩德堂 網站主邏輯
   - 單頁應用路由（hash 切換）
   - 分頁（tabs）切換
   - 隨喜護持表單：可複選供養項目 + 金額自動加總 + 送出至 Google Drive
   - 最新消息渲染、聯絡資訊綁定
   - 網站分享（Facebook / LINE / Instagram / 複製連結 / QR Code）
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

    // 若有 LINE 邀請連結，優先顯示 QR Code + 加入社群按鈕
    if (c.lineUrl) {
      el.innerHTML = `
        ${c.lineQrCode ? `<img src="${c.lineQrCode}" alt="浩德堂 LINE 社群 QR Code" class="contact-qr">` : ""}
        <p class="contact-line-msg">您已被邀請加入「浩德堂」！<br>請點選以下連結加入社群。</p>
        <a href="${c.lineUrl}" target="_blank" rel="noopener" class="btn btn-primary">加入浩德堂 LINE 社群</a>
      `;
    } else {
      const parts = [];
      if (c.phone) parts.push("電話：" + c.phone);
      if (c.line) parts.push("LINE：" + c.line);
      if (c.email) parts.push("Email：" + c.email);
      el.textContent = parts.length ? parts.join("　｜　") : c.note;
    }
  }

  /* ---------- 付款方式（綠界） ---------- */
  function bindPayment() {
    const ecpay = SITE_CONFIG.ECPAY || {};
    const note = document.getElementById("payNote");
    if (note) {
      note.textContent = ecpay.enabled
        ? `${ecpay.label || "綠界支付"}（送出登記後可前往完成付款）`
        : "送出登記後由浩德堂與您聯絡確認付款方式。";
    }
  }

  function getPaymentUrl() {
    const ecpay = SITE_CONFIG.ECPAY || {};
    return (ecpay.paymentUrl || "").trim();
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

  /* ---------- 隨喜護持 表單（可複選） ---------- */
  const form = document.getElementById("donateForm");
  const itemList = document.getElementById("itemList");
  const itemHint = document.getElementById("itemHint");
  const amountInput = document.getElementById("amount");
  const nameInput = document.getElementById("name");
  const contactInput = document.getElementById("contact");
  const noteInput = document.getElementById("note");
  const sumItems = document.getElementById("sumItems");
  const sumAmount = document.getElementById("sumAmount");
  const payCta = document.getElementById("payCta");
  const payBtn = document.getElementById("payBtn");

  const items = (SITE_CONFIG.ITEMS || []).filter((it) => it && it.id && it.name);

  /* 渲染項目清單（依 group 分組） */
  function renderItems() {
    if (!itemList) return;
    const groups = [];
    items.forEach((it) => {
      let g = groups.find((x) => x.name === (it.group || "其他"));
      if (!g) { g = { name: it.group || "其他", list: [] }; groups.push(g); }
      g.list.push(it);
    });

    itemList.innerHTML = groups.map((g) => `
      <p class="item-group-title">${g.name}</p>
      ${g.list.map((it) => itemCardHTML(it)).join("")}
    `).join("");
  }

  function itemCardHTML(it) {
    const price =
      it.type === "fixed" ? (it.amount || 0).toLocaleString() + " 元" :
      it.type === "unit"  ? (it.unitAmount || 0).toLocaleString() + " 元／單位" :
                            "隨喜";

    let extra = "";
    if (it.type === "unit") {
      const per = it.unitPerSet || 1;
      extra = `
        <div class="item-extra">
          <label for="q-${it.id}">單位數</label>
          <input type="number" id="q-${it.id}" data-id="${it.id}" data-role="unit"
                 min="1" step="1" value="${per}" inputmode="numeric">
          <p class="item-hintline" id="h-${it.id}"></p>
        </div>`;
    } else if (it.type === "free") {
      extra = `
        <div class="item-extra">
          <label for="q-${it.id}">隨喜金額（元）</label>
          <input type="number" id="q-${it.id}" data-id="${it.id}" data-role="free"
                 min="0" step="1" placeholder="自由填寫" inputmode="numeric">
          <p class="item-hintline">可先留空，之後由浩德堂與您確認。</p>
        </div>`;
    }

    return `
      <div class="item-card" data-item="${it.id}">
        <input type="checkbox" id="cb-${it.id}" data-id="${it.id}" aria-label="${it.name}">
        <div class="item-body">
          <div class="item-top">
            <span class="item-name">${it.name}</span>
            <span class="item-price">${price}</span>
          </div>
          <p class="item-desc">${it.desc || ""}</p>
          ${extra}
        </div>
      </div>`;
  }

  /* 取得目前勾選的項目與金額 */
  function collectSelection() {
    const picked = [];
    items.forEach((it) => {
      const cb = itemList.querySelector(`input[type="checkbox"][data-id="${it.id}"]`);
      if (!cb || !cb.checked) return;
      const q = itemList.querySelector(`#q-${it.id}`);
      let units = 1, amount = 0, qtyText = "";

      if (it.type === "fixed") {
        amount = it.amount || 0;
        qtyText = "1 份";
      } else if (it.type === "unit") {
        units = Math.max(1, parseInt((q && q.value) || "1", 10) || 1);
        amount = (it.unitAmount || 0) * units;
        const per = it.unitPerSet || 1;
        const sets = units / per;
        qtyText = (Number.isInteger(sets) && sets >= 1)
          ? `${units} 單位（${sets} 片）`
          : `${units} 單位`;
      } else if (it.type === "free") {
        amount = Math.max(0, parseInt((q && q.value) || "0", 10) || 0);
        qtyText = amount > 0 ? `隨喜 ${amount.toLocaleString()} 元` : "隨喜（未填金額）";
      }

      picked.push({ item: it, units: units, amount: amount, qtyText: qtyText });
    });
    return picked;
  }

  function totalOf(picked) {
    return picked.reduce((s, p) => s + p.amount, 0);
  }

  /* 更新金額與摘要 */
  function refreshForm() {
    const picked = collectSelection();

    // 勾選狀態樣式
    itemList.querySelectorAll(".item-card").forEach((card) => {
      const cb = card.querySelector('input[type="checkbox"]');
      card.classList.toggle("checked", !!(cb && cb.checked));
    });

    // 銅瓦換算提示
    items.filter((it) => it.type === "unit").forEach((it) => {
      const h = itemList.querySelector(`#h-${it.id}`);
      const q = itemList.querySelector(`#q-${it.id}`);
      if (!h || !q) return;
      const u = Math.max(1, parseInt(q.value || "1", 10) || 1);
      const per = it.unitPerSet || 1;
      const sets = (u / per);
      const setText = Number.isInteger(sets) ? `＝ ${sets} 片` : `≈ ${sets.toFixed(2)} 片`;
      h.innerHTML = `共 <b>${((it.unitAmount || 0) * u).toLocaleString()}</b> 元 ${setText}`;
    });

    // 金額
    const total = totalOf(picked);
    amountInput.value = picked.length ? total.toLocaleString() + " 元" : "尚未選擇項目";

    // 摘要
    if (sumItems) {
      if (!picked.length) {
        sumItems.innerHTML = '<li class="summary-empty"><span>尚未選擇項目</span></li>';
      } else {
        sumItems.innerHTML = picked.map((p) => `
          <li><span>${p.item.name}<br><small style="color:var(--gold);font-size:.8rem;">${p.qtyText}</small></span>
              <b>${p.amount > 0 ? p.amount.toLocaleString() + " 元" : "隨喜"}</b></li>
        `).join("");
      }
    }
    if (sumAmount) sumAmount.textContent = picked.length ? total.toLocaleString() + " 元" : "—";
    const sn = document.getElementById("sumName");
    if (sn) sn.textContent = nameInput.value.trim() || "—";

    if (itemHint) itemHint.hidden = picked.length > 0;

    // 綠界付款按鈕
    if (payCta) payCta.hidden = true;
  }

  /* 表單事件綁定 */
  if (form && itemList) {
    renderItems();

    itemList.addEventListener("change", (e) => {
      if (e.target.matches('input[type="checkbox"]')) refreshForm();
    });
    itemList.addEventListener("input", (e) => {
      if (e.target.matches("input[data-role]")) refreshForm();
    });
    // 點擊卡片任一處可切換勾選（點數字輸入框時不切換）
    itemList.addEventListener("click", (e) => {
      if (e.target.closest("input")) return;
      const card = e.target.closest(".item-card");
      if (!card) return;
      const cb = card.querySelector('input[type="checkbox"]');
      if (cb) { cb.checked = !cb.checked; refreshForm(); }
    });
    nameInput.addEventListener("input", () => {
      const sn = document.getElementById("sumName");
      if (sn) sn.textContent = nameInput.value.trim() || "—";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const hint = document.getElementById("formHint");
      hint.className = "form-hint";
      hint.textContent = "";

      const picked = collectSelection();
      const name = nameInput.value.trim();
      const contact = contactInput.value.trim();

      if (!picked.length) {
        if (itemHint) itemHint.hidden = false;
        hint.className = "form-hint error";
        hint.textContent = "請至少勾選一項供養項目。";
        itemList.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (!name || !contact) {
        hint.className = "form-hint error";
        hint.textContent = "請填寫稱呼與聯絡方式。";
        return;
      }

      const total = totalOf(picked);
      const now = new Date();
      const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
      const ymd = ym + "-" + String(now.getDate()).padStart(2, "0");

      // 組裝資料（對應月結系統「明細紀錄」欄位）
      const projectNames = picked.map((p) => p.item.name).join("、");
      const groupNames = [...new Set(picked.map((p) => p.item.group || ""))].filter(Boolean).join("、");
      // 多選明細以文字寫入「備註」欄，既有 Google 試算表與 GAS 不需改動
      const detailText = picked
        .map((p) => `${p.item.name}｜${p.qtyText}｜${p.amount > 0 ? p.amount.toLocaleString() + " 元" : "隨喜"}`)
        .join("；");
      const payText = (SITE_CONFIG.ECPAY && SITE_CONFIG.ECPAY.enabled)
        ? (SITE_CONFIG.ECPAY.label || "綠界支付")
        : "另行確認";
      const noteText = [
        noteInput.value.trim(),
        detailText ? `【明細】${detailText}` : "",
        `【付款】${payText}`
      ].filter(Boolean).join("　");

      const payload = {
        日期: ymd,
        月份: ym,
        "姓名／稱呼": name,
        聯絡方式: contact,
        方向: groupNames,
        項目: projectNames,
        單位數: "",
        單位金額: "",
        "本筆金額": total,
        備註: noteText,
        是否已匯款: "否"
      };

      // 嘗試上傳 Google Drive；失敗則本機暫存
      const gasUrl = (SITE_CONFIG.GAS_URL || "").trim();
      if (!gasUrl) {
        saveLocal(payload);
        afterSubmit("本次登記已記錄，浩德堂將盡快與您聯絡確認。", "ok");
        return;
      }

      try {
        await postToGAS(gasUrl, payload);
        afterSubmit("登記已送出，感謝您的發心。浩德堂將盡快與您聯絡確認。", "ok");
      } catch (err) {
        saveLocal(payload);
        afterSubmit("送出時發生問題，本次登記已先記錄，請再與浩德堂聯絡確認。", "err");
      }
    });
  }

  function afterSubmit(msg, type) {
    showToast(msg, type);
    // 顯示綠界付款 CTA
    const url = getPaymentUrl();
    if (payCta && SITE_CONFIG.ECPAY && SITE_CONFIG.ECPAY.enabled && url) {
      payBtn.href = url;
      payCta.hidden = false;
      payCta.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      form.reset();
      refreshForm();
    }
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

  /* ---------- 網站分享 ---------- */
  const SHARE = SITE_CONFIG.SHARE || {};

  // 網站根網址（優先採用設定檔，方便之後換正式網域）
  function siteRoot() {
    const configured = ((SITE_CONFIG.SITE && SITE_CONFIG.SITE.url) || "").trim().replace(/\/+$/, "");
    if (/^https?:/i.test(configured)) return configured;
    return location.origin + location.pathname.replace(/index\.html$/, "").replace(/\/+$/, "");
  }

  // 取得目前這頁的完整網址（含 hash，讓對方點進來就到同一頁）
  function pageUrl() {
    const h = location.hash.replace("#", "");
    return routes.includes(h) && h !== "home" ? `${siteRoot()}/#${h}` : `${siteRoot()}/`;
  }

  function shareTitle() {
    const meta = document.querySelector('meta[property="og:title"]');
    return (SITE_CONFIG.SITE && SITE_CONFIG.SITE.name ? SITE_CONFIG.SITE.name + " ｜ " : "") +
           (meta ? meta.getAttribute("content") : document.title);
  }

  function openShare(url) {
    const w = 640, h = 560;
    const y = window.top.outerHeight / 2 + window.top.screenY - h / 2;
    const x = window.top.outerWidth / 2 + window.top.screenX - w / 2;
    window.open(url, "_blank", `width=${w},height=${h},top=${y},left=${x},noopener`);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  /* 依設定網址即時產生 QR Code；若產生失敗則沿用圖片檔 */
  function renderQr() {
    if (SHARE.qrCode === false) return;
    if (typeof QRCode === "undefined") return;
    const url = siteRoot() + "/";   // QR Code 固定導向首頁，方便掃描進站

    const small = document.getElementById("qrBox");
    const smallImg = document.getElementById("qrImg");
    if (small) {
      small.innerHTML = "";
      try {
        new QRCode(small, {
          text: url, width: 184, height: 184,
          colorDark: "#322F2A", colorLight: "#FFFFFF",
          correctLevel: QRCode.CorrectLevel.M
        });
        small.hidden = false;
        if (smallImg) smallImg.hidden = true;
      } catch (_) {
        small.hidden = true;
        if (smallImg) smallImg.hidden = false;
      }
    }

    const large = document.getElementById("qrBoxLarge");
    const largeImg = document.getElementById("qrImgLarge");
    if (large) {
      large.innerHTML = "";
      try {
        new QRCode(large, {
          text: url, width: 300, height: 300,
          colorDark: "#322F2A", colorLight: "#FFFFFF",
          correctLevel: QRCode.CorrectLevel.M
        });
        large.hidden = false;
        if (largeImg) largeImg.hidden = true;
      } catch (_) {
        large.hidden = true;
        if (largeImg) largeImg.hidden = false;
      }
    }
  }

  function bindShare() {
    const bar = document.getElementById("shareBar");
    if (!bar) return;

    // 依設定顯示／隱藏按鈕
    bar.querySelectorAll(".share-btn").forEach((btn) => {
      const key = btn.dataset.share;
      if (key === "facebook" && SHARE.facebook === false) btn.hidden = true;
      if (key === "line" && SHARE.line === false) btn.hidden = true;
      if (key === "instagram" && SHARE.instagram === false) btn.hidden = true;
      if (key === "copy" && SHARE.copyLink === false) btn.hidden = true;
      if (key === "native" && !navigator.share) btn.hidden = true;
    });

    const qrBox = document.getElementById("shareQr");
    if (qrBox && SHARE.qrCode === false) qrBox.hidden = true;
    renderQr();

    bar.addEventListener("click", async (e) => {
      const btn = e.target.closest(".share-btn");
      if (!btn) return;
      const kind = btn.dataset.share;
      const url = pageUrl();
      const text = shareTitle();

      if (kind === "facebook") {
        openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);

      } else if (kind === "line") {
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener");

      } else if (kind === "instagram") {
        // Instagram 無網頁分享 API：先複製連結，再引導到 Instagram
        const ok = await copyText(url);
        showToast(ok
          ? "已複製網站連結，請開啟 Instagram 貼上分享。"
          : "請長按網址列複製連結，再到 Instagram 貼上分享。", ok ? "ok" : "err");
        setTimeout(() => window.open("https://www.instagram.com/", "_blank", "noopener"), 700);

      } else if (kind === "copy") {
        let ok = await copyText(url);
        if (!ok) {
          window.prompt("請複製以下網址分享：", url);
          ok = true;
        }
        showToast(ok ? "已複製網站連結，可直接貼上分享。" : "複製失敗，請手動複製網址列連結。", ok ? "ok" : "err");

      } else if (kind === "native") {
        try {
          await navigator.share({ title: text, text: (SITE_CONFIG.SITE && SITE_CONFIG.SITE.desc) || "", url: url });
        } catch (_) {}
      }
    });

    // QR Code 放大
    const modal = document.getElementById("qrModal");
    const zoom = document.getElementById("qrZoom");
    const close = document.getElementById("qrClose");
    const modalUrl = document.getElementById("qrModalUrl");
    if (zoom && modal) {
      zoom.addEventListener("click", () => {
        if (modalUrl) modalUrl.textContent = pageUrl();
        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add("show"));
      });
    }
    function closeModal() {
      modal.classList.remove("show");
      setTimeout(() => (modal.hidden = true), 260);
    }
    if (close) close.addEventListener("click", closeModal);
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && !modal.hidden) closeModal();
    });
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
  bindPayment();
  renderNews();
  bindShare();
  if (form && itemList) refreshForm();
  showRoute(getRoute());
})();

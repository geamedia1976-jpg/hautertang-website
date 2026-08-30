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
  const routes = ["home", "about", "taisu", "online", "donate", "news", "contact", "payresult"];
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
    // 付款結果頁：依綠界回傳參數顯示明確狀態
    if (route === "payresult") renderPayResult();
  }

  window.addEventListener("hashchange", () => showRoute(getRoute()));
  function getRoute() {
    // 綠界導回時會在 hash 後面帶參數（#payresult?RtnCode=1），這裡只取路由部分
    const h = location.hash.replace("#", "").split("?")[0];
    return routes.includes(h) ? h : "home";
  }

  function parseHashQuery() {
    const q = location.hash.split("?")[1] || "";
    return Object.fromEntries(new URLSearchParams(q).entries());
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
    if (!note) return;
    if (!ecpay.enabled) {
      note.textContent = "送出登記後由浩德堂與您聯絡確認付款方式。";
      return;
    }
    // 安全提示已由 .pay-secure 顯示，這裡留白避免重複佔版面
    note.hidden = true;
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
  const paymentList = document.getElementById("paymentList");
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

  /* ---------- 付款方式選擇 ---------- */
  const payMethods = (SITE_CONFIG.PAYMENT_METHODS || []).filter((m) => m && m.id && m.name);

  function renderPayments() {
    if (!paymentList) return;
    if (!payMethods.length) {
      paymentList.innerHTML = '<p class="inline-note">送出登記後由浩德堂與您聯絡確認付款方式。</p>';
      return;
    }
    paymentList.innerHTML = payMethods.map((m, i) => `
      <label class="pay-card${i === 0 ? " checked" : ""}" data-pay="${m.id}">
        <input type="radio" name="payment" id="pay-${m.id}" value="${m.id}"${i === 0 ? " checked" : ""}>
        <span class="pay-body">
          <span class="pay-name">${m.name}</span>
          <span class="pay-desc">${m.desc || ""}</span>
        </span>
      </label>
    `).join("") + `
      <p class="pay-secure">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2"></rect>
          <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
        </svg>
        付款資料由綠界科技處理，本站不會取得或保存您的卡號。
      </p>`;

    paymentList.addEventListener("change", (e) => {
      if (!e.target.matches('input[name="payment"]')) return;
      paymentList.querySelectorAll(".pay-card").forEach((c) => {
        const r = c.querySelector('input[type="radio"]');
        c.classList.toggle("checked", !!(r && r.checked));
      });
    });
  }

  function selectedPayment() {
    const el = paymentList ? paymentList.querySelector('input[name="payment"]:checked') : null;
    return el ? el.value : "";
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

      // 交給後端建立綠界訂單（金額由後端重新計算，前端傳的金額不算數）
      const raw = picked.map((p) => ({
        id: p.item.id,
        units: p.units,
        freeAmount: p.item.type === "free" ? p.amount : undefined
      }));

      const submitBtn = document.getElementById("submitBtn");
      const originalText = submitBtn ? submitBtn.textContent : "";
      const payLabel = payMethods.find((m) => m.id === selectedPayment());
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "處理中…"; }
      if (payCta) {
        const msg = document.getElementById("payCtaMsg");
        if (msg) {
          msg.textContent = payLabel
            ? `正在前往綠界「${payLabel.name}」付款頁，請稍候…`
            : "正在前往綠界支付，請稍候…";
        }
        payCta.hidden = false;
      }

      try {
        const res = await fetch(SITE_CONFIG.ECPAY.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            picked: raw,
            name,
            contact,
            note: noteInput.value.trim(),
            payment: selectedPayment()
          })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          throw new Error(data.message || "建立訂單時發生問題，請稍後再試。");
        }

        // 建立隱藏表單，自動導向綠界付款頁
        goToEcpay(data.action, data.params);
        showToast("訂單已建立，正在前往綠界支付。", "ok");

      } catch (err) {
        if (payCta) payCta.hidden = true;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
        hint.className = "form-hint error";
        hint.textContent = (err && err.message) || "送出時發生問題，請稍後再試，或與浩德堂聯絡。";
        // 本機暫存，避免資料遺失
        saveLocal({
          picked: raw,
          name,
          contact,
          note: noteInput.value.trim(),
          total: totalOf(picked),
          時間: new Date().toISOString()
        });
      }
    });
  }

  /* 建立隱藏表單並自動送出到綠界 */
  let ecpayForm = null;
  function goToEcpay(action, params) {
    if (!action || !params) return;

    if (ecpayForm && ecpayForm.parentNode) ecpayForm.parentNode.removeChild(ecpayForm);

    ecpayForm = document.createElement("form");
    ecpayForm.method = "POST";
    ecpayForm.action = action;
    ecpayForm.style.display = "none";
    ecpayForm.target = "_self";

    Object.keys(params).forEach((k) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = params[k];
      ecpayForm.appendChild(input);
    });

    document.body.appendChild(ecpayForm);

    const manual = document.getElementById("payManualBtn");
    if (manual) manual.onclick = () => ecpayForm.submit();

    ecpayForm.submit();
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
  function makeQr(boxId, imgId, url, size) {
    const box = document.getElementById(boxId);
    const img = document.getElementById(imgId);
    if (!box) return;
    box.innerHTML = "";
    try {
      new QRCode(box, {
        text: url, width: size, height: size,
        colorDark: "#322F2A", colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.M
      });
      box.hidden = false;
      if (img) img.hidden = true;
    } catch (_) {
      box.hidden = true;
      if (img) img.hidden = false;
    }
  }

  function renderQr() {
    if (SHARE.qrCode === false) return;
    if (typeof QRCode === "undefined") return;
    const url = siteRoot() + "/";   // QR Code 固定導向首頁，方便掃描進站

    makeQr("qrBox", "qrImg", url, 184);            // 全站底部分享區
    makeQr("qrBoxLarge", "qrImgLarge", url, 300);  // 放大檢視
    makeQr("qrBoxContact", "qrImgContact", url, 440); // 聯絡頁主據點

    const u = document.getElementById("contactQrUrl");
    if (u) u.textContent = url;
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

    // QR Code 放大（底部分享區 + 聯絡頁主據點）
    const modal = document.getElementById("qrModal");
    const close = document.getElementById("qrClose");
    const modalUrl = document.getElementById("qrModalUrl");

    function openModal() {
      if (!modal) return;
      if (modalUrl) modalUrl.textContent = siteRoot() + "/";
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add("show"));
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove("show");
      setTimeout(() => (modal.hidden = true), 260);
    }

    ["qrZoom", "qrZoomContact"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", openModal);
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(); }
        });
      }
    });

    if (close) close.addEventListener("click", closeModal);
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && !modal.hidden) closeModal();
    });

    // 聯絡頁：複製網站網址
    const copyBtn = document.getElementById("copySiteUrl");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const url = siteRoot() + "/";
        let ok = await copyText(url);
        if (!ok) { window.prompt("請複製以下網址：", url); ok = true; }
        showToast("已複製網站網址，可直接貼上分享。", "ok");
      });
    }
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

  /* ---------- 付款結果頁 ---------- */
  function renderPayResult() {
    const qs = parseHashQuery();
    const title = document.getElementById("payResultTitle");
    const body = document.getElementById("payResultBody");
    const box = document.getElementById("payStatusBox");
    const method = document.getElementById("payResultMethod");
    const grid = document.getElementById("payResultGrid");
    const extra = document.getElementById("payResultExtra");
    const extraGrid = document.getElementById("payExtraGrid");
    const extraNote = document.getElementById("payExtraNote");
    if (!title || !body || !box) return;

    const status = qs.status;
    const rtnCode = String(qs.RtnCode || "");
    const paymentType = qs.PaymentType || "";
    const methodName = formatPaymentType(paymentType);

    // 清除舊狀態樣式
    box.classList.remove("success", "pending", "error");

    if (status === "invalid") {
      box.classList.add("error");
      title.textContent = "交易資料驗證失敗";
      body.textContent = "回傳的付款資料無法通過安全驗證。請不要重新整理此頁，直接回到護持登記重新填寫即可。若您已完成扣款，請保留綠界通知信並聯絡浩德堂。";
      method.textContent = "—";
      if (extra) extra.hidden = true;
      return;
    }

    if (status === "method_not_allowed") {
      box.classList.add("error");
      title.textContent = "無法直接開啟此頁面";
      body.textContent = "付款結果頁面需要由綠界在完成付款後自動帶入。請回到護持登記重新操作。";
      method.textContent = "—";
      if (extra) extra.hidden = true;
      return;
    }

    // 綠界 RtnCode: 1=付款成功, 2=取號成功（ATM/CVS/BARCODE）, 其餘=失敗/取消
    if (rtnCode === "1") {
      box.classList.add("success");
      title.textContent = "付款完成，感謝您的護持";
      body.textContent = "您的善心已記錄。浩德堂會在確認款項後與您聯絡，願這份功德迴向一切有緣眾生。";
    } else if (rtnCode === "2") {
      box.classList.add("pending");
      title.textContent = "繳費資訊已產生";
      body.textContent = "請在期限內完成繳費，此筆護持即會生效。逾期未繳，系統將自動取消。";
    } else if (rtnCode === "0" || !rtnCode) {
      box.classList.add("error");
      title.textContent = "付款尚未完成";
      body.textContent = "您目前尚未完成付款。若改變心意，歡迎再次回到護持登記，我們隨時恭候您的發心。";
    } else {
      box.classList.add("error");
      title.textContent = "交易狀態不明";
      body.textContent = "綠界回傳的狀態碼為：" + (qs.RtnMsg || rtnCode) + "。請回到護持登記重新操作，或聯絡浩德堂協助確認。";
    }

    if (method) method.textContent = methodName || "綠界支付";

    // 基本交易資訊
    const baseItems = [
      ["綠界交易編號", qs.TradeNo],
      ["訂單編號", qs.MerchantTradeNo],
      ["登記金額", qs.TradeAmt ? "NT$ " + Number(qs.TradeAmt).toLocaleString() : ""],
      ["付款時間", qs.PaymentDate]
    ].filter(([_, v]) => v);
    if (grid) grid.innerHTML = baseItems.map(([k, v]) => `<div class="info-item"><span class="info-k">${k}</span><span class="info-v">${v}</span></div>`).join("") +
      `<div class="info-item"><span class="info-k">付款方式</span><span class="info-v">${methodName || "綠界支付"}</span></div>` +
      `<div class="info-item"><span class="info-k">後續承接</span><span class="info-v">由浩德堂確認後聯絡</span></div>`;

    // 取號類付款（ATM / 超商代碼 / 超商條碼）顯示繳費資訊
    if (extra && extraGrid && extraNote) {
      const isCode = rtnCode === "2";
      let extraItems = [];
      let note = "";

      if (qs.vAccount) {
        // ATM 虛擬帳號
        extraItems.push(["銀行代碼", qs.BankCode || ""]);
        extraItems.push(["虛擬帳號", qs.vAccount]);
        extraItems.push(["繳費期限", qs.ExpireDate || ""]);
        note = "請使用網路銀行、ATM 轉帳或臨櫃繳費，帳號逾期將失效。";
      } else if (qs.PaymentNo) {
        // 超商代碼
        extraItems.push(["超商繳費代碼", qs.PaymentNo]);
        extraItems.push(["繳費期限", qs.ExpireDate || ""]);
        note = "請至 7-11、全家、萊爾富、OK 門市多媒體機台輸入代碼列印繳費單。";
      } else if (qs.Barcode1 || qs.Barcode2 || qs.Barcode3) {
        // 超商條碼
        extraItems.push(["超商條碼一", qs.Barcode1 || ""]);
        extraItems.push(["超商條碼二", qs.Barcode2 || ""]);
        extraItems.push(["超商條碼三", qs.Barcode3 || ""]);
        extraItems.push(["繳費期限", qs.ExpireDate || ""]);
        note = "請列印或截圖條碼，至超商櫃檯掃描繳費。";
      }

      if (isCode && extraItems.length) {
        extra.hidden = false;
        extraGrid.innerHTML = extraItems.filter(([_, v]) => v).map(([k, v]) => `<div class="info-item"><span class="info-k">${k}</span><span class="info-v">${v}</span></div>`).join("");
        extraNote.textContent = note;
      } else {
        extra.hidden = true;
      }
    }
  }

  function formatPaymentType(raw) {
    if (!raw) return "";
    if (raw.startsWith("Credit")) return "信用卡";
    if (raw.startsWith("WebATM")) return "WebATM";
    if (raw.startsWith("ATM")) return "ATM 虛擬帳號";
    if (raw.startsWith("CVS")) return "超商代碼";
    if (raw.startsWith("BARCODE")) return "超商條碼";
    if (raw.startsWith("ApplePay")) return "Apple Pay";
    if (raw.startsWith("GooglePay")) return "Google Pay";
    if (raw === "ALL") return "綠界支付";
    return raw;
  }

  /* ---------- 初始化 ---------- */
  bindContact();
  bindPayment();
  renderPayments();
  renderNews();
  bindShare();
  if (form && itemList) refreshForm();
  showRoute(getRoute());
})();

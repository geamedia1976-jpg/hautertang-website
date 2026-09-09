# 浩德堂網站上線檢查清單

正式網址：**https://www.hauterglobal.com/**
上線版本：**第一終極版**（隱藏太素觀 + 收起供瓦片）
產生日期：2026-08-31

> V2（紫微斗數命盤 + 會員福田查詢）**本次不上線**，等你說「更新」再處理。

---

## 一、我已經做好的（你不用動手）

| 項目 | 狀態 | 說明 |
|---|---|---|
| 隱藏太素觀 | ✅ | 導覽列、頁腳、首頁入口卡、緣起頁按鈕、`#page-taisu` 全部加上 `.taisu-only` |
| 收起供瓦片 | ✅ | `lib/items.js` 過濾 `group: "太素觀供養銅瓦"`，前後端同時失效 |
| 舊連結導回首頁 | ✅ | 舊的 `#taisu` 網址自動導回首頁，訪客不會看到空白 |
| 消息過濾 | ✅ | 「太素觀進度」標籤的新聞已過濾 |
| 換新網址 | ✅ | `SITE.url`、`og:url`、`og:image` 全部改成新網域 |
| 重做 QR Code | ✅ | 已實際解碼驗證 → `https://www.hauterglobal.com/` |
| 加 favicon | ✅ | 紅底金字「德」的 inline SVG |
| 綠界回傳網址 | ✅ | `api/_env.js` 加 fallback，忘了設 env 也不會出包 |
| 瀏覽器驗證 | ✅ | 14 項全過（含 V1 那個隱形遮罩的坑） |

Commit：`7753bf3`（尚未推送，等你確認）

### 關於太素觀：是「收起」不是「刪除」

資料都還在，隨時可一鍵恢復：

1. `js/config.js` → `FEATURES.taisu` 改回 `true`
2. `lib/items.js` → `ENABLE_TAISU` 改回 `true`
3. `css/style.css` → 把 `.taisu-only{ display:none !important; }` 這行註解掉
4. `js/main.js` → `routes` 陣列加回 `"taisu"`

---

## 二、需要你給我的東西（只有 1 樣）

### ❶ GitHub Personal Access Token（repo 權限）

舊的 token 已經失效（回傳 401），需要你重新產生一組。

**產生步驟：**

1. 打開 https://github.com/settings/tokens
2. 右上角 `Generate new token` → 選 **Generate new token (classic)**
3. Note 填：`浩德堂網站上線`
4. Expiration 建議選 `90 days` 或 `No expiration`
5. 勾選 **`repo`**（整個區塊打勾即可，會自動包含底下所有細項）
6. 拉到最下面按 `Generate token`
7. **複製那串 `ghp_` 開頭的字串給我**（離開頁面後就看不到囉）

拿到之後我就能推送，Vercel 會自動部署。

> 我已經寫好 `scripts/push-release.sh`，推送前會自動做兩道檢查：
> ① 確認在 `main` 分支（不會誤推 v2-dev）
> ② 確認 `index.html` 沒有 `data-page-node-id` 污染
> 拿到 token 後我跑一行就完成。

---

## 三、需要你在 Cloudflare 做的（DNS 設定）

登入 Cloudflare → 點 `hauterglobal.com` → 左邊 **DNS** → **Records** → `Add record`

### 加這兩筆

| # | Type | Name | Content | Proxy status |
|---|---|---|---|---|
| 1 | `A` | `@` | `76.76.21.21` | **DNS only（灰色雲）** |
| 2 | `CNAME` | `www` | `cname.vercel-dns.com` | **DNS only（灰色雲）** |

TTL 都用 Auto。

> **⚠️ Proxy status 一定要點開改成灰色雲的「DNS only」**
> 預設會是橘色雲（Proxied）。開著的話 Cloudflare 會自己攔下 SSL 驗證，
> Vercel 簽不出 Let's Encrypt 憑證，網域會一直卡在 `Invalid Configuration`。

**為什麼 apex 用 A record 而不是 CNAME？**
`76.76.21.21` 是 Vercel 的 anycast IP，任何 DNS 商都吃；
CNAME 放在 apex 要靠各家支援 CNAME flattening，比較容易出狀況。
`www` 用 CNAME 則是 Vercel 官方建議（走 `cname.vercel-dns.com`，
Vercel 日後調整架構時不用你改記錄）。

> **小技巧：建議先在 Vercel 加網域（第四節），Vercel 會直接列出它要的 DNS 值，
> 再回 Cloudflare 照抄**——比憑記憶填 IP 可靠。

### 順便確認一件事

左邊 **SSL/TLS** → **Overview** → 加密模式選 **Full** 或 **Full (strict)**。
（不要選 Flexible）

### 如果 Cloudflare 已經自動幫你建了記錄

有些情況下 Cloudflare 會自動產生 `www` 的 A record 或其他預設記錄。
**同一個 hostname 不要有兩筆互相衝突的記錄**（例如 www 同時有 A 和 CNAME），
會造成時好時壞。看到多餘的就刪掉。

---

## 四、需要你在 Vercel 做的（綁定網域）

1. 登入 https://vercel.com → 進 `hautertang-website` 專案
2. **Settings** → **Domains**
3. 輸入 `www.hauterglobal.com` → `Add`
   （Vercel 這時會列出它要的 DNS 值，可以先抄下來）
4. 再輸入 `hauterglobal.com` → `Add`
5. Vercel 會自動簽 SSL 憑證（通常 1～5 分鐘）

### 把 www 設為主要網址

在 Domains 列表點 `www.hauterglobal.com` 右邊的 **⋯** → **Set as Primary**。
Vercel 會自動把 `hauterglobal.com` 用 **308 永久轉址**導到 `www`，
這樣網址只有一種版本，對 SEO 和分享都好。

> 順序建議：先在 Vercel 加網域（會拿到確切 DNS 值）→ 再回 Cloudflare 填。

### Vercel 環境變數（**建議設，雙保險**）

**Settings** → **Environment Variables** → 新增：

| Name | Value |
|---|---|
| `SITE_URL` | `https://www.hauterglobal.com` |

> **實測發現（2026-09-09）**：打 `/api/health` 回傳
> `"網站網址":"https://hautertang-website.vercel.app"` —
> 代表 Vercel **目前沒有設 `SITE_URL`**，程式正 fallback 到 Vercel 專案網址。
>
> 我已經在 `api/_env.js` 把 fallback 預設值改成新網域，
> 所以**推送後即使你沒設環境變數也會自動對**。
> 但設了更保險（而且環境變數優先權最高，日後換網址只要改這裡）。

---

## 五、好消息：綠界後台不用動

我檢查過 `api/create-order.js`，綠界的三個網址都是**程式動態組合**的：

```js
const base = env.siteUrl.replace(/\/+$/, "");
returnURL:      `${base}/api/ecpay-notify`   // 綠界通知我們付款結果
orderResultURL: `${base}/api/ecpay-result`   // 付款完成導回
clientBackURL:  `${base}/#donate`            // 取消付款返回
```

沒有寫死舊網址，綠界後台也沒有網址白名單，所以**完全不用改**。

---

## 五點五、目前線上環境實測（2026-09-09 打 `/api/health`）

```json
{
  "ok": true,
  "環境": "正式環境 (production)",
  "綠界端點": "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
  "網站網址": "https://hautertang-website.vercel.app",
  "試算表": "連線正常",
  "簽章演算法": "正常",
  "缺少的環境變數": []
}
```

解讀：

- ✅ 綠界 `MerchantID` / `HashKey` / `HashIV` 都設好了，正式環境
- ✅ Google 試算表連線正常、簽章演算法正常
- ✅ 沒有任何缺少的環境變數
- ⚠️ `網站網址` 是舊的 → `SITE_URL` 沒設（見上一節，我已加 fallback）

**結論：後端現在是健康的，換網域只需要動 DNS + Vercel 綁定，不用改任何憑證。**

---

## 六、DNS 現況（2026-09-09 實測）

```
hauterglobal.com.  SOA  addilyn.ns.cloudflare.com.  ← 已在 Cloudflare ✅
www.hauterglobal.com.   （無任何記錄）              ← 還沒設 ⚠️
```

網域確實已經在 Cloudflare 名下，但 `www` 還沒有 A / CNAME 記錄，
所以第三節那兩筆一定要加。

---

## 七、上線順序（照這個做最順）

```
1. 你給我 GitHub token
      ↓
2. 我推送 → Vercel 自動部署第一終極版
      ↓
3. 你在 Vercel 加兩個網域（先拿到確切 DNS 值）
      ↓
4. 你在 Cloudflare 加 A + CNAME 兩筆（灰色雲）
      ↓
5. 等 5 分鐘 SSL 簽好 → 開 https://www.hauterglobal.com/ 驗收
```

步驟 3 和 4 順序可以互換，先看 Vercel 給的值再填 Cloudflare 最穩。

---

## 八、上線後怎麼驗收

### 先確認 DNS 生效（我可以幫你跑）

```
dig www.hauterglobal.com +short          → 應出現 cname.vercel-dns.com
dig hauterglobal.com A +short            → 應出現 76.76.21.21（或其他 Vercel IP）
```

或者開 https://dnschecker.org 輸入 `www.hauterglobal.com` 看全球是否都生效。

### 然後開 https://www.hauterglobal.com/ 檢查這 8 項

- [ ] 網址列出現 🔒 鎖頭（SSL 正常）
- [ ] 導覽列**沒有**「太素觀」
- [ ] 隨喜護持只看到：禮敬上香、供花、供果（**沒有銅瓦**）
- [ ] 最新消息只有：共修公告、節日祈福、特別公告
- [ ] 開 https://www.hauterglobal.com/#taisu → 自動回到首頁
- [ ] 開 https://hauterglobal.com/（不加 www）→ 自動跳到 www
- [ ] 手機開也正常
- [ ]（選測）走一次小額登記，確認綠界付款頁開得出來、付完導得回來

---

## 九、如果出問題

| 狀況 | 原因 | 解法 |
|---|---|---|
| 網址打不開 | DNS 還沒生效 | 等 10～30 分鐘；用 https://dnschecker.org 查 |
| 無限轉址 / 一直轉圈 | Cloudflare 開了橘色雲 | 改回灰色雲 DNS only |
| SSL 憑證一直簽不過 | 同上 | 同上，或先移除網域再重加 |
| 網站是舊版（有太素觀） | Vercel 還沒部署完 | 去 Vercel → Deployments 看狀態 |
| 付完款導回舊網址 | `SITE_URL` 沒設 | 設環境變數後 **Redeploy** |

---

## 附錄：本次異動檔案

```
index.html                    51 行變更（太素觀收起 + 換網址 + favicon）
js/config.js                  SITE.url → 新網域，新增 FEATURES.taisu 開關
js/main.js                    routes 移除 taisu
js/news.js                    依 FEATURES.taisu 過濾消息
lib/items.js                  過濾「太素觀供養銅瓦」群組
css/style.css                 .taisu-only 隱藏規則 + 按鈕間距
api/_env.js                   SITE_URL fallback 改新網域
assets/images/site-qr.png     重做為新網址 QR（已解碼驗證）
```

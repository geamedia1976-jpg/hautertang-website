/* =========================================================
   最新消息 資料
   後續可直接在此陣列新增 / 修改真實消息。
   欄位：date 日期、tag 分類、title 標題、body 內文
   tag 建議：共修公告 / 太素觀進度 / 節日祈福 / 特別公告
   ========================================================= */

const NEWS_DATA_ALL = [
  {
    date: "",
    tag: "共修公告",
    title: "本月共修通知",
    body: "共修日期、時間、方式與注意事項，將於確定後公告。"
  },
  {
    date: "",
    tag: "太素觀進度",
    title: "太素觀最新現況",
    body: "結構、工程、空間整備與現況照片，將陸續更新。"
  },
  {
    date: "",
    tag: "節日祈福",
    title: "節日祈福安排",
    body: "特定節日、法會、祈福與迴向安排，將於適時公告。"
  },
  {
    date: "",
    tag: "特別公告",
    title: "特別公告",
    body: "網站更新、特別公告、重要說明與承接訊息，將於適時公告。"
  }
];

/* 太素觀暫時收起（2026-09）：一併隱藏「太素觀進度」分類的消息。
   恢復方式：js/config.js 的 FEATURES.taisu 改回 true 即可，本檔不用動。
   （config.js 在本檔之前載入，所以這裡讀得到 SITE_CONFIG） */
const NEWS_DATA = (typeof SITE_CONFIG !== "undefined" &&
                   SITE_CONFIG.FEATURES &&
                   SITE_CONFIG.FEATURES.taisu)
  ? NEWS_DATA_ALL
  : NEWS_DATA_ALL.filter((n) => n.tag !== "太素觀進度");

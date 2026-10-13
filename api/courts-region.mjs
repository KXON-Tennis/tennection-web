// /courts/tw            —— 台灣各縣市的網球場（總覽）
// /courts/tw/<縣市>     —— 一個縣市的網球場清單，每座連到 /courts/<id>
//
// 為什麼要有這兩頁：球場頁只有 sitemap 一條路進得去。Google 在 Search Console
// 裡回報 853 頁「已找到 - 目前尚未建立索引」——知道網址，但沒有排到去讀，因為
// 站內沒有任何一般連結指向它們（公開地圖是 JavaScript 畫的，爬蟲不會點）。
// 首頁 → 縣市總覽 → 縣市頁 → 球場頁，是爬蟲順著讀得下去的路；「台中 網球場」
// 這類搜尋量大得多的字，縣市頁本身也接得住。
//
// 收錄跟球場頁同一個規則（isIndexable）：清單上只放會被收錄的球場，所以這裡
// 連過去的每一頁都不會自己說「別收我」。

import {
  ACCESS, APP_STORE_URL, SITE, SURFACES, VENUE_KINDS, escapeHtml as h,
  isIndexable, rest,
} from "./_lib/courts.mjs";

// 北到南、本島在前離島在後——使用者找自己的縣市時的順序，不是筆畫也不是數量。
const TW_ORDER = [
  "基隆市", "台北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
  "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "台南市",
  "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣", "澎湖縣", "金門縣", "連江縣",
];

export const regionUrl = (city) =>
  city ? `${SITE}/courts/tw/${encodeURIComponent(city)}` : `${SITE}/courts/tw`;

async function twCourts() {
  const PAGE = 1000;
  let all = [], after = 0;
  for (;;) {
    const rows = await rest(
      `courts_with_status?select=id,name,country,city,venue_kind,surface_code,court_count,light,is_indoor,access` +
      `&country=eq.TW&lat=not.is.null&lng=not.is.null&id=gt.${after}&order=id.asc&limit=${PAGE}`);
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    after = rows[rows.length - 1].id;
  }
  return all.filter(isIndexable);
}

function shell({ title, desc, canonical, crumbs, body }) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${h(title)}</title>
  <meta name="description" content="${h(desc)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${h(title)}" />
  <meta property="og:description" content="${h(desc)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${SITE}/share-court.jpg" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/styles.css" />
  <style>
    .region { max-width: 760px; width: 100%; min-width: 0; box-sizing: border-box;
              margin: 0 auto; padding: 24px 20px 48px; }
    .crumbs { font-size: 13px; color: var(--text-tertiary); margin-bottom: 10px; }
    .crumbs a { color: var(--text-tertiary); }
    .region h1 { font-size: 28px; line-height: 1.3; margin: 0 0 6px; }
    .region .lead { color: var(--text-secondary); margin: 0 0 18px; }
    .cities { list-style: none; margin: 0; padding: 0; display: grid;
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    .cities a { display: flex; justify-content: space-between; align-items: baseline;
                padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px;
                background: var(--surface); text-decoration: none; color: var(--text-primary); }
    .cities b { font-weight: 700; }
    .cities span { color: var(--text-tertiary); font-size: 14px; }
    .list { list-style: none; margin: 0; padding: 0; background: var(--surface);
            border: 1px solid var(--border); border-radius: 14px; }
    .list li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px;
               padding: 11px 16px; }
    .list li + li { border-top: 1px solid var(--border); }
    .list .meta { color: var(--text-tertiary); font-size: 14px; }
    .others { margin-top: 22px; font-size: 14px; color: var(--text-secondary); }
    .others a { margin-right: 10px; white-space: nowrap; }
    .app { margin-top: 22px; padding: 16px 18px; border-radius: 14px;
           background: var(--tint); border: 1px solid var(--accent-soft); }
    .app p { margin: 0 0 8px; color: var(--text-secondary); }
  </style>
</head>
<body>
  <header class="site-header">
    <a href="/" class="brand-link">
      <img src="/wordmark-glow.png" alt="Tennis Nut" class="brand-wordmark" />
    </a>
    <nav>
      <a href="${APP_STORE_URL}" target="_blank" rel="noopener">下載</a>
      <a href="/courts-map">球場地圖</a>
      <a href="/blog">Blog</a>
    </nav>
  </header>
  <main class="region">
    <div class="crumbs">${crumbs}</div>
    ${body}
    <div class="app">
      <p>在 Tennis Nut 打卡、回報場況、看誰常在同一座球場打球。</p>
      <a href="${APP_STORE_URL}" target="_blank" rel="noopener">從 App Store 下載</a> ·
      <a href="/install">Android：加入 Google Play 測試</a>
    </div>
  </main>
  <footer>
    <div class="footer-inner">
      <div class="footer-text">
        <a href="/blog">Blog</a>·
        <a href="/privacy">隱私權政策</a>·
        <a href="/terms">服務條款</a>
        <div style="margin-top: 12px;">© 2026 Tennis Nut · KXON</div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function meta(c) {
  return [
    VENUE_KINDS[c.venue_kind] || SURFACES[c.surface_code],
    c.court_count ? `${c.court_count} 面` : null,
    c.light ? "夜間照明" : null,
    c.is_indoor ? "室內" : null,
    ACCESS[c.access],
  ].filter(Boolean).join(" · ");
}

function overview(courts) {
  const count = new Map();
  for (const c of courts) if (c.city) count.set(c.city, (count.get(c.city) || 0) + 1);
  const cities = TW_ORDER.filter((x) => count.has(x))
    .concat([...count.keys()].filter((x) => !TW_ORDER.includes(x)));
  const total = courts.length;
  return shell({
    title: "台灣網球場 · 各縣市網球場一覽 · Tennis Nut",
    desc: `台灣 ${cities.length} 個縣市、${total} 座網球場：材質、場地數、夜間照明、免費或付費，` +
      `以及球友回報的即時場況。`,
    canonical: regionUrl(),
    crumbs: `<a href="/courts-map">球場地圖</a> › 台灣`,
    body: `<h1>台灣的網球場</h1>
    <p class="lead">${cities.length} 個縣市、${total} 座網球場。點進縣市，看每一座球場的材質、場地數和即時場況。</p>
    <ul class="cities">${cities.map((x) =>
      `<li><a href="/courts/tw/${encodeURIComponent(x)}"><b>${h(x)}</b><span>${count.get(x)} 座</span></a></li>`).join("")}</ul>`,
  });
}

function cityPage(city, courts, allCities) {
  const list = courts
    .filter((c) => c.city === city)
    .sort((a, b) => (b.court_count || 0) - (a.court_count || 0) || a.name.localeCompare(b.name, "zh-Hant"));
  const free = list.filter((c) => c.access === "free").length;
  const lit = list.filter((c) => c.light).length;
  const facts = [free ? `${free} 座免費開放` : null, lit ? `${lit} 座有夜間照明` : null]
    .filter(Boolean).join("、");
  return shell({
    title: `${city}網球場 · ${list.length} 座 · Tennis Nut`,
    desc: `${city}的 ${list.length} 座網球場${facts ? `（${facts}）` : ""}：` +
      `材質、場地數、開放方式，以及球友回報的即時場況。`,
    canonical: regionUrl(city),
    crumbs: `<a href="/courts-map">球場地圖</a> › <a href="/courts/tw">台灣</a> › ${h(city)}`,
    body: `<h1>${h(city)}的網球場</h1>
    <p class="lead">${list.length} 座${facts ? `，其中 ${facts}` : ""}。資料由球友在現場確認與補充。</p>
    <ul class="list">${list.map((c) =>
      `<li><a href="/courts/${c.id}">${h(c.name)}</a><span class="meta">${h(meta(c))}</span></li>`).join("")}</ul>
    <p class="others">其他縣市：${allCities.filter((x) => x !== city).map((x) =>
      `<a href="/courts/tw/${encodeURIComponent(x)}">${h(x)}</a>`).join("")}</p>`,
  });
}

export default async function handler(req, res) {
  const city = req.query.city ? decodeURIComponent(String(req.query.city)) : null;
  let courts;
  try {
    courts = await twCourts();
  } catch {
    res.statusCode = 503;
    res.setHeader("Cache-Control", "no-store");
    return res.end("暫時讀不到球場資料，請稍後再試。");
  }
  const cities = TW_ORDER.filter((x) => courts.some((c) => c.city === x));
  let html;
  if (!city) {
    html = overview(courts);
  } else if (!courts.some((c) => c.city === city)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.end(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" />
<meta name="robots" content="noindex" /><title>找不到這個縣市 · Tennis Nut</title>
<link rel="stylesheet" href="/styles.css" /></head><body>
<main style="max-width:680px;margin:0 auto;padding:48px 20px">
<h1>找不到這個縣市</h1><p>看看 <a href="/courts/tw">台灣各縣市的網球場</a>。</p></main></body></html>`);
  } else {
    html = cityPage(city, courts, cities);
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // 清單一天變不了幾次（新球場要核可），一小時的快取夠新。
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.end(html);
}

// /courts/<id> —— 一座球場一頁，給搜尋引擎和 AI 讀。
//
// 為什麼在伺服器端組 HTML，而不是像 courts-map 一樣在瀏覽器裡抓資料：
// 爬蟲和 AI 讀的是回應本身，一頁要等 JavaScript 跑完才有內容，對它們來說
// 就是空白頁。場況、封閉期間又會變，所以也不在部署時烤成檔案——CDN 快取
// 十分鐘，過期的先回舊的、背景再更新。
//
// 頁面的分工：資訊在這裡給足（地址、材質、場況、封閉期間），App 給的是
// 網頁做不到的行動——打卡、回報、封場通知。不吹噓，只傳資訊。

import {
  APP_STORE_ID, APP_STORE_URL, ACCESS, CLOSURE_KINDS, COND, HIT_FORMATS,
  SURFACES, VENUE_KINDS, condEntries, courtUrl, distanceM, escapeHtml as h,
  isIndexable, isPlaceholderName, rest, rpcOr, statusFresh,
} from "./_lib/courts.mjs";

const COURT_FIELDS = [
  "id", "name", "name_en", "city", "country", "address", "lat", "lng",
  "surface_code", "venue_kind", "court_count", "light", "is_indoor", "access",
  "status_light", "status_text", "status_counts", "last_reported_at",
  "community_verify_count", "is_verified", "hours_text", "opening_notes",
  "pricing_note", "rental", "tel", "website", "booking_url",
].join(",");

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function ago(iso, now) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  return `${Math.floor(mins / 60)} 小時前`;
}

// starts_on / ends_on 是日期，不是時刻——當成 UTC 午夜讀，才不會被時區推前一天。
function day(ymd) {
  const d = new Date(ymd + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAYS[d.getUTCDay()]}）`;
}

function hitWhen(iso) {
  const parts = new Intl.DateTimeFormat("zh-Hant", {
    timeZone: "Asia/Taipei", month: "numeric", day: "numeric",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
  return parts;
}

function kindLabel(c) {
  if (VENUE_KINDS[c.venue_kind]) return VENUE_KINDS[c.venue_kind];
  return "網球場";
}

function factsList(c) {
  const facts = [];
  if (c.venue_kind === "court" || !c.venue_kind) {
    const s = SURFACES[c.surface_code];
    facts.push(["材質", s || "尚未標示"]);
  }
  if (c.court_count) facts.push(["場地數", `${c.court_count} 面`]);
  if (c.light != null) facts.push(["夜間照明", c.light ? "有" : "沒有"]);
  if (c.is_indoor) facts.push(["室內", "是"]);
  if (ACCESS[c.access]) facts.push(["開放方式", ACCESS[c.access]]);
  if (c.hours_text) facts.push(["開放時間", c.hours_text]);
  if (c.pricing_note) facts.push(["費用", c.pricing_note]);
  if (c.rental === "yes") facts.push(["租借", "可租借"]);
  if (c.rental === "no") facts.push(["租借", "不開放租借"]);
  if (c.opening_notes) facts.push(["備註", c.opening_notes]);
  return facts;
}

function jsonLd(c, url) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: c.name,
    url,
    sport: "Tennis",
    geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
  };
  if (c.name_en && c.name_en !== c.name) ld.alternateName = c.name_en;
  if (c.address || c.city) {
    ld.address = { "@type": "PostalAddress", addressCountry: c.country };
    if (c.address) ld.address.streetAddress = c.address;
    if (c.city) ld.address.addressLocality = c.city;
  }
  if (c.tel) ld.telephone = c.tel;
  if (c.website) ld.sameAs = c.website;
  if (c.access === "free") ld.isAccessibleForFree = true;
  if (c.access === "paid") ld.isAccessibleForFree = false;
  const amen = [];
  if (c.court_count) amen.push(["球場數", c.court_count]);
  if (c.light != null) amen.push(["夜間照明", !!c.light]);
  if (c.is_indoor != null) amen.push(["室內", !!c.is_indoor]);
  if (SURFACES[c.surface_code]) amen.push(["材質", SURFACES[c.surface_code]]);
  if (amen.length) {
    ld.amenityFeature = amen.map(([name, value]) =>
      ({ "@type": "LocationFeatureSpecification", name, value }));
  }
  // </script> 不能出現在 JSON 裡面，否則會提前結束這個 script 區塊。
  return JSON.stringify(ld).replace(/</g, "\\u003c");
}

function describe(c) {
  const bits = [];
  if (c.address) bits.push(c.address);
  else if (c.city) bits.push(c.city);
  const s = SURFACES[c.surface_code];
  const spec = [s, c.court_count ? `${c.court_count} 面` : null].filter(Boolean).join(" ");
  if (spec) bits.push(spec);
  if (c.light) bits.push("有夜間照明");
  return `${c.name}：${bits.join("，")}。即時場況與封閉期間由在現場的球友回報。`;
}

function page({ c, now, closures, hits, parking, live, nearby, players }) {
  const url = courtUrl(c.id);
  const indexable = isIndexable(c);
  const kind = kindLabel(c);
  const place = `${c.city || ""}${kind}`;
  const title = `${c.name} · ${place} · Tennis Nut`;
  const desc = describe(c);

  // ── 現在 ──
  const fresh = statusFresh(c.status_light, c.last_reported_at, now);
  const entries = fresh ? condEntries(c.status_counts) : [];
  let statusHtml;
  if (entries.length || (fresh && c.status_text)) {
    const body = entries.length
      ? entries.map(([k, v]) =>
          `<span class="cond ${COND[k]?.light || "green"}">${h(COND[k]?.label || k)}` +
          ` <b>${v}</b> 人回報</span>`).join("")
      : `<span class="cond ${h(c.status_light || "green")}">${h(c.status_text)}</span>`;
    statusHtml = `<div class="conds">${body}</div>` +
      `<p class="when">${h(ago(c.last_reported_at, now))}更新</p>`;
  } else {
    statusHtml = `<p class="quiet">目前沒有即時場況。</p>` +
      `<p class="nudge">人在場上嗎？在 Tennis Nut 回報現在的狀況（可使用、客滿、溼滑），` +
      `下一個要來的人就知道。</p>`;
  }
  const liveHtml = live && live.playing_now > 0
    ? `<p class="live"><span class="pulse"></span>現在 ${live.playing_now} 人在這裡打球</p>`
    : "";

  // ── 封閉期間 ──
  const upcoming = closures
    .filter((x) => x.status !== "rejected" && new Date(x.ends_at).getTime() > now)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  const closureHtml = upcoming.length
    ? `<ul class="closures">` + upcoming.map((x) => {
        const range = x.starts_on === x.ends_on
          ? day(x.starts_on) : `${day(x.starts_on)} – ${day(x.ends_on)}`;
        const pending = x.status === "confirmed" ? "" : `<span class="pending">球友回報，待確認</span>`;
        return `<li><div class="cl-head"><span class="cl-kind">${h(CLOSURE_KINDS[x.kind] || x.kind)}</span>` +
          `<span class="cl-range">${h(range)}</span>${pending}</div>` +
          (x.note ? `<p>${h(x.note)}</p>` : "") + `</li>`;
      }).join("") + `</ul>`
    : `<p class="quiet">目前沒有已知的封閉期間。</p>`;

  // ── 約球 ──
  const hitsHtml = hits.length
    ? `<section><h2>有人約在這裡</h2><ul class="hits">` + hits.slice(0, 3).map((x) => {
        const n = x.capacity ? `${x.participant_count || 0}/${x.capacity} 人`
                             : `${x.participant_count || 0} 人要去`;
        return `<li><span class="dt">${h(hitWhen(x.starts_at))}</span>` +
          `<span class="meta">${h(HIT_FORMATS[x.format] || x.format || "")}` +
          (x.beginners_welcome ? " · 新手可" : "") + `</span><span class="n">${h(n)}</span></li>`;
      }).join("") + `</ul><p class="nudge">用 Tennis Nut 就能報名參加。</p></section>`
    : "";

  // ── 資訊 ──
  const facts = factsList(c);
  const factsHtml = `<dl class="facts">` + facts.map(([k, v]) =>
    `<dt>${h(k)}</dt><dd>${h(v)}</dd>`).join("") + `</dl>`;
  const verify = c.community_verify_count > 0
    ? `<p class="verified">✓ ${c.community_verify_count} 位球友在現場確認過這些資料</p>` : "";

  const contact = [];
  if (c.tel) contact.push(`<a href="tel:${h(c.tel.replace(/[^\d+]/g, ""))}">電話 ${h(c.tel)}</a>`);
  if (c.website) contact.push(`<a href="${h(c.website)}" target="_blank" rel="noopener nofollow">官網</a>`);
  if (c.booking_url) contact.push(`<a href="${h(c.booking_url)}" target="_blank" rel="noopener nofollow">線上預約</a>`);

  const parkHtml = parking.length
    ? `<section><h2>附近停車</h2><ul class="plain">` + parking.map((p) =>
        `<li>${h(p.name || "停車場")} · 步行約 ${Math.max(1, Math.round(p.distance_m / 80))} 分鐘</li>`
      ).join("") + `</ul></section>`
    : "";

  const nearbyHtml = nearby.length
    ? `<section><h2>附近的球場</h2><ul class="nearby">` + nearby.map((n) => {
        const meta = [VENUE_KINDS[n.venue_kind] || SURFACES[n.surface_code], n.court_count ? `${n.court_count} 面` : null,
                      n.d < 1000 ? `${Math.round(n.d / 10) * 10} 公尺` : `${(n.d / 1000).toFixed(1)} 公里`]
          .filter(Boolean).join(" · ");
        return `<li><a href="/courts/${n.id}">${h(n.name)}</a><span>${h(meta)}</span></li>`;
      }).join("") + `</ul></section>`
    : "";

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${h(title)}</title>
  <meta name="description" content="${h(desc)}" />
  ${indexable ? "" : `<meta name="robots" content="noindex" />`}
  <meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="place" />
  <meta property="og:title" content="${h(c.name)} · Tennis Nut" />
  <meta property="og:description" content="${h(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://tennisnut.kxon.net/share-court.jpg" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/styles.css" />
  <script type="application/ld+json">${jsonLd(c, url)}</script>
  <style>
    .court { max-width: 680px; margin: 0 auto; padding: 24px 20px 48px; }
    .crumbs { font-size: 13px; color: var(--text-tertiary); margin-bottom: 10px; }
    .crumbs a { color: var(--text-tertiary); }
    .court h1 { font-size: 28px; line-height: 1.3; margin: 0 0 4px; }
    .court .en { color: var(--text-tertiary); margin: 0 0 6px; font-size: 15px; }
    .court .addr { color: var(--text-secondary); margin: 0 0 14px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 8px; }
    .actions a { display: inline-block; padding: 7px 14px; border-radius: 999px;
                 border: 1px solid var(--border); background: var(--surface);
                 font-size: 14px; text-decoration: none; }
    .court section { background: var(--surface); border: 1px solid var(--border);
                     border-radius: 14px; padding: 16px 18px; margin-top: 14px; }
    .court h2 { font-size: 15px; margin: 0 0 10px; color: var(--text-primary); }
    .quiet { color: var(--text-tertiary); margin: 0; }
    .nudge { color: var(--text-secondary); font-size: 14px; margin: 8px 0 0; }
    .when { color: var(--text-tertiary); font-size: 13px; margin: 8px 0 0; }
    .conds { display: flex; flex-wrap: wrap; gap: 6px; }
    .cond { padding: 4px 10px; border-radius: 999px; font-size: 14px; background: var(--tint); }
    .cond.yellow { background: #FFF4D6; color: #7A5A00; }
    .cond.red { background: #FDE4E1; color: #9A2B1E; }
    .live { margin: 0 0 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .pulse { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); }
    .facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; }
    .facts dt { color: var(--text-tertiary); }
    .facts dd { margin: 0; color: var(--text-primary); white-space: pre-line; }
    .verified { color: var(--accent-d); font-size: 14px; margin: 12px 0 0; }
    .players { color: var(--accent-d); font-weight: 600; margin: -6px 0 14px; }
    .closures, .hits, .plain, .nearby { list-style: none; margin: 0; padding: 0; }
    .closures li + li, .hits li + li, .nearby li + li { border-top: 1px solid var(--border);
                                                        margin-top: 10px; padding-top: 10px; }
    .cl-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
    .cl-kind { font-weight: 700; color: #9A2B1E; }
    .pending { font-size: 12px; color: var(--text-tertiary); }
    .closures p { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .hits li { display: flex; flex-wrap: wrap; gap: 4px 12px; }
    .hits .dt { font-weight: 600; }
    .hits .meta { color: var(--text-secondary); }
    .hits .n { margin-left: auto; color: var(--text-tertiary); }
    .plain li { color: var(--text-secondary); margin: 4px 0; }
    .nearby li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; }
    .nearby span { color: var(--text-tertiary); font-size: 14px; }
    .app { background: var(--tint) !important; border-color: var(--accent-soft) !important; }
    .app p { margin: 0 0 10px; color: var(--text-secondary); }
    .app .badge img { display: block; height: 46px; width: auto; }
    .app .android { font-size: 14px; margin-top: 10px; }
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

  <main class="court">
    <div class="crumbs"><a href="/courts-map">球場地圖</a>${c.city ? ` › ${h(c.city)}` : ""}</div>
    <h1>${h(c.name)}</h1>
    ${c.name_en && c.name_en !== c.name && !isPlaceholderName(c.name_en) ? `<p class="en">${h(c.name_en)}</p>` : ""}
    <p class="addr">${h(c.address || c.city || "")}</p>
    ${players > 0 ? `<p class="players">${players} 位球友在這裡打過球</p>` : ""}
    <div class="actions">
      <a href="${navUrl}" target="_blank" rel="noopener">導航</a>
      <a href="/courts-map?court=${c.id}">在地圖上看</a>
      ${contact.join("\n      ")}
    </div>

    <section>
      <h2>現在的場況</h2>
      ${liveHtml}
      ${statusHtml}
    </section>

    <section>
      <h2>封閉期間</h2>
      ${closureHtml}
      <p class="nudge">在 Tennis Nut 把這座球場加入最愛，有封場或比賽時會通知你。</p>
    </section>

    ${hitsHtml}

    <section>
      <h2>球場資訊</h2>
      ${factsHtml}
      ${verify}
    </section>

    ${parkHtml}

    <section class="app">
      <h2>在這裡打卡，看見更多球友與即時場況</h2>
      <p>${players > 0
        ? `已經有 ${players} 位球友在這裡打卡。`
        : "還沒有人在這裡打卡過。"}用 Tennis Nut 在這座球場打卡，記下這一場；之後就看得到還有誰常在這裡打球。把它加入最愛，有人回報場況或封場時會通知你。</p>
      <a class="badge" href="${APP_STORE_URL}" target="_blank" rel="noopener" aria-label="從 App Store 下載 Tennis Nut">
        <img src="/app-store-badge-zh-tw.svg" alt="從 App Store 下載" width="138" height="46" />
      </a>
      <p class="android">Android：<a href="/install">加入 Google Play 測試</a></p>
    </section>

    ${nearbyHtml}
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

function notFound(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300");
  res.end(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" /><title>找不到這座球場 · Tennis Nut</title>
<link rel="stylesheet" href="/styles.css" /></head><body>
<main style="max-width:680px;margin:0 auto;padding:48px 20px">
<h1>找不到這座球場</h1><p>它可能已經被標記為廢棄。到 <a href="/courts-map">球場地圖</a> 找附近的球場。</p>
</main></body></html>`);
}

export default async function handler(req, res) {
  const id = Number.parseInt(String(req.query.id || ""), 10);
  if (!Number.isFinite(id) || id <= 0) return notFound(res);

  let c;
  try {
    // 從 view 讀：廢棄的球場在這裡就被濾掉了，跟 App 和地圖看到的是同一份。
    const rows = await rest(`courts_with_status?id=eq.${id}&select=${COURT_FIELDS}`);
    c = rows[0];
  } catch (e) {
    res.statusCode = 503;
    res.setHeader("Cache-Control", "no-store");
    return res.end("暫時讀不到球場資料，請稍後再試。");
  }
  if (!c || c.lat == null || c.lng == null) return notFound(res);

  const box = 0.03; // 約 3 公里見方
  const [closures, hits, parking, live, around, footprints] = await Promise.all([
    rpcOr("court_closures_for", { p_court_ids: [id] }, []),
    rpcOr("public_hits_at_court", { p_court_id: id }, []),
    rest(`court_parking?court_id=eq.${id}&select=name,distance_m&order=rank&limit=3`).catch(() => []),
    rpcOr("court_live_activity", { p_court_id: id }, []),
    rest(`courts_with_status?select=id,name,venue_kind,surface_code,court_count,lat,lng` +
         `&lat=gte.${c.lat - box}&lat=lte.${c.lat + box}` +
         `&lng=gte.${c.lng - box}&lng=lte.${c.lng + box}&id=neq.${id}&limit=200`).catch(() => []),
    // 只有總數，說不出任何人是誰（20261004191116 開給 anon）。
    rpcOr("court_footprint_count", { p_court_id: id }, []),
  ]);

  const nearby = around
    .map((n) => ({ ...n, d: distanceM(c.lat, c.lng, n.lat, n.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  const html = page({
    c, now: Date.now(),
    closures: Array.isArray(closures) ? closures : [],
    hits: Array.isArray(hits) ? hits : [],
    parking: Array.isArray(parking) ? parking : [],
    live: Array.isArray(live) ? live[0] : null,
    nearby,
    players: Array.isArray(footprints) ? (footprints[0]?.total ?? 0) : 0,
  });

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // 十分鐘內的請求共用一份；過期後先回舊的、背景重組。場況的有效期是兩小時，
  // 十分鐘的落差不改變它說的事。
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  res.end(html);
}

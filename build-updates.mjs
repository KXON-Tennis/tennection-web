#!/usr/bin/env node
/*
  updates.json → /blog (索引) + /blog/<build> (每一版一頁)。
  無依賴，node build-updates.mjs 就跑得動；`npm run ship` 會先跑一次。

  為什麼每版一個檔而不是單頁加錨點：這些網址的用途是貼進 LINE 群，LINE 讀的是
  該網址的 og: meta。錨點共用同一組 meta，貼哪一版預覽卡都長一樣；一版一頁才能
  讓卡片標題就是那一版的標題。

  生成的 HTML 也要進 git —— 這站沒有 build step，Vercel 直接吃 repo 裡的靜態檔。

  英文版：release 裡有 `en` 物件的才會多產一份 /en/blog/<build>，索引 /en/blog
  也只列那幾版。刻意不機器翻譯其餘幾版——一篇看不懂的英文比沒有英文更糟，而
  且舊版更新對新的英文使用者沒有意義。兩邊互相掛 hreflang。
*/

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://tennisnut.kxon.net';

const { releases, guides } = JSON.parse(
  readFileSync(join(ROOT, 'updates.json'), 'utf8')
);
if (!releases?.length) throw new Error('updates.json 裡沒有任何 release');

// 兩個語系的差別只有字串與網址前綴；版面、CSS、資料來源都同一份。
const L = {
  zh: {
    lang: 'zh-Hant',
    home: '/',
    blog: '/blog',
    rel: (b) => `/blog/${b}`,
    nav: { download: '下載', install: '安裝', blog: 'Blog', privacy: '隱私權', terms: '服務條款', other: 'EN', otherHref: '/en/blog' },
    back: '← 所有更新',
    verLine: (r, d) => `版本 ${r.version} · Build ${r.build} · ${d}`,
    otherFixes: '其他修正',
    howTo: '<b>怎麼更新？</b> Android 走 Google Play 會自動更新；iPhone 從 App Store 更新即可。還沒裝的話，iPhone 從 <a href="https://apps.apple.com/app/id6761720650" target="_blank" rel="noopener">App Store</a> 下載。',
    foot: '用起來怪怪的？<a class="line-inline" href="https://line.me/R/ti/p/@tennisnut" target="_blank" rel="noopener">在 LINE 🌰</a> 說一聲，或寄信到 <a href="mailto:kaysoncho@gmail.com">kaysoncho@gmail.com</a>。',
    footer: { blog: 'Blog', privacy: '隱私權政策', terms: '服務條款', contact: '聯絡我們' },
    idxTitle: 'Blog',
    idxSection: '版本更新紀錄',
    idxGuides: '功能介紹',
    latestBadge: '最新版本',
    metaIdxTitle: '最新情報 · Tennis Nut',
    metaIdxDesc: (r) => `Tennis Nut 的版本更新與功能介紹。最新版 ${r.version}：${r.summary}`,
  },
  en: {
    lang: 'en',
    home: '/en',
    blog: '/en/blog',
    rel: (b) => `/en/blog/${b}`,
    nav: { download: 'Get the app', install: 'Install', blog: 'Blog', privacy: 'Privacy', terms: 'Terms', other: '中文', otherHref: '/blog' },
    back: '← All updates',
    verLine: (r, d) => `Version ${r.version} · Build ${r.build} · ${d}`,
    otherFixes: 'Also fixed',
    howTo: '<b>How do I update?</b> Android updates itself through Google Play; on iPhone, update from the App Store. Not installed yet? Get it on the <a href="https://apps.apple.com/app/id6761720650" target="_blank" rel="noopener">App Store</a>.',
    foot: 'Something behaving oddly? Email <a href="mailto:kaysoncho@gmail.com">kaysoncho@gmail.com</a> — a screenshot or a screen recording helps a lot.',
    footer: { blog: 'Blog', privacy: 'Privacy policy', terms: 'Terms', contact: 'Contact us' },
    idxTitle: 'Blog',
    idxSection: 'Release notes',
    idxGuides: 'Feature guides',
    latestBadge: 'Latest release',
    metaIdxTitle: 'What\u2019s new · Tennis Nut',
    metaIdxDesc: (r) => `Release notes for Tennis Nut. Latest ${r.version}: ${r.summary}`,
  },
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 這站的樣式是 styles.css 加每頁自己的 <style>；這裡是更新頁那一份。
const PAGE_CSS = `
    h1 { font-family: "Sora", -apple-system, sans-serif; font-size: 30px; line-height: 1.3; margin: 8px 0 12px; }
    .rel-back { display: inline-block; font-size: 14px; color: var(--text-tertiary); margin-bottom: 16px; }
    .rel-lead { font-size: 18px; color: var(--text-secondary); margin: 0 0 32px; }
    .hl { display: flex; gap: 14px; align-items: flex-start; background: var(--surface);
          border: 1px solid var(--border); border-radius: 14px; padding: 18px 18px 14px; margin-bottom: 14px; }
    .hl-emoji { font-size: 22px; line-height: 1.4; flex-shrink: 0; }
    .hl-body h2 { font-size: 17px; margin: 0 0 6px; }
    .hl-body p { margin: 0; color: var(--text-secondary); font-size: 15px; }
    .hl-shot { margin: 14px 0 2px; }
    .hl-shot img { display: block; width: 100%; max-width: 300px; height: auto;
                   border-radius: 12px; }
    .hl-shot figcaption { font-size: 13px; color: var(--text-tertiary); margin-top: 6px; }
    .guide-h { font-size: 19px; margin: 34px 0 2px; padding-top: 4px; }
    .guide-h + .meta { margin-top: 0; }
    .fixes { margin: 28px 0 8px; }
    .fixes h2 { font-size: 15px; color: var(--text-tertiary); font-weight: 600; margin: 0 0 8px; }
    .fixes ul { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 15px; }
    .fixes li { margin-bottom: 4px; }
    .callout { background: var(--tint); border: 1px solid var(--accent-soft); border-radius: 14px;
               padding: 14px 16px; font-size: 15px; margin: 28px 0 0; }
    .rel-nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 28px; font-size: 14px; }
    .guide-foot { margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border);
                  font-size: 14px; color: var(--text-secondary); }
    .rel-list { list-style: none; margin: 20px 0 0; padding: 0; }
    .rel-item { margin-bottom: 12px; }
    .rel-item a { display: block; background: var(--surface); border: 1px solid var(--border);
                  border-radius: 14px; padding: 18px; text-decoration: none;
                  transition: background-color .15s ease, border-color .15s ease; }
    .rel-item a:hover { background: var(--accent-d); border-color: var(--accent-d);
                        text-decoration: none; }
    .rel-item a:hover .rel-item-title,
    .rel-item a:hover .rel-item-meta { color: #fff; }
    .rel-item a:hover .rel-item-sum { color: rgba(255, 255, 255, .82); }
    .rel-item-meta { font-size: 13px; color: var(--text-tertiary); }
    .rel-item-title { font-family: "Sora", -apple-system, sans-serif; font-size: 19px;
                      color: var(--text-primary); margin: 4px 0 6px; }
    .rel-item-sum { margin: 0; font-size: 15px; color: var(--text-secondary); }

    /* 區塊標題：小標籤 + 一條線，兩區才分得開 */
    .sec-eyebrow { display: flex; align-items: center; gap: 12px; margin: 44px 0 0; }
    .sec-eyebrow::after { content: ""; flex: 1; height: 1px; background: var(--border); }
    .sec-eyebrow h2 { font-size: 13px; font-weight: 800; letter-spacing: 1.5px;
                      color: var(--accent); margin: 0; white-space: nowrap; }

    /* 最新一版：有圖、字大，跟舊版本明顯不同重量 */
    .rel-hero { display: block; background: var(--surface); border: 1px solid var(--border);
                border-radius: 18px; overflow: hidden; text-decoration: none; margin-top: 20px; }
    .rel-hero { transition: border-color .15s ease; }
    .rel-hero:hover { border-color: var(--accent-d); text-decoration: none; }
    .rel-hero:hover .rel-hero-body { background: var(--accent-d); }
    .rel-hero-body { transition: background-color .15s ease; }
    .rel-hero:hover h3, .rel-hero:hover .rel-item-meta { color: #fff; }
    .rel-hero:hover p { color: rgba(255, 255, 255, .82); }
    .rel-hero-body { padding: 26px 22px 28px; }
    .rel-badge { display: inline-block; background: var(--accent); color: #fff; font-size: 11px;
                 font-weight: 800; letter-spacing: .5px; border-radius: 999px; padding: 3px 10px; }
    .rel-hero h3 { font-family: "Sora", -apple-system, sans-serif; font-size: 24px; line-height: 1.35;
                   color: var(--text-primary); margin: 12px 0 8px; }
    .rel-hero p { margin: 0; font-size: 15px; color: var(--text-secondary); line-height: 1.7; }
    .rel-hero .rel-item-meta { margin-top: 12px; }

    /* 舊版本：收成一行，日期與標題並排 */
    .rel-past { list-style: none; margin: 14px 0 0; padding: 0; border-top: 1px solid var(--border); }
    .rel-past li a { display: flex; gap: 14px; align-items: baseline; padding: 14px 2px;
                     border-bottom: 1px solid var(--border); text-decoration: none; }
    .rel-past li a { transition: background-color .15s ease; border-radius: 8px; }
    .rel-past li a:hover { background: var(--accent-d); text-decoration: none;
                           padding-left: 10px; padding-right: 10px; }
    .rel-past li a:hover .rel-past-t { color: #fff; }
    .rel-past li a:hover .rel-past-d { color: rgba(255, 255, 255, .75); }
    .rel-past-d { font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
    .rel-past-t { font-size: 16px; font-weight: 700; color: var(--text-primary); }

    /* 功能介紹：圖示當錨點，桌機兩欄 */
    .guide-grid { list-style: none; margin: 20px 0 0; padding: 0; display: grid; gap: 12px; }
    @media (min-width: 720px) { .guide-grid { grid-template-columns: 1fr 1fr; } }
    .guide-grid a { display: flex; gap: 14px; height: 100%; background: var(--surface);
                    border: 1px solid var(--border); border-radius: 14px; padding: 18px;
                    text-decoration: none;
                    transition: background-color .15s ease, border-color .15s ease; }
    /* 滑過整張卡就翻成品牌綠底白字——卡片本來就是一整個連結，
       只換邊框顏色的話，游標在卡片中間時看不出它可以點。 */
    .guide-grid a:hover { background: var(--accent-d); border-color: var(--accent-d);
                          text-decoration: none; }
    .guide-grid a:hover .guide-t { color: #fff; }
    .guide-grid a:hover .guide-s { color: rgba(255, 255, 255, .82); }
    .guide-ic { font-size: 22px; line-height: 1.3; flex-shrink: 0; }
    .guide-t { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
    .guide-s { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.65; }
`;

const head = ({ title, description, canonical, image, alt }) => `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(SITE + image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
  <link rel="canonical" href="${esc(canonical)}" />
${
  alt
    ? `  <link rel="alternate" hreflang="zh-Hant" href="${esc(SITE + alt.zh)}" />
  <link rel="alternate" hreflang="en" href="${esc(SITE + alt.en)}" />
  <link rel="alternate" hreflang="x-default" href="${esc(SITE + alt.zh)}" />
`
    : ''
}  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&display=swap" />
  <link rel="stylesheet" href="/styles.css" />
  <style>${PAGE_CSS}</style>`;

const header = (t) => `  <header class="site-header">
    <a href="${t.home}" class="brand-link">
      <img src="/wordmark-glow.png" alt="Tennis Nut" class="brand-wordmark" />
    </a>
    <nav>
      <a href="https://apps.apple.com/app/id6761720650" target="_blank" rel="noopener">${t.nav.download}</a>
      <a href="${t.lang === 'en' ? '/en/install' : '/install'}">${t.nav.install}</a>
      <a href="${t.blog}" class="active">${t.nav.blog}</a>
      <a href="${t.lang === 'en' ? '/en/privacy' : '/privacy'}">${t.nav.privacy}</a>
      <a href="${t.lang === 'en' ? '/en/terms' : '/terms'}">${t.nav.terms}</a>
      <a href="${t.nav.otherHref}">${t.nav.other}</a>
    </nav>
  </header>`;

const footer = (t) => `  <footer>
    <div class="footer-inner">
      <div class="footer-text">
        <a href="${t.blog}">${t.footer.blog}</a>·
        <a href="${t.lang === 'en' ? '/en/privacy' : '/privacy'}">${t.footer.privacy}</a>·
        <a href="${t.lang === 'en' ? '/en/terms' : '/terms'}">${t.footer.terms}</a>·
        <a href="mailto:kaysoncho@gmail.com">${t.footer.contact}</a>
        <div style="margin-top: 12px;">© 2026 Tennis Nut · KXON</div>
      </div>
    </div>
  </footer>`;

const page = (meta, body, t = L.zh) => `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
${head(meta)}
</head>
<body>
${header(t)}

${body}

${footer(t)}
</body>
</html>
`;

const relPath = (b) => `/blog/${b}`;
const twoDigits = (n) => String(n).padStart(2, '0');
const prettyDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${y}.${twoDigits(m)}.${twoDigits(d)}`;
};

// ── 每一版一頁 ────────────────────────────────────────────────────────────
//
// 中文每一版都產；英文只產有 `en` 物件的那幾版，而且上一篇／下一篇也只在
// 那個子集合裡走——連到一篇不存在的英文頁比沒有連結糟。
mkdirSync(join(ROOT, 'blog'), { recursive: true });
mkdirSync(join(ROOT, 'en', 'blog'), { recursive: true });

const enReleases = releases.filter((r) => r.en);

const buildRelease = (r, i, list, t, isEn) => {
  const src = isEn ? { ...r, ...r.en } : r;
  const newer = list[i - 1];
  const older = list[i + 1];
  const body = `  <article class="container rel">
    <a class="rel-back" href="${t.blog}">${t.back}</a>
    <span class="tag-line">${esc(t.verLine(r, prettyDate(r.date)))}</span>
    <h1>${esc(src.title)}</h1>
    <p class="rel-lead">${esc(src.summary)}</p>

${src.highlights
  .map(
    (h) => `    <section class="hl">
      <div class="hl-emoji" aria-hidden="true">${esc(h.emoji)}</div>
      <div class="hl-body">
        <h2>${esc(h.title)}</h2>
        <p>${esc(h.body)}</p>
${
  h.shot
    ? `        <figure class="hl-shot">
          <img src="${esc(h.shot.src)}" alt="${esc(h.shot.alt || h.title)}" loading="lazy" />
${h.shot.caption ? `          <figcaption>${esc(h.shot.caption)}</figcaption>` : ''}
        </figure>`
    : ''
}
      </div>
    </section>`
  )
  .join('\n')}

${
  src.fixes?.length
    ? `    <section class="fixes">
      <h2>${esc(t.otherFixes)}</h2>
      <ul>
${src.fixes.map((f) => `        <li>${esc(f)}</li>`).join('\n')}
      </ul>
    </section>`
    : ''
}

    <div class="callout">${t.howTo}</div>

${
  newer || older
    ? `    <nav class="rel-nav">
      ${newer ? `<a href="${t.rel(newer.build)}">← ${esc(newer.version)} (${newer.build})</a>` : '<span></span>'}
      ${older ? `<a href="${t.rel(older.build)}">${esc(older.version)} (${older.build}) →</a>` : '<span></span>'}
    </nav>`
    : ''
}

    <div class="guide-foot">${t.foot}</div>
  </article>`;

  writeFileSync(
    join(ROOT, isEn ? 'en/blog' : 'blog', `${r.build}.html`),
    page(
      {
        // 標題本身已經帶版本（「第 1.16.3 版更新：…」），這裡再加一次
        // 會變成「… · Tennis Nut 1.16.3」重複兩遍。
        title: `${src.title} · Tennis Nut`,
        description: src.summary,
        canonical: SITE + t.rel(r.build),
        image: r.image || '/app-features.png',
        // 只有兩邊都有的版本才掛 hreflang。沒有英文版的那幾篇宣告一個
        // 不存在的網址，等於叫搜尋引擎去撞 404。
        alt: r.en
          ? { zh: L.zh.rel(r.build), en: L.en.rel(r.build) }
          : null,
      },
      body,
      t
    )
  );
};

releases.forEach((r, i) => buildRelease(r, i, releases, L.zh, false));
enReleases.forEach((r, i) => buildRelease(r, i, enReleases, L.en, true));

// ── 功能介紹（不綁版本）───────────────────────────────────────────────────
//
// 內容放在 guides/<slug>.html，只有 <article> 那一段；<head>、頁首、頁尾一律
// 由這裡套上，跟每一版的更新頁共用同一個殼。手寫整頁那次，頁首用了站上不存在
// 的 class，wordmark 沒有寬度限制就把版面撐開了——外殼只能有一個來源。
(guides ?? []).forEach((g) => {
  const slug = g.href.replace(/^\//, '');
  const fragment = readFileSync(join(ROOT, 'guides', `${slug}.html`), 'utf8');
  writeFileSync(
    join(ROOT, `${slug}.html`),
    page(
      {
        title: `${g.title} · Tennis Nut`,
        description: g.blurb,
        canonical: `${SITE}${g.href}`,
        image: g.image || '/app-features.png',
      },
      fragment
    )
  );
});

// ── 索引 ─────────────────────────────────────────────────────────────────
const latest = releases[0];

const buildIndex = (list, t, isEn) => {
  const [newest, ...past] = list;
  const n = isEn ? { ...newest, ...newest.en } : newest;
  const indexBody = `  <article class="container">
    <span class="tag-line">🌰 Tennis Nut</span>
    <h1>${esc(t.idxTitle)}</h1>

    <div class="sec-eyebrow"><h2>${esc(t.idxSection)}</h2></div>

    <!-- 分享圖不放在這裡：那張圖上印的就是底下這幾行字（標題、副標、版本），
         擺在一起是同一句話說兩次。它的用途是貼進 LINE／FB 的預覽卡，
         留在 og:image 就好。 -->
    <a class="rel-hero" href="${t.rel(newest.build)}">
      <div class="rel-hero-body">
        <span class="rel-badge">${esc(t.latestBadge)}</span>
        <h3>${esc(n.title)}</h3>
        <p>${esc(n.summary)}</p>
        <div class="rel-item-meta">${prettyDate(newest.date)} · ${esc(newest.version)} (${esc(newest.build)})</div>
      </div>
    </a>

${
  past.length
    ? `    <ul class="rel-past">
${past
  .map(
    (r) => `      <li><a href="${t.rel(r.build)}">
        <span class="rel-past-d">${prettyDate(r.date)} · ${esc(r.build)}</span>
        <span class="rel-past-t">${esc(isEn ? r.en.title : r.title)}</span>
      </a></li>`
  )
  .join('\n')}
    </ul>`
    : ''
}
${
  !isEn && guides?.length
    ? `
    <div class="sec-eyebrow"><h2>${esc(t.idxGuides)}</h2></div>
    <ul class="guide-grid">
${guides
  .map(
    (g) => `      <li><a href="${esc(g.href)}">
        <span class="guide-ic" aria-hidden="true">${esc(g.icon || '🌰')}</span>
        <span>
          <span class="guide-t">${esc(g.title)}</span>
          <p class="guide-s">${esc(g.blurb)}</p>
        </span>
      </a></li>`
  )
  .join('\n')}
    </ul>`
    : ''
}
  </article>`;

  writeFileSync(
    join(ROOT, isEn ? 'en/blog.html' : 'blog.html'),
    page(
      {
        title: t.metaIdxTitle,
        description: t.metaIdxDesc(n),
        canonical: `${SITE}${t.blog}`,
        image: newest.image || '/app-features.png',
        alt: { zh: L.zh.blog, en: L.en.blog },
      },
      indexBody,
      t
    )
  );
};

buildIndex(releases, L.zh, false);
if (enReleases.length) buildIndex(enReleases, L.en, true);

console.log(`blog.html + ${releases.length} 版：${releases.map((r) => r.build).join(', ')}`);
console.log(
  `en/blog.html + ${enReleases.length} 版：${enReleases.map((r) => r.build).join(', ') || '（無）'}`
);
console.log(`最新一版網址（貼 LINE 用）：${SITE}${relPath(latest.build)}`);

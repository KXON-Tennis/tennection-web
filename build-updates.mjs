#!/usr/bin/env node
/*
  updates.json → /whats-new (索引) + /whats-new/<build> (每一版一頁)。
  無依賴，node build-updates.mjs 就跑得動；`npm run ship` 會先跑一次。

  為什麼每版一個檔而不是單頁加錨點：這些網址的用途是貼進 LINE 群，LINE 讀的是
  該網址的 og: meta。錨點共用同一組 meta，貼哪一版預覽卡都長一樣；一版一頁才能
  讓卡片標題就是那一版的標題。

  生成的 HTML 也要進 git —— 這站沒有 build step，Vercel 直接吃 repo 裡的靜態檔。
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
                  border-radius: 14px; padding: 18px; text-decoration: none; }
    .rel-item a:hover { border-color: var(--accent); text-decoration: none; }
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
    .rel-hero:hover { border-color: var(--accent); text-decoration: none; }
    .rel-hero img { display: block; width: 100%; height: auto; border-bottom: 1px solid var(--border); }
    .rel-hero-body { padding: 20px 20px 22px; }
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
    .rel-past li a:hover { text-decoration: none; }
    .rel-past li a:hover .rel-past-t { color: var(--accent-d); }
    .rel-past-d { font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
    .rel-past-t { font-size: 16px; font-weight: 700; color: var(--text-primary); }

    /* 功能介紹：圖示當錨點，桌機兩欄 */
    .guide-grid { list-style: none; margin: 20px 0 0; padding: 0; display: grid; gap: 12px; }
    @media (min-width: 720px) { .guide-grid { grid-template-columns: 1fr 1fr; } }
    .guide-grid a { display: flex; gap: 14px; height: 100%; background: var(--surface);
                    border: 1px solid var(--border); border-radius: 14px; padding: 18px;
                    text-decoration: none; }
    .guide-grid a:hover { border-color: var(--accent); text-decoration: none; }
    .guide-ic { font-size: 22px; line-height: 1.3; flex-shrink: 0; }
    .guide-t { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
    .guide-s { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.65; }
`;

const head = ({ title, description, canonical, image }) => `  <meta charset="UTF-8" />
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
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&display=swap" />
  <link rel="stylesheet" href="/styles.css" />
  <style>${PAGE_CSS}</style>`;

const header = `  <header class="site-header">
    <a href="/" class="brand-link">
      <img src="/wordmark.png" alt="Tennis Nut" class="brand-wordmark" />
    </a>
    <nav>
      <a href="https://apps.apple.com/app/id6761720650" target="_blank" rel="noopener">下載 App</a>
      <a href="/whats-new" class="active">Blog</a>
      <a href="/privacy">隱私權</a>
      <a href="/terms">服務條款</a>
    </nav>
  </header>`;

const footer = `  <footer>
    <div class="footer-inner">
      <div class="footer-text">
        <a href="/whats-new">Blog</a>·
        <a href="/privacy">隱私權政策</a>·
        <a href="/terms">服務條款</a>·
        <a href="mailto:kaysoncho@gmail.com">聯絡我們</a>
        <div style="margin-top: 12px;">© 2026 Tennis Nut · KXON</div>
      </div>
    </div>
  </footer>`;

const page = (meta, body) => `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
${head(meta)}
</head>
<body>
${header}

${body}

${footer}
</body>
</html>
`;

const relPath = (b) => `/whats-new/${b}`;
const twoDigits = (n) => String(n).padStart(2, '0');
const prettyDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${y}.${twoDigits(m)}.${twoDigits(d)}`;
};

// ── 每一版一頁 ────────────────────────────────────────────────────────────
mkdirSync(join(ROOT, 'whats-new'), { recursive: true });

releases.forEach((r, i) => {
  const newer = releases[i - 1];
  const older = releases[i + 1];
  const body = `  <article class="container rel">
    <a class="rel-back" href="/whats-new">← 所有更新</a>
    <span class="tag-line">版本 ${esc(r.version)} · Build ${esc(r.build)} · ${prettyDate(r.date)}</span>
    <h1>${esc(r.title)}</h1>
    <p class="rel-lead">${esc(r.summary)}</p>

${r.highlights
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
  r.fixes?.length
    ? `    <section class="fixes">
      <h2>其他修正</h2>
      <ul>
${r.fixes.map((f) => `        <li>${esc(f)}</li>`).join('\n')}
      </ul>
    </section>`
    : ''
}

    <div class="callout">
      <b>怎麼更新？</b>
      Android 走 Google Play 會自動更新；iPhone 從 App Store 更新即可。
      還沒裝的話，iPhone 從 <a href="https://apps.apple.com/app/id6761720650" target="_blank" rel="noopener">App Store</a> 下載。
    </div>

${
  newer || older
    ? `    <nav class="rel-nav">
      ${newer ? `<a href="${relPath(newer.build)}">← ${esc(newer.version)} (${newer.build})</a>` : '<span></span>'}
      ${older ? `<a href="${relPath(older.build)}">${esc(older.version)} (${older.build}) →</a>` : '<span></span>'}
    </nav>`
    : ''
}

    <div class="guide-foot">
      用起來怪怪的？<a class="line-inline" href="https://line.me/R/ti/p/@tennisnut" target="_blank" rel="noopener">在 LINE 上找 Nutty</a>說一聲，或寄信到 <a href="mailto:kaysoncho@gmail.com">kaysoncho@gmail.com</a>。
    </div>
  </article>`;

  writeFileSync(
    join(ROOT, 'whats-new', `${r.build}.html`),
    page(
      {
        title: `${r.title} · Tennis Nut ${r.version}`,
        description: r.summary,
        canonical: SITE + relPath(r.build),
        image: r.image || '/app-features.png',
      },
      body
    )
  );
});

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
const [newest, ...past] = releases;
const indexBody = `  <article class="container">
    <span class="tag-line">🌰 Tennis Nut</span>
    <h1>Blog</h1>

    <div class="sec-eyebrow"><h2>版本更新紀錄</h2></div>

    <a class="rel-hero" href="${relPath(newest.build)}">
      ${newest.image ? `<img src="${esc(newest.image)}" alt="" />` : ''}
      <div class="rel-hero-body">
        <span class="rel-badge">最新版本</span>
        <h3>${esc(newest.title)}</h3>
        <p>${esc(newest.summary)}</p>
        <div class="rel-item-meta">${prettyDate(newest.date)} · ${esc(newest.version)} (${esc(newest.build)})</div>
      </div>
    </a>

${
  past.length
    ? `    <ul class="rel-past">
${past
  .map(
    (r) => `      <li><a href="${relPath(r.build)}">
        <span class="rel-past-d">${prettyDate(r.date)} · ${esc(r.build)}</span>
        <span class="rel-past-t">${esc(r.title)}</span>
      </a></li>`
  )
  .join('\n')}
    </ul>`
    : ''
}
${
  guides?.length
    ? `
    <div class="sec-eyebrow"><h2>功能介紹</h2></div>
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
  join(ROOT, 'whats-new.html'),
  page(
    {
      title: '最新情報 · Tennis Nut',
      description: `Tennis Nut 的版本更新與功能介紹。最新版 ${latest.version}：${latest.summary}`,
      canonical: `${SITE}/whats-new`,
      image: latest.image || '/app-features.png',
    },
    indexBody
  )
);

console.log(`whats-new.html + ${releases.length} 版：${releases.map((r) => r.build).join(', ')}`);
console.log(`最新一版網址（貼 LINE 用）：${SITE}${relPath(latest.build)}`);

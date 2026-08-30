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

const { releases } = JSON.parse(readFileSync(join(ROOT, 'updates.json'), 'utf8'));
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
    .fixes { margin: 28px 0 8px; }
    .fixes h2 { font-size: 15px; color: var(--text-tertiary); font-weight: 600; margin: 0 0 8px; }
    .fixes ul { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 15px; }
    .fixes li { margin-bottom: 4px; }
    .callout { background: var(--tint); border: 1px solid var(--accent-soft); border-radius: 14px;
               padding: 14px 16px; font-size: 15px; margin: 28px 0 0; }
    .rel-nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 28px; font-size: 14px; }
    .guide-foot { margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border);
                  font-size: 14px; color: var(--text-secondary); }
    .rel-list { list-style: none; margin: 24px 0 0; padding: 0; }
    .rel-item { margin-bottom: 12px; }
    .rel-item a { display: block; background: var(--surface); border: 1px solid var(--border);
                  border-radius: 14px; padding: 18px; text-decoration: none; }
    .rel-item a:hover { border-color: var(--accent); text-decoration: none; }
    .rel-item-meta { font-size: 13px; color: var(--text-tertiary); }
    .rel-item-title { font-family: "Sora", -apple-system, sans-serif; font-size: 19px;
                      color: var(--text-primary); margin: 4px 0 6px; }
    .rel-item-sum { margin: 0; font-size: 15px; color: var(--text-secondary); }
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
      <a href="/install">安裝 App</a>
      <a href="/whats-new" class="active">最新情報</a>
      <a href="/privacy">隱私權</a>
    </nav>
  </header>`;

const footer = `  <footer>
    <div class="footer-inner">
      <div class="footer-text">
        <a href="/install">安裝 App</a>·
        <a href="/whats-new">最新情報</a>·
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
    <span class="tag-line">🌰 版本 ${esc(r.version)} · Build ${esc(r.build)} · ${prettyDate(r.date)}</span>
    <h1>${esc(r.title)}</h1>
    <p class="rel-lead">${esc(r.summary)}</p>

${r.highlights
  .map(
    (h) => `    <section class="hl">
      <div class="hl-emoji" aria-hidden="true">${esc(h.emoji)}</div>
      <div class="hl-body">
        <h2>${esc(h.title)}</h2>
        <p>${esc(h.body)}</p>
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
      還沒裝的話看 <a href="/install">安裝教學</a>。
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
      用起來怪怪的？<a class="line-inline" href="https://line.me/R/ti/p/@tennisnut" target="_blank" rel="noopener">在 LINE 上找 Nutty 🌰</a>說一聲，或<a href="mailto:kaysoncho@gmail.com">寄信給我們</a>。
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

// ── 索引 ─────────────────────────────────────────────────────────────────
const latest = releases[0];
const indexBody = `  <article class="container">
    <span class="tag-line">🌰 最新情報</span>
    <h1>App 更新紀錄</h1>
    <p class="meta">每一次改版做了什麼，都記在這裡。</p>

    <ul class="rel-list">
${releases
  .map(
    (r) => `      <li class="rel-item">
        <a href="${relPath(r.build)}">
          <div class="rel-item-meta">${prettyDate(r.date)} · ${esc(r.version)} (${esc(r.build)})</div>
          <div class="rel-item-title">${esc(r.title)}</div>
          <p class="rel-item-sum">${esc(r.summary)}</p>
        </a>
      </li>`
  )
  .join('\n')}
    </ul>
  </article>`;

writeFileSync(
  join(ROOT, 'whats-new.html'),
  page(
    {
      title: 'App 更新紀錄 · Tennis Nut',
      description: `Tennis Nut 每一次改版的內容。最新版 ${latest.version}：${latest.summary}`,
      canonical: `${SITE}/whats-new`,
      image: latest.image || '/app-features.png',
    },
    indexBody
  )
);

console.log(`whats-new.html + ${releases.length} 版：${releases.map((r) => r.build).join(', ')}`);
console.log(`最新一版網址（貼 LINE 用）：${SITE}${relPath(latest.build)}`);

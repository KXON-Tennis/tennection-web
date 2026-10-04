// /sitemap-courts.xml —— 列出要給搜尋引擎收錄的球場頁。
//
// 收錄規則只在 _lib/courts.mjs 的 isIndexable 一處；頁面的 noindex 也讀它，
// 所以 sitemap 列出的頁面永遠不會自己說「別收我」。

import { courtUrl, isIndexable, rest } from "./_lib/courts.mjs";

export default async function handler(req, res) {
  const PAGE = 1000;
  let all = [], after = 0;
  try {
    for (;;) {
      const rows = await rest(
        `courts_with_status?select=id,name,country&country=eq.TW` +
        `&lat=not.is.null&lng=not.is.null&id=gt.${after}&order=id.asc&limit=${PAGE}`);
      all = all.concat(rows);
      if (rows.length < PAGE) break;
      after = rows[rows.length - 1].id;
    }
  } catch {
    res.statusCode = 503;
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  }

  const urls = all.filter(isIndexable)
    .map((c) => `  <url><loc>${courtUrl(c.id)}</loc></url>`).join("\n");

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
  res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
}

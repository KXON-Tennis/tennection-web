// 球場頁與 sitemap 共用：資料來源、收錄規則、標籤。
//
// 讀的全是 anon 讀得到的東西——官網地圖用的就是同一把 key。凡 anon 讀得到
// 就已經是公開資料，這裡不多開任何一扇門。

export const SUPABASE_URL = "https://dwjwisgbpnrxtcvpbkec.supabase.co";
export const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3andpc2dicG5yeHRjdnBia2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTU2ODQsImV4cCI6MjA4NDAzMTY4NH0.Em6SlZlakgd8WlL-PgFsR-NjpN2HFc38yNUw1zRKB9I";
export const SITE = "https://tennisnut.kxon.net";
export const APP_STORE_ID = "6761720650";
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

const HEADERS = { apikey: ANON, Authorization: "Bearer " + ANON,
                  "Content-Type": "application/json" };

export async function rest(path) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
  return r.json();
}

/** Optional data: a failed call leaves its section out instead of failing the page. */
export async function rpcOr(name, body, fallback) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,
      { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
    return r.ok ? await r.json() : fallback;
  } catch {
    return fallback;
  }
}

// OSM 匯入時沒有名字的球場，名稱就是這些佔位字（全部 11,582 座裡約 3,600 座）。
// 幾千頁同名、內容只有座標的頁面，對搜尋引擎是「薄內容」，會拖累整個網站。
const PLACEHOLDER_NAMES = new Set([
  "tennis court", "tennis courts", "pista de tenis", "pistas de tenis",
  "gelanggang tenis", "テニスコート", "網球場", "网球场", "테니스장",
]);
export const isPlaceholderName = (name) =>
  PLACEHOLDER_NAMES.has(String(name || "").trim().toLowerCase());

// 收錄規則：頁面是中文寫的，第一版只讓台灣、有真名字的球場進搜尋引擎。
// 其他球場的頁面照樣打得開（分享、地圖連過來），只是標 noindex、不進 sitemap。
// 要放寬時改這一個地方，sitemap 和頁面的 robots 會一起跟著變。
export const isIndexable = (c) => c.country === "TW" && !isPlaceholderName(c.name);

export const courtUrl = (id) => `${SITE}/courts/${id}`;

// 跟 App 的 Court.freshnessFor 同一組數字：黃綠燈兩小時、紅燈 24 小時。
// 過期的場況不顯示——早上的「客滿」不是下午的事實。
export function statusFresh(light, iso, now = Date.now()) {
  if (!iso) return false;
  const windowMs = (light === "red" ? 24 : 2) * 3600_000;
  return now - new Date(iso).getTime() <= windowMs;
}

export const SURFACES = {
  hard: "硬地", clay: "紅土", grass: "草地", artificial_grass: "人工草",
  omni: "砂地人工草", concrete: "水泥", pu: "PU", carpet: "地毯", other: "其他",
};
export const VENUE_KINDS = { wall: "練習牆", indoor_practice: "室內練習場" };
export const ACCESS = { free: "免費開放", paid: "付費", private: "私人球場" };
export const COND = {
  playable: { label: "可使用", light: "green" },
  occupied: { label: "客滿", light: "yellow" },
  wet: { label: "溼滑", light: "yellow" },
  damaged: { label: "損壞", light: "red" },
  closed: { label: "暫停開放", light: "red" },
};
const COND_SEVERITY = { closed: 3, damaged: 3, wet: 2, occupied: 2, playable: 1 };
// 人數多的在前，同數時嚴重的在前——跟 App 的 CourtCondition.sortedEntries 同規則。
export const condEntries = (counts) =>
  Object.entries(counts || {}).filter(([, v]) => v > 0)
    .sort((a, b) => (b[1] - a[1]) ||
      ((COND_SEVERITY[b[0]] || 0) - (COND_SEVERITY[a[0]] || 0)));

export const CLOSURE_KINDS = { closed: "封閉", maintenance: "整修", event: "舉辦比賽" };
export const HIT_FORMATS = { rally: "慢球長來回", crosscourt: "半場對角",
  serve_return: "發球與接發", points: "打點／比賽", free: "自由對打" };

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

export function distanceM(aLat, aLng, bLat, bLng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

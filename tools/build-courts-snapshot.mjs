#!/usr/bin/env node
// 烤 courts-snapshot.json：courts-map 開頁先吃這份（同源、CDN 快取、一趟到），
// 背景再跟 Supabase 對時。查詢條件必須跟 courts-map.html 的 COURTS_QUERY
// 一模一樣——不一樣的話背景對時每次都會判定「有差異」而白白重畫一次。
//
// `npm run ship` 會先跑這支再部署，所以快照最多落後一個部署週期，而頁面
// 反正會背景對時，落後無害。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL_BASE = "https://dwjwisgbpnrxtcvpbkec.supabase.co";
// 官網頁面內嵌的同一把 anon key——快照抓的本來就是匿名可讀的公開資料。
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3andpc2dicG5yeHRjdnBia2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTU2ODQsImV4cCI6MjA4NDAzMTY4NH0.Em6SlZlakgd8WlL-PgFsR-NjpN2HFc38yNUw1zRKB9I";
const QUERY = "?select=id,name,name_en,city,country,lat,lng,surface_code,venue_kind,court_count,light,is_indoor,access,community_verify_count&lat=not.is.null&lng=not.is.null&is_abandoned=eq.false";

const headers = { apikey: ANON, Authorization: "Bearer " + ANON };
const PAGE = 1000;

let all = [], after = 0;
for (;;) {
  const r = await fetch(
    `${URL_BASE}/rest/v1/courts${QUERY}&id=gt.${after}&order=id.asc&limit=${PAGE}`,
    { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status} at id>${after}`);
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error("not an array");
  if (rows.length === 0) break;
  all = all.concat(rows);
  after = rows[rows.length - 1].id;
  if (rows.length < PAGE) break;
}

if (all.length < 1000) {
  // 快照比現實小一個量級，多半是查詢壞了。寧可部署舊快照（頁面會對時），
  // 也不要部署一份空的。
  throw new Error(`only ${all.length} courts — refusing to write snapshot`);
}

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "courts-snapshot.json");
writeFileSync(out, JSON.stringify({ generated_at: new Date().toISOString(), courts: all }));
console.log(`courts-snapshot.json: ${all.length} courts`);

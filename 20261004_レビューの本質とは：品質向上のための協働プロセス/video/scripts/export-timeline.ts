// ページ表を JSON に書き出し、Python の部品生成（prep/build_parts.py）へ渡す。
// 使い方: node scripts/export-timeline.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGE_COUNT, VERSIONS, pageKey, uniquePages } from "../src/story/pages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "gen");
mkdirSync(out, { recursive: true });

const versions = Object.fromEntries(Object.entries(VERSIONS).map(([v, pages]) => [v, pages.map(pageKey)]));
const pages = Object.fromEntries(uniquePages().map((p) => [pageKey(p), p]));
writeFileSync(join(out, "pages.json"), JSON.stringify({ pageCount: PAGE_COUNT, versions, pages }, null, 1));
console.log(`pages.json: ${Object.keys(pages).length} unique pages`);

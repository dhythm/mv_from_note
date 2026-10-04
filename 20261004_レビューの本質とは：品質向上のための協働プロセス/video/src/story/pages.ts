// パラパラ漫画（内側の世界）のページ表。
// 同じ体（P01）に、渡す人・受け手の腕と手、カップを差し替えて各ページを作る。
// Python の部品生成（prep/build_parts.py）も、この表から書き出した JSON を読む。

/** 渡す人の腕：hold=カップを持つ(P01) / holdTall=形の違うカップ(P00) / open=開いた手(P02) / rel=下ろした手(P04) */
export type GiverPose = "hold" | "holdTall" | "open" | "rel";
/** 受け手の腕：open=差し出した手(P01) / low=腰へ下げた手(P03) / hold=胸元で持つ(P04) */
export type ReceiverPose = "open" | "low" | "hold";
/** カップがどこにあるか。float は手から離れて浮く（描き間違い） */
export type CupOwner = "giver" | "receiver" | "float";

export type PageSpec = {
  giver: { pose: GiverPose; dx: number };
  receiver: { pose: ReceiverPose; dx: number };
  cup: CupOwner;
};

export type Version = "Q0" | "Q1" | "Q2" | "Q3";

export const PAGE_COUNT = 24;
/** 前半も終盤も同じ速さでめくる */
export const PAGES_PER_SEC = 12;
/** 渡す前に一度手を引く「ためらい」 */
export const HESITATION_PAGES = [3, 4, 5, 6, 7, 8];

type G = PageSpec["giver"];
type R = PageSpec["receiver"];
const g = (pose: GiverPose, dx = 0): G => ({ pose, dx });
const r = (pose: ReceiverPose, dx = 0): R => ({ pose, dx });

// 渡す人：静止→一度引く→ゆっくり差し出す（全版共通の前半 p0〜p11）
const GIVER_DX = [0, 0, 0, -4, -9, -13, -14, -13, -8, 0, 8, 14];
const opening = (): PageSpec[] =>
  GIVER_DX.map((dx) => ({ giver: g("hold", dx), receiver: r("open"), cup: "giver" }));

/** Q1：事前修正後・承認時。p12 でカップだけが手から離れて先へ跳ぶ */
function buildQ1(): PageSpec[] {
  const pages = opening();
  const tail: PageSpec[] = [
    { giver: g("open", 14), receiver: r("open", -3), cup: "float" },
    { giver: g("open", 12), receiver: r("open", -4), cup: "receiver" },
    { giver: g("open", 8), receiver: r("open", 8), cup: "receiver" },
    { giver: g("rel"), receiver: r("open", 16), cup: "receiver" },
  ];
  pages.push(...tail);
  while (pages.length < PAGE_COUNT) pages.push({ giver: g("rel"), receiver: r("low"), cup: "receiver" });
  return pages;
}

/** Q0：事前確認前。差し出し始めの3ページだけカップの形が変わる */
function buildQ0(q1: PageSpec[]): PageSpec[] {
  return q1.map((p, i) => (i >= 9 && i <= 11 ? { ...p, giver: g("holdTall", p.giver.dx) } : p));
}

/** Q2：作り手がカップを手に描き戻した。受け手の絵は Q1 のまま → 先に手を下げてしまう */
function buildQ2(q1: PageSpec[]): PageSpec[] {
  const giverDx = [18, 21, 22, 22];
  return q1.map((p, i) => {
    if (i < 12) return p;
    return { ...p, giver: g("hold", giverDx[Math.min(i - 12, giverDx.length - 1)]), cup: "giver" };
  });
}

/** Q3：受け手が待つ案。ためらいは残し、受け手と隣接する渡す人のページを描き直す */
function buildQ3(q2: PageSpec[]): PageSpec[] {
  const tail: PageSpec[] = [
    { giver: g("hold", 18), receiver: r("open", -3), cup: "giver" },
    { giver: g("hold", 21), receiver: r("open", -7), cup: "giver" },
    { giver: g("hold", 23), receiver: r("open", -9), cup: "giver" },
    { giver: g("open", 22), receiver: r("open", -8), cup: "receiver" },
    { giver: g("open", 17), receiver: r("open", -4), cup: "receiver" },
    { giver: g("open", 10), receiver: r("open", 6), cup: "receiver" },
    { giver: g("rel"), receiver: r("open", 14), cup: "receiver" },
  ];
  const pages = [...q2.slice(0, 12), ...tail];
  while (pages.length < PAGE_COUNT) pages.push({ giver: g("rel"), receiver: r("hold"), cup: "receiver" });
  return pages;
}

const Q1 = buildQ1();
const Q2 = buildQ2(Q1);
export const VERSIONS: Record<Version, PageSpec[]> = {
  Q0: buildQ0(Q1),
  Q1,
  Q2,
  Q3: buildQ3(Q2),
};

/** 同じ絵なら同じ文字列（部品ファイル名にも使う） */
export function pageKey(p: PageSpec): string {
  return `g-${p.giver.pose}${p.giver.dx}_r-${p.receiver.pose}${p.receiver.dx}_c-${p.cup}`;
}

/** そのページに描かれるカップの数（腕の絵に描き込まれているものも数える） */
export function cupCount(p: PageSpec): number {
  const inGiver = p.giver.pose === "hold" || p.giver.pose === "holdTall" ? 1 : 0;
  const inReceiverArt = p.receiver.pose === "hold" ? 1 : 0;
  const loose = p.cup === "float" || (p.cup === "receiver" && p.receiver.pose !== "hold") ? 1 : 0;
  const consistent =
    (p.cup === "giver") === (inGiver === 1) && (p.receiver.pose !== "hold" || p.cup === "receiver");
  return consistent ? inGiver + inReceiverArt + loose : -1;
}

/** 絵が異なるページ番号 */
export function diffPages(a: PageSpec[], b: PageSpec[]): number[] {
  return a.map((p, i) => (pageKey(p) !== pageKey(b[i]) ? i : -1)).filter((i) => i >= 0);
}

/** 全ての版に現れる、異なるページの一覧 */
export function uniquePages(): PageSpec[] {
  const seen = new Map<string, PageSpec>();
  for (const v of Object.values(VERSIONS)) for (const p of v) seen.set(pageKey(p), p);
  return [...seen.values()];
}

import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import type { Pt } from "../lib/track";
import { INNER, LEAF_STRIPS, PAGE, leafCurls } from "./geometry";
import type { BookState, EditState, SheetState } from "./types";

import { EDITS } from "./edits";
import { SKETCHES } from "./sketches";

const gen = (p: string) => staticFile(`gen/${p}`);
const pageSrc = (key: string) => gen(`pages/${key}.webp`);
const PAPER = gen("parts/page.webp");
const COVER = gen("parts/cover.webp");
const SEAL = gen("parts/seal.webp");

/** 真上に近いカメラ。遠い視点で、立ったページは細い帯に見える */
const PERSPECTIVE = 30000;
const STRIPS = LEAF_STRIPS;

/** 消しゴム・鉛筆が通ったところだけを見せるマスク（内側の絵の座標） */
function strokeMask(path: Pt[], f: number, width: number): CSSProperties {
  if (f <= 0 || path.length < 2) return { opacity: 0 };
  const cut = cutAt(path, f);
  const d = cut.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720' preserveAspectRatio='none'><path d='${d}' fill='none' stroke='white' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return { maskImage: url, WebkitMaskImage: url, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" } as CSSProperties;
}

/** 折れ線を長さの割合 f までで切った点列 */
export function cutAt(path: Pt[], f: number): Pt[] {
  if (f >= 1) return path;
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  let left = Math.max(0, f) * total;
  const out: Pt[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (left <= seg) {
      const r = seg > 0 ? left / seg : 0;
      out.push([path[i - 1][0] + (path[i][0] - path[i - 1][0]) * r, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * r]);
      return out;
    }
    out.push(path[i]);
    left -= seg;
  }
  return out;
}

const fill: CSSProperties = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };

/** ページの表：紙の上に内側の絵を乗算で重ねる */
export function PageFront({ pageKey, edit, onionKey, onion = 0 }: { pageKey: string; edit?: EditState; onionKey?: string; onion?: number }) {
  const e = edit ? EDITS[edit.name] : undefined;
  return (
    <div style={{ position: "relative", width: PAGE.w, height: PAGE.h, overflow: "hidden", isolation: "isolate" }}>
      <Img src={PAPER} style={fill} />
      {onionKey && onion > 0 ? (
        <div style={{ position: "absolute", left: INNER.left, top: INNER.top, width: INNER.w, height: INNER.h, mixBlendMode: "multiply", opacity: 0.5 * onion }}>
          <Img src={pageSrc(onionKey)} style={fill} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: INNER.left, top: INNER.top, width: INNER.w, height: INNER.h, mixBlendMode: "multiply" }}>
        <Img src={pageSrc(pageKey)} style={fill} />
        {e && edit ? (
          <>
            <Img src={gen(e.erased)} style={{ ...fill, ...strokeMask(e.erasePath, edit.erase, 34) }} />
            <Img src={pageSrc(e.after)} style={{ ...fill, ...strokeMask(e.drawPath, edit.draw, 15) }} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function CoverFront({ seal }: { seal: number }) {
  return (
    <div style={{ position: "relative", width: PAGE.w, height: PAGE.h, overflow: "hidden" }}>
      <Img src={COVER} style={fill} />
      {seal > 0 ? (
        <Img src={SEAL} style={{ position: "absolute", left: 494, top: 222, width: 84, height: 84, opacity: Math.min(1, seal) * 0.92, mixBlendMode: "multiply" }} />
      ) : null}
    </div>
  );
}

/** 薄紙：下の絵がかすんで透け、鉛筆の下描きが乗る */
function Sheet({ s }: { s: SheetState }) {
  const sk = SKETCHES[s.sketch];
  return (
    <div
      style={{
        position: "absolute",
        left: PAGE.x - 6 + s.x,
        top: PAGE.y - 5 + s.y,
        width: PAGE.w + 4,
        height: PAGE.h + 10,
        transform: `rotate(${s.rot}deg)`,
        opacity: s.opacity ?? 1,
        background: "rgba(248,246,240,0.5)",
        boxShadow: "2px 3px 6px rgba(20,20,25,0.18)",
        border: "1px solid rgba(255,255,255,0.35)",
      }}
    >
      <div style={{ position: "absolute", left: INNER.left + 6, top: INNER.top + 5, width: INNER.w, height: INNER.h }}>
        <Img src={gen(sk.file)} style={{ ...fill, ...strokeMask(sk.drawPath, s.draw, 13) }} />
      </div>
    </div>
  );
}

/** 1枚の紙を3本の帯に分け、外側ほど少し遅れて曲がるようにする（紙のしなり） */
function Leaf({ angle, front, back, z, see = 0 }: { angle: number; front: ReactNode; back: ReactNode; z: number; see?: number }) {
  const s = PAGE.w / STRIPS;
  const bend = Math.sin((Math.min(angle, 180) * Math.PI) / 180);
  const curls = leafCurls(angle);
  const shade = 0.22 * bend;
  const strip = (i: number): ReactNode => {
    const face = (content: ReactNode, isBack: boolean) => (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: s + 1.5,
          height: PAGE.h,
          overflow: "hidden",
          backfaceVisibility: "hidden",
          transform: isBack ? "rotateY(180deg)" : undefined,
          opacity: isBack ? 1 : 1 - 0.55 * see,
        }}
      >
        <div style={{ position: "absolute", left: isBack ? -(STRIPS - 1 - i) * s : -i * s, top: 0, width: PAGE.w, height: PAGE.h }}>{content}</div>
        <div style={{ ...fill, background: (() => {
          // ページ全体で一続きの陰（綴じ目側が暗い）
          const k = isBack ? 0.6 : 1;
          const j = isBack ? STRIPS - 1 - i : i;
          const a0 = shade * k * (1 - 0.7 * (j / STRIPS));
          const a1 = shade * k * (1 - 0.7 * ((j + 1) / STRIPS));
          return `linear-gradient(${isBack ? 270 : 90}deg, rgba(40,35,30,${a0}), rgba(40,35,30,${a1}))`;
        })() }} />
      </div>
    );
    const child = i + 1 < STRIPS ? (
      <div style={{ position: "absolute", left: s, top: 0, width: s, height: PAGE.h, transformOrigin: "0 50%", transform: `rotateY(${-curls[i + 1]}deg)`, transformStyle: "preserve-3d" }}>
        {strip(i + 1)}
      </div>
    ) : null;
    return (
      <>
        {face(front, false)}
        {face(back, true)}
        {child}
      </>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        left: PAGE.x,
        top: PAGE.y,
        width: s,
        height: PAGE.h,
        transformOrigin: "0 50%",
        transform: `translateZ(${z}px) rotateY(${-angle}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {strip(0)}
    </div>
  );
}

/** ページの裏：白い紙に表の絵がうっすら透ける（左右反転） */
function PageBack({ pageKey }: { pageKey?: string }) {
  return (
    <div style={{ position: "relative", width: PAGE.w, height: PAGE.h, overflow: "hidden", isolation: "isolate" }}>
      <Img src={PAPER} style={{ ...fill, transform: "scaleX(-1)" }} />
      {pageKey ? (
        <div style={{ position: "absolute", left: INNER.left, top: INNER.top, width: INNER.w, height: INNER.h, mixBlendMode: "multiply", opacity: 0.1, transform: "scaleX(-1)" }}>
          <Img src={pageSrc(pageKey)} style={fill} />
        </div>
      ) : null}
    </div>
  );
}

export function Book({ book, cx, cy }: { book: BookState; cx: number; cy: number }) {
  const top = book.angles.findIndex((a) => a === 0);
  const topIdx = top < 0 ? book.keys.length - 1 : top;
  const leaves: ReactNode[] = [];
  // めくれているページ：左の束（角度大）ほど下、持ち上がり途中ほど上
  book.angles.forEach((a, i) => {
    if (a <= 0) return;
    const showFront = a < 100;
    leaves.push(
      <Leaf
        key={`p${i}`}
        angle={a}
        see={book.peek && book.peek.page === i ? book.peek.amount : 0}
        z={a > 90 ? i * 0.02 : 1 + (book.keys.length - i) * 0.02}
        front={showFront ? <PageFront pageKey={book.keys[i]} /> : <Img src={PAPER} style={fill} />}
        back={<PageBack pageKey={a > 80 ? book.keys[i] : undefined} />}
      />,
    );
  });
  const lift = book.lift ?? 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1600, height: 900, perspective: PERSPECTIVE, perspectiveOrigin: `${cx}px ${cy}px`, transformStyle: "preserve-3d" }}>
      {book.cover > 0.01 ? (
        <div style={{ position: "absolute", left: PAGE.x, top: PAGE.y }}>
          <PageFront
            pageKey={book.keys[topIdx]}
            edit={book.edit && book.edit.page === topIdx ? book.edit : undefined}
            onionKey={book.onion ? book.keys[book.onion.page] : undefined}
            onion={book.onion?.amount ?? 0}
          />
          {lift > 0 ? <div style={{ ...fill, background: `linear-gradient(270deg, rgba(30,28,25,${0.12 * lift}), rgba(30,28,25,0) 30%)` }} /> : null}
        </div>
      ) : null}
      {(book.sheets ?? []).map((sh, i) => (
        <Sheet key={`s${i}`} s={sh} />
      ))}
      {leaves}
      {book.cover <= 0.01 ? (
        <div style={{ position: "absolute", left: PAGE.x, top: PAGE.y }}>
          <CoverFront seal={book.seal} />
        </div>
      ) : book.cover < 179 ? (
        <Leaf key="cover" angle={book.cover} z={book.cover > 90 ? -0.5 : 3} front={<CoverFront seal={book.seal} />} back={<Img src={COVER} style={{ ...fill, transform: "scaleX(-1)", filter: "brightness(0.92)" }} />} />
      ) : null}
    </div>
  );
}

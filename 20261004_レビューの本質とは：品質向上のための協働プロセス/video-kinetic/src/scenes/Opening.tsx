import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE_IN, EASE_INOUT, mix, prog } from "../design";
import { sans } from "../fonts";
import { Glyph, Key, stateAt } from "../glyph";

// 冒頭 B01〜B04（0–25.1秒 / 0–752フレーム）。一つの舞台で、同じ文字が意味を変えながら動き続ける。
//   B01  0–150  「レビューは、何のためにある？」
//   B02 150–345 「レビュー」が引用の中へ入り「〇〇さんのレビューを通した」、朱の角印
//   B03 345–573 「通した」→「通す」。目的／手段の段で「品質を高める」と入れ替わり、下段のラベルは「手段」から「二の次」へ
//   B04 573–753 「通す」は水平に抜けていき、「品質を高める」が垂直に上って「品質を高めるための行為」
// フレーム値は timeline.ts の B01〜B04（start / steps.at / out）に合わせている。

export const OPENING_FRAMES = 753;

// 段の位置
const TOP = 400; // 目的の段
const LOW = 660; // 手段の段
const ROW_X = 480;
const QUOTE_X = 232; // 引用 13字 × 112px を中央に
const QUOTE_Y = 560;
const FINAL_X = 300; // 「品質を高めるための行為」11字 × 120px
const FINAL_Y = 590;

const at = (x0: number, size: number, i: number) => x0 + i * size;

/** 「レビュー」4字：問いの主語 → 引用の一部 → 手段の段 → 目的の段へ押し上がる → 退場 */
function reviewKeys(i: number): Key[] {
  return [
    { f: 0, x: 200 + i * (160 + 150), y: 520, size: 160, opacity: 0 },
    { f: 30, x: at(200, 160, i), opacity: 1 },
    { f: 150 },
    { f: 176, x: at(QUOTE_X, 112, 5 + i), y: QUOTE_Y, size: 112, serif: 1, easing: EASE_INOUT },
    { f: 336 },
    { f: 363, x: at(ROW_X, 96, i), y: LOW, size: 96, serif: 0, easing: EASE_INOUT },
    { f: 446 },
    { f: 473, x: at(ROW_X, 128, i), y: TOP, size: 128, color: C.shu, easing: EASE_INOUT },
    { f: 573 },
    { f: 596, x: at(ROW_X, 128, i) - 60, opacity: 0 },
  ];
}

/** 「を」「通」：引用の末尾 → 手段の段 → 目的の段。「通」は B04 で水平に抜ける */
function woTsuKeys(k: 0 | 1): Key[] {
  const leaves = k === 1;
  const keys: Key[] = [
    { f: 176, x: at(QUOTE_X, 112, 9 + k) + 40, y: QUOTE_Y, size: 112, serif: 1, opacity: 0 },
    { f: 198, x: at(QUOTE_X, 112, 9 + k), opacity: 1 },
    { f: 336 },
    { f: 363, x: at(ROW_X, 96, 4 + k), y: LOW, size: 96, serif: 0, easing: EASE_INOUT },
    { f: 446 },
    { f: 473, x: at(ROW_X, 128, 4 + k), y: TOP, size: 128, color: C.shu, easing: EASE_INOUT },
    { f: 573 },
  ];
  if (leaves) keys.push({ f: 604, x: at(ROW_X, 128, 5) + 1500, easing: EASE_IN });
  else keys.push({ f: 596, x: at(ROW_X, 128, 4) - 60, opacity: 0 });
  return keys;
}

/** 「す」：「通した」の「した」と入れ替わって現れ、「通」と一緒に抜ける */
const suKeys: Key[] = [
  { f: 348, x: at(ROW_X, 96, 6), y: LOW + 30, size: 96, opacity: 0 },
  { f: 363, y: LOW, opacity: 1 },
  { f: 446 },
  { f: 473, x: at(ROW_X, 128, 6), y: TOP, size: 128, color: C.shu, easing: EASE_INOUT },
  { f: 573 },
  { f: 604, x: at(ROW_X, 128, 6) + 1500, easing: EASE_IN },
];

/** 「した」：引用の後で消える */
function shitaKeys(k: 0 | 1): Key[] {
  return [
    { f: 176, x: at(QUOTE_X, 112, 11 + k) + 40, y: QUOTE_Y, size: 112, serif: 1, opacity: 0 },
    { f: 198, x: at(QUOTE_X, 112, 11 + k), opacity: 1 },
    { f: 336 },
    { f: 352, y: QUOTE_Y + 40, opacity: 0 },
  ];
}

/** 「〇〇さんの」 */
function marukoKeys(i: number): Key[] {
  return [
    { f: 176, x: at(QUOTE_X, 112, i) - 40, y: QUOTE_Y, size: 112, serif: 1, opacity: 0 },
    { f: 196, x: at(QUOTE_X, 112, i), opacity: 1 },
    { f: 336 },
    { f: 352, x: at(QUOTE_X, 112, i) - 60, opacity: 0 },
  ];
}

/** 「は、何のためにある？」 */
function questionKeys(i: number): Key[] {
  return [
    { f: 10 + i, x: at(840, 88, i) + 160, y: 558, size: 88, opacity: 0 },
    { f: 36 + i, x: at(840, 88, i), opacity: 1 },
    { f: 144 },
    { f: 166, y: 558 + 70, opacity: 0, easing: EASE_IN },
  ];
}

/** 「品質を高める」6字：目的の段に現れる → 押し出されて手段の段へ → 藍に戻って垂直に上がる */
function hinshitsuKeys(i: number): Key[] {
  return [
    { f: 348, x: at(ROW_X, 120, i), y: TOP - 50, size: 120, color: C.ai, opacity: 0 },
    { f: 363, y: TOP, opacity: 1 },
    { f: 420 },
    // 右へ押しやられて縮み、手段の段の右端へ落ちる（「通す」の印とは交差しない）
    { f: 436, x: at(1260, 72, i), size: 72, color: C.grey, easing: EASE_INOUT },
    { f: 452, y: LOW, easing: EASE_INOUT },
    { f: 473 },
    // 空いた手段の段へ寄る
    { f: 493, x: at(ROW_X, 72, i) },
    { f: 582 + 2 * i },
    { f: 589 + 2 * i, color: C.ai },
    // 1字ずつ階段状に上がり、明朝の引用になる
    { f: 604 + 2 * i, x: at(FINAL_X, 120, i), y: FINAL_Y, size: 120, serif: 1 },
  ];
}

/** 「ための行為」：下から積み上がる */
function tameniKeys(j: number): Key[] {
  const i = 6 + j;
  return [
    { f: 598 + 2 * j, x: at(FINAL_X, 120, i), y: FINAL_Y + 80, size: 120, serif: 1, color: C.ai, opacity: 0 },
    { f: 614 + 2 * j, y: FINAL_Y, opacity: 1 },
  ];
}

function TextBlock({
  text, left, top, size, weight, color, opacity, dy = 0,
}: { text: string; left: number; top: number; size: number; weight: number; color: string; opacity: number; dy?: number }) {
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute", left, top: top + dy, fontFamily: sans, fontWeight: weight, fontSize: size,
        lineHeight: 1.2, color, opacity, whiteSpace: "nowrap", letterSpacing: "0.04em",
      }}
    >
      {text}
    </div>
  );
}

function fadeInOut(frame: number, inA: number, inB: number, outA: number, outB: number): number {
  return Math.min(prog(frame, inA, inB), 1 - prog(frame, outA, outB, EASE_IN));
}

export function Opening() {
  const frame = useCurrentFrame();

  // 朱の角印：「通」の文字に付いて動く。囲む字数は「通した」3字 →「通す」2字
  const tsu = stateAt(woTsuKeys(1), frame);
  const stampChars = mix(3, 2, prog(frame, 336, 363, EASE_INOUT));
  const stampLand = prog(frame, 204, 214, EASE_IN);
  const stampOpacity = frame < 204 ? 0 : Math.min(1, stampLand * 1.2);
  const stampScale = mix(1.7, 1, stampLand);
  const stampPad = tsu.size * 0.14;

  // 目的／手段のラベル
  const labelOpacity = fadeInOut(frame, 350, 366, 573, 590);
  // 入れ替わった後、下段のラベルは「手段」ではなく記事の言う「二の次」
  const demote = prog(frame, 451, 460);
  // B03 要約
  const summary3 = fadeInOut(frame, 462, 480, 567, 577);
  // B02 要約
  const summary2 = fadeInOut(frame, 152, 168, 336, 348);
  // B04「レビューの本質は、」
  const lead4 = fadeInOut(frame, 596, 615, 747, 753);
  // 水平の通り道（B04 で「通す」が抜けていく線）
  const track = prog(frame, 568, 580) * (1 - prog(frame, 600, 620));
  // 垂直の軸（品質が上る方向）
  const axis = prog(frame, 593, 626);
  // B01 問いの後ろに伸びる線
  const qLine = prog(frame, 40, 80) * (1 - prog(frame, 144, 162));

  const all = 1 - prog(frame, 747, 753, EASE_IN);

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: all }}>
        {/* B01 の線 */}
        <div style={{ position: "absolute", left: 1740, top: 556, height: 4, width: 180 * qLine, background: C.ink }} />

        {/* 水平の通り道 */}
        <div
          style={{
            position: "absolute", left: at(ROW_X, 128, 5), top: TOP + 82, height: 5,
            width: (1920 - at(ROW_X, 128, 5)) * track, background: C.shu, opacity: 0.85,
          }}
        />
        {/* 垂直の軸 */}
        <div
          style={{
            position: "absolute", left: FINAL_X - 48, top: FINAL_Y + 60 - 250 * axis, width: 8,
            height: 250 * axis, background: C.ai,
          }}
        />

        {/* 目的／手段 */}
        {labelOpacity > 0.001 ? (
          <>
            {([["目的", TOP, 1], ["手段", LOW, 1 - prog(frame, 442, 451)], ["二の次", LOW, demote]] as const).map(([text, y, o]) => (
              <div
                key={text as string}
                style={{
                  position: "absolute", left: 300, top: (y as number) - 32, height: 64, display: "flex",
                  alignItems: "center", gap: 18, opacity: labelOpacity * o, fontFamily: sans, fontWeight: 700,
                  fontSize: 44, color: C.grey, letterSpacing: "0.1em",
                }}
              >
                <div style={{ width: 4, height: 64, background: C.grey }} />
                {text}
              </div>
            ))}
          </>
        ) : null}

        <TextBlock text="筆者がいたSIerでは、こう語られた。" left={QUOTE_X} top={392} size={56} weight={500} color={C.ink}
          opacity={summary2} dy={(1 - prog(frame, 152, 168)) * 20} />
        <TextBlock text="通すことが、目的になる。" left={ROW_X} top={830} size={64} weight={700} color={C.ink}
          opacity={summary3} dy={(1 - prog(frame, 462, 480)) * 20} />
        <TextBlock text="レビューの本質は、" left={FINAL_X} top={398} size={68} weight={700} color={C.ink}
          opacity={lead4} dy={(1 - prog(frame, 596, 615)) * 20} />

        {/* 文字 */}
        {[..."レビュー"].map((ch, i) => <Glyph key={`r${i}`} char={ch} keys={reviewKeys(i)} frame={frame} />)}
        {[..."は、何のためにある？"].map((ch, i) => (
          <Glyph key={`q${i}`} char={ch} keys={questionKeys(i)} frame={frame} weight={700} />
        ))}
        {[..."〇〇さんの"].map((ch, i) => <Glyph key={`m${i}`} char={ch} keys={marukoKeys(i)} frame={frame} />)}
        <Glyph char="を" keys={woTsuKeys(0)} frame={frame} />
        <Glyph char="通" keys={woTsuKeys(1)} frame={frame} />
        <Glyph char="し" keys={shitaKeys(0)} frame={frame} />
        <Glyph char="た" keys={shitaKeys(1)} frame={frame} />
        <Glyph char="す" keys={suKeys} frame={frame} />
        {[..."品質を高める"].map((ch, i) => <Glyph key={`h${i}`} char={ch} keys={hinshitsuKeys(i)} frame={frame} />)}
        {[..."ための行為"].map((ch, j) => <Glyph key={`t${j}`} char={ch} keys={tameniKeys(j)} frame={frame} />)}

        {/* 朱の角印 */}
        {stampOpacity > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: tsu.x - stampPad,
              top: tsu.y - tsu.size / 2 - stampPad,
              width: tsu.size * stampChars + stampPad * 2,
              height: tsu.size + stampPad * 2,
              border: `${Math.max(5, tsu.size * 0.06)}px solid ${C.shu}`,
              borderRadius: 6,
              background: "rgba(200,67,43,0.07)",
              transform: `scale(${stampScale}) rotate(-3deg)`,
              opacity: stampOpacity * tsu.opacity,
            }}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

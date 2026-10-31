// 07–10: 恐怖も爆速で（素材動画 F2） → だから調べる → 頭を使う場所が、移った → 怖いですよ。でも楽しい（素材動画 F3）
import React from 'react';
import {Bg, C, Card, Circle, Dot, DrawLine, F, Footage, H, Lay, Line, W, inExpo, inOut, kv, lerp, mix, outExpo, out3, prog} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s;

// ---- 07 爆速でできても、恐怖も爆速でやってくる。 ----
// 巨大な「爆速」の字の形の窓の中で、素材動画 F2（床すれすれの前進、素材 1.5–5.5 秒を等速）が流れる。
// 素材が終わる直前に字の窓ごと左上へ吹き飛ぶように縮み、同じ速さで朱の 2 行が反対側から入る（速さを恐怖へ受け渡す）。
const GLYPH = {cx: 960, base: 575, size: 440, cy: 385};
export const Cut07: React.FC<CutProps> = ({t, start}) => {
  const fly = kv(t, [[3.25, 0], [3.85, 1, inOut]]);
  const s = lerp(1, 0.34, fly);
  const gx = lerp(0, 290 - GLYPH.cx, fly);
  const gy = lerp(0, 175 - GLYPH.cy, fly);
  // 素材の最後（本編 3.5 秒）より前に、字の中を灰で埋めて止まった画を見せない
  const fillGray = prog(t, 3.1, 3.45);
  const push = kv(t, [[v(6.4), 0], [v(7.0), 1, outExpo], [v(8.1), 1], [v(8.7), 2.6, outExpo]]);
  return (
    <>
      <Bg color={C.paper} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <clipPath id="glyph07" clipPathUnits="userSpaceOnUse">
            <text x={GLYPH.cx} y={GLYPH.base} textAnchor="middle" fontFamily={F.noto} fontWeight={900} fontSize={GLYPH.size} style={{fontFeatureSettings: '"palt" 1'}}>
              爆速
            </text>
          </clipPath>
        </defs>
      </svg>
      <Lay s={1 + push * 0.04} ox={120} oy={600}>
        <Lay x={gx} y={gy} s={s} ox={GLYPH.cx} oy={GLYPH.cy}>
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: 'url(#glyph07)', opacity: outExpo(prog(t, -0.3, 0.3))}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, background: '#a8a097'}} />
            {fillGray < 1 && <Footage src="f07.mp4" absStart={start - 0.5} srcDur={4} w={W} h={H} fx={0.5} fy={0.8} zoom={1.25} />}
            <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, background: C.gray, opacity: fillGray}} />
          </div>
        </Lay>
        <Line t={t} text="でできても、" x={GLYPH.cx} y={660} size={110} color={C.ink} t0={v(1.55)} t1={3.2} anchor="c" stagger={0.035} />
        <Line t={t} text="でできても、" x={470} y={128} size={70} color={C.ink} t0={3.75} stagger={0.025} />
        <Line t={t} text="恐怖も爆速で" x={120} y={420} size={190} color={C.red} t0={v(3.95)} dir="left" stagger={0.03} dur={0.35} />
        <Line t={t} text="やってくる。" x={120} y={650} size={190} color={C.red} t0={v(5.4)} dir="left" stagger={0.03} dur={0.35} />
      </Lay>
      <Line t={t} text="拠り所が、自分の中にない" x={1800} y={925} size={72} weight={800} color={C.gray} t0={v(8.2)} dir="left" anchor="r" stagger={0.025} />
    </>
  );
};

// ---- 08 だから、調べる。 ----
// 3 つの問いの札が叩き込まれ、最後の札のあとで 3 枚が橙の点へ縮み、点を左からつなぐ線が「成長」へ届く（自分でつないだ学び）
const Q = [
  {text: 'どう動いている？', x: 380, t0: v(1.5), dy: 420},
  {text: 'なぜそうなる？', x: 960, t0: v(3.02), dy: -420},
  {text: '本当に問題ない？', x: 1540, t0: v(4.78), dy: 420},
];
const P = [
  {x: 300, y: 720},
  {x: 640, y: 560},
  {x: 990, y: 700},
  {x: 1330, y: 500},
];
export const Cut08: React.FC<CutProps> = ({t}) => {
  const toDot = inOut(prog(t, v(6.9), v(7.5)));
  const dim = inOut(prog(t, v(6.9), v(7.6)));
  // 線を描く拍（声の「調べる時間」「学ぶ時間」「一つずつ」「成長に」）
  const segs = [v(7.38), v(8.64), v(9.78), v(11.4)];
  const seg = (i: number) => outExpo(prog(t, segs[i], segs[i] + 0.7));
  // カメラは線を追って右へ（Truck）、「成長」で寄る（Push in）
  const truck = kv(t, [[v(7.3), 60], [v(9.0), 20, outExpo], [v(10.2), -20, outExpo], [v(11.6), -60, outExpo]]);
  const push = outExpo(prog(t, v(11.5), v(12.2)));
  const goal = {x: 1460, y: 440};
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={lerp(1, 0.6, dim)} ox={130} oy={90}>
        <Line t={t} text="だから、調べる。" x={130} y={110} size={130} color={mix(C.ink, C.gray, dim)} t0={v(0.0)} stagger={0.04} />
      </Lay>
      <Lay x={truck * prog(t, v(7.0), v(7.3))} s={1 + push * 0.07} ox={1600} oy={420}>
        {Q.map((q, i) => {
          const k = outExpo(prog(t, q.t0, q.t0 + 0.35));
          if (k <= 0 || toDot >= 1) return null;
          const s = lerp(1.25, 1, outExpo(prog(t, q.t0 + 0.08, q.t0 + 0.45))) * (1 - toDot);
          return (
            <Lay key={i} x={lerp(0, P[i].x - q.x, toDot)} y={q.dy * (1 - k) + lerp(0, P[i].y - 600, toDot)} s={s} ox={q.x} oy={600}>
              <Card text={q.text} x={q.x} y={545} size={66} anchor="c" border={`3px solid ${C.ink}`} />
            </Lay>
          );
        })}
        {[0, 1, 2].map((i) => (
          <DrawLine key={i} x1={P[i].x} y1={P[i].y} x2={lerp(P[i].x, P[i + 1].x, seg(i))} y2={lerp(P[i].y, P[i + 1].y, seg(i))} k={seg(i) > 0 ? 1 : 0} color={C.orange} w={10} />
        ))}
        <DrawLine x1={P[3].x} y1={P[3].y} x2={lerp(P[3].x, goal.x, seg(3))} y2={lerp(P[3].y, goal.y, seg(3))} k={seg(3) > 0 ? 1 : 0} color={C.orange} w={10} head={36} />
        {P.map((p, i) => (
          <Dot key={i} x={p.x} y={p.y} r={26} color={C.orange} s={i < 3 ? outExpo(prog(t, v(7.2) + i * 0.08, v(7.6) + i * 0.08)) : outExpo(prog(t, segs[2] + 0.55, segs[2] + 0.85))} />
        ))}
        <Line t={t} text="成長" x={1500} y={300} size={200} color={C.orange} t0={v(11.45)} dir="left" stagger={0.06} dur={0.4} />
      </Lay>
      <Line t={t} text="調べる時間、学ぶ時間を、一つずつつなげる" x={130} y={900} size={60} weight={800} color={C.ink} t0={v(7.38)} stagger={0.018} />
    </>
  );
};

// ---- 09 頭を使う場所が、移った。 ----
// 同じ大きさの 2 円（慣れた／未経験）が入れ替わるように回り込み、灰は奥の小さな「AIへ」に、橙は手前で大きくなって主張を抱える
export const Cut09: React.FC<CutProps> = ({t}) => {
  const k = inOut(prog(t, v(2.5), v(3.45)));
  const bulge = Math.sin(Math.PI * k);
  const ax = lerp(560, 1730, k);
  const ay = lerp(500, 930, k) - bulge * 170;
  const ar = lerp(250, 74, k);
  const bxp = lerp(1360, 960, k);
  const byp = lerp(500, 540, k) + bulge * 150;
  const br = lerp(250, 420, k);
  const appear = outExpo(prog(t, 0.0, 0.6));
  // 「移った。」で叩き込み、そのまま寄る
  const smash = kv(t, [[v(4.28), 1.12], [v(4.7), 1, outExpo]]) * (1 + out3(prog(t, v(4.7), 8)) * 0.05);
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={t >= v(4.28) ? smash : 1} ox={960} oy={540}>
      <Circle x={ax} y={ay} r={ar * appear} fill={C.grayPale} stroke={C.gray} sw={lerp(6, 4, k)} />
      <Circle x={bxp} y={byp} r={br * appear} fill={C.orangePale} stroke={C.orange} sw={8} />
      <Line t={t} text="慣れた領域" x={560} y={466} size={64} weight={800} color={C.gray} t0={0.25} t1={v(2.35)} anchor="c" stagger={0.03} />
      <Line t={t} text="未経験" x={1360} y={460} size={80} color={C.orange} t0={0.35} t1={v(2.35)} anchor="c" stagger={0.04} />
      <Line t={t} text="同じ量の「頭」" x={960} y={830} size={60} weight={800} color={C.gray} t0={v(0.2)} t1={v(2.3)} anchor="c" stagger={0.025} />
      <Line t={t} text="AIへ" x={1730} y={911} size={40} weight={900} color={C.blue} t0={v(3.3)} anchor="c" stagger={0.04} />
      <Line t={t} text="頭を使う場所が、" x={960} y={392} size={84} color={C.ink} t0={v(2.8)} anchor="c" stagger={0.035} />
      <Line t={t} text="移った。" x={960} y={530} size={180} color={C.orange} t0={v(4.28)} anchor="c" stagger={0.06} dur={0.4} />
      </Lay>
    </>
  );
};

// ---- 10 怖いですよ。でも、頭を使うのはめちゃくちゃ楽しい。 ----
// 紙色の余白を残した大窓に素材動画 F3（机から Crane up で見下ろしへ、明るい床が広がる）。
// 「怖いですよ。」の札は上へ押し出され、Crane up と逆向きに結論の 2 行が下から入る。最後の 1 秒は窓ごと寄る
export const Cut10: React.FC<CutProps> = ({t, start}) => {
  const rate = 8.04 / 9.6;
  const exit = inExpo(prog(t, v(1.0), v(1.45)));
  const in1 = outExpo(prog(t, v(1.15), v(1.7)));
  const in2 = outExpo(prog(t, v(2.9), v(3.45)));
  const push = out3(prog(t, 7.6, 9.2));
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={1 + push * 0.045} ox={W / 2} oy={H / 2}>
        <div style={{position: 'absolute', left: 60, top: 40, width: W - 120, height: H - 80, borderRadius: 28, overflow: 'hidden', background: '#c9c0b5'}}>
          <Footage src="f10.mp4" absStart={start - 0.5} srcDur={8.04} rate={rate} w={W - 120} h={H - 80} fx={0.5} fy={0.5} />
        </div>
        {exit < 1 && t >= v(0.0) && (
          <Lay y={-exit * 360}>
            <Lay y={lerp(-200, 0, outExpo(prog(t, v(0.0), v(0.45))))}>
              <Card text="怖いですよ。" x={140} y={100} size={100} />
            </Lay>
          </Lay>
        )}
        {in1 > 0 && (
          <Lay y={(1 - in1) * 420}>
            <Card text="でも、頭を使うのは" x={180} y={650} size={84} />
          </Lay>
        )}
        {in2 > 0 && (
          <Lay y={(1 - in2) * 420}>
            <Card text="めちゃくちゃ楽しい。" x={180} y={790} size={132} color={C.orange} />
          </Lay>
        )}
      </Lay>
    </>
  );
};

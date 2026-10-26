// 06・08–10。各カットはカットの頭からの秒 t だけで決まる。声の頭は t=0.5。07（3D）は scene07.tsx。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, C, CodeWall, DrawLine, F, HL_W, HL_X, HL_Y, Lay, Line, Slam, TypingFrame, W, inExpo, inOut, kv, lerp, outBack, outExpo, prog} from './kit';
import type {CutProps} from './Main';

// ---- 06 書かないは判断。書けないは、手が止まる。 ----
// 実写の時刻: 原本 0:10 から等速 → 9.6 秒から 1.6 秒かけて減速し停止（y36 のスピードランプを「普通→ゆっくり→停止」に）
const RAMP_A = 9.6;
const RAMP_D = 1.6;
function footageTime(t: number) {
  const base = 1.0; // 書き出したコマは原本 0:09 から。0:10 を頭にする
  if (t < RAMP_A) return base + t;
  const u = Math.min(1, (t - RAMP_A) / RAMP_D);
  // 速さ v(u) = 1 - smoothstep(u) の積分
  return base + RAMP_A + RAMP_D * (u - u * u * u + (u * u * u * u) / 2);
}
export const Cut06: React.FC<CutProps> = ({t}) => {
  const mk = inOut(prog(t, 7.9, 8.9));
  // 窓は画面を横切って右上から左下へ（Tracking）
  const wx = lerp(1040, 140, mk);
  const wy = lerp(170, 560, mk) - Math.sin(Math.PI * mk) * 120;
  const ww = 760;
  const wh = 420;
  const sat = 1 - prog(t, 11.0, 11.6);
  const stopped = t > 11.15;
  const leftOut = inExpo(prog(t, 7.8, 8.4));
  const camS = 1 + 0.03 * prog(t, 0, 13);
  return (
    <AbsoluteFill>
      <Bg />
      <Lay s={camS} x={kv(t, [[0, 20], [13, -20]])}>
        <div style={{position: 'absolute', left: wx, top: wy, width: ww, height: wh, borderRadius: 26, overflow: 'hidden', background: C.ink, boxShadow: '0 24px 50px rgba(30,36,48,0.18)', transform: `scale(${outExpo(prog(t, 0.0, 0.6)) * 0.08 + 0.92 + 0.04 * Math.sin(Math.PI * mk)}) rotate(${-2 * Math.sin(Math.PI * mk)}deg)`, opacity: outExpo(prog(t, 0, 0.4))}}>
          <TypingFrame ft={footageTime(t)} w={ww} h={wh} sat={sat} fy={0.4} />
          {stopped ? <div style={{position: 'absolute', left: ww / 2 - 14, top: wh * 0.36, width: 28, height: 50, background: C.ink, boxShadow: '0 0 0 3px rgba(251,248,241,0.85)'}} /> : null}
        </div>
        <Lay y={-700 * leftOut} o={1 - leftOut}>
          <Slam t={t} text="書かない" x={140} y={330} size={200} color={C.red} t0={4.1} anchor="l" />
          <Line t={t} text="＝ 判断" x={150} y={470} size={110} t0={6.5} />
        </Lay>
        <Line t={t} text="一定以上を任せるなら、" x={150} y={700} size={52} weight={700} t0={0.5} t1={7.8} />
        <Line t={t} text="書かないと選んだ人" x={150} y={780} size={52} weight={700} t0={3.9} t1={7.85} />
        <Line t={t} text="書けない" x={1020} y={250} size={200} color={C.gray} t0={8.45} />
        <Line t={t} text="道具が止まると、" x={1030} y={540} size={64} t0={9.55} />
        <Line t={t} text="手が止まる。" x={1030} y={640} size={104} t0={10.35} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 08 なぜ、その設計？ 職種は説明できる範囲で決まる。 ----
const AppFrame: React.FC<{t: number}> = ({t}) => {
  const bars = [0, 1, 2, 3, 4];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 400, height: 760, borderRadius: 44, border: `7px solid ${C.ink}`, background: C.card, boxSizing: 'border-box', overflow: 'hidden'}}>
      {bars.map((b) => {
        // 「やり切った熱量」で中身が順に組み上がる
        const k = outExpo(prog(t, 6.9 + b * 0.32, 7.5 + b * 0.32));
        return (
          <div key={b} style={{position: 'absolute', left: 30, top: 34 + b * 92, width: 326, height: 66, borderRadius: 10, background: '#eceef1'}}>
            <div style={{position: 'absolute', left: 0, top: 0, height: '100%', width: `${k * 100}%`, borderRadius: 10, background: C.gray2}} />
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 120, bottom: 46, width: 146, height: 44, borderRadius: 22, background: C.gray2}} />
    </div>
  );
};
export const Cut08: React.FC<CutProps> = ({t}) => {
  const ai = outExpo(prog(t, 3.85, 4.55));
  const pk = inOut(prog(t, 9.3, 10.2));
  // アプリの図: 右から入り、問いの前に左下へ押しやられて小さくなる（Push in）
  const ax = lerp(lerp(2100, 1300, ai), 140, pk);
  const ay = lerp(150, 590, pk);
  const as = lerp(1, 0.4, pk);
  const camS = kv(t, [[0, 1.0], [9.3, 1.03], [10.4, 1.0], [19, 1.035]]);
  return (
    <AbsoluteFill>
      <Bg />
      <Lay s={camS} x={kv(t, [[0, -20], [9.3, 10], [19, -20]])}>
        <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${ax}px, ${ay}px) scale(${as}) rotate(${(1 - ai) * 6}deg)`, transformOrigin: '0 0'}}>
          <AppFrame t={t} />
        </div>
        <Line t={t} text="AI 使い放題" x={150} y={500} size={84} color={C.blue} t0={0.5} t1={9.2} />
        <Slam t={t} text="1週間" x={140} y={330} size={240} t0={2.6} t1={9.25} anchor="l" />
        <Line t={t} text="良くできたアプリが届いた" x={150} y={660} size={56} weight={700} t0={4.1} t1={9.3} />
        <Lay y={-(1 - outExpo(prog(t, 10.15, 10.55))) * 260}>
          <Slam t={t} text="なぜ、その設計？" x={420} y={250} size={124} color={C.red} t0={10.15} anchor="l" from={1.5} />
        </Lay>
        <Line t={t} text="答えられなかった。" x={424} y={380} size={76} t0={11.75} />
        <DrawLine x1={424} y1={522} x2={1560} y2={522} k={outExpo(prog(t, 13.9, 14.5))} color={C.gray2} w={4} cap="butt" />
        <Line t={t} text="職種は、" x={424} y={580} size={68} t0={14.0} />
        <Line t={t} text="説明できる範囲で決まる。" x={424} y={690} size={96} t0={15.6} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 09 次の仕事は、再出題じゃない。 ----
const GX = 1080;
const GY = 300;
const GB = 110;
const GG = 24;
const BIG = {x: 1390, y: 480, s: 380};
const Check: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{position: 'absolute', left: 0, top: 0}}>
    <polyline points="28,52 44,68 74,34" fill="none" stroke={C.gray} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Cut09: React.FC<CutProps> = ({t}) => {
  const gk = inOut(prog(t, 2.35, 3.25));
  const bigK = outBack(prog(t, 3.05, 3.6), 1.4);
  const camS = kv(t, [[0, 1.0], [2.4, 0.95], [3.6, 1.04], [10, 1.065]]);
  const boxes = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      const pop = outBack(prog(t, 0.15 + i * 0.035, 0.5 + i * 0.035), 1.6);
      const x0 = GX + c * (GB + GG);
      const y0 = GY + r * (GB + GG);
      // 中央の 1 つの箱へ吸い寄せられる
      const x = lerp(x0, BIG.x - GB / 2, gk);
      const y = lerp(y0, BIG.y - GB / 2, gk);
      const o = 1 - prog(t, 3.0, 3.3);
      if (o <= 0 || pop <= 0) continue;
      boxes.push(
        <div key={i} style={{position: 'absolute', left: x, top: y, width: GB, height: GB, borderRadius: 14, border: `3px solid ${C.gray2}`, background: '#f3f4f6', boxSizing: 'border-box', transform: `scale(${pop}) rotate(${gk * (i % 2 ? 20 : -20)}deg)`, opacity: o}}>
          <Check size={GB - 6} />
        </div>,
      );
    }
  return (
    <AbsoluteFill>
      <Bg />
      <Lay s={camS} ox={1100} oy={540}>
        {boxes}
        {bigK > 0 ? (
          <div style={{position: 'absolute', left: BIG.x - BIG.s / 2, top: BIG.y - BIG.s / 2, width: BIG.s, height: BIG.s, borderRadius: 30, border: `8px solid ${C.ink}`, background: C.card, boxSizing: 'border-box', transform: `scale(${bigK}) rotate(${lerp(-12, 0, Math.min(1, prog(t, 3.05, 3.9)))}deg)`}}>
            <div data-ch="1" style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.jp, fontWeight: 900, fontSize: 250, color: C.ink, lineHeight: 1, transform: `scale(${outBack(prog(t, 3.55, 3.95), 2)})`}}>？</div>
          </div>
        ) : null}
        <Line t={t} text="知っている" x={140} y={290} size={120} color={C.gray} dir="down" t0={0.2} t1={2.0} />
        <Line t={t} text="問題" x={140} y={430} size={120} color={C.gray} dir="down" t0={0.35} t1={2.1} />
        <Line t={t} text="次の仕事は、" x={146} y={740} size={66} t0={0.5} t1={4.6} />
        <Line t={t} text="再出題" x={140} y={250} size={210} dir="down" t0={2.35} />
        <Line t={t} text="じゃない。" x={146} y={490} size={140} dir="down" t0={2.75} />
        <Line t={t} text="問題が変わっても、手が動く。" x={146} y={780} size={64} color={C.red} t0={6.7} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 10 仲間として信頼できるのは、考えを説明できる人。 ----
export const Cut10: React.FC<CutProps> = ({t}) => {
  // 壁を引いて全体を見せ（Dolly out）、朱の 1 行から左右へ割れて消える
  const s = lerp(1.35, 1.0, outExpo(prog(t, 0, 3.6)));
  const split = 1500 * inExpo(prog(t, 3.5, 4.4));
  const hlO = 1 - prog(t, 3.9, 4.3);
  const bandO = 1 - prog(t, 3.7, 4.2);
  // 最後の行で画面を一度だけ押し込む
  const push = 1 + 0.045 * outExpo(prog(t, 6.3, 6.8)) + 0.02 * prog(t, 6.8, 10);
  const HCX = HL_X + HL_W / 2;
  return (
    <AbsoluteFill>
      <Bg />
      <Lay s={s} ox={HCX} oy={HL_Y}>
        <div style={{position: 'absolute', inset: 0, opacity: 1}}>
          <CodeWall flow={t * 0.8} hl={C.red} fade={0.75} split={split} hideHl={hlO <= 0} />
        </div>
      </Lay>
      <div style={{position: 'absolute', left: -40, top: 360, width: W + 80, height: 150, background: C.paper, opacity: bandO, boxShadow: '0 20px 40px rgba(30,36,48,0.08)'}} />
      <Line t={t} text="見ているのは、コードではなく理由。" x={960} y={400} size={70} anchor="c" t0={0.5} t1={3.7} colorAt={(i) => (i >= 14 && i <= 15 ? C.red : undefined)} />
      <Lay s={push} ox={180} oy={600}>
        <Line t={t} text="仲間として" x={180} y={200} size={112} t0={4.0} />
        <Line t={t} text="信頼できるのは、" x={180} y={350} size={112} t0={4.55} />
        <Line t={t} text="考えを説明できる人。" x={180} y={540} size={144} color={C.red} t0={6.1} />
        <Line t={t} text="見ているのは、コードではなく理由。" x={186} y={900} size={44} weight={700} color={C.gray} t0={7.4} />
      </Lay>
    </AbsoluteFill>
  );
};

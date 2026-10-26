// 01–05。各カットはカットの頭からの秒 t だけで決まる。声の頭は t=0.5（timeline.json の voiceOffset）。
// 秒の目安は audio/voice の実測（区切りの間の位置）から決めた。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, C, Card, CodeWall, DrawLine, F, H, HL_TEXT, HL_W, HL_X, HL_Y, Lay, Line, Plate, Slam, VLine, W, WALL, clamp, inExpo, inOut, kv, lerp, outExpo, prog} from './kit';
import {hash} from './lib/anim';
import type {CutProps} from './Main';

const HCX = HL_X + HL_W / 2; // 問われる行の中心（壁の座標）

// 壁のカメラ: 問われる行へ寄る。k=0 は全景、k=1 で行の中心が画面の中心に来る。zb は放射状のぶれの強さ
const WallCam: React.FC<{s: number; k: number; zb?: number; children: React.ReactNode}> = ({s, k, zb = 0, children}) => {
  const x = lerp(0, W / 2 - HCX, k);
  const y = lerp(0, H / 2 - HL_Y, k);
  const copies = zb > 0.02 ? [0.10, 0.05, 0] : [0];
  return (
    <>
      {copies.map((d, i) => (
        <Lay key={i} x={x} y={y} s={s * (1 + d * zb)} ox={HCX} oy={HL_Y} o={i === copies.length - 1 ? 1 : 0.28 * zb}>
          {children}
        </Lay>
      ))}
    </>
  );
};

// ---- 01 コードは、もう貼れる。 ----
export const Cut01: React.FC<CutProps> = ({t}) => {
  // 最後の 1.4 秒で行へ加速して寄る（Dolly in）。02 の頭の倍率 2.0 へ速度を保ったまま渡す
  const dk = prog(t, 5.6, 7.0);
  const s = lerp(1.04 - 0.04 * prog(t, 0, 5.6), 2.0, inExpo(dk) * 0.85 + dk * dk * 0.15);
  const k = inOut(dk);
  const zb = clamp((dk - 0.45) * 2.2);
  // 紙色の帯: 下から押し上がり（Crane up）、寄りの直前に上へ抜ける
  const bandY = kv(t, [
    [0.35, H + 40, outExpo],
    [1.25, 150],
    [5.2, 150, inExpo],
    [5.8, -520],
  ]);
  const drift = kv(t, [[0, 50], [5.4, -50]]);
  const bandS = 1 + 0.05 * prog(t, 1.0, 5.4);
  return (
    <AbsoluteFill>
      <Bg />
      <WallCam s={s} k={k} zb={zb}>
        <CodeWall flow={t} hl={C.ink} hlWeight={700} />
      </WallCam>
      <Lay y={bandY - 150} x={drift} s={bandS} ox={130} oy={400}>
        <div style={{position: 'absolute', left: -40, top: 150, width: W + 80, height: 390, background: C.paper, boxShadow: '0 30px 60px rgba(30,36,48,0.10)'}} />
        <Line t={t} text="コードは、" x={130} y={196} size={112} t0={0.85} />
        <Line t={t} text="もう貼れる。" x={130} y={334} size={160} t0={1.25} />
        <Line t={t} text="検索でも、AIでも。" x={1290} y={410} size={50} weight={700} color={C.gray} t0={2.1} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 02 この一行、なぜ？ ----
const GLYPHS = '#%&*<>{}[]/=+?!$;:~^';
export const Cut02: React.FC<CutProps> = ({t}) => {
  // 01 から続く寄り（2.0 → 2.12）。ぶれは頭の 0.4 秒で収まる
  const s = 2.0 + 0.12 * outExpo(prog(t, 0, 3.8)) + 0.05 * inOut(prog(t, 3.8, 4.4));
  const zb = 1 - outExpo(prog(t, 0, 0.45));
  const fade = lerp(1, 0.38, prog(t, 0.4, 2.0)) * lerp(1, 0.4, prog(t, 4.3, 5.0));
  // 組み変わり: 左から順に記号へ崩れ（3.9〜）、行の中心へ吸い込まれて消える
  const chars = Array.from(HL_TEXT);
  const cw = HL_W / chars.length;
  const lineChars = chars.map((ch, i) => {
    const a = 3.85 + i * 0.009;
    const sc = prog(t, a, a + 0.06) > 0 && t < a + 0.6;
    const gk = inExpo(prog(t, a + 0.18, a + 0.6));
    const g = sc ? GLYPHS[Math.floor(hash(i * 13 + Math.floor(t * 15)) * GLYPHS.length)] : ch;
    const dx = (HCX - (HL_X + (i + 0.5) * cw)) * gk;
    const dy = (hash(i + 5) - 0.5) * 30 * gk;
    if (gk >= 1) return null;
    return (
      <span key={i} style={{position: 'absolute', left: HL_X + i * cw, top: 0, width: cw, textAlign: 'center', transform: `translate(${dx}px, ${dy}px) scale(${1 - 0.7 * gk})`, opacity: 1 - gk, color: sc ? C.red : C.ink}}>
        {g === ' ' ? ' ' : g}
      </span>
    );
  });
  // 叩き込みに合わせた画面全体の押し込みと、半歩の押し戻し
  const cam = 1 + 0.05 * inOut(prog(t, 3.4, 4.4)) - 0.035 * outExpo(prog(t, 4.4, 4.9)) + 0.03 * prog(t, 4.9, 9);
  return (
    <AbsoluteFill>
      <Bg />
      <Lay s={cam}>
        <WallCam s={s} k={1} zb={zb}>
          <CodeWall flow={7 + 0.6 * t} hideHl fade={fade} />
          <div style={{position: 'absolute', left: 0, top: HL_Y - WALL.lh / 2, height: WALL.lh, width: W, fontFamily: F.mono, fontSize: WALL.size, lineHeight: `${WALL.lh}px`, fontWeight: 700, whiteSpace: 'pre'}}>{lineChars}</div>
          <DrawLine x1={HL_X} y1={HL_Y + 17} x2={HL_X + HL_W} y2={HL_Y + 17} k={outExpo(prog(t, 0.9, 1.5)) * (1 - prog(t, 3.9, 4.3))} w={3} cap="butt" />
        </WallCam>
        <Line t={t} text="この一行、" x={150} y={800} size={72} t0={0.7} t1={3.9} />
        <Lay s={1 + 0.1 * prog(t, 4.6, 9)} x={-50 * prog(t, 4.6, 9)} ox={960} oy={520}>
          <Slam t={t} text="なぜ？" x={960} y={470} size={330} color={C.red} t0={4.32} />
          <DrawLine x1={560} y1={700} x2={1360} y2={700} k={outExpo(prog(t, 6.1, 6.7))} w={8} cap="butt" />
          <Line t={t} text="貼ったコードでも、意図を聞く" x={960} y={740} size={58} weight={700} anchor="c" t0={6.25} />
        </Lay>
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 03 見ているのは、コードではなく理由。 ----
export const Cut03: React.FC<CutProps> = ({t}) => {
  // 「コード」が左上へ縮んで「コードではなく」になる（4.1〜4.7）
  const ck = inOut(prog(t, 4.1, 4.75));
  const cs = lerp(1, 0.215, ck);
  const cy = lerp(0, 172 - 330, ck);
  // 「理由」は右の画面外から横振りで入って止まる（Whip pan）
  const rk = outExpo(prog(t, 4.95, 5.45));
  const rx = lerp(1500, 0, rk);
  const rv = (1 - rk) * prog(t, 4.95, 5.0);
  const rs = 1 + 0.07 * prog(t, 5.45, 9);
  const camX = kv(t, [[0, 30], [4.1, -10], [9, -40]]);
  const camS = 1 + 0.025 * prog(t, 0, 9);
  return (
    <AbsoluteFill>
      <Bg />
      <Lay x={camX} s={camS}>
        <Line t={t} text="見ているのは、" x={140} y={170} size={76} t0={0.3} t1={3.95} />
        <Line t={t} text="自分の採用で" x={1700} y={930} size={42} weight={700} color={C.gray} anchor="r" t0={0.5} />
        <Lay s={cs} y={cy} ox={140} oy={330}>
          <Line t={t} text="コード" x={140} y={330} size={320} color={C.gray} t0={0.65} dir="left" stagger={0.06} dur={0.6} />
        </Lay>
        <Line t={t} text="ではなく" x={140 + 213} y={172} size={69} color={C.gray} t0={4.55} />
        <DrawLine x1={136} y1={208} x2={136 + 214} y2={208} k={outExpo(prog(t, 4.75, 5.1))} color={C.gray} w={7} cap="butt" />
        <Lay x={rx} s={rs} ox={1180} oy={520} style={{filter: rv > 0.01 ? `blur(${rv * 22}px)` : undefined}}>
          <Slam t={t} text="理由" x={1180} y={520} size={440} color={C.red} t0={4.95} from={1.15} />
        </Lay>
        <Line t={t} text="自分の言葉で、説明できるか。" x={140} y={820} size={70} t0={5.6} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 04 借りた答えでは、考えていないのと同じ。 ----
export const Cut04: React.FC<CutProps> = ({t}) => {
  const c1 = outExpo(prog(t, 0.3, 0.9));
  const c2 = outExpo(prog(t, 3.15, 3.75));
  const pop1 = 1 + 0.06 * inOut(prog(t, 0.6, 1.0)) - 0.06 * inOut(prog(t, 3.2, 3.6));
  const pop2 = 1 + 0.06 * inOut(prog(t, 3.5, 3.9)) - 0.06 * inOut(prog(t, 5.0, 5.4));
  // 「その答えでは、」で画面が右へ流れ、札は左に置き去りになって縮む（崩さない）
  const pk = inOut(prog(t, 5.9, 6.8));
  const cardS = lerp(1, 0.62, pk);
  const cardO = lerp(1, 0.6, pk);
  const camX = kv(t, [[0, 40], [5.9, 10], [6.8, -30], [10, -40]]);
  return (
    <AbsoluteFill>
      <Bg />
      <Lay x={camX}>
        <Lay s={cardS} ox={140} oy={420} o={cardO}>
          <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${lerp(-1300, 520, c1)}px, ${lerp(-260, 300, c1)}px) rotate(-2.5deg) scale(${pop1})`, transformOrigin: '50% 50%'}}>
            <Card text="「参考ページにこう書いてありました」" />
          </div>
          <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${lerp(2300, 860, c2)}px, ${lerp(760, 480, c2)}px) rotate(2.5deg) scale(${pop2})`, transformOrigin: '50% 50%'}}>
            <Card text="「AIが提案してきました」" />
          </div>
        </Lay>
        <Line t={t} text="その答えでは、" x={230} y={830} size={64} t0={5.75} />
        <Lay s={1 + 0.035 * prog(t, 6.6, 10)} ox={1440} oy={540}>
          <VLine t={t} text="考えていない、" x={1560} y={110} size={122} t0={6.55} />
          <VLine t={t} text="と同じ。" x={1400} y={110} size={122} t0={7.7} />
        </Lay>
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 05 貼ってもいい。全部じゃなくていい。 ----
// A（冒頭の留保）→ B（説明の例: 目的→選択→理由）→ C（終盤の留保）
const BX = {b1: 160, b2: 1246, b3: 2188};
const Block: React.FC<{t: number; t0: number; x: number; label: string; text: string; size: number; color: string; labelColor?: string}> = ({t, t0, x, label, text, size, color, labelColor = C.gray}) => (
  <>
    <Line t={t} text={label} x={x} y={390} size={42} weight={700} color={labelColor} t0={t0 - 0.1} />
    <Line t={t} text={text} x={x} y={462} size={size} color={color} t0={t0} stagger={0.02} />
  </>
);
export const Cut05: React.FC<CutProps> = ({t}) => {
  const aOut = inOut(prog(t, 8.15, 8.85));
  const bIn = outExpo(prog(t, 8.2, 9.0));
  const cPush = inOut(prog(t, 16.8, 17.5));
  // B のカメラ: 横へ送って目的→選択→理由を順に見せ、最後は理由の塊へ寄る
  const camX = kv(t, [
    [9.0, 0],
    [11.4, 0],
    [12.2, -946],
    [14.0, -970],
    [14.8, -1640],
    [14.95, -1650],
    [16.3, -1774],
    [16.8, -1790],
  ]);
  const zoom = 1 + 0.15 * inOut(prog(t, 14.9, 16.3));
  const drift = 1 + 0.03 * prog(t, 0, 8.2);
  return (
    <AbsoluteFill>
      <Bg />
      {/* A */}
      <Lay y={-1150 * aOut} s={drift} o={aOut < 1 ? 1 : 0}>
        <Line t={t} text="手で書くことだけが、" x={140} y={120} size={58} t0={0.4} />
        <Line t={t} text="大事なわけじゃない。" x={140} y={198} size={58} t0={0.7} />
        <Plate x={0} y={410} w={W} h={250} k={outExpo(prog(t, 6.45, 6.9))} color={C.gray3} from="b" style={{opacity: 1 - prog(t, 7.0, 7.8)}} />
        <Line t={t} text="貼ってもいい。" x={140} y={440} size={200} t0={6.5} stagger={0.03} dur={0.45} />
        <Line t={t} text="調べて、妥当な解を導けるなら" x={146} y={720} size={52} weight={700} color={C.gray} t0={3.75} />
      </Lay>
      {/* B */}
      {t > 8.1 && t < 17.6 ? (
        <Lay x={-2000 * cPush} y={1150 * (1 - bIn)}>
          <div style={{position: 'absolute', left: 140, top: 128, padding: '10px 18px', border: `3px solid ${C.ink}`, borderRadius: 10, fontFamily: F.jp, fontWeight: 700, fontSize: 34, lineHeight: 1, color: C.ink, opacity: prog(t, 8.6, 8.9)}}>
            <span data-ch="1">説明の例</span>
          </div>
          <Lay x={camX} s={zoom} ox={BX.b3 + 546} oy={540}>
            {/* 画面の外へ送る塊は、切れた語を読ませないよう送り出しながら薄くする */}
            <div style={{position: 'absolute', inset: 0, opacity: 1 - 0.85 * prog(t, 11.7, 12.3)}}>
              <Block t={t} t0={9.5} x={BX.b1} label="目的" text="あとから変更しやすくしたい" size={72} color={C.ink} />
              <DrawLine x1={BX.b1 + 960} y1={500} x2={BX.b2 - 40} y2={500} k={outExpo(prog(t, 11.0, 11.6))} color={C.ink} w={6} head={26} />
            </div>
            <div style={{position: 'absolute', inset: 0, opacity: 1 - 0.85 * prog(t, 14.05, 14.55)}}>
              <Block t={t} t0={11.75} x={BX.b2} label="選択" text="処理を役割ごとに分けた" size={72} color={C.ink} />
            </div>
            <DrawLine x1={BX.b2 + 820} y1={500} x2={BX.b3 - 40} y2={500} k={outExpo(prog(t, 13.4, 14.0))} color={C.ink} w={6} head={26} />
            <Block t={t} t0={14.6} x={BX.b3} label="理由" text="一部分を直しやすくするため" size={84} color={C.red} labelColor={C.red} />
          </Lay>
        </Lay>
      ) : null}
      {/* C */}
      {t > 16.7 ? (
        <Lay x={1900 * (1 - cPush)} s={1 + 0.03 * prog(t, 17.5, 21)} ox={140} oy={540}>
          <Line t={t} text="貼ってもいい。" x={1700} y={150} size={60} color={C.gray} anchor="r" t0={17.25} />
          <Line t={t} text="全部に" x={140} y={360} size={150} t0={17.6} />
          <Line t={t} text="答えられなくてもいい。" x={140} y={550} size={120} t0={17.95} />
          <DrawLine x1={144} y1={748} x2={800} y2={748} k={outExpo(prog(t, 18.9, 19.4))} w={7} cap="butt" />
          <Line t={t} text="なぜそうしたかは、聞く。" x={144} y={784} size={56} color={C.red} t0={19.15} />
        </Lay>
      ) : null}
    </AbsoluteFill>
  );
};


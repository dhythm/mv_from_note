// 01–03: 温度差の実感 → 答え（温度差） → 打ち返しても止まる
// 時刻はカットの頭からの秒。声はカットの頭から VO 秒後に始まる（語の位置は audio/voice/words.json の実測）。
import React from 'react';
import {Bg, C, Dot, DrawLine, F, H, Lay, Line, Plate, Thermo, VLine, W, inOut, kv, lerp, outExpo, out3, prog} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s; // 声の頭からの秒 → カットの頭からの秒

// ---- 01 一番動いている人が、ズレている気がしてくる ----
export const Cut01: React.FC<CutProps> = ({t}) => {
  // 斜めの境界で二分割。頭は境界が右から掃くように入り（Whip pan）、「他人事に見える」で青の面が広がる
  const sweep = outExpo(prog(t, 0, 0.75));
  const shift = inOut(prog(t, v(4.9), v(5.8)));
  const bx = lerp(W + 400, 1010, sweep) - shift * 360;
  const sk = 280;
  const merc = kv(t, [[v(1.4), 0.1], [v(3.0), 0.4, outExpo], [v(4.9), 0.4], [v(5.8), 0.84, outExpo]]);
  // 主文が入るときに寄る（Dolly in）
  const push = outExpo(prog(t, v(6.0), v(6.9)));
  return (
    <>
      <Bg color={C.redPale} />
      <Lay s={1 + push * 0.05} ox={W / 2} oy={H * 0.75}>
        <div style={{position: 'absolute', inset: 0, background: C.bluePale, clipPath: `polygon(${bx}px -10px, ${W + 400}px -10px, ${W + 400}px ${H + 10}px, ${bx - sk}px ${H + 10}px)`}} />
        {/* 熱量は左上へ縮み、他人事は大きくなる（面の比率と文字サイズの逆転） */}
        <Lay s={lerp(1, 0.6, shift)} ox={140} oy={190}>
          <Line t={t} text="熱量" x={140} y={190} size={230} color={C.red} t0={v(0.0)} stagger={0.06} />
        </Lay>
        <Lay s={lerp(1, 1.32, shift)} ox={1790} oy={210}>
          <Line t={t} text="他人事" x={1790} y={210} size={190} color={C.blue} t0={v(3.9)} dir="left" anchor="r" stagger={0.05} />
        </Lay>
        <Thermo x0={150} x1={1770} y={590} k={merc} draw={outExpo(prog(t, 0.3, 1.3))} />
        <Line t={t} text="一番動いている人が、" x={150} y={730} size={78} color={C.ink} t0={v(6.0)} />
        <Line t={t} text="ズレている気がしてくる。" x={150} y={850} size={78} color={C.ink} t0={v(6.3)} colorAt={(i) => (i < 2 ? C.red : undefined)} />
      </Lay>
    </>
  );
};

// ---- 02 疲れだけじゃない。温度差。 ----
export const Cut02: React.FC<CutProps> = ({t}) => {
  // 「疲れ」に寄り（Zoom in）、2 行が抜けたあと、両端の点と線が引かれ、「温度差」が最大サイズで叩き込まれる
  const z = kv(t, [[0, 1.0], [v(3.2), 1.14, out3]]);
  const smash = kv(t, [[v(6.5), 1.5], [v(6.9), 1.0, outExpo]]);
  const apart = outExpo(prog(t, v(7.2), v(8.0)));
  const rx = 230 - apart * 90;
  const bx = 1690 + apart * 90;
  const lineK = outExpo(prog(t, v(3.7), v(5.4)));
  // 点と線は画面の中ほどで引かれ、「温度差」が入る瞬間に上へ跳ね上がる
  const up = outExpo(prog(t, v(6.35), v(6.75)));
  const ly = lerp(560, 190, up);
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={z} ox={160} oy={300} o={1 - prog(t, v(3.3), v(3.7))}>
        <Line t={t} text="疲れ" x={140} y={150} size={290} color={C.ink} t0={0.15} t1={v(3.3)} stagger={0.07} />
        <Line t={t} text="だけじゃない。" x={145} y={480} size={196} color={C.ink} t0={v(1.9)} t1={v(3.35)} dir="left" stagger={0.035} />
        <Thermo x0={150} x1={1300} y={820} k={0.35} draw={outExpo(prog(t, 0.4, 1.4))} />
      </Lay>
      {/* 二つの熱量の間の距離（温度差） */}
      <DrawLine x1={rx} y1={ly} x2={lerp(rx, bx, lineK)} y2={ly} k={lineK > 0 ? 1 : 0} color={C.ink} w={lerp(8, 5, up)} />
      <Dot x={rx} y={ly} r={lerp(52, 34, up)} color={C.red} s={outExpo(prog(t, v(3.6), v(4.0)))} />
      <Dot x={bx} y={ly} r={lerp(52, 34, up)} color={C.blue} s={outExpo(prog(t, v(5.2), v(5.6)))} />
      <Line t={t} text="周囲" x={1760} y={650} size={130} color={C.blue} t0={v(4.75)} t1={v(6.3)} anchor="r" />
      <Line t={t} text="熱量" x={160} y={650} size={130} color={C.red} t0={v(5.85)} t1={v(6.3)} />
      <Lay s={smash} ox={W / 2} oy={560}>
        <Line t={t} text="温度差" x={W / 2} y={340} size={430} color={C.ink} t0={v(6.5)} anchor="c" stagger={0.04} dur={0.35} />
      </Lay>
      <Line t={t} text="出し切った反動だけじゃない" x={W / 2} y={880} size={56} weight={700} color={C.ink} t0={v(7.3)} anchor="c" stagger={0.02} />
    </>
  );
};

// ---- 03 打ち返しても、止まる。 ----
const arc = (cx: number, cy: number, r: number) => `M${cx - r * 0.5},${cy - r * 0.87} A${r},${r} 0 0 0 ${cx - r * 0.5},${cy + r * 0.87}`;
export const Cut03: React.FC<CutProps> = ({t}) => {
  const hit = v(4.95);
  // 球は壁の手前で加速して止まる（Tracking＋Speed ramp）
  const ballX = kv(t, [[v(3.0), 330], [hit, 1478, (k) => k * k * k * k]]);
  const ballS = outExpo(prog(t, v(2.2), v(2.6)));
  // 当たった瞬間に画面全体を一度だけ押し込む
  const press = kv(t, [[hit, 1], [hit + 0.08, 0.93, outExpo], [hit + 0.7, 1, inOut]]);
  const wallX = kv(t, [[hit, 0], [hit + 0.06, 18, outExpo], [hit + 0.5, 0]]);
  // 「疑問が湧く」で文字の塊は退き、球と壁へ寄る
  const doubt = inOut(prog(t, v(8.1), v(8.9)));
  const aim = outExpo(prog(t, v(2.5), v(2.95))) * (1 - prog(t, v(3.0), v(3.3)));
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={press} ox={W / 2} oy={H / 2}>
        <Lay s={1 + doubt * 0.09} ox={1560} oy={690}>
          <Lay x={wallX}>
            <Plate x={1560} y={260} w={150} h={640} k={outExpo(prog(t, 0.1, v(0.6)))} color={C.blue} from="t" />
            <VLine t={t} text="確認" x={1635} y={480} size={66} color={C.white} t0={v(0.25)} />
          </Lay>
          {aim > 0 && <DrawLine x1={420} y1={690} x2={780} y2={690} k={aim} color={C.red} w={8} />}
          {/* 走った跡（球の後ろに残る線） */}
          {t > v(3.0) && <DrawLine x1={300} y1={690} x2={ballX - 90} y2={690} k={1 - prog(t, hit + 0.1, hit + 0.6)} color={C.red} w={8} />}
          {[0, 1, 2].map((i) => {
            const k = outExpo(prog(t, hit + 0.04 + i * 0.07, hit + 0.5 + i * 0.07));
            return k > 0 ? (
              <svg key={i} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
                <path d={arc(1478 - 20 - i * 34 * k, 690, 70 + i * 26)} fill="none" stroke={C.red} strokeWidth={6} strokeLinecap="round" opacity={0.85 - i * 0.15} />
              </svg>
            ) : null;
          })}
          <Dot x={ballX} y={690} r={80} color={C.red} s={ballS} />
          {ballS > 0.3 && (
            <div style={{position: 'absolute', left: ballX - 80, top: 690 - 30, width: 160, textAlign: 'center', fontFamily: F.noto, fontWeight: 900, fontSize: 52, lineHeight: 1, color: C.white, fontFeatureSettings: '"palt" 1', transform: `scale(${ballS})`}}>全力</div>
          )}
        </Lay>
        <Lay s={1 - doubt * 0.08} y={-doubt * 40} ox={140} oy={230}>
          <Line t={t} text="打ち返しても、" x={140} y={150} size={104} color={C.ink} t0={v(2.95)} t1={hit - 0.6} />
          <Line t={t} text="止まる。" x={140} y={230} size={270} color={C.ink} t0={hit} dur={0.3} stagger={0.025} />
          <Line t={t} text="本当に、本気なのだろうか" x={150} y={600} size={60} weight={700} color={C.gray} t0={v(6.0)} />
        </Lay>
      </Lay>
    </>
  );
};

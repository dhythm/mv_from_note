// 01–03: 思い込み → 本人の実感（反転） → 手放したもの（留保）
// 時刻はカットの頭からの秒。声はカットの頭から VO 秒後に始まる（語の位置は audio/voice/words.json の実測）。
import React from 'react';
import {Bg, C, Circle, DrawLine, F, H, Lay, Line, W, inOut, kv, lerp, mix, outExpo, out3, prog, typeBase} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s; // 声の頭からの秒 → カットの頭からの秒

// 01 の終わりの字組み（02 の頭で同じ画から受け渡す）
const C01 = {x: 150, y1: 210, y2: 360, y3: 640, s1: 96, s2: 190, s3: 60};
// 01 の「頭を使わなくなる。」の取り消し線（右端は文字幅の実測に近い値）
const STRIKE = {x1: C01.x - 20, x2: C01.x + 190 * 9 * 0.98 + 20, y: C01.y2 + 190 * 0.55};

// ---- 01 AIを使うと、頭を使わなくなる。 ----
export const Cut01: React.FC<CutProps> = ({t}) => {
  // 頭は「AIを使うと、」が画面より大きく入り、Dolly out で左上へ収まる
  const out = outExpo(prog(t, 0.1, v(1.1)));
  const s = lerp(2.3, 1, out);
  const x = lerp(260, 0, out);
  const y = lerp(150, 0, out);
  // 「よく言われる」で塊ごと一段持ち上げ（Truck）、最後に取り消し線が走り始める
  const lift = outExpo(prog(t, v(3.0), v(3.6)));
  const strike = kv(t, [[8.3, 0], [9.0, 0.35, inOut]]);
  // 「そう思っている人は、かなり多い」で主役の行へ一段寄り、取り消し線の前に戻す
  const lean = kv(t, [[v(4.3), 1], [v(5.0), 1.1, outExpo], [7.9, 1.1], [8.4, 1, inOut]]);
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={lean} ox={C01.x} oy={C01.y2 + 100}>
      <Lay x={x} y={y - lift * 40} s={s} ox={C01.x} oy={C01.y1}>
        <Line t={t} text="AIを使うと、" x={C01.x} y={C01.y1} size={C01.s1} weight={800} color={mix(C.ink, C.gray, prog(t, v(0.9), v(1.4)))} t0={0.05} stagger={0.04} />
        <Line t={t} text="頭を使わなくなる。" x={C01.x} y={C01.y2} size={C01.s2} t0={v(0.9)} stagger={0.035} />
        <Line t={t} text="——と、よく言われる。" x={C01.x + 6} y={C01.y3} size={C01.s3} weight={700} color={C.gray} t0={v(3.1)} dir="left" stagger={0.02} />
        <DrawLine x1={STRIKE.x1} y1={STRIKE.y} x2={STRIKE.x2} y2={STRIKE.y} k={strike} color={C.ink} w={16} />
      </Lay>
      </Lay>
    </>
  );
};

// ---- 02 私は、逆だ。以前より、頭を使っている。 ----
// 01 の終わりの画から始め、取り消し線を引き切る。画面全体が 90° Roll して 01 の文は床へ倒れ、02 の文が下から起き上がる
const PIVOT = {x: W / 2, y: H * 1.55};
export const Cut02: React.FC<CutProps> = ({t}) => {
  const strike = kv(t, [[0, 0.35], [0.45, 1, outExpo]]);
  const sink = prog(t, 0.2, 0.7);
  const roll = inOut(prog(t, v(2.55), v(3.35)));
  // 起き上がった後、「頭を使っている。」で叩き込み、その後も少し寄り続ける
  const smash = kv(t, [[v(6.35), 1.18], [v(6.75), 1, outExpo]]);
  const push = out3(prog(t, v(6.75), 10));
  return (
    <>
      <Bg color={C.paper} />
      {roll < 1 && (
        <Lay r={roll * 90} ox={PIVOT.x} oy={PIVOT.y}>
          <Line t={t} text="AIを使うと、" x={C01.x} y={C01.y1 - 40} size={C01.s1} weight={800} color={mix(C.gray, C.grayText, sink)} t0={-5} />
          <Line t={t} text="頭を使わなくなる。" x={C01.x} y={C01.y2 - 40} size={C01.s2} color={mix(C.ink, C.grayText, sink)} t0={-5} />
          <Line t={t} text="——と、よく言われる。" x={C01.x + 6} y={C01.y3 - 40} size={C01.s3} weight={700} color={mix(C.gray, C.grayText, sink)} t0={-5} />
          <DrawLine x1={STRIKE.x1} y1={STRIKE.y - 40} x2={STRIKE.x2} y2={STRIKE.y - 40} k={strike} color={C.ink} w={16} />
          <Line t={t} text="私は、逆だ。" x={1780} y={790} size={150} color={C.ink} t0={v(0.0)} dir="left" anchor="r" stagger={0.045} />
        </Lay>
      )}
      {roll > 0 && (
        <Lay r={(roll - 1) * 90} ox={PIVOT.x} oy={PIVOT.y}>
          <Lay s={smash * (1 + push * 0.045)} ox={W / 2} oy={470}>
            <Lay s={lerp(1.9, 1, inOut(prog(t, v(4.45), v(5.0))))} y={lerp(260, 0, inOut(prog(t, v(4.45), v(5.0))))} ox={W / 2} oy={190}>
              <Line t={t} text="AIを使い始めてから" x={W / 2} y={160} size={64} weight={800} color={mix(C.ink, C.gray, prog(t, v(4.45), v(5.0)))} t0={v(2.85)} anchor="c" stagger={0.025} />
            </Lay>
            <Line t={t} text="以前より、" x={W / 2} y={300} size={130} color={C.ink} t0={v(4.85)} anchor="c" stagger={0.05} />
            <Line t={t} text="頭を使っている。" x={W / 2} y={500} size={232} color={C.orange} t0={v(6.35)} anchor="c" stagger={0.035} dur={0.4} />
          </Lay>
        </Lay>
      )}
    </>
  );
};

// ---- 03 手放したものは、ある。 ----
// 慣れた領域の円から語が 1 つずつ青い矢印に吸われて「AIへ」流れ、そのたびに円が縮んで左へ寄る（語が抜けると円が縮む＝因果）
export const C03 = {cx0: 900, cy: 600, r0: 320, cx2: 470, r2: 150, ax: 1470};
export const Cut03: React.FC<CutProps> = ({t}) => {
  const tA = v(4.3); // 「コードを読む」が抜ける
  const tB = v(7.0); // 「慣れた仕事」が抜ける
  const shrink = kv(t, [[tA, 0], [tA + 0.6, 0.5, outExpo], [tB, 0.5], [tB + 0.6, 1, outExpo]]);
  const r = lerp(C03.r0, C03.r2, shrink);
  const cx = lerp(C03.cx0, C03.cx2, shrink);
  const circleIn = outExpo(prog(t, 0.15, 0.85));
  const arrowK = outExpo(prog(t, v(3.6), v(4.2)));
  // 矢印は円の右端から「AIへ」の手前まで（語に掛からない）
  const ax1 = cx + r + 30;
  const ax2 = C03.ax - 50;
  // 吸われる語: 円の中 → 矢印の先（AIへ）へ流れて小さくなる
  const fly = (t0: number) => outExpo(prog(t, t0, t0 + 0.7));
  const item = (text: string, y: number, t0: number, tIn: number) => {
    const k = fly(t0);
    if (k >= 0.999) return null;
    const x0 = cx;
    const x = lerp(x0, C03.ax + 40, k);
    const yy = lerp(y, C03.cy - 30, k);
    return (
      <div style={{position: 'absolute', left: x, top: yy, transform: `scale(${1 - k * 0.7})`, transformOrigin: '0 50px', opacity: 1 - prog(k, 0.75, 1)}}>
        <Line t={t} text={text} x={0} y={0} size={62} weight={800} color={k > 0 ? C.blue : C.ink} t0={tIn} anchor="c" stagger={0.03} />
      </div>
    );
  };
  return (
    <>
      <Bg color={C.paper} />
      <Line t={t} text="手放したものは、ある。" x={130} y={110} size={92} color={C.ink} t0={v(0.0)} stagger={0.035} />
      <Circle x={cx} y={C03.cy} r={r * circleIn} fill={C.grayPale} stroke={C.gray} sw={6}>
        <div style={{...typeBase, left: '50%', top: lerp(C03.r0 * 0.36, C03.r2 * 0.78, shrink), transform: 'translateX(-50%)', fontFamily: F.noto, fontWeight: 800, fontSize: lerp(68, 44, shrink), color: C.gray}}>
          {Array.from('慣れた領域').map((ch, i) => (
            <span key={i} data-ch="1" style={{display: 'inline-block', opacity: outExpo(prog(t, 0.4 + i * 0.04, 0.9 + i * 0.04))}}>
              {ch}
            </span>
          ))}
        </div>
      </Circle>
      {item('コードを読む', C03.cy - 10, tA, v(2.45))}
      {item('慣れた仕事', C03.cy + 80, tB, v(5.3))}
      <DrawLine x1={ax1} y1={C03.cy} x2={lerp(ax1, ax2, arrowK)} y2={C03.cy} k={arrowK > 0 ? 1 : 0} color={C.blue} w={9} head={34} />
      <Lay s={kv(t, [[tA + 0.55, 1], [tA + 0.7, 1.12, outExpo], [tA + 1.1, 1], [tB + 0.55, 1], [tB + 0.7, 1.12, outExpo], [tB + 1.1, 1]])} ox={C03.ax + 150} oy={C03.cy}>
        <Line t={t} text="AIへ" x={C03.ax} y={C03.cy - 95} size={190} color={C.blue} t0={v(3.9)} dir="left" stagger={0.05} />
      </Lay>
      <Line t={t} text="外注と同じで、ほとんど手がかからない" x={130} y={900} size={58} weight={700} color={C.gray} t0={v(7.4)} stagger={0.018} />
    </>
  );
};

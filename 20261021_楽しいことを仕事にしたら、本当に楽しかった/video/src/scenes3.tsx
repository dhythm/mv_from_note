// 11–14: つくり方が変わる → 循環 → 留保 → 最後の肯定
import React from 'react';
import {Bg, C, DrawLine, F, H, Lay, Line, Plate, W, inOut, kv, outExpo, prog} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s;

// ---- 11 つくり方も、変わる。 ----
export const Cut11: React.FC<CutProps> = ({t}) => {
  const send = inOut(prog(t, v(2.3), v(3.4))); // コードの行を AI の面へ送る
  const plate = outExpo(prog(t, v(1.9), v(2.5)));
  const band = outExpo(prog(t, v(5.6), v(6.3)));
  return (
    <>
      <Bg color={C.ink} />
      <Lay s={kv(t, [[0, 1.0], [10, 1.06]])} ox={W / 2} oy={420}>
        <DrawLine x1={680 + send * 470} y1={310} x2={1110} y2={310} k={outExpo(prog(t, v(0.8), v(1.7))) * (1 - Math.min(1, send * 3))} color={C.mute} w={7} head={30} />
        <Lay x={send * 1050}>
          <Line t={t} text="コード" x={170} y={230} size={150} font={F.dot} color={C.white} t0={v(0.35)} />
        </Lay>
        {/* 面は文字より手前。コードはこの面の後ろへ入る */}
        <Plate x={1150} y={140} w={640} h={330} k={plate} color={C.amber} from="l" />
        <Line t={t} text="AI" x={1470} y={190} size={230} font={F.dela} color={C.amber} t0={v(0.0)} anchor="c" />
        {/* 面が開いた範囲だけ、同じ位置に黒い字を重ねる（アンバー同士で字が消えないように） */}
        {plate > 0 && (
          <div style={{position: 'absolute', inset: 0, clipPath: `inset(140px ${W - 1150 - 640 * plate}px ${H - 470}px 1150px)`}}>
            <Line t={t} text="AI" x={1470} y={190} size={230} font={F.dela} color={C.ink} t0={v(0.0)} anchor="c" />
          </div>
        )}
      </Lay>
      <Line t={t} text="つくり方は、変わる。" x={170} y={560} size={112} color={C.white} t0={v(4.1)} />
      {/* 前景の大きな一行が、画面を斜めに横断する */}
      <Lay r={-4} x={(1 - band) * 2900 + kv(t, [[v(6.3), 0], [10, -50]])} ox={W / 2} oy={850} o={band > 0 ? 1 : 0}>
        <div style={{position: 'absolute', left: -300, top: 750, width: 2800, height: 190, background: C.amber}} />
        <Line t={t} text="夢中になるのは、変わらない。" x={140} y={790} size={112} color={C.ink} t0={v(5.75)} dir="left" stagger={0.025} />
      </Lay>
    </>
  );
};

// ---- 12 楽しいから、もっと考える。 ----
export const Cut12: React.FC<CutProps> = ({t}) => {
  const cx = 960;
  const cy = 560;
  const R = 370;
  const orbit = inOut(prog(t, v(5.7), v(7.6))) * 120; // 位置を受け渡して循環を一周見せる
  const pos = (deg: number) => {
    const a = ((deg + orbit) * Math.PI) / 180;
    return [cx + Math.cos(a) * R * 1.4, cy + Math.sin(a) * R];
  };
  const P = [pos(-150), pos(-30), pos(90)]; // 楽しい・考える・成果
  const words: [string, string, number][] = [
    ['楽しい', C.amber, v(0.0)],
    ['考える', C.white, v(1.0)],
    ['成果', C.white, v(2.8)],
  ];
  const SIZE = 130;
  // 語の外接矩形の半分の幅・高さ（Dela の全角は約 1em 幅）
  const half = (i: number) => [(Array.from(words[i][0]).length * SIZE) / 2, SIZE * 0.55];
  const seg = (i: number, j: number, k: number) => {
    const a = P[i];
    const b = P[j];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const pad = 34;
    // 中心から矩形の縁までの距離（線の向きで決まる）
    const exit = (h: number[]) => Math.min(Math.abs(ux) > 1e-6 ? h[0] / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? h[1] / Math.abs(uy) : 1e9) + pad;
    const ea = exit(half(i));
    const eb = exit(half(j));
    return <DrawLine x1={a[0] + ux * ea} y1={a[1] + uy * ea} x2={b[0] - ux * eb} y2={b[1] - uy * eb} k={k} color={C.amber} w={8} head={30} />;
  };
  const pull = inOut(prog(t, v(8.2), 10));
  return (
    <>
      <Bg color={C.ink} />
      {/* 下層の面は回り込み続ける */}
      <Lay r={kv(t, [[-0.5, -40], [10, 70]])} s={1.0 + 0.1 * Math.sin(t * 0.5)} ox={cx} oy={cy}>
        <div style={{position: 'absolute', left: cx - 600, top: cy - 600, width: 1200, height: 1200, borderRadius: 240, background: C.ink2}} />
      </Lay>
      <Lay s={1 + pull * 0.7} ox={P[0][0]} oy={P[0][1]}>
        {seg(0, 1, outExpo(prog(t, v(0.8), v(1.6))))}
        {seg(1, 2, outExpo(prog(t, v(2.5), v(3.3))))}
        {seg(2, 0, outExpo(prog(t, v(3.8), v(4.6))))}
        {words.map(([w, col, t0], i) => (
          <Line key={w} t={t} text={w} x={P[i][0]} y={P[i][1] - SIZE / 2} size={SIZE} font={F.dela} color={col} t0={t0} anchor="c" />
        ))}
        <Line t={t} text="もっと、" x={cx} y={cy - 62} size={58} color={C.amber} t0={v(4.0)} anchor="c" />
        <Line t={t} text="楽しい。" x={cx} y={cy + 8} size={58} color={C.amber} t0={v(4.15)} anchor="c" />
      </Lay>
    </>
  );
};

// ---- 13 大変なことも、ある。 ----
export const Cut13: React.FC<CutProps> = ({t}) => {
  const drift = kv(t, [[-0.5, 120], [10, -110]]);
  const edge = inOut(prog(t, v(7.6), 10));
  return (
    <>
      <Bg color={C.paper} />
      <Lay x={drift}>
        <Line t={t} text="趣味にしておきたい。" x={200} y={200} size={132} font={F.min} weight={400} color={C.ink} t0={v(0.05)} dir="left" stagger={0.04} />
        <Line t={t} text="それもいい。" x={1700} y={400} size={132} font={F.min} weight={400} color={C.ink} t0={v(2.75)} anchor="r" dir="left" stagger={0.05} />
      </Lay>
      <Lay x={-drift * 0.6}>
        <Plate x={140} y={640} w={1210} h={190} k={outExpo(prog(t, v(4.8), v(5.4)))} color={C.amber} from="b">
          <Line t={t} text="大変なことも、ある。" x={50} y={36} size={118} color={C.ink} t0={v(4.95)} />
        </Plate>
      </Lay>
      {/* 次の肯定へ: 右端からアンバーの面が幅を広げる */}
      <div style={{position: 'absolute', top: -20, height: H + 40, left: W + 160 - edge * 560, width: 600, background: C.amber, transform: 'skewX(-12deg)'}} />
    </>
  );
};

// ---- 14 好きなことを仕事にするって、めっちゃいい。 ----
export const Cut14: React.FC<CutProps> = ({t}) => {
  const slam = outExpo(prog(t, v(4.0), v(4.7)));
  const re = inOut(prog(t, v(5.7), v(6.5))); // 斜めの組み替え
  const align = inOut(prog(t, v(6.3), v(8.6))); // 二段が正面でそろう
  const band = kv(t, [[-0.5, 1700], [12, -900]]);
  return (
    <>
      <Bg color={C.amber} />
      <div style={{position: 'absolute', left: band, top: -300, width: 380, height: H + 600, background: C.amberDeep, transform: 'rotate(-20deg)', opacity: 0.5}} />
      <Lay x={-re * 40} y={-re * 70} r={-re * 4} s={1 - re * 0.22} ox={150} oy={180}>
        <Line t={t} text="好きなことを仕事にするって、" x={150} y={170} size={86} color={C.ink} t0={v(0.85)} stagger={0.025} />
        <Lay s={1.8 - 0.8 * slam} ox={900} oy={460} o={slam > 0 ? 1 : 0}>
          <Line t={t} text="めっちゃいい。" x={100} y={330} size={250} font={F.dela} color={C.ink} t0={v(3.95)} dur={0.35} stagger={0.03} />
        </Lay>
      </Lay>
      <Lay x={(1 - align) * -160} y={re > 0 ? 0 : 400}>
        <Line t={t} text="楽しんで、" x={240} y={560} size={190} font={F.dela} color={C.ink} t0={v(6.0)} dir="right" />
      </Lay>
      <Lay x={(1 - align) * 200}>
        <Plate x={200} y={790} w={1380} h={230} k={outExpo(prog(t, v(6.4), v(7.0)))} color={C.ink} from="r">
          <Line t={t} text="お金をもらう。" x={60} y={36} size={160} font={F.dela} color={C.white} t0={v(6.55)} dir="left" />
        </Plate>
      </Lay>
    </>
  );
};

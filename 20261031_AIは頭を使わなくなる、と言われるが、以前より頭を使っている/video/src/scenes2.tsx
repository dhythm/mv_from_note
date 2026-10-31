// 04–06: 未経験が来た（素材動画 F1） → あえて慣れていないほうへ（留保） → これで良いですか？
import React from 'react';
import {Bg, C, Card, Circle, DrawLine, F, Footage, H, Lay, Line, W, inExpo, inOut, kv, lerp, mix, outExpo, prog, typeBase} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';
import {C03} from './scenes1';

const v = (s: number) => VO + s;

// ---- 04 その分、未経験が来た。 ----
// 03 の終わりの画（縮んだ慣れた領域の円）を引き継ぐ。右に「未経験」の円の窓が開き、その中で素材動画の床が明るくなる。
// 5 つの仕事が四方から札ごと叩き込まれるたび、窓は画面いっぱいへ広がり、慣れた領域の円は点まで縮む。
const WIN0 = {x: 1070, y: 230, w: 660, h: 660, r: 330};
const WIN1 = {x: 40, y: 40, w: 1840, h: 1000, r: 28};
const JOBS: {text: string; t0: number; x: number; y: number; size: number; anchor: 'l' | 'c' | 'r'; dx: number; dy: number}[] = [
  {text: 'インフラ', t0: v(4.42), x: 120, y: 100, size: 96, anchor: 'l', dx: -520, dy: -260},
  {text: '技術選定', t0: v(5.3), x: 1800, y: 130, size: 84, anchor: 'r', dx: 640, dy: 0},
  {text: '営業', t0: v(6.64), x: 150, y: 760, size: 132, anchor: 'l', dx: 0, dy: 520},
  {text: 'コンサル', t0: v(7.58), x: 1800, y: 540, size: 96, anchor: 'r', dx: 640, dy: 0},
  {text: 'コンテンツ制作', t0: v(8.44), x: 1010, y: 820, size: 100, anchor: 'c', dx: 0, dy: 480},
];
export const Cut04: React.FC<CutProps> = ({t, start}) => {
  // 03 の残り（題・矢印・AIへ・注記）は最初の 0.45 秒で外へ抜ける
  const away = inExpo(prog(t, 0, 0.45));
  const winIn = outExpo(prog(t, 0.35, 1.05));
  const grow = kv(t, [[v(4.0), 0], [v(5.3), 0.55, outExpo], [v(6.64), 0.55], [v(7.5), 1, outExpo]]);
  const bx = lerp(WIN0.x, WIN1.x, grow);
  const by = lerp(WIN0.y, WIN1.y, grow);
  const bw = lerp(WIN0.w, WIN1.w, grow);
  const bh = lerp(WIN0.h, WIN1.h, grow);
  const br = lerp(WIN0.r, WIN1.r, grow);
  // 円の窓は中心から開く
  const sOpen = lerp(0.001, 1, winIn);
  // 慣れた領域: 03 の位置から左下へ寄り、窓が広がるにつれて点まで縮む
  const move = inOut(prog(t, 0, 0.8));
  const gx = lerp(lerp(C03.cx2, 300, move), 110, grow);
  const gy = lerp(lerp(C03.cy, 800, move), 470, grow);
  const gr = lerp(lerp(C03.r2, 112, move), 16, grow);
  // 終わりは札が外へ押し出され、素材に寄る（Whip pan へ渡す）
  const end = inExpo(prog(t, 10.9, 12));
  const rate = 7 / (12 - 0.35 + 0.1);
  return (
    <>
      <Bg color={C.paper} />
      {away < 1 && (
        <>
          <Line t={t} text="手放したものは、ある。" x={130} y={110 - away * 260} size={92} color={C.ink} t0={-5} />
          <Lay x={away * 900}>
            <DrawLine x1={C03.cx2 + C03.r2 + 30} y1={C03.cy} x2={C03.ax - 50} y2={C03.cy} k={1} color={C.blue} w={9} head={34} />
            <Line t={t} text="AIへ" x={C03.ax} y={C03.cy - 95} size={190} color={C.blue} t0={-5} />
          </Lay>
          <Line t={t} text="外注と同じで、ほとんど手がかからない" x={130} y={900 + away * 260} size={58} weight={700} color={C.gray} t0={-5} />
        </>
      )}
      <Line t={t} text="その分、" x={120} y={140} size={100} color={C.ink} t0={v(0.0)} t1={v(3.9)} stagger={0.04} />
      <Line t={t} text="未経験が来た。" x={120} y={270} size={160} color={C.orange} t0={v(0.66)} t1={v(3.95)} stagger={0.04} />
      {/* 未経験の窓（円 → 角丸の大窓）。中は素材動画 F1（素材 0.75–7.75 秒を窓が開いてから最後まで） */}
      <div style={{position: 'absolute', left: bx, top: by, width: bw, height: bh, borderRadius: br, overflow: 'hidden', background: '#a59d94', transform: `scale(${sOpen})`, transformOrigin: '50% 50%'}}>
        <Lay s={1 + end * 0.12} ox={bw / 2} oy={bh / 2} style={{width: bw, height: bh}}>
          <Footage src="f04.mp4" absStart={start + 0.35} srcDur={7} rate={rate} w={bw} h={bh} fx={0.5} fy={0.6} zoom={lerp(1.05, 1, grow)} />
        </Lay>
        <div style={{position: 'absolute', inset: 0, borderRadius: br, boxShadow: `inset 0 0 0 10px ${C.orange}`}} />
      </div>
      <Circle x={gx} y={gy} r={gr} fill={C.grayPale} stroke={C.gray} sw={lerp(6, 4, grow)}>
        <div style={{...typeBase, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontFamily: F.noto, fontWeight: 800, fontSize: 40, color: C.gray, opacity: 1 - prog(t, v(3.9), v(4.3))}}>
          {Array.from('慣れた').map((ch, i) => (
            <span key={i} data-ch={t < v(4.2) ? '1' : undefined} style={{display: 'inline-block'}}>
              {ch}
            </span>
          ))}
        </div>
      </Circle>
      {JOBS.map((j, i) => {
        const k = outExpo(prog(t, j.t0, j.t0 + 0.38));
        if (k <= 0) return null;
        const s = lerp(1.25, 1, outExpo(prog(t, j.t0 + 0.1, j.t0 + 0.5)));
        const ox = j.x + (j.anchor === 'r' ? -200 : j.anchor === 'c' ? 0 : 200);
        const push = end * (ox < W / 2 ? -1 : 1) * 70;
        return (
          <Lay key={i} x={j.dx * (1 - k) + push} y={j.dy * (1 - k) + end * (j.y < H / 2 ? -30 : 30)} s={s} ox={ox} oy={j.y + j.size * 0.7}>
            <Card text={j.text} x={j.x} y={j.y} size={j.size} anchor={j.anchor} />
          </Lay>
        );
      })}
    </>
  );
};

// ---- 05 あえて、慣れていないほうへ。（留保） ----
// 矢印が伸びる勢いで Tilt down。題は上へ縮み、留保の札が下から押し上がって中央に止まる。最後の 2 行は左右逆向きに入る
export const Cut05: React.FC<CutProps> = ({t}) => {
  const tilt = inOut(prog(t, v(3.25), v(4.05)));
  const cardY = lerp(1150, 300, outExpo(prog(t, v(3.35), v(4.1))));
  const back = inOut(prog(t, v(8.5), v(9.3)));
  // 札を読む間の寄り（「下手に変えない」で一段寄り、「それでも」で引いて次の 2 行へ場所を空ける）
  const lean = kv(t, [[v(5.9), 1], [v(6.5), 1.07, outExpo], [v(8.5), 1.07], [v(9.3), 1, inOut]]);
  const last = kv(t, [[v(11.25), 1], [v(11.9), 1.06, outExpo]]);
  const arrowK = outExpo(prog(t, v(2.3), v(2.95)));
  return (
    <>
      <Bg color={C.paper} />
      <Line t={t} text="あえて、" x={120} y={170} size={120} color={C.ink} t0={v(0.45)} t1={v(3.2)} stagger={0.045} />
      <Lay s={lerp(1, 0.56, tilt)} y={lerp(0, -232, tilt)} ox={120} oy={320}>
        <Line t={t} text="慣れていないほうへ。" x={120} y={330} size={160} color={C.orange} t0={v(1.3)} stagger={0.035} />
      </Lay>
      <Line t={t} text="TypeScript" x={120} y={650} size={80} weight={800} color={C.gray} t0={v(1.9)} t1={v(3.15)} stagger={0.025} />
      {tilt < 1 && <DrawLine x1={600} y1={700} x2={lerp(600, 1120, arrowK)} y2={700} k={arrowK > 0 ? 1 - tilt : 0} color={C.orange} w={9} head={32} />}
      <Line t={t} text="AIが提案した方" x={1160} y={655} size={80} color={C.orange} t0={v(2.75)} t1={v(3.2)} stagger={0.03} />
      {/* 留保の札（読める大きさで中央に） */}
      <Lay s={lerp(1, 0.93, back) * lean} y={lerp(0, -40, back)} ox={W / 2} oy={cardY + 150}>
        <div style={{position: 'absolute', left: 120, top: cardY, width: 1680, height: 300, background: C.white, borderRadius: 30, boxShadow: '0 10px 34px rgba(30,36,48,0.12), inset 0 0 0 3px #e3e5ea'}} />
        <Line t={t} text="保守を考えれば、下手に変えないほうがいい。" x={190} y={cardY + 62} size={70} color={C.ink} t0={v(3.9)} stagger={0.02} />
        <Line t={t} text="それは間違いない。" x={192} y={cardY + 180} size={56} weight={700} color={C.gray} t0={v(6.3)} stagger={0.03} />
      </Lay>
      <Lay s={last} ox={W / 2} oy={900}>
      <Line t={t} text="影響が小さいところから、" x={120} y={710} size={92} color={C.ink} t0={v(9.2)} dir="right" stagger={0.03} />
      <Line t={t} text="新しい刺激を。" x={1800} y={850} size={130} color={C.orange} t0={v(11.25)} dir="left" anchor="r" stagger={0.04} />
      </Lay>
    </>
  );
};

// ---- 06 これで良いですか？ ----
// AI の青い吹き出しが奥から視聴者へ加速して迫り（Dolly in）、安全域の手前で止まる。止まった瞬間に朱の「……知らん。」が叩き込まれ、画面が押し戻される
const BW = 1640;
const BH = 300;
function bubblePath() {
  const r = 70;
  // 角丸の矩形と左下の尾を 1 本の輪郭で描く
  return `M${r},0 H${BW - r} Q${BW},0 ${BW},${r} V${BH - r} Q${BW},${BH} ${BW - r},${BH} H330 L200,${BH + 110} L230,${BH} H${r} Q0,${BH} 0,${BH - r} V${r} Q0,0 ${r},0 Z`;
}
export const Cut06: React.FC<CutProps> = ({t}) => {
  const pop = outExpo(prog(t, 0.15, 0.6));
  const dolly = kv(t, [[0.4, 0], [v(2.95), 1, (k) => k * k * k]]);
  const s = lerp(0.22, 1, dolly) * pop;
  const hit = v(4.45);
  const recoil = kv(t, [[hit, 1], [hit + 0.12, 0.94, outExpo], [hit + 0.9, 0.965, inOut]]);
  const smash = lerp(1.4, 1, outExpo(prog(t, hit, hit + 0.35)));
  return (
    <>
      <Bg color={mix(C.paper, C.bluePale, prog(t, v(2.2), v(2.95)) * 0.55)} />
      <Lay s={recoil} ox={W / 2} oy={H / 2}>
        {s > 0.001 && (
          <div style={{position: 'absolute', left: W / 2 - BW / 2, top: 470 - BH / 2, width: BW, height: BH, transform: `scale(${s})`, transformOrigin: '50% 50%'}}>
            <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={BW} height={BH}>
              <path d={bubblePath()} fill={C.bluePale} stroke={C.blue} strokeWidth={8} strokeLinejoin="round" />
            </svg>
            <Line t={t} text="これで良いですか？" x={BW / 2} y={BH / 2 - 80} size={160} color={C.blue} t0={v(1.25)} anchor="c" stagger={0.04} />
          </div>
        )}
        <Lay s={smash} ox={1600} oy={880}>
          <Line t={t} text="……知らん。" x={1800} y={790} size={150} color={C.red} t0={hit} dir="left" anchor="r" stagger={0.03} dur={0.3} />
        </Lay>
      </Lay>
    </>
  );
};

// 画面の言葉（reading-timeline.json の順）。各カットの文字群の運動は、読む区間も止めずに
// 移動・回転・拡縮・組み替えを続ける。地面の点に沿わせる文字は camera.ts の投影を使う。
import React from 'react';
import {BEAT, H, W, beat, clamp, cut, ease, hash, lerp, prog, pulse, smooth, wobble} from '../lib/anim';
import {project, projectAngle} from '../lib/camera';
import {P, ROOT, WAITER, detourHead, followHead, growDepth, paveA} from '../lib/world';
import {INK, Kinetic, LIME, Pose, Tok} from './Kinetic';

const T = (s: string, o: Partial<Tok> = {}): Tok => ({t: s, ...o});
const b = (c: number, i: number) => beat(c, i);
const sw = (t: number, seed: number, amp: number, period = 5) => amp * wobble(t, seed, period);
const clampX = (x: number, half: number) => clamp(x, 80 + half, W - 80 - half);
const clampY = (y: number, half: number) => clamp(y, 60 + half, H - 60 - half);

// ---- カット1: 引用 ----
function Cut1({t}: {t: number}) {
  const b0 = b(1, 0);
  const b1 = b(1, 1);
  return (
    <>
      <Kinetic
        id="c1a"
        t={t}
        t0={b0.start + 0.25}
        t1={b0.end + 0.35}
        font="mincho"
        weight={400}
        size={56}
        enter="flip"
        stagger={0.07}
        enterDur={0.7}
        exit="slide"
        exitDir={[-0.6, -1]}
        exitDur={0.55}
        align="left"
        lines={[[T('「いつか技術の進化が')], [T('解決してくれるかもしれないけど、')]]}
        pose={(u) => {
          const k = prog(u, 0, 5.8);
          return {x: lerp(560, 690, ease.inOut(k)) + sw(u, 1, 12), y: lerp(250, 205, k), ry: lerp(-44, -6, ease.out(k)), rx: lerp(28, 4, k), rot: lerp(-9, -1, k) + sw(u, 2, 1.5), scale: lerp(0.88, 1.08, k)};
        }}
      />
      <Kinetic
        id="c1b"
        t={t}
        t0={b1.start - 0.1}
        t1={b1.end + 0.3}
        font="mincho"
        weight={400}
        size={124}
        enter="drop"
        stagger={0.09}
        enterDur={0.6}
        exit="burst"
        exitDur={0.45}
        lines={[[T('やってみる', {em: true}), T('。」', {s: 124})]]}
        pose={(u) => {
          // 最後の句点が着地した瞬間に地面を押す（沈み込み→反発）
          const hit = pulse(u, 7.05, 5);
          const k = prog(u, 5.4, 8);
          return {x: 640 + sw(u, 3, 8), y: 215 + hit * 26, rot: lerp(-3, 2.5, k), scale: lerp(0.98, 1.1, ease.out(k)) * (1 - hit * 0.06), rx: lerp(10, 26, k) + hit * 10};
        }}
      />
    </>
  );
}

// ---- カット2: 待つ／試す ----
function SplitLine({t}: {t: number}) {
  const k = prog(t, 7.6, 8.4) * (1 - prog(t, 19.6, 20.3));
  if (k <= 0) return null;
  const ang = lerp(-14, 9, ease.inOut(prog(t, 8, 20)));
  const x = lerp(600, 690, prog(t, 8, 20)) + 14 * Math.sin(t * 1.3);
  const len = 1400 * ease.out(k);
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(${x} ${H / 2}) rotate(${90 + ang})`}>
        <line x1={-len / 2} y1={0} x2={len / 2} y2={0} stroke={LIME} strokeWidth={3} opacity={0.85} />
      </g>
    </svg>
  );
}
function Cut2({t}: {t: number}) {
  const c = cut(2);
  // 「待つ」「試す」は同じ大きさの軸の名前。人印の頭上に投影して付ける
  const wp = project(t, [WAITER[0], 0, WAITER[1]]);
  const hp = project(t, [detourHead(t).p[0], 0, detourHead(t).p[1]]);
  return (
    <>
      <SplitLine t={t} />
      <Kinetic id="c2wait" t={t} t0={c.start + 0.2} t1={c.end + 0.2} size={46} weight={900} enter="slam" exit="slide" exitDir={[-1, 0]} lines={[[T('待つ', {c: INK})]]} pose={() => ({x: clampX(wp.x, 60), y: clampY(wp.y + 44, 30), rot: -4})} />
      <Kinetic id="c2try" t={t} t0={c.start + 0.35} t1={c.end + 0.2} size={46} weight={900} enter="slam" exit="slide" exitDir={[1, 0]} lines={[[T('試す', {c: LIME})]]} pose={() => ({x: clampX(hp.x, 60), y: clampY(hp.y + 44, 30), rot: 4})} />
      <Kinetic
        id="c2a"
        t={t}
        t0={b(2, 0).start - 0.15}
        t1={b(2, 0).end + 0.2}
        size={56}
        enter="scatter"
        enterDur={0.7}
        stagger={0.025}
        exit="slide"
        exitDir={[-1, 0.1]}
        align="left"
        lines={[[T('そんなの、そのうち')], [T('できるようになる。')]]}
        pose={(u) => {
          const k = prog(u, 8, 12);
          return {x: lerp(330, 370, k) + sw(u, 4, 8), y: 175 + sw(u, 5, 6), rot: lerp(-5, 1, k), ry: lerp(18, -6, k), scale: lerp(0.95, 1.05, k)};
        }}
      />
      <Kinetic
        id="c2b"
        t={t}
        t0={b(2, 1).start}
        t1={b(2, 1).end + 0.25}
        size={54}
        enter="flip"
        exit="sink"
        lines={[[T('待つのも、'), T('判断', {em: true}), T('ではある。')]]}
        pose={(u) => {
          const k = prog(u, 12, 15);
          return {x: lerp(380, 430, k), y: 175 + sw(u, 6, 5), rot: lerp(3, -2, k), ry: lerp(-12, 10, k), scale: lerp(1.0, 1.08, k)};
        }}
      />
      <Kinetic
        id="c2c"
        t={t}
        t0={b(2, 2).start}
        t1={b(2, 2).end + 0.3}
        size={60}
        enter="slam"
        stagger={0.04}
        exit="slide"
        exitDir={[1, 0.15]}
        exitDur={0.55}
        lineDelay={[0, 0.7]}
        lines={[[T('ただ、それは'), T('いつ？', {em: true, s: 84})], [T('それまで不便なまま。', {s: 56})]]}
        pose={(u) => {
          // 分割線をまたいで横へ流れる（右の字列がカメラを溝へ引く）
          const k = prog(u, 15, 20);
          return {x: lerp(600, 700, ease.inOut(k)) + sw(u, 7, 10), y: lerp(190, 205, k), rot: lerp(-4, 4, k) + sw(u, 8, 1.5), scale: lerp(0.96, 1.06, k), ry: lerp(-10, 14, k)};
        }}
      />
    </>
  );
}

// ---- カット3: 溝と並走 ----
function Cut3({t}: {t: number}) {
  const b0 = b(3, 0);
  const b1 = b(3, 1);
  const h = detourHead(t);
  const hp = project(t, [h.p[0], 0.2, h.p[1]]);
  const ang = clamp(projectAngle(t, [h.p[0], 0, h.p[1]], h.dir), -200, 200);
  // 文字の角度は溝の向きに寄せつつ ±16° に収める
  const a = ((ang + 540) % 360) - 180;
  const tilt = clamp(Math.abs(a) > 90 ? a - Math.sign(a) * 180 : a, -16, 16);
  return (
    <>
      <Kinetic
        id="c3a"
        t={t}
        t0={b0.start + 0.1}
        t1={b0.end + 0.2}
        size={54}
        enter="slide"
        dir={[-1, 0.2]}
        stagger={0.035}
        exit="fly"
        exitDir={[-1, 0.4]}
        align="left"
        lineDelay={[0, 0.9]}
        lineShift={(u, li) => (li === 1 ? [lerp(0, 90, prog(u, 21, 26)), 0, 0] : [0, 0, 0])}
        lines={[[T('公式の対応を待ちながら、')], [T('自分たちで'), T('やってみる。', {em: true})]]}
        pose={(u) => ({x: clampX(lerp(hp.x, 600, 0.55), 380), y: clampY(hp.y - 340, 135), rot: tilt * 0.8 + sw(u, 9, 1.5), scale: lerp(0.96, 1.06, prog(u, 20, 26)), rx: 12})}
      />
      <Kinetic
        id="c3b"
        t={t}
        t0={b1.start}
        t1={b1.end + 0.25}
        size={64}
        enter="slide"
        dir={[1, -0.1]}
        stagger={0.03}
        exit="fly"
        exitDir={[1, -0.1]}
        exitDur={0.5}
        lines={[[T("誰も", {em: true, s: 96}), T("やっていないから、"), T("やる。", {s: 80})]]}
        pose={(u) => {
          // 行き止まりで向きを切り返す: 右から逆向きに入り、反転して読む向きへ
          const k = prog(u, 26, 26.8);
          const flip = lerp(180, 0, ease.outBack(k, 1.3));
          const kk = prog(u, 26.8, 32);
          return {x: lerp(670, 630, kk) + sw(u, 10, 8), y: lerp(560, 540, kk), ry: flip, rot: lerp(5, -4, kk) + sw(u, 11, 1.2), scale: lerp(0.92, 1.03, kk)};
        }}
      />
    </>
  );
}

// ---- カット4: 舗装へ切り替える ----
function Cut4({t}: {t: number}) {
  const b0 = b(4, 0);
  const b1 = b(4, 1);
  const fx = paveA(t);
  const fp = project(t, [clamp(fx, -100, 60), 0.3, P.roadZ]);
  return (
    <>
      <Kinetic
        id="c4a"
        t={t}
        t0={b0.start + 0.15}
        t1={b0.end + 0.25}
        size={58}
        enter="flip"
        exit="slide"
        exitDir={[1, 0]}
        align="left"
        lines={[[T('対応されたら、')], [T('そっちへ'), T('切り替える。', {em: true, s: 74})]]}
        lineShift={(u, li) => (li === 1 ? [lerp(0, 140, ease.inOut(prog(u, 33.5, 37.5))), 0, 0] : [0, 0, 0])}
        pose={(u) => {
          const k = prog(u, 32, 38);
          // 舗装の先端に引かれて横へ大きく移動し、奥から明るい前景へ回り込む
          return {x: clampX(lerp(420, Math.max(560, fp.x), ease.inOut(k)), 330), y: lerp(200, 225, k), ry: lerp(42, -4, ease.out(k)), rot: lerp(-6, 2, k), scale: lerp(0.82, 1.06, k), z: lerp(-200, 40, k)};
        }}
      />
      <Kinetic
        id="c4b"
        t={t}
        t0={b1.start}
        t1={b1.end + 0.2}
        size={150}
        weight={900}
        enter="slam"
        stagger={0.06}
        enterDur={0.5}
        exit="slide"
        exitDir={[1, 0.1]}
        exitDur={0.5}
        lines={[[T('それで'), T('いい。', {em: true})]]}
        pose={(u) => {
          const k = prog(u, 38, 42);
          return {x: 640 + sw(u, 12, 10) + lerp(0, -40, k), y: 330 + sw(u, 13, 8), rot: lerp(-3, 3, k), scale: lerp(1.0, 1.14, ease.out(k)) * (1 + 0.04 * pulse(u, 38.5, 4)), rx: lerp(0, 14, k)};
        }}
      />
    </>
  );
}

// ---- カット5: 減る力 ----
const CODE = ['if (', '=>', 'for', '{ }', 'return', '0101', 'fn()', '==', '[ ]', 'let'];
function CodeBits({t}: {t: number}) {
  const k = prog(t, 48.8, 49.8) * (1 - prog(t, 55, 56));
  if (k <= 0) return null;
  return (
    <>
      {CODE.map((s, i) => {
        const x = -8 + i * 2.5;
        const z = 31 + (i % 3) * 2.2;
        const sink = ease.in(prog(t, 50 + hash(i + 3) * 2.4, 51.6 + hash(i + 3) * 2.4));
        const pp = project(t, [x, 1.6 + 2.2 * hash(i) - sink * 2.6, z]);
        return (
          <div
            key={i}
            style={{position: 'absolute', left: pp.x, top: pp.y, transform: `translate(-50%,-50%) rotate(${(hash(i + 9) - 0.5) * 30 + sink * 40}deg)`, fontFamily: '"Dot16", monospace', fontSize: 30, color: LIME, opacity: k * (1 - sink) * 0.85, textShadow: '0 0 10px rgba(0,0,0,0.9)'}}
          >
            {s}
          </div>
        );
      })}
    </>
  );
}
function Cut5({t}: {t: number}) {
  const sinkWord = (start: number, depth: number) => (u: number) => {
    const k = ease.inOut(prog(u, start, start + 1.4));
    return {ty: depth * k, rot: 6 * k};
  };
  return (
    <>
      <CodeBits t={t} />
      <Kinetic
        id="c5a"
        t={t}
        t0={b(5, 0).start}
        t1={b(5, 0).end + 0.2}
        size={60}
        enter="type"
        stagger={0.06}
        enterDur={0.25}
        exit="sink"
        lines={[[T('解決されると、'), T('経験', {em: true, s: 78}), T('が減る。')]]}
        pose={(u) => {
          const k = prog(u, 42, 45);
          return {x: 640 + lerp(-40, 40, k), y: 170 + sw(u, 14, 6), rot: lerp(4, -3, k), scale: lerp(0.95, 1.06, k), ry: lerp(-16, 12, k)};
        }}
      />
      <Kinetic
        id="c5b"
        t={t}
        t0={b(5, 1).start}
        t1={b(5, 1).end + 0.2}
        size={56}
        enter="type"
        stagger={0.05}
        enterDur={0.25}
        exit="sink"
        align="left"
        lines={[[T('打たなくなれば、')], [T('打つ', {em: true, s: 80, extra: sinkWord(47.0, 34)}), T('力は落ちるかもしれない。')]]}
        pose={(u) => {
          const k = prog(u, 45, 49.5);
          return {x: lerp(560, 640, k), y: 185 + sw(u, 15, 6), rot: lerp(-5, 2, k), scale: lerp(0.96, 1.04, k), rx: lerp(18, 4, k)};
        }}
      />
      <Kinetic
        id="c5c"
        t={t}
        t0={b(5, 2).start}
        t1={b(5, 2).end + 0.2}
        size={56}
        enter="type"
        stagger={0.05}
        enterDur={0.25}
        exit="sink"
        align="left"
        lines={[[T('書かなくなれば、')], [T('書く', {em: true, s: 80, extra: sinkWord(51.2, 58)}), T('力も落ちる。')]]}
        pose={(u) => {
          const k = prog(u, 49.5, 53);
          return {x: lerp(720, 640, k), y: 185 + sw(u, 16, 6), rot: lerp(5, -3, k), scale: lerp(0.96, 1.05, k), rx: lerp(-14, 4, k)};
        }}
      />
      <Kinetic
        id="c5d"
        t={t}
        t0={b(5, 3).start}
        t1={b(5, 3).end + 0.35}
        size={58}
        enter="flip"
        exit="fall"
        exitDur={0.6}
        lines={[[T('いらなくなった'), T('力', {stay: true, extra: (u) => carryRiki(u)}), T('もある。')]]}
        pose={(u) => {
          const k = prog(u, 53, 56);
          return {x: 640 + sw(u, 17, 10), y: lerp(200, 190, k), rot: lerp(-2, 2, k), scale: lerp(1, 1.06, k)};
        }}
      />
    </>
  );
}
// 「力」の持ち越し: カット5の文の中の位置から、カット6の中央へ浮かぶ
const RIKI_FROM = {x: 640 + (7 - 5.5) * 58 * 1.06, y: 190};
const RIKI_TO = {x: 600, y: 300};
function carryRiki(u: number) {
  const k = ease.inOut(prog(u, 55.2, 56.6));
  return {tx: (RIKI_TO.x - RIKI_FROM.x) * k / 1.06, ty: (RIKI_TO.y - RIKI_FROM.y) * k / 1.06 - Math.sin(k * Math.PI) * 60, sc: 1 + 1.0 * k, op: u > 56.6 ? 0 : 1};
}

// ---- カット6: 残したい力 ----
function Cut6({t}: {t: number}) {
  const pil = project(t, [ROOT[0], 5.5, ROOT[1] + 2.6]);
  const shake = pulse(t, 61.5, 6) * 14 * Math.sin(t * 60);
  return (
    <>
      <Kinetic
        id="c6a"
        t={t}
        t0={b(6, 0).start + 0.5}
        t1={b(6, 0).end + 0.3}
        size={60}
        enter="scatter"
        stagger={0.02}
        enterDur={0.8}
        exit="burst"
        exitDur={0.5}
        lines={[[T('残したい'), T('力', {em: true, s: 116, carried: true}), T('もある。')]]}
        pose={(u) => {
          const k = prog(u, 56, 60);
          return {x: lerp(520, 600, k) + sw(u, 18, 8), y: 300 + sw(u, 19, 8), ry: lerp(-30, 20, ease.inOut(k)), rot: lerp(-4, 3, k), scale: lerp(1.0, 1.1, k)};
        }}
      />
      <Kinetic
        id="c6b"
        t={t}
        t0={b(6, 1).start}
        t1={b(6, 1).end + 0.3}
        size={66}
        weight={900}
        vertical
        enter="scatter"
        stagger={0.035}
        enterDur={0.9}
        exit="fly"
        exitDir={[0.2, -1]}
        lineGap={18}
        lineDelay={[0, 0.5]}
        lines={[[T('何を作るかを、')], [T('言葉にする', {em: true}), T('力。')]]}
        pose={(u) => {
          const k = prog(u, 60, 66);
          return {x: clampX(pil.x > 640 ? pil.x - 300 : pil.x + 300, 90), y: 360 + shake * 0.4, rot: lerp(3, -2, k) + shake * 0.1, ry: lerp(-24, 14, ease.inOut(k)), scale: lerp(0.94, 1.04, k) * (1 + 0.05 * pulse(u, 61.5, 5))};
        }}
      />
    </>
  );
}

// ---- カット7: 未解決→試す ----
function Cut7({t}: {t: number}) {
  return (
    <>
      <Kinetic
        id="c7a"
        t={t}
        t0={b(7, 0).start + 0.1}
        t1={b(7, 0).end + 0.2}
        size={54}
        enter="slide"
        dir={[1, 0]}
        stagger={0.03}
        exit="fly"
        exitDir={[0, -1]}
        align="left"
        lineDelay={[0, 1.2]}
        lineShift={(u, li) => (li === 1 ? [lerp(-120, 60, ease.out(prog(u, 67.2, 69))), lerp(40, 0, ease.out(prog(u, 67.2, 69))), lerp(-90, 0, ease.outBack(prog(u, 67.2, 68.2)))] : [0, 0, 0])}
        lines={[[T('解けていない課題があるから、')], [T('試行錯誤', {em: true, s: 78}), T('が生まれる。')]]}
        pose={(u) => {
          const k = prog(u, 66, 71);
          return {x: lerp(560, 620, k) + sw(u, 20, 8), y: 180 + sw(u, 21, 6), rot: lerp(-3, 3, k), scale: lerp(0.95, 1.05, k), ry: lerp(14, -8, k)};
        }}
      />
      <Kinetic
        id="c7b"
        t={t}
        t0={b(7, 1).start}
        t1={b(7, 1).end + 0.25}
        size={56}
        weight={900}
        enter="slam"
        stagger={0.03}
        exit="slide"
        exitDir={[-1, 0]}
        lines={[[T('その領域は、')], [T('あとで奪われてもいい。', {s: 78, c: '#ffffff'})]]}
        pose={(u) => {
          const k = prog(u, 71, 75);
          return {x: lerp(700, 640, k) + sw(u, 22, 8), y: lerp(470, 450, k), rot: lerp(3, -2, k), scale: lerp(0.95, 1.04, k), rx: lerp(16, 0, k)};
        }}
      />
      <Kinetic
        id="c7c"
        t={t}
        t0={b(7, 2).start}
        t1={b(7, 2).end + 0.2}
        size={60}
        enter="flip"
        exit="fly"
        exitDir={[-1, 0.3]}
        exitDur={0.45}
        lines={[[T('まだあがける場所が、'), T('宝', {em: true, s: 140, stay: true, extra: (u) => zoomTakara(u)}), T('。')]]}
        pose={(u) => {
          const k = prog(u, 75, 80);
          return {x: 600 + sw(u, 23, 10), y: 330 + sw(u, 24, 6), rot: lerp(-3, 2, k), scale: lerp(0.98, 1.06, k), ry: lerp(-12, 8, k)};
        }}
      />
    </>
  );
}
function zoomTakara(u: number) {
  const k = ease.inExpo(prog(u, 78.6, 80.2));
  return {sc: 1 + 14 * k, tx: -60 * k, op: 1 - prog(u, 79.8, 80.2)};
}

// ---- カット8: 目標と現在 ----
function Ring({t}: {t: number}) {
  const show = prog(t, 80, 80.8) * (1 - prog(t, 88.4, 89.2));
  if (show <= 0) return null;
  const cur = prog(t, 85, 86.2);
  const tgtArc = ease.out(prog(t, 80.4, 82.2)) * 0.9;
  const nowArc = ease.out(prog(t, 85.1, 86.6)) * 0.99;
  const R = 128;
  const C = 2 * Math.PI * R;
  const x = 960 + sw(t, 30, 10);
  const y = 300 + sw(t, 31, 8) - (1 - ease.out(show)) * 80;
  const rot = -90 + lerp(-30, 0, ease.out(prog(t, 80, 81.5))) + 6 * Math.sin(t * 0.9);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) perspective(900px) rotateY(${lerp(-25, 18, prog(t, 80, 88))}deg) scale(${lerp(0.7, 1, ease.outBack(show))})`, opacity: show}}>
      <svg width={320} height={320} viewBox="-160 -160 320 320" style={{overflow: 'visible'}}>
        <circle r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={18} />
        {/* 目標: 破線の輪（達成の実測ではない） */}
        <circle r={R} fill="none" stroke={INK} strokeWidth={6} strokeDasharray="10 9" opacity={1 - cur * 0.55} transform={`rotate(${rot})`} strokeDashoffset={0} style={{}} pathLength={C} />
        <circle r={R} fill="none" stroke="#000" strokeWidth={8} strokeDasharray={`${(1 - tgtArc) * C} ${C}`} strokeDashoffset={-tgtArc * C} transform={`rotate(${rot})`} opacity={1 - cur} />
        {/* 現在: 塗りの輪 */}
        <circle r={R} fill="none" stroke={LIME} strokeWidth={18} strokeLinecap="round" strokeDasharray={`${nowArc * C} ${C}`} transform={`rotate(${rot})`} opacity={cur} />
      </svg>
      <div style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', whiteSpace: 'nowrap'}}>
        <div style={{fontFamily: '"NotoJP"', fontWeight: 900, fontSize: 34, color: cur > 0.5 ? LIME : INK, transform: `rotateX(${cur > 0.5 ? (1 - prog(t, 85.3, 85.7)) * 90 : prog(t, 84.9, 85.3) * 90}deg)`}}>
          {cur > 0.5 ? '現在' : '目標'}
        </div>
        <div style={{fontFamily: '"Dot16"', fontSize: 58, color: INK, lineHeight: 1.1}}>
          <Digits t={t} />
          <span style={{fontSize: 40}}>%</span>
        </div>
        <div style={{fontFamily: '"NotoJP"', fontWeight: 800, fontSize: 26, color: INK}}>以上</div>
      </div>
    </div>
  );
}
// 一の位を回して 90 → 99（目標と現在は別の値。連続した実測の推移としては描かない）
function Digits({t}: {t: number}) {
  const k = ease.inOut(prog(t, 85.0, 86.0));
  const v = lerp(0, 9, k);
  const d = Math.floor(v);
  const f = v - d;
  return (
    <span style={{display: 'inline-block'}}>
      9
      <span style={{display: 'inline-block', position: 'relative', height: '1.1em', overflow: 'hidden', verticalAlign: 'bottom'}}>
        <span style={{display: 'block', transform: `translateY(${-f * 100}%)`}}>
          <span style={{display: 'block'}}>{d}</span>
          <span style={{display: 'block'}}>{Math.min(9, d + 1)}</span>
        </span>
      </span>
    </span>
  );
}
function Cut8({t}: {t: number}) {
  return (
    <>
      <Ring t={t} />
      <Kinetic
        id="c8a"
        t={t}
        t0={b(8, 0).start + 0.2}
        t1={b(8, 0).end + 0.15}
        size={46}
        enter="flip"
        stagger={0.03}
        exit="fly"
        exitDir={[0, -1]}
        align="left"
        lineGap={14}
        lines={[[T('私の場合：', {em: true}), T('AIに書かせるコード')], [T('90%以上', {f: 'dot', s: 76, w: 400}), T('を目指していた。')]]}
        pose={(u) => {
          const k = prog(u, 80, 85);
          return {x: lerp(425, 445, ease.inOut(k)) + sw(u, 32, 6), y: lerp(280, 320, k) + sw(u, 33, 6), ry: lerp(30, -6, ease.out(k)), rot: lerp(-5, 2, k), scale: lerp(0.92, 1.05, k)};
        }}
      />
      <Kinetic
        id="c8b"
        t={t}
        t0={b(8, 1).start}
        t1={b(8, 1).end + 0.2}
        size={60}
        enter="slam"
        stagger={0.05}
        exit="fly"
        exitDir={[0, -1]}
        lines={[[T('今は、'), T('99%以上', {f: 'dot', s: 104, w: 400, em: true}), T('。')]]}
        pose={(u) => {
          const k = prog(u, 85, 88);
          return {x: 420 + sw(u, 34, 8), y: 330 + sw(u, 35, 6), rot: lerp(-4, 2, k), scale: lerp(1, 1.08, k), ry: lerp(-14, 10, k)};
        }}
      />
      <Kinetic
        id="c8c"
        t={t}
        t0={b(8, 2).start}
        t1={b(8, 2).end + 0.2}
        size={58}
        enter="rise"
        stagger={0.03}
        exit="sink"
        lines={[[T('そこまでの'), T('試行錯誤', {em: true, s: 74}), T('が、大きかった。')]]}
        pose={(u) => {
          const k = prog(u, 88, 92);
          return {x: 640 + lerp(-50, 50, k), y: 150 + sw(u, 36, 6), rot: lerp(3, -3, k), scale: lerp(0.96, 1.06, k), rx: lerp(-20, 6, k)};
        }}
      />
      <Kinetic
        id="c8d"
        t={t}
        t0={b(8, 3).start}
        t1={b(8, 3).end + 0.25}
        size={58}
        enter="flip"
        exit="slide"
        exitDir={[0, 1]}
        lineGap={6}
        lines={[[T('資料作成では、')], [T('もう困っていない。')]]}
        lineShift={(u, li) => {
          const k = ease.inOut(prog(u, 92.6, 94.8));
          return li === 0 ? [-150 * k, 0, -3 * k] : [150 * k, 0, 3 * k];
        }}
        pose={(u) => {
          const k = prog(u, 92, 96);
          return {x: 640 + sw(u, 37, 6), y: 175 + sw(u, 38, 6), rot: lerp(-2, 2, k), scale: lerp(0.98, 1.06, k)};
        }}
      />
    </>
  );
}

// ---- カット9 ----
function Cut9({t}: {t: number}) {
  return (
    <>
      <Kinetic
        id="c9a"
        t={t}
        t0={b(9, 0).start + 0.1}
        t1={b(9, 0).end + 0.2}
        size={54}
        enter="slide"
        dir={[1, 0]}
        stagger={0.03}
        exit="slide"
        exitDir={[-1, 0]}
        align="left"
        lineDelay={[0, 1.0]}
        lines={[[T('成功の筋道だけを教わり、')], [T('そこしか', {em: true, s: 74}), T('試さないと、弱い。')]]}
        pose={(u) => {
          const k = prog(u, 96, 102);
          // カメラの横移動と逆へ流れる
          return {x: lerp(700, 560, ease.inOut(k)), y: 175 + sw(u, 40, 6), rot: lerp(2, -3, k), scale: lerp(0.96, 1.05, k), ry: lerp(-18, 10, k)};
        }}
      />
      <Kinetic
        id="c9b"
        t={t}
        t0={b(9, 1).start}
        t1={b(9, 1).end + 0.3}
        size={70}
        weight={900}
        enter="cross"
        stagger={0.06}
        enterDur={1.0}
        exit="zoom"
        exitDur={0.45}
        lines={[[T('失敗', {em: true, s: 92}), T('した経験は、'), T('大きい。')]]}
        pose={(u) => {
          const k = prog(u, 102, 106);
          return {x: 640 + sw(u, 41, 10), y: 520 + sw(u, 42, 6), rot: lerp(-4, 3, k), scale: lerp(0.95, 1.08, k), rx: lerp(14, 2, k)};
        }}
      />
    </>
  );
}

// ---- カット10 ----
function Cut10({t}: {t: number}) {
  const g = growDepth(t);
  const h = followHead(P.follow.c10, g);
  const ang = projectAngle(t, [h.p[0], 0, h.p[1]], h.dir);
  const a = ((ang + 540) % 360) - 180;
  const tilt = clamp(Math.abs(a) > 90 ? a - Math.sign(a) * 180 : a, -14, 14);
  return (
    <>
      <Kinetic
        id="c10a"
        t={t}
        t0={b(10, 0).start + 0.05}
        t1={b(10, 0).end + 0.25}
        size={58}
        weight={900}
        enter="slide"
        dir={[0, -1]}
        stagger={0.03}
        exit="zoom"
        exitDur={0.6}
        lineDelay={[0, 0.8]}
        lines={[[T('便利なものに食われる前に、')], [T('自分で'), T('チャレンジ', {em: true, s: 80}), T('しておく。')]]}
        pose={(u) => {
          const k = prog(u, 106, 112);
          // 地面の進行方向へ大きく傾けたまま前進（奥から手前へ流れる）
          return {x: 640 + sw(u, 43, 14), y: lerp(250, 330, k), rx: lerp(46, 30, k), rot: tilt * 0.9, scale: lerp(0.98, 1.12, k), z: lerp(-120, 60, k)};
        }}
      />
      <Kinetic
        id="c10b"
        t={t}
        t0={b(10, 1).start + 0.4}
        t1={TOP_TEXT_END}
        size={60}
        weight={900}
        enter="rise"
        stagger={0.04}
        enterDur={0.7}
        exit="none"
        lineGap={4}
        lines={[[T('経験', {em: true, s: 74}), T('だけは、')], [T('AIが代わってくれない。')]]}
        pose={(u) => {
          const k = prog(u, 112, 118);
          return {x: 640 + sw(u, 44, 8) + lerp(-20, 20, k), y: 588 + sw(u, 45, 4), rot: lerp(-2.5, 2, k), scale: lerp(0.96, 1.04, k), ry: lerp(-10, 10, k)};
        }}
      />
    </>
  );
}
export const TOP_TEXT_END = 118.0;

export const Texts: React.FC<{t: number}> = ({t}) => {
  const c = (n: number) => t >= cut(n).start - 0.6 && t <= cut(n).end + 0.7;
  return (
    <>
      {c(1) ? <Cut1 t={t} /> : null}
      {c(2) ? <Cut2 t={t} /> : null}
      {c(3) ? <Cut3 t={t} /> : null}
      {c(4) ? <Cut4 t={t} /> : null}
      {c(5) ? <Cut5 t={t} /> : null}
      {c(6) ? <Cut6 t={t} /> : null}
      {c(7) ? <Cut7 t={t} /> : null}
      {c(8) ? <Cut8 t={t} /> : null}
      {c(9) ? <Cut9 t={t} /> : null}
      {c(10) ? <Cut10 t={t} /> : null}
    </>
  );
};

export {BEAT, smooth, hash};

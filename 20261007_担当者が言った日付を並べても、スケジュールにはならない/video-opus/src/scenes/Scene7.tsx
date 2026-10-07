import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Grid} from '../components/Grid';
import {KineticText} from '../components/KineticText';
import {Camera} from '../components/Camera';
import {DependencyLine, DeadlineLine} from '../components/Lines';
import {line} from '../lib/copy';
import {COLORS, FONT} from '../lib/theme';
import {drift, inOut, outFade, pop, prog} from '../lib/anim';

const Panel: React.FC<{
  x: number; y: number; w: number; h: number; title: string; accent: string; opacity: number;
  bars: {bx: number; bw: number; by: number; c: string}[]; risk: string;
}> = ({x, y, w, h, title, accent, opacity, bars, risk}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity, background: 'rgba(255,255,255,0.72)', border: `3px solid ${accent}`, borderRadius: 16, boxShadow: '0 10px 28px rgba(40,40,40,0.14)'}}>
    <div style={{position: 'absolute', left: 18, top: 14, fontFamily: FONT, fontWeight: 900, fontSize: 24, color: accent}}>{title}</div>
    {bars.map((b, i) => (
      <div key={i} style={{position: 'absolute', left: b.bx, top: b.by, width: b.bw, height: 26, background: b.c, borderRadius: 7}} />
    ))}
    <div style={{position: 'absolute', left: 18, bottom: 14, fontFamily: FONT, fontWeight: 700, fontSize: 18, color: COLORS.addDeep}}>{risk}</div>
  </div>
);

// 場面7 終わる案と代案を示す。期限を共通軸に案Aと代案Bを並べ、リスクを展開、判断を求める。
export const Scene7: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const dlGrow = prog(f, g0 + 20, 50);
  const pA = pop(f, g0 + 120, 20);
  const pArisk = prog(f, g0 + 210, 60);
  const pB = pop(f, g0 + 340, 20);
  const pBrisk = prog(f, g0 + 430, 60);
  const pPeople = prog(f, g0 + 560, 70, inOut);
  const pJudge = prog(f, g0 + 782, 90, inOut);

  const camX = interpolate(L, [0, 120, 330, 540, 780, 990], [0, 120, 120, -120, 0, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut}) + drift(f, 8, 300);
  const camScale = interpolate(L, [0, 120, 540, 780, 990], [1.0, 1.07, 1.07, 1.0, 0.97], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});
  const converge = pJudge * 46;

  return (
    <AbsoluteFill>
      <Camera x={camX} scale={camScale} rotate={drift(f, 0.5, 240)} originX={640} originY={380}>
        <Grid translateX={drift(f, 16, 300)} opacity={0.6} />
        {L >= 10 && <DeadlineLine x={640} grow={dlGrow} y0={150} y1={560} />}

        {/* 案A: 期限内に終える案 */}
        <div style={{position: 'absolute', inset: 0, scale: pA.scale, opacity: pA.opacity, transformOrigin: '360px 360px', translate: `${converge}px 0px`}}>
          <Panel x={150} y={252} w={430} h={236} title="期限内に終える案" accent={COLORS.bar}
            bars={[{bx: 28, bw: 170, by: 74, c: COLORS.done}, {bx: 28, bw: 270, by: 114, c: COLORS.bar}, {bx: 28, bw: 210, by: 154, c: COLORS.bar2}]}
            risk="リスク: バッファが薄い" opacity={1} />
        </div>
        {L >= 200 && <DependencyLine points={[[360, 490], [360, 540], [470, 560]]} progress={pArisk} color={COLORS.addDeep} />}

        {/* 代案B */}
        <div style={{position: 'absolute', inset: 0, scale: pB.scale, opacity: pB.opacity, transformOrigin: '920px 360px', translate: `${-converge}px 0px`}}>
          <Panel x={700} y={252} w={430} h={236} title="代わりの案" accent={COLORS.add}
            bars={[{bx: 28, bw: 220, by: 74, c: COLORS.done}, {bx: 28, bw: 170, by: 114, c: COLORS.add}, {bx: 28, bw: 120, by: 154, c: COLORS.bar2}]}
            risk="リスク: 範囲を縮小" opacity={1} />
        </div>
        {L >= 420 && <DependencyLine points={[[920, 490], [920, 540], [810, 560]]} progress={pBrisk} color={COLORS.addDeep} />}

        {/* 人員: 社内でアサイン確認 */}
        {L >= 550 && (
          <div style={{position: 'absolute', left: 150, top: 560, opacity: pPeople, fontFamily: FONT}}>
            <div style={{display: 'inline-block', background: COLORS.bar2, color: '#fff', fontWeight: 800, fontSize: 18, padding: '8px 14px', borderRadius: 10}}>
              人を増やす → 先に社内でアサイン確認
            </div>
          </div>
        )}
      </Camera>

      {/* 判断を求める */}
      {L >= 780 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 612, textAlign: 'center', opacity: pJudge, fontFamily: FONT, fontWeight: 900, fontSize: 34, color: COLORS.ink}}>
          案とリスクをそろえて、<span style={{color: COLORS.add}}>関係者に判断を求める</span>
        </div>
      )}

      {/* 文言 */}
      <div style={{opacity: outFade(f, g0 + 206, 16)}}>
        {L < 214 && <KineticText line={line(25)} start={g0 + 10} x={120} y={54} size={42} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 426, 16)}}>
        {L >= 320 && L < 430 && <KineticText line={line(26)} start={g0 + 330} x={120} y={54} size={44} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 772, 16)}}>
        {L >= 548 && L < 776 && <KineticText line={line(27)} start={g0 + 556} x={120} y={110} size={40} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 18)}}>
        {L >= 780 && <KineticText line={line(28)} start={g0 + 788} x={120} y={54} size={40} maxWidth={1080} />}
      </div>
    </AbsoluteFill>
  );
};

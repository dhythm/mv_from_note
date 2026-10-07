import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Grid} from '../components/Grid';
import {Bar} from '../components/Bar';
import {KineticText} from '../components/KineticText';
import {Camera} from '../components/Camera';
import {DeadlineLine} from '../components/Lines';
import {line} from '../lib/copy';
import {BAR_H} from '../lib/gantt';
import {COLORS, FONT, unitX} from '../lib/theme';
import {drift, inOut, outFade, prog} from '../lib/anim';

const rect = (u0: number, u1: number, y: number) => ({x: unitX(u0), y, w: unitX(u1) - unitX(u0), h: BAR_H});

const START_FILL = [
  {u0: 0, u1: 3, row: 0}, {u0: 3, u1: 6.3, row: 0}, {u0: 6.3, u1: 10, row: 0},
  {u0: 0, u1: 2.4, row: 1}, {u0: 2.4, u1: 5.6, row: 1}, {u0: 5.6, u1: 8.6, row: 1},
  {u0: 0, u1: 3.6, row: 2}, {u0: 3.6, u1: 7, row: 2}, {u0: 7, u1: 10, row: 2},
];

// 場面8 組み替えて初めて。スタート地点のガントを奥へ、リスクと判断を伴う計画を手前へ。結論へ収束。
export const Scene8: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const pRecede = prog(f, g0 + 130, 110, inOut);
  const pFront = prog(f, g0 + 250, 110, inOut);
  const pFinal = prog(f, g0 + 470, 110, inOut);
  const dlGrow = prog(f, g0 + 300, 70);

  const startScale = interpolate(pRecede, [0, 1], [1, 0.56]);
  const startOp = interpolate(pRecede, [0, 1], [0.95, 0.22]);
  const startBlur = interpolate(pRecede, [0, 1], [0, 3]);
  const frontScale = interpolate(pFront, [0, 1], [0.82, 1.0]);

  const camScale = interpolate(L, [0, 470, 560, 600], [1.0, 1.1, 1.12, 1.12], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});
  const startTravelX = interpolate(L, [150, 320], [1200, -420], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});

  return (
    <AbsoluteFill>
      <Camera scale={camScale} x={drift(f, 6, 320)} rotate={drift(f, 0.3, 260)} originX={unitX(4)} originY={380}>
        {/* スタート地点のガント（奥へ後退） */}
        <div style={{position: 'absolute', inset: 0, scale: startScale, opacity: startOp, filter: `blur(${startBlur}px)`, transformOrigin: `${unitX(5)}px 330px`, translate: `0px ${-pRecede * 40}px`}}>
          <Grid opacity={0.5} />
          {START_FILL.map((b, i) => (
            <Bar key={i} rect={rect(b.u0, b.u1, 250 + b.row * 70)} color={i % 2 ? COLORS.bar2 : COLORS.bar} />
          ))}
        </div>
        {L >= 150 && L < 330 && (
          <div style={{position: 'absolute', left: startTravelX, top: 170, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: COLORS.inkSoft, whiteSpace: 'nowrap'}}>
            スタート地点
          </div>
        )}

        {/* 組み替えた計画（手前へ） */}
        {L >= 235 && (
          <div style={{position: 'absolute', inset: 0, scale: frontScale, opacity: pFront, transformOrigin: `${unitX(4)}px 362px`}}>
            <Bar rect={rect(0, 4, 300)} color={COLORS.done} label="完了分" />
            <Bar rect={rect(4, 6, 362)} color={COLORS.add} label="予定外のタスク" />
            <Bar rect={rect(6, 8, 424)} color={COLORS.bar} label="残りの作業" />
            {L >= 295 && <DeadlineLine x={unitX(7)} grow={dlGrow} y0={270} y1={470} />}
          </div>
        )}
      </Camera>

      {/* 文言 */}
      <div style={{opacity: outFade(f, g0 + 156, 16)}}>
        {L < 164 && <KineticText line={line(29)} start={g0 + 10} x={120} y={56} size={46} maxWidth={1080} align="center" />}
      </div>
      <div style={{opacity: outFade(f, g0 + 306, 16)}}>
        {L >= 146 && L < 310 && <KineticText line={line(30)} start={g0 + 152} x={120} y={110} size={42} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 446, 16)}}>
        {L >= 296 && L < 450 && <KineticText line={line(31)} start={g0 + 302} x={120} y={110} size={42} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 516, 14)}}>
        {L >= 436 && L < 520 && <KineticText line={line(32)} start={g0 + 442} x={120} y={110} size={42} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 24)}}>
        {L >= 508 && <KineticText line={line(33)} start={g0 + 516} x={120} y={560} size={54} maxWidth={1080} align="center" />}
      </div>
    </AbsoluteFill>
  );
};

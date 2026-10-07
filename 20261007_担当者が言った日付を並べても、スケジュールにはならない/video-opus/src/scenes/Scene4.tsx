import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Grid} from '../components/Grid';
import {Bar} from '../components/Bar';
import {KineticText} from '../components/KineticText';
import {Camera} from '../components/Camera';
import {line} from '../lib/copy';
import {BAR_H} from '../lib/gantt';
import {COLORS, FONT, unitX} from '../lib/theme';
import {drift, inOut, outFade, pop, prog} from '../lib/anim';

const rect = (u0: number, u1: number, y: number) => ({x: unitX(u0), y, w: unitX(u1) - unitX(u0), h: BAR_H});

// 場面4 短縮の中身を読む。4週→2週。中身を保つ整理と、検証/余白を削る短縮を対比（説明用）。
export const Scene4: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const yTitle = 224;
  const yA = 352;
  const yB = 470;
  const titleP = pop(f, g0 + 10, 16);
  const pA = prog(f, g0 + 200, 70, inOut);
  const pB = prog(f, g0 + 384, 70, inOut);
  const pC = prog(f, g0 + 642, 60, inOut);

  const camRot = interpolate(L, [0, 200, 384, 560, 642, 840], [0, -2.6, 3.0, 3.0, 0.2, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut}) + drift(f, 0.4, 230);
  const camScale = interpolate(L, [0, 200, 384, 642, 840], [1.0, 1.05, 1.05, 1.0, 1.0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});

  return (
    <AbsoluteFill>
      <Camera rotate={camRot} scale={camScale} x={drift(f, 10, 300)} originX={unitX(5)} originY={yA}>
        <Grid translateX={drift(f, 16, 300)} opacity={0.75} />

        {/* 4週間の見積り */}
        <div style={{position: 'absolute', inset: 0, scale: titleP.scale, opacity: titleP.opacity, transformOrigin: `${unitX(5)}px ${yTitle}px`}}>
          <Bar rect={rect(3, 7, yTitle)} color={COLORS.bar2} label="4週間の見積り" />
        </div>

        {/* 例A: 工程を整理 → 中身そのままで2週 */}
        {L >= 185 && (
          <>
            <Bar rect={rect(3, 7, yA)} ghost opacity={pA * 0.7} />
            <div style={{position: 'absolute', inset: 0, opacity: pA}}>
              <Bar rect={rect(3, 5, yA)} color={COLORS.bar} label="整理して2週" />
              <div style={{position: 'absolute', left: unitX(5) + 10, top: yA + 12, fontFamily: FONT, fontWeight: 700, fontSize: 16, color: COLORS.done}}>中身そのまま</div>
              {/* 内部の工程を保つ仕切り */}
              {[3.67, 4.33].map((u, i) => (
                <div key={i} style={{position: 'absolute', left: unitX(u), top: yA + 6, width: 2, height: BAR_H - 12, background: 'rgba(247,246,243,0.6)'}} />
              ))}
            </div>
          </>
        )}

        {/* 例B: 検証/余白を削る → 2週だが中身が減る */}
        {L >= 370 && (
          <>
            <Bar rect={rect(3, 7, yB)} ghost opacity={pB * 0.7} />
            <div style={{position: 'absolute', inset: 0, opacity: pB}}>
              <Bar rect={rect(3, 4.3, yB)} color={COLORS.add} label="削って2週" />
              {/* 抜けた検証/余白 */}
              <div style={{position: 'absolute', left: unitX(4.3), top: yB, width: unitX(5) - unitX(4.3), height: BAR_H, border: `2px dashed ${COLORS.addDeep}`, borderRadius: 8, boxSizing: 'border-box'}} />
              <div style={{position: 'absolute', left: unitX(4.3) + 6, top: yB + 12, fontFamily: FONT, fontWeight: 700, fontSize: 16, color: COLORS.addDeep}}>検証/余白が抜ける</div>
            </div>
          </>
        )}

        {/* 比較: 同じ2週 */}
        {L >= 630 && (
          <div style={{position: 'absolute', inset: 0, opacity: pC}}>
            <div style={{position: 'absolute', left: unitX(3), top: yB + 70, width: unitX(5) - unitX(3), height: 2, background: COLORS.ink}} />
            <div style={{position: 'absolute', left: unitX(3), top: yA - 24, width: 2, height: yB + 70 - (yA - 24), background: COLORS.gridStrong}} />
            <div style={{position: 'absolute', left: unitX(5) - 2, top: yA - 24, width: 2, height: yB + 70 - (yA - 24), background: COLORS.gridStrong}} />
            <div style={{position: 'absolute', left: unitX(4) - 36, top: yB + 76, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: COLORS.ink}}>同じ「2週」</div>
          </div>
        )}
      </Camera>

      {/* 文言 */}
      <div style={{opacity: outFade(f, g0 + 186, 16)}}>
        {L < 194 && <KineticText line={line(13)} start={g0 + 10} x={120} y={58} size={46} maxWidth={1060} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 362, 16)}}>
        {L >= 182 && L < 370 && <KineticText line={line(14)} start={g0 + 190} x={120} y={120} size={42} maxWidth={1060} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 498, 14)}}>
        {L >= 366 && L < 502 && <KineticText line={line(15)} start={g0 + 374} x={120} y={58} size={42} maxWidth={1060} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 628, 14)}}>
        {L >= 498 && L < 632 && <KineticText line={line(16)} start={g0 + 506} x={120} y={120} size={42} maxWidth={1060} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 18)}}>
        {L >= 630 && <KineticText line={line(17)} start={g0 + 638} x={120} y={58} size={48} maxWidth={1060} />}
      </div>
    </AbsoluteFill>
  );
};

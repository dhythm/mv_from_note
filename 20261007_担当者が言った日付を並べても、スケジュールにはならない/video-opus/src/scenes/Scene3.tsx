import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Grid} from '../components/Grid';
import {Bar} from '../components/Bar';
import {KineticText} from '../components/KineticText';
import {Camera} from '../components/Camera';
import {DependencyLine, DeadlineLine} from '../components/Lines';
import {line} from '../lib/copy';
import {BAR_H} from '../lib/gantt';
import {COLORS, FONT, unitX} from '../lib/theme';
import {drift, inOut, outFade, prog} from '../lib/anim';

const rect = (u0: number, u1: number, y: number) => ({x: unitX(u0), y, w: unitX(u1) - unitX(u0), h: BAR_H});

// 場面3 遅れの影響を読む。依存線を描き、許容/後ろも遅れるの二方向へ。後者はバッファ。前倒し過多は相談。
export const Scene3: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const yTask = 348;
  const yMid = yTask + BAR_H / 2;
  const pA = prog(f, g0 + 172, 70); // 許容できる分岐
  const pB = prog(f, g0 + 352, 80); // 後ろも遅れる分岐
  const bufGrow = prog(f, g0 + 430, 60);
  const dlGrow = prog(f, g0 + 360, 54);

  const camScale = interpolate(L, [0, 160, 360, 560, 780], [1.02, 1.0, 1.08, 1.06, 1.0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});
  const camRot = interpolate(L, [0, 360, 780], [-1.6, 0.8, -0.4], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut}) + drift(f, 0.4, 240);
  const camX = drift(f, 12, 300);

  return (
    <AbsoluteFill>
      <Camera x={camX} scale={camScale} rotate={camRot} originX={unitX(6)} originY={yMid}>
        <Grid translateX={drift(f, 20, 280)} translateY={drift(f, 8, 360)} opacity={0.8} />

        {/* 対象タスク */}
        <Bar rect={rect(1, 6, yTask)} color={COLORS.bar} label="対象タスク" />

        {/* 期限線 */}
        {L >= 350 && <DeadlineLine x={unitX(7)} grow={dlGrow} />}

        {/* バッファ（受け渡し前倒しでできる余白） */}
        {L >= 420 && (
          <>
            <Bar rect={{...rect(6, 7, yTask), w: (unitX(7) - unitX(6)) * bufGrow}} ghost opacity={bufGrow} />
            <div style={{position: 'absolute', left: unitX(6) + 8, top: yTask - 34, fontFamily: FONT, fontWeight: 800, fontSize: 20, color: COLORS.done, opacity: bufGrow}}>
              バッファ
            </div>
          </>
        )}

        {/* 分岐A: 許容できる → 日付そのまま */}
        {L >= 160 && (
          <>
            <DependencyLine points={[[unitX(6), yMid], [unitX(7.2), 300], [unitX(8), 262]]} progress={pA} color={COLORS.done} />
            {pA > 0.6 && (
              <>
                <Bar rect={rect(8, 10, 240)} color={COLORS.done} label="後工程" sub="日付そのまま" opacity={(pA - 0.6) / 0.4} />
                <div style={{position: 'absolute', left: unitX(8), top: 206, fontFamily: FONT, fontWeight: 800, fontSize: 20, color: COLORS.done, opacity: (pA - 0.6) / 0.4}}>
                  許容できる
                </div>
              </>
            )}
          </>
        )}

        {/* 分岐B: 後ろも遅れる → 前倒し＋バッファ */}
        {L >= 345 && (
          <>
            <DependencyLine points={[[unitX(6), yMid], [unitX(7.2), 452], [unitX(8), 494]]} progress={pB} color={COLORS.add} />
            {pB > 0.6 && (
              <>
                <Bar rect={rect(8, 10, 472)} color={COLORS.add} label="後工程" sub="後ろも遅れる" opacity={(pB - 0.6) / 0.4} />
                <div style={{position: 'absolute', left: unitX(8), top: 438, fontFamily: FONT, fontWeight: 800, fontSize: 20, color: COLORS.add, opacity: (pB - 0.6) / 0.4}}>
                  まずい
                </div>
              </>
            )}
          </>
        )}
      </Camera>

      {/* 文言 */}
      <div style={{opacity: outFade(f, g0 + 156, 16)}}>
        {L < 164 && <KineticText line={line(9)} start={g0 + 10} x={120} y={58} size={46} maxWidth={1050} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 332, 16)}}>
        {L >= 146 && L < 340 && <KineticText line={line(10)} start={g0 + 152} x={120} y={122} size={44} maxWidth={1050} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 556, 16)}}>
        {L >= 330 && L < 564 && <KineticText line={line(11)} start={g0 + 336} x={120} y={58} size={44} maxWidth={1060} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 18)}}>
        {L >= 556 && <KineticText line={line(12)} start={g0 + 564} x={120} y={122} size={42} maxWidth={1060} />}
      </div>
    </AbsoluteFill>
  );
};

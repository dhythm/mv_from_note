import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Grid} from '../components/Grid';
import {Bar} from '../components/Bar';
import {KineticText} from '../components/KineticText';
import {Camera} from '../components/Camera';
import {line} from '../lib/copy';
import {BAR_H} from '../lib/gantt';
import {COLORS, unitX} from '../lib/theme';
import {drift, inOut, outFade, pop, prog, zoomAccent} from '../lib/anim';

const rect = (u0: number, u1: number, y: number) => ({x: unitX(u0), y, w: unitX(u1) - unitX(u0), h: BAR_H});

// 場面2 全部右へ？ 影響対象を一律右ずらし。元位置を細線で残し、実施中まで動く理由を問う。
export const Scene2: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const yA = 300; // 実施中タスク（進んだ分を含む）
  const yB = 392; // 未着手タスク
  const shift = prog(f, g0 + 48, 42, inOut) * 96; // 1週間ぶんの右移動

  const camScale = interpolate(L, [0, 268, 334, 430, 600], [1, 1, 1.22, 1.22, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: inOut,
  });
  const camX = interpolate(L, [0, 268, 334, 430, 600], [0, 0, -90, -90, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: inOut,
  }) + drift(f, 8, 300);
  const acc = zoomAccent(f, g0 + 300, 14, 10, 0.1);

  const ghostOp = prog(f, g0 + 60, 40) * 0.9;

  return (
    <AbsoluteFill>
      <Camera x={camX} scale={camScale} rotate={drift(f, 0.5, 260)} originX={unitX(4)} originY={345}>
        {/* 背景グリッド（別速度でパララックス） */}
        <Grid translateX={drift(f, 16, 320) - shift * 0.25} opacity={0.85} />

        {/* 元位置の細線（ゴースト） */}
        <Bar rect={rect(0, 4, yA)} ghost opacity={ghostOp} />
        <Bar rect={rect(4, 6, yA)} ghost opacity={ghostOp} />
        <Bar rect={rect(5, 8, yB)} ghost opacity={ghostOp} />

        {/* 実施中タスク: 完了[0,4]（緑）＋残り[4,6]（青）。右へスライド */}
        <div style={{position: 'absolute', inset: 0, translate: `${shift}px 0px`, scale: 1 + acc.scalePlus, filter: `blur(${acc.blur}px)`, transformOrigin: `${unitX(3)}px ${yA}px`}}>
          <Bar rect={rect(0, 4, yA)} color={COLORS.done} label="実施中" sub="完了分" />
          <Bar rect={rect(4, 6, yA)} color={COLORS.bar} />
        </div>
        {/* 未着手タスク: 右へスライド */}
        <div style={{position: 'absolute', inset: 0, translate: `${shift}px 0px`}}>
          <Bar rect={rect(5, 8, yB)} color={COLORS.bar2} label="未着手" />
        </div>

        {/* 「なぜ？」の注視マーク: 完了分が動いたことへの疑問 */}
        {L >= 270 && L < 430 && (
          <div
            style={{
              position: 'absolute',
              left: unitX(2) + shift - 16,
              top: yA - 54,
              fontFamily: 'NotoSansJP',
              fontWeight: 900,
              fontSize: 52,
              color: COLORS.add,
              opacity: prog(f, g0 + 274, 16) * outFade(f, g0 + 428, 16),
              scale: 1 + 0.08 * Math.sin((L - 270) / 6),
            }}
          >
            ？
          </div>
        )}
      </Camera>

      {/* 文言 */}
      <div style={{opacity: outFade(f, g0 + 150, 16)}}>
        {L < 158 && <KineticText line={line(5)} start={g0 + 8} x={120} y={60} size={46} maxWidth={1050} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 262, 16)}}>
        {L >= 142 && L < 270 && <KineticText line={line(6)} start={g0 + 150} x={120} y={124} size={44} maxWidth={1050} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 426, 16)}}>
        {L >= 258 && L < 436 && <KineticText line={line(7)} start={g0 + 266} x={120} y={58} size={50} maxWidth={1050} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 18)}}>
        {L >= 424 && <KineticText line={line(8)} start={g0 + 432} x={120} y={120} size={46} maxWidth={1060} />}
      </div>
    </AbsoluteFill>
  );
};

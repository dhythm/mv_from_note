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
import {drift, inOut, outFade, pop, prog} from '../lib/anim';

const rect = (u0: number, u1: number, y: number) => ({x: unitX(u0), y, w: unitX(u1) - unitX(u0), h: BAR_H});

// 場面6 記録は読める。でも期限は？ 分割は唯一解でない。記録は根拠になるが期限内終了は別問題。
export const Scene6: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const yC = 292, yA = 362, yR = 432;
  const r1 = pop(f, g0 + 130, 16);
  const r2 = pop(f, g0 + 160, 16);
  const r3 = pop(f, g0 + 190, 16);
  const pNote = prog(f, g0 + 40, 46);
  const dlGrow = prog(f, g0 + 332, 60);
  const pOver = prog(f, g0 + 430, 60);

  const camRot = interpolate(L, [0, 330, 450, 630], [0, 0, 1, 6.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut}) + drift(f, 0.4, 230);
  const camScale = interpolate(L, [0, 160, 330, 630], [1.04, 1.0, 1.03, 0.98], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});

  return (
    <AbsoluteFill>
      <Camera x={drift(f, 8, 300)} scale={camScale} rotate={camRot} originX={unitX(7)} originY={yR}>
        <Grid translateX={drift(f, 16, 300)} opacity={0.72} />

        {/* 分けない選択（唯一解ではない）を薄く提示 */}
        <div style={{opacity: pNote * 0.5}}>
          <Bar rect={rect(0, 8, 210)} ghost />
          <div style={{position: 'absolute', left: unitX(0), top: 176, fontFamily: FONT, fontWeight: 700, fontSize: 18, color: COLORS.inkSoft}}>
            分けないという選択もある（唯一の正解ではない）
          </div>
        </div>

        {/* 三行: 完了→追加→残り（前面へ） */}
        <div style={{position: 'absolute', inset: 0, scale: r1.scale, opacity: r1.opacity, transformOrigin: `${unitX(2)}px ${yC}px`, translate: `0px ${drift(f, 1.5, 150, 0)}px`}}>
          <Bar rect={rect(0, 4, yC)} color={COLORS.done} label="完了分" />
        </div>
        <div style={{position: 'absolute', inset: 0, scale: r2.scale, opacity: r2.opacity, transformOrigin: `${unitX(5)}px ${yA}px`, translate: `0px ${drift(f, 1.5, 150, 1)}px`}}>
          <Bar rect={rect(4, 6, yA)} color={COLORS.add} label="予定外のタスク" />
        </div>
        <div style={{position: 'absolute', inset: 0, scale: r3.scale, opacity: r3.opacity, transformOrigin: `${unitX(7)}px ${yR}px`, translate: `0px ${drift(f, 1.5, 150, 2)}px`}}>
          <Bar rect={rect(6, 8, yR)} color={COLORS.bar} label="残りの作業" />
          {/* 期限をはみ出す部分 */}
          {L >= 420 && (
            <>
              <div style={{position: 'absolute', left: unitX(7), top: yR, width: unitX(8) - unitX(7), height: BAR_H, background: COLORS.deadline, opacity: pOver * 0.8, borderRadius: 6}} />
              <div style={{position: 'absolute', left: unitX(7) + 6, top: yR + BAR_H + 8, fontFamily: FONT, fontWeight: 800, fontSize: 18, color: COLORS.deadline, opacity: pOver}}>
                期限を越える恐れ
              </div>
            </>
          )}
        </div>

        {/* 期限線 */}
        {L >= 320 && <DeadlineLine x={unitX(7)} grow={dlGrow} y0={200} y1={yR + BAR_H + 40} />}
      </Camera>

      {/* 文言 */}
      <div style={{opacity: outFade(f, g0 + 166, 16)}}>
        {L < 174 && <KineticText line={line(22)} start={g0 + 10} x={120} y={58} size={44} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 342, 16)}}>
        {L >= 158 && L < 346 && <KineticText line={line(23)} start={g0 + 166} x={120} y={120} size={44} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 18)}}>
        {L >= 338 && <KineticText line={line(24)} start={g0 + 346} x={120} y={58} size={50} maxWidth={1080} />}
      </div>
    </AbsoluteFill>
  );
};

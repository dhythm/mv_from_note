import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Grid} from '../components/Grid';
import {Bar} from '../components/Bar';
import {KineticText} from '../components/KineticText';
import {Camera} from '../components/Camera';
import {line} from '../lib/copy';
import {BAR_H} from '../lib/gantt';
import {COLORS, FONT, unitX} from '../lib/theme';
import {drift, inOut, outFade, prog, zoomAccent} from '../lib/anim';

const rr = (x: number, y: number, w: number) => ({x, y, w, h: BAR_H});

// 場面5 作業を分けて残す（見せ場）。完了分を元位置へ戻し、残りを追加タスクの後ろの新しい行へ分離。
export const Scene5: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const pSplit = prog(f, g0 + 252, 54, inOut); // 完了分が元位置へ
  const pSep = prog(f, g0 + 432, 76, inOut); // 残りが新しい行へ、追加タスク出現
  const pBack = prog(f, g0 + 706, 84, inOut); // 引いて全体比較
  const acc = zoomAccent(f, g0 + 252, 16, 16, 0.18);

  // 完了分（緑）: 一律右[1,5]@340 → 元位置[0,4]@300
  const cx = interpolate(pSplit, [0, 1], [unitX(1), unitX(0)]);
  const cy = interpolate(pSplit, [0, 1], [340, 300]);
  const cw = unitX(4) - unitX(0);
  // 残り（青）: [5,7]@340 → [6,8]@440（追加タスクの後ろ）
  const rx = interpolate(pSep, [0, 1], [unitX(5), unitX(6)]);
  const ry = interpolate(pSep, [0, 1], [340, 440]);
  const rw = unitX(2) - unitX(0);

  const camRot = interpolate(L, [0, 252, 306, 432, 560, 706, 960], [0, 0, -4, -2.4, 2.6, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut}) + drift(f, 0.4, 230);
  const camScale = interpolate(L, [0, 252, 306, 500, 706, 960], [1.0, 1.02, 1.16, 1.08, 0.95, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});
  const camY = interpolate(L, [0, 432, 560, 706, 960], [0, 0, -40, 10, 24], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});

  return (
    <AbsoluteFill>
      <Camera x={drift(f, 8, 300)} y={camY} scale={camScale} rotate={camRot} originX={unitX(4)} originY={370}>
        <Grid translateX={drift(f, 18, 280)} opacity={0.72} />

        {/* 元位置ゴースト */}
        <Bar rect={rr(unitX(1), 340, unitX(6) - unitX(1))} ghost opacity={interpolate(L, [0, 60, 300], [0, 0.6, 0.35], {extrapolateRight: 'clamp'})} />

        {/* 完了分（緑）: 元の時間位置へ復帰 */}
        <div style={{position: 'absolute', inset: 0, scale: 1 + acc.scalePlus, filter: `blur(${acc.blur}px)`, transformOrigin: `${cx + cw / 2}px ${cy}px`}}>
          <Bar rect={rr(cx, cy, cw)} color={COLORS.done} label="完了分" sub="〜7割（説明用）" />
        </div>

        {/* 追加タスク（オレンジ） */}
        {L >= 420 && <Bar rect={rr(unitX(4), 370, unitX(6) - unitX(4))} color={COLORS.add} label="予定外のタスク" opacity={pSep} />}

        {/* 残り（青）: 追加タスクの後ろの新しい行へ */}
        <Bar rect={rr(rx, ry, rw)} color={COLORS.bar} label="残りの作業" />

        {/* 引きで全体ブラケット */}
        {L >= 700 && (
          <div style={{opacity: pBack}}>
            <div style={{position: 'absolute', left: unitX(0), top: 510, width: unitX(8) - unitX(0), height: 2, background: COLORS.ink}} />
            <div style={{position: 'absolute', left: unitX(0), top: 500, width: 2, height: 18, background: COLORS.ink}} />
            <div style={{position: 'absolute', left: unitX(8) - 2, top: 500, width: 2, height: 18, background: COLORS.ink}} />
            <div style={{position: 'absolute', left: unitX(3), top: 520, fontFamily: FONT, fontWeight: 800, fontSize: 20, color: COLORS.ink}}>
              外枠は延びる・中身は読める
            </div>
          </div>
        )}
      </Camera>

      {/* 文言 */}
      <div style={{opacity: outFade(f, g0 + 258, 16)}}>
        {L < 266 && <KineticText line={line(18)} start={g0 + 10} x={120} y={58} size={44} maxWidth={1060} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 436, 16)}}>
        {L >= 250 && L < 440 && <KineticText line={line(19)} start={g0 + 256} x={120} y={120} size={48} maxWidth={1060} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 706, 16)}}>
        {L >= 432 && L < 710 && <KineticText line={line(20)} start={g0 + 438} x={120} y={58} size={44} maxWidth={1080} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 18)}}>
        {L >= 704 && <KineticText line={line(21)} start={g0 + 712} x={120} y={120} size={44} maxWidth={1080} />}
      </div>
    </AbsoluteFill>
  );
};

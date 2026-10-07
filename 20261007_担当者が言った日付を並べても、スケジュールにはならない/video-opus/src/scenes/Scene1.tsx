import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Grid} from '../components/Grid';
import {Bar} from '../components/Bar';
import {DateChip} from '../components/DateChip';
import {KineticText} from '../components/KineticText';
import {Camera} from '../components/Camera';
import {line} from '../lib/copy';
import {COLORS, unitX} from '../lib/theme';
import {damped, drift, outFade, pop, prog, zoomAccent} from '../lib/anim';
import {unitRect, rowY} from '../lib/gantt';

const DATES = ['8/4', '8/11', '8/18', '8/25', '9/1'];

// 場面1 日付は埋まった。希望日が集まりガントへ収束、予定外タスクが割り込みグリッドを傾ける。
export const Scene1: React.FC<{g0: number; dur: number}> = ({g0, dur}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;

  const crash = 172;
  // 割り込みの衝撃でカメラが傾き→減衰で戻る
  const tilt = damped(f, g0 + crash, -3.2, 0, 5, 16);
  const shove = damped(f, g0 + crash, 34, 0, 5, 16);
  const endLeanX = prog(f, g0 + 486, 54) * 26;
  const acc = zoomAccent(f, g0 + crash, 12, 10, 0.12);

  const fillRows: {u0: number; u1: number; row: number; c: string; label: string}[] = [
    {u0: 0, u1: 3, row: 0, c: COLORS.bar, label: '要件定義'},
    {u0: 3, u1: 6.3, row: 0, c: COLORS.bar2, label: '設計'},
    {u0: 6.3, u1: 10, row: 0, c: COLORS.bar, label: '実装'},
    {u0: 0, u1: 2.4, row: 1, c: COLORS.bar2, label: '調査'},
    {u0: 2.4, u1: 5.6, row: 1, c: COLORS.bar, label: 'データ整形'},
    {u0: 5.6, u1: 8.6, row: 1, c: COLORS.bar2, label: '評価'},
    {u0: 0, u1: 3.6, row: 2, c: COLORS.bar, label: 'UI'},
    {u0: 3.6, u1: 7, row: 2, c: COLORS.bar2, label: '連携'},
    {u0: 7, u1: 10, row: 2, c: COLORS.bar, label: '報告'},
  ];

  const chipFade = 1 - prog(f, g0 + 66, 42);

  return (
    <AbsoluteFill style={{background: 'transparent'}}>
      <Camera x={shove + endLeanX} rotate={tilt} originX={unitX(5)} originY={rowY(1)}>
        <Grid translateX={drift(f, 10, 360)} translateY={drift(f, 5, 420)} opacity={0.9} />

        {/* 飛び込む日付チップ（P23の減衰でランディング） */}
        {chipFade > 0.01 &&
          DATES.map((d, i) => {
            const landX = 300 + i * 150;
            const landY = 168;
            const off = (i % 2 ? -680 : 680) - i * 40;
            const x = damped(f, g0 + i * 4, landX + off, landX, 5, 15);
            const y = damped(f, g0 + i * 4, 40, landY, 6, 17);
            const {scale, opacity} = pop(f, g0 + i * 4, 14);
            return (
              <DateChip key={i} x={x} y={y} label={d} opacity={opacity * chipFade} scale={scale} rotate={drift(f, 4, 80, i)} />
            );
          })}

        {/* 埋まったスケジュール（3行の通常タスク） */}
        {fillRows.map((b, i) => {
          const r = unitRect(b.u0, b.u1, b.row);
          const {scale, opacity} = pop(f, g0 + 64 + i * 7, 15);
          const dy = drift(f, 2.2, 150, i);
          return (
            <div key={i} style={{position: 'absolute', inset: 0, translate: `0px ${dy}px`, scale, transformOrigin: `${r.x + r.w / 2}px ${r.y + r.h / 2}px`}}>
              <Bar rect={r} color={b.c} label={b.label} opacity={opacity} />
            </div>
          );
        })}

        {/* 予定外タスクの割り込み（右から衝突） */}
        {L >= crash - 2 && (() => {
          const r = unitRect(4, 6, 3);
          const x = damped(f, g0 + crash, 760, 0, 5.5, 15); // 右からスライドイン
          const op = prog(f, g0 + crash, 10);
          return (
            <div key="add" style={{position: 'absolute', inset: 0, translate: `${x}px 0px`, scale: 1 + acc.scalePlus, filter: `blur(${acc.blur}px)`, transformOrigin: `${r.x + r.w / 2}px ${r.y + r.h / 2}px`}}>
              <Bar rect={{...r, y: r.y + 6}} color={COLORS.add} label="予定外のタスク" opacity={op} />
            </div>
          );
        })()}
      </Camera>

      {/* 文言（上帯・2スロット交互） */}
      <div style={{opacity: outFade(f, g0 + 122, 16)}}>
        {L < 130 && <KineticText line={line(1)} start={g0 + 10} x={120} y={60} size={44} maxWidth={1040} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 170, 16)}}>
        {L >= 88 && L < 178 && <KineticText line={line(2)} start={g0 + 92} x={120} y={120} size={44} maxWidth={1040} />}
      </div>
      <div style={{opacity: outFade(f, g0 + 328, 18)}}>
        {L >= 160 && L < 340 && <KineticText line={line(3)} start={g0 + 170} x={120} y={60} size={50} maxWidth={1040} />}
      </div>
      <div style={{opacity: outFade(f, g0 + dur, 20)}}>
        {L >= 326 && <KineticText line={line(4)} start={g0 + 334} x={120} y={120} size={48} maxWidth={1040} />}
      </div>
    </AbsoluteFill>
  );
};

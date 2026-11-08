// 共通の箱（自分のキャパ）。一つの外枠の中に、琥珀（得られたもの）・灰（移動・予定）・白（回復の余白）を左から並べる。
// 灰と白の境界は緑の線。08 以降は墨の線で細い白を確保する（ink: 0..1 で上から描く）。
// 箱の中のラベルは図の一部として扱い、文字の検査からは外す（data-ch-in）。
import React from 'react';
import {C, F, typeBase} from './kit';
import type {BoxS} from './box';
import type {Stage} from './stage';

const LBL = 30;

export const Box: React.FC<{st: Stage; b: BoxS; ink?: number; labels?: number; inner?: React.ReactNode}> = ({st, b, ink = 0, labels = 1, inner}) => {
  const {w, h} = st;
  const xa = b.a * w;
  const xg = (b.a + b.g) * w;
  const roomW = w - xg;
  // ラベルは自分の領域の中だけに置く。領域の幅に収まらないときは出さない（隣の領域へはみ出させない）。
  // 収まる幅から 60 の間で薄く入れる。領域の枠（data-region）で切り抜き、検査でもはみ出しを見る。
  const PAD = 22;
  const lab = (text: string, x0: number, x1: number, color: string): React.ReactNode => {
    const need = Array.from(text).length * LBL + PAD * 2;
    const o = Math.min(1, Math.max(0, (x1 - x0 - need) / 60));
    if (o <= 0.01) return null;
    return (
      <div data-region="1" style={{position: 'absolute', left: x0, top: 0, width: x1 - x0, height: h, overflow: 'hidden'}}>
        <div style={{...typeBase, left: PAD, top: 22, fontFamily: F.noto, fontWeight: 700, fontSize: LBL, color, opacity: o * labels}}>
          <span data-ch-in="1">{text}</span>
        </div>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', left: st.X - w / 2, top: st.Y - h / 2, width: w, height: h, transform: `rotate(${st.r}deg) scale(${st.z})`, transformOrigin: '50% 50%'}}>
      {/* 箱の名前（外枠の上） */}
      <div style={{...typeBase, left: 0, top: -54, fontFamily: F.noto, fontWeight: 700, fontSize: LBL, color: C.ink, opacity: labels}}>
        <span data-ch-in="1">自分のキャパ</span>
      </div>
      <div data-fig="1" style={{position: 'absolute', inset: 0, background: C.room, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: xa, height: h, background: C.amber}} />
        <div style={{position: 'absolute', left: xa, top: 0, width: xg - xa, height: h, background: C.load}} />
        {roomW > 1 && <div style={{position: 'absolute', left: xg - 3, top: 0, width: 6, height: h, background: C.green}} />}
        {ink > 0 && <div style={{position: 'absolute', left: xg - 5, top: 0, width: 10, height: h * Math.min(1, ink), background: C.ink}} />}
        {lab('得られたもの', 0, xa, C.ink)}
        {lab('移動・予定', xa, xg, C.ink)}
        {lab('回復の余白', xg, w, C.green)}
        {inner}
      </div>
      <div style={{position: 'absolute', inset: 0, border: `5px solid ${C.ink}`, pointerEvents: 'none'}} />
    </div>
  );
};

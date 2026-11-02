// 04–06: 根拠の核（断面）→ Web 制作の例 → システム開発。地層は 2D の断面（境目を時刻から決まる正弦でうねらせる）。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, C, DrawLine, E_SINK, E_SLAM, F, Grid, Lay, Line, Prompt, STRATA, Strata, VBlur, VLine, lerp, prog, typeBase} from './kit';
import type {CutProps} from './Main';

// 読んだ語を一瞬押す（scale 1 → 1.08 → 1）
const nudge = (t: number, at: number) => 1 + 0.08 * Math.sin(Math.PI * prog(t, at, at + 0.4));

// ---- 04 その一言の下に、地層がある。（Crane down） ----
const B04_FROM = [620, 700, 790, 900];
const B04_TO = [140, 345, 560, 790];
const LABELS04 = ['ガイドライン', '要求・要件', '設計書', 'ハーネス'];
export const Cut04: React.FC<CutProps> = ({t}) => {
  const arrive = E_SLAM(prog(t, 0, 0.6));
  const c = E_SINK(prog(t, 1.8, 4.3));
  const bounds = B04_FROM.map((b, i) => lerp(b, B04_TO[i], E_SINK(prog(t, 1.8 + 0.12 * i, 4.3 + 0.2 * i))));
  const pan = prog(t, 6.0, 12.5);
  const said = [9e9, 7.0, 5.8, 4.9]; // 声の語順（ハーネス→設計書→要求・要件）で押す
  const arrow = E_SINK(prog(t, 9.9, 10.8));
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <VBlur id="c04" n={(1 - arrive) * 22}>
        <Lay y={450 * (1 - arrive)}>
          <Grid dx={t * 8} o={1 - c} />
          <Lay x={-60 * pan} r={-3 * pan} s={lerp(1, 1.08, pan)} ox={200} oy={460}>
            <Strata id="s04" t={t} bounds={bounds} edges={prog(t, 2.4, 4.6)} />
            {LABELS04.map((label, i) => {
              const bandTop = bounds[i];
              const bandBot = i < 3 ? bounds[i + 1] : Math.min(1080, bandTop + 290);
              const y = (bandTop + bandBot) / 2 - 46;
              return (
                <Line
                  key={label}
                  t={t}
                  text={label}
                  x={200}
                  y={y}
                  size={92}
                  weight={800}
                  color={i === 3 ? C.paper : C.ink}
                  t0={3.9 + 0.35 * i}
                  style={{transform: `scale(${nudge(t, said[i])})`, transformOrigin: '0 50%'}}
                />
              );
            })}
            {/* 情報が AI へ渡る向き（墨の矢印、下から上へ） */}
            <DrawLine x1={1650} y1={770} x2={1650} y2={170} k={arrow} w={5} head={28} />
            {arrow > 0.6 && (
              <div style={{position: 'absolute', left: 1760, top: 828, transform: `translateX(-100%) scale(${E_SLAM(prog(t, 10.4, 10.9))})`, transformOrigin: '100% 0', background: C.white, borderRadius: 10, padding: '10px 22px'}}>
                <div style={{...typeBase, position: 'relative', fontFamily: F.noto, fontWeight: 700, fontSize: 38, color: C.ink}}>
                  {Array.from('コンテキストとして AI へ').map((ch, i) => (
                    <span key={i} data-ch="1" style={{display: 'inline-block'}}>
                      {ch === ' ' ? ' ' : ch}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Lay>
          {/* 一行の入力（表）: 地層の上端に小さく残る */}
          <Prompt t={t} x={lerp(510 - 30 * prog(t, 0, 1.8), 150, c)} y={lerp(450, 52, c)} size={96} s={lerp(1 + 0.08 * prog(t, 0, 1.8), 0.45, c)} blink={0} />
        </Lay>
      </VBlur>
    </AbsoluteFill>
  );
};

// ---- 05 「おしゃれなホームページを作って」だけでは、限界。 ----
const ST = {x0: 150, x1: 1300, bottom: 560, band: 120};
const INS = [5.5, 6.9, 7.8]; // 層を下から差し込む秒（声: ガイドライン、ページ構成）
const LABELS05 = ['Human Interface Guidelines に従う', 'ページ構成', 'ヒーロー画像の構成'];
export const Cut05: React.FC<CutProps> = ({t}) => {
  const k = INS.map((s) => E_SLAM(prog(t, s, s + 0.5)));
  const hs = [lerp(10, ST.band, k[0]), ST.band * k[1], ST.band * k[2]];
  const top = ST.bottom - hs[0] - hs[1] - hs[2];
  const bounds = [top, top + hs[0], top + hs[0] + hs[1], ST.bottom + 40];
  const pan = prog(t, 11.0, 12.2);
  const roll = E_SINK(prog(t, 12.1, 13.0));
  const cx = (ST.x0 + ST.x1) / 2;
  const cy = (top + ST.bottom) / 2;
  const slam = E_SLAM(prog(t, 9.6, 10.1));
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={t * 10} o={1 - roll} />
      <Lay x={-160 * pan - 40 * prog(t, 0, 11)} s={lerp(1, 1.05, prog(t, 0, 11))} ox={150} oy={400}>
        <Lay ox={cx} oy={cy} r={-90 * roll} s={lerp(1, 0.82, roll)} x={(297 + 160 - cx) * roll} y={(540 - cy) * roll}>
          <Strata id="s05" t={t} bounds={bounds} x0={ST.x0} x1={ST.x1} bottom={ST.bottom} amp={5} n={3} surface={1 - prog(t, 11.9, 12.2)} />
          {LABELS05.map((label, i) => (
            <Line key={label} t={t} text={label} x={ST.x0 + 40} y={bounds[i] + (ST.band - 56) / 2} size={56} weight={700} t0={INS[i] + 0.15} t1={11.8} />
          ))}
        </Lay>
        <Line t={t} text="「おしゃれなホームページを作って」" x={130} y={top - 88} size={60} weight={700} color={C.gray} t0={1.0} t1={11.1} />
        <Line t={t} text="だけでは、限界がある。" x={150} y={650} size={72} weight={700} t0={3.5} t1={8.4} />
        <Line t={t} text="今でも、" x={1824} y={650} size={56} weight={700} anchor="r" t0={8.8} t1={11.4} />
        <Lay ox={1230} oy={820} r={lerp(4, 0, slam)} s={lerp(1.3, 1, slam)}>
          <Line t={t} text="圧倒的に良い。" x={1824} y={735} size={170} color={C.red} anchor="r" t0={9.6} t1={11.5} stagger={0.02} />
        </Lay>
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 06 設計を、言葉で定義する。（05 の地層が 90° Roll して縦の柱に） ----
const PIL = ['データモデル', '設計書', '要求・要件'];
const CARD = {x: 300, y: 240, w: 540, h: 380};
const BARS = [
  {w: 400, c: STRATA[0]},
  {w: 460, c: STRATA[1]},
  {w: 320, c: STRATA[2]},
  {w: 420, c: STRATA[1]},
  {w: 260, c: STRATA[0]},
];
const barRect = (j: number) => ({x: CARD.x + 40, y: CARD.y + 100 + j * 52, w: BARS[j].w, h: 18});
export const Cut06: React.FC<CutProps> = ({t}) => {
  const fold = E_SINK(prog(t, 7.3, 8.3));
  const card = E_SLAM(prog(t, 7.4, 8.0));
  const arrow = E_SINK(prog(t, 8.1, 8.9));
  const pop = 1 + 0.12 * Math.sin(Math.PI * prog(t, 8.9, 9.3));
  const cam = prog(t, 8.9, 14.6);
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={t * 10} o={prog(t, 0.2, 1.0)} />
      <Lay s={lerp(1, 1.08, cam) * lerp(1, 1.05, prog(t, 1.0, 7.2))} x={-40 * cam} ox={900} oy={540}>
        {/* 要求・要件のカード（柱が畳まれて入る） */}
        {card > 0 && (
          <div style={{position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, background: C.white, borderRadius: 18, boxShadow: '0 10px 30px rgba(20,22,26,0.10)', transform: `scale(${lerp(0.7, 1, card)})`, transformOrigin: '50% 50%', opacity: card}} />
        )}
        <Line t={t} text="要求・要件" x={CARD.x + 40} y={CARD.y + 36} size={30} weight={700} color={C.gray} t0={7.9} t1={14.4} />
        {BARS.map((b, j) => {
          const r = barRect(j);
          if (j < 3) {
            const sep = E_SLAM(prog(t, 0.3, 1.5));
            const rise = 60 * (1 - E_SLAM(prog(t, 0.6 + 0.25 * j, 1.4 + 0.25 * j)));
            const flt = 12 * Math.sin((t / 3) * 2 * Math.PI + j * Math.PI) * prog(t, 1.4, 2.4) * (1 - fold);
            const px = lerp(150 + j * 98.3, 150 + j * 176, sep);
            const pw = lerp(98.3, 140, sep);
            const py = lerp(68, 120, sep) + rise * sep + flt;
            const ph = lerp(943, 840, sep);
            const f = E_SINK(prog(t, 7.3 + 0.08 * j, 8.3 + 0.08 * j));
            return <div key={j} style={{position: 'absolute', left: lerp(px, r.x, f), top: lerp(py, r.y, f), width: lerp(pw, r.w, f), height: lerp(ph, r.h, f), borderRadius: lerp(0, 9, f), background: b.c}} />;
          }
          const k = E_SLAM(prog(t, 8.0 + 0.1 * j, 8.5 + 0.1 * j));
          return k > 0 ? <div key={j} style={{position: 'absolute', left: r.x, top: r.y, width: r.w * k, height: r.h, borderRadius: 9, background: b.c}} /> : null;
        })}
        {PIL.map((label, j) => (
          <VLine key={label} t={t} text={label} x={150 + j * 176 + 70} y={170} size={60} weight={800} t0={1.2 + 0.2 * j} t1={7.0} />
        ))}
        {/* 縦組みの見出し（全編で唯一の縦組み） */}
        <VLine t={t} text="設計を、" x={1600 - 20 * prog(t, 3, 7.2)} y={90} size={104} t0={2.8} t1={7.0} />
        <VLine t={t} text="言葉で定義する。" x={1466 - 20 * prog(t, 3, 7.2)} y={90} size={104} t0={3.3} t1={7.1} />
        {/* カード → AI */}
        <DrawLine x1={CARD.x + CARD.w + 30} y1={CARD.y + CARD.h / 2} x2={1170} y2={CARD.y + CARD.h / 2} k={arrow} w={5} head={26} />
        {t > 7.9 && (
          <div style={{position: 'absolute', left: 1290 - 100, top: CARD.y + CARD.h / 2 - 100, width: 200, height: 200, borderRadius: '50%', boxShadow: `inset 0 0 0 5px ${C.ink}`, background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${E_SLAM(prog(t, 7.9, 8.4)) * pop})`}}>
            <div style={{...typeBase, position: 'relative', fontFamily: F.noto, fontWeight: 700, fontSize: 76, color: C.ink}}>
              <span data-ch="1">AI</span>
            </div>
          </div>
        )}
        <Line t={t} text="裏を整えているから、" x={300} y={675} size={64} weight={700} t0={9.7} />
        <Line t={t} text="表は一言で済む。" x={300} y={762} size={150} t0={11.1} stagger={0.03} />
      </Lay>
    </AbsoluteFill>
  );
};


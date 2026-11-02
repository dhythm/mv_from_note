// 09–10: 分かれ目（地盤へ Crane down）→ 本人の結論（表層へ Crane up）。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, C, DrawLine, E_PUSH, E_SINK, E_SLAM, F, Grid, Lay, Line, Prompt, Strata, W, clamp, lerp, mix, prog, typeBase} from './kit';
import type {CutProps} from './Main';

// 09 の終わり＝10 のはじめの断面
const B_GROUND = [140, 250, 330, 400];
const ONE_Y = 600; // 地盤の中の 1 行の上端
// 1 行に組んだ「ドメイン知識 × コンテキスト設計」の各塊の左端（96px 相当）
const ONE = {a: 150, x: 742, c: 862, s: 0.6};

const Word: React.FC<{text: string; size: number; color: string; weight?: number}> = ({text, size, color, weight = 900}) => (
  <div style={{...typeBase, position: 'relative', fontFamily: F.noto, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.02em'}}>
    {Array.from(text).map((ch, i) => (
      <span key={i} data-ch="1" style={{display: 'inline-block'}}>
        {ch}
      </span>
    ))}
  </div>
);

// ---- 09 分かれ目は、ドメイン知識 × コンテキスト設計。 ----
export const Cut09: React.FC<CutProps> = ({t}) => {
  const out = E_PUSH(prog(t, 3.0, 3.6));
  const a = E_SLAM(prog(t, 4.0, 4.5));
  const xk = E_SLAM(prog(t, 5.3, 5.8));
  const c = E_SLAM(prog(t, 7.0, 7.5));
  const join = E_SINK(prog(t, 7.9, 8.7));
  const crane = E_SINK(prog(t, 8.7, 10.6));
  const bounds = B_GROUND.map((b, i) => lerp(1250 + i * 100, b, E_SINK(prog(t, 8.7 + 0.1 * i, 10.4 + 0.12 * i))));
  const lineY = lerp(lerp(170, 470, join), ONE_Y, crane);
  const onNavy = clamp((lineY + 140 - bounds[3]) / 160);
  const ink = mix(C.ink, C.paper, onNavy);
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={t * 8} o={1 - crane} />
      {/* 一回の入力（表の一行）だけでは解けない: 寄ったあと上へ押し出す */}
      <Lay y={-760 * out} s={lerp(1, 1.06, prog(t, 0, 3.2))} o={out < 1 ? 1 : 0}>
        <Prompt t={t} x={500} y={410} size={100} typed={prog(t, 0.2, 1.3)} blink={1.3} />
        <DrawLine x1={0} y1={575} x2={W} y2={575} k={E_SINK(prog(t, 0.3, 1.1))} w={3} />
      </Lay>
      <Strata id="s09" t={t} bounds={bounds} />
      <Prompt t={t} x={150} y={58} size={40} typed={prog(t, 10.0, 10.5)} blink={10.5} o={t > 10 ? 1 : 0} />
      <Line t={t} text="ハーネスエンジニアリング／コンテキストエンジニアリング" x={150} y={lerp(304, 274, E_SLAM(prog(t, 10.4, 11)))} size={32} weight={700} t0={10.4} stagger={0.012} style={{transform: `translateX(${lerp(40, 0, E_SLAM(prog(t, 10.4, 11)))}px)`}} />
      {/* 3 語: 対角から叩き込み → 1 行に組み変わる（位置と大きさだけ。字形は崩さない）→ 地盤へ沈む */}
      {t > 3.95 && (
        <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${lerp(lerp(-320, 0, a), ONE.a - 150, join) + 150}px, ${lineY}px) scale(${lerp(1, ONE.s, join)})`, transformOrigin: '0 0'}}>
          <Word text="ドメイン知識" size={160} color={ink} />
        </div>
      )}
      {t > 5.25 && (
        <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${lerp(900, ONE.x, join)}px, ${lerp(400, lineY + 2, join)}px) rotate(${lerp(45, 0, xk)}deg) scale(${xk * lerp(1, 0.8, join)})`, transformOrigin: '0 0'}}>
          <Word text="×" size={120} weight={700} color={ink} />
        </div>
      )}
      {t > 6.95 && (
        <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${lerp(lerp(880, 544, c), ONE.c, join)}px, ${lerp(620, lineY, join)}px) scale(${lerp(1, ONE.s, join)})`, transformOrigin: '0 0'}}>
          <Word text="コンテキスト設計" size={160} color={ink} />
        </div>
      )}
      {/* 分かれ目は、ここ。（朱の縦棒） */}
      <div style={{position: 'absolute', left: 150, top: 742, width: 10, height: 66, background: C.red, transform: `scaleY(${E_SLAM(prog(t, 10.5, 10.9))})`, transformOrigin: '50% 0'}} />
      <Line t={t} text="分かれ目は、ここ。" x={182} y={744} size={64} weight={800} color={C.red} dir="right" t0={10.6} />
    </AbsoluteFill>
  );
};

// ---- 10 表層は、手軽になった。だから、裏側の深さが問われる。（本人の結論） ----
const B_SURF = [470, 560, 650, 760];
export const Cut10: React.FC<CutProps> = ({t}) => {
  const up = E_SINK(prog(t, 0, 2.6));
  // 04 と逆向きの縦の視差: 深い所ほど速く下へ流れる
  const deep = E_SINK(prog(t, 0, 1.6));
  const spread = prog(t, 6.5, 12.6);
  const bounds = B_GROUND.map((b, i) => lerp(b, B_SURF[i], E_SINK(prog(t, 0.25 * (3 - i) * 0.4, 2.2 + 0.1 * (3 - i)))) + 130 * spread * (i / 3));
  const grow = E_SLAM(prog(t, 2.4, 3.0));
  const slam = E_SLAM(prog(t, 4.3, 4.8));
  const dolly = prog(t, 6.5, 12.6);
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={t * 8} o={up} />
      <Lay s={lerp(1, 0.86, dolly)} oy={420}>
        <Strata id="s10" t={t} bounds={bounds} />
        {/* 地盤の中の語は、昇るにつれて下へ流れ去る */}
        {deep < 1 && (
          <>
            <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(0px, ${ONE_Y + 760 * deep}px)`}}>
              <div style={{position: 'absolute', left: ONE.a, top: 0, transform: `scale(${ONE.s})`, transformOrigin: '0 0'}}>
                <Word text="ドメイン知識" size={160} color={C.paper} />
              </div>
              <div style={{position: 'absolute', left: ONE.x, top: 2, transform: 'scale(0.8)', transformOrigin: '0 0'}}>
                <Word text="×" size={120} weight={700} color={C.paper} />
              </div>
              <div style={{position: 'absolute', left: ONE.c, top: 0, transform: `scale(${ONE.s})`, transformOrigin: '0 0'}}>
                <Word text="コンテキスト設計" size={160} color={C.paper} />
              </div>
            </div>
            <div style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${760 * deep}px)`}}>
              <div style={{position: 'absolute', left: 150, top: 742, width: 10, height: 66, background: C.red}} />
              <Line t={t} text="分かれ目は、ここ。" x={182} y={744} size={64} weight={800} color={C.red} t0={-1} />
            </div>
          </>
        )}
        <Line t={t} text="ハーネスエンジニアリング／コンテキストエンジニアリング" x={150} y={bounds[1] + 24} size={32} weight={700} t0={-1} t1={0.6} stagger={0.01} />
        {/* 一行の入力: 表層に出た瞬間に 04 の逆で大きく戻る。キャレットが 2 回点滅 */}
        <Prompt t={t} x={150} y={bounds[0] - 92} size={60} s={lerp(40 / 60, 1, grow)} blink={t < 4.0 ? 3.0 : undefined} />
        <Line t={t} text="表層は、手軽になった。" x={150 - 40 * prog(t, 3.4, 12.6)} y={100} size={72} weight={700} t0={2.6} />
        <Lay ox={150} oy={262} s={lerp(1.15, 1, slam)} x={36 * prog(t, 5.0, 12.6)}>
          <Line t={t} text="だから、裏側の深さが問われる。" x={150} y={210} size={104} color={C.red} t0={4.3} stagger={0.022} />
        </Lay>
      </Lay>
    </AbsoluteFill>
  );
};

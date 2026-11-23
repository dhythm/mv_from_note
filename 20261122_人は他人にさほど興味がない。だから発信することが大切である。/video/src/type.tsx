// 画面の語（DOM／CSS）。詰め組・行マスク・塊着地・吹き出し一塊出現・縦書き。
// 字形は崩さない。図の外接矩形（data-fig）も投影して機械検査の対象にする。
import React from 'react';
import {project, type CamS} from './cam';
import {C, G, Line, Txt, clamp, inOut, lerp, out3, outBack, prog, slam} from './kit';
import {POS, PX, layerBreath, wx, wy} from './score';
import {at, D} from './timeline';

// 世界座標の矩形を画面 px へ投影して、検査用の見えない data-fig を出す
const FigBox: React.FC<{cam: CamS; x: number; y: number; w: number; h: number; z?: number; fly?: boolean}> = ({
  cam, x, y, w, h, z = 0, fly,
}) => {
  const a = project(cam, x - w / 2, y + h / 2, z);
  const b = project(cam, x + w / 2, y - h / 2, z);
  if (a.w <= 0 || b.w <= 0) return null;
  const L = Math.min(a.x, b.x);
  const R = Math.max(a.x, b.x);
  const T = Math.min(a.y, b.y);
  const B = Math.max(a.y, b.y);
  if (R - L < 2 || B - T < 2) return null;
  return (
    <div
      data-fig={fly ? 'fly' : '1'}
      style={{position: 'absolute', left: L, top: T, width: R - L, height: B - T, pointerEvents: 'none'}}
    />
  );
};

// 02 の「相談したい」吹き出し（一つの SVG 輪郭。尾の先から一塊で弾み出る s23）
const SpeechBubble: React.FC<{t: number; t0: number; t1: number; x: number; y: number; scale?: number}> = ({
  t, t0, t1, x, y, scale = 1,
}) => {
  if (t < t0 - 0.02 || t > t1 + 0.35) return null;
  const kin = outBack(prog(t, t0, t0 + 0.46));
  const kout = inOut(prog(t, t1, t1 + 0.32));
  const s = Math.max(0.001, kin * (1 - kout) * scale);
  const o = clamp(prog(t, t0, t0 + 0.08)) * (1 - kout);
  const mv = t < t0 + 0.36 || t > t1 - 0.02;

  const bw = 620;
  const bh = 196;
  const tail = 88;
  const r = 32;

  return (
    <div
      data-mv={mv ? '1' : undefined}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: bw + tail,
        height: bh,
        opacity: o,
        transform: `scale(${s})`,
        transformOrigin: `0px ${bh * 0.54}px`,
      }}
    >
      <svg width={bw + tail} height={bh} viewBox={`0 0 ${bw + tail} ${bh}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path
          d={[
            `M ${tail + r} 6`,
            `L ${tail + bw - r} 6`,
            `Q ${tail + bw - 6} 6 ${tail + bw - 6} ${r}`,
            `L ${tail + bw - 6} ${bh - r}`,
            `Q ${tail + bw - 6} ${bh - 6} ${tail + bw - r} ${bh - 6}`,
            `L ${tail + r} ${bh - 6}`,
            `Q ${tail + 6} ${bh - 6} ${tail + 6} ${bh - r}`,
            `L ${tail + 6} ${bh * 0.68}`,
            `L 6 ${bh * 0.54}`,
            `L ${tail + 6} ${bh * 0.40}`,
            `L ${tail + 6} ${r}`,
            `Q ${tail + 6} 6 ${tail + r} 6 Z`,
          ].join(' ')}
          fill={C.white}
          stroke={C.indigo}
          strokeWidth={8}
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: tail,
          top: 0,
          width: bw,
          height: bh,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt text="相談したい" x={bw / 2} y={bh / 2 - 48} size={94} anchor="c" color={C.indigo} box mv={mv} />
      </div>
    </div>
  );
};

export const Type: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const br = layerBreath(T);
  const t01 = T - at('01', 0);
  const t02 = T - at('02', 0);
  const t03 = T - at('03', 0);
  const t04 = T - at('04', 0);
  const t05 = T - at('05', 0);
  const t06 = T - at('06', 0);
  const t07 = T - at('07', 0);

  // 01: 紙カードの上「失望される？」→ 点の列へ戻ったあと「人は、興味がない。」「だから、発信していい。」
  const s01Main = slam(t01, 7.55, {dur: 0.44, y: 36, s: 1.55, r: -2.2, grow: 0.015, out: D['01'] - 0.35, outX: -120});
  const drift01 = Math.max(0, t01 - 7.6) * 8.5; // 点は右→左、語の塊は逆（左→右）へゆっくり流す

  // 02: 「素通り。」→ 動画インサート中＆紙色戻り後「相談したい」吹き出し
  const s02Pass = slam(t02, 1.70, {dur: 0.42, x: 40, s: 1.65, r: -3, grow: 0.014, out: 4.85, outX: -160});
  // 動画インサート中は立ち止まった藍の人の右上の白い壁 (1110, 175)、10.95s からは Three.js の藍の点の右端に動的同期！
  const b02Move = inOut(prog(t02, 10.85, 11.45));
  const pHeroC = project(cam, POS['01'][0] + wx(480), POS['01'][1] + wy(520), 1.2);
  const pHeroR = project(cam, POS['01'][0] + wx(480) + 84 * PX, POS['01'][1] + wy(520), 1.2);
  const b02X = lerp(1110, pHeroR.x + 22, b02Move);
  const b02Y = lerp(175, pHeroC.y - 196 * 0.54, b02Move);
  const b02Scale = lerp(0.92, 1.0 + 0.03 * inOut(prog(t02, 11.4, 14.0)), b02Move);

  // 03: 「悪意ではない。」（右）→ 動画インサート後半＋紙色戻り後「余裕がない。」（左特大）
  const s03Margin = slam(t03, 8.85, {dur: 0.45, x: -35, s: 1.58, r: -2, grow: 0.014, out: D['03'] - 0.32, outY: -90});

  // 04: 「知らせなければ、」「存在しない。」→ クレーンアップ後「通り道に、出す。」（右縦書き）
  const s04None = slam(t04, 4.20, {dur: 0.44, y: 30, s: 1.62, r: -2.5, grow: 0.012, out: 7.75, outY: 90});

  // 05: 「話を聞かせて。」（左上）→ 動画インサート終盤＋弧の戻り後「まず、知る人へ。」（左縦書き）
  const drift05 = Math.max(0, t05 - 12.1) * -3.0;

  // 06: 「打算的だ、」→ 斜線抜けたあと「打算ではない。」＋「雑音は、流す。」＋「真摯な意見は、受け取る。」
  const s06Not = slam(t06, 7.05, {dur: 0.44, x: -35, s: 1.58, r: -2.5, grow: 0.010, out: D['06'] - 0.34, outY: 90});

  // 07: 「恐れて、やめる」→ 動画インサート＋琥珀の点再開後「恥ずかしがらず、」「自分の言葉で。」
  const s07Own = slam(t07, 12.05, {dur: 0.46, y: 36, s: 1.55, r: -2.0, grow: 0.008});
  const endPush = 1 + 0.042 * inOut(prog(t07, 14.6, D['07'] - 0.45));

  return (
    <G dx={br.dx} dy={br.dy} r={br.r} s={br.s}>
      {/* ===== 01 ===== */}
      {t01 >= -0.05 && t01 <= D['01'] + 0.1 ? (
        <>
          <Line
            t={t01}
            text="失望される？"
            x={110}
            y={665}
            size={146}
            color={C.ink}
            t0={2.25}
            t1={4.72}
            dir="up"
            dx={Math.max(0, t01 - 2.3) * 8}
            shadow="0 2px 24px rgba(244,240,230,0.65)"
          />
          <G dx={s01Main.dx + drift01} dy={s01Main.dy} mv={s01Main.mv}>
            <Txt text="人は、興味がない。" x={110} y={530} size={150} color={C.ink} s={s01Main.s} r={s01Main.r} o={s01Main.o} mv={s01Main.mv} />
          </G>
          <Line
            t={t01}
            text="だから、発信していい。"
            x={110}
            y={735}
            size={102}
            color={C.amber}
            t0={10.55}
            t1={D['01'] - 0.35}
            dir="up"
            dx={drift01 * 0.7}
          />
        </>
      ) : null}

      {/* ===== 02 ===== */}
      {t02 >= -0.05 && t02 <= D['02'] + 0.1 ? (
        <>
          <G dx={s02Pass.dx} dy={s02Pass.dy} mv={s02Pass.mv}>
            <Txt text="素通り。" x={110} y={130} size={172} color={C.ink} s={s02Pass.s} r={s02Pass.r} o={s02Pass.o} mv={s02Pass.mv} />
          </G>
          <SpeechBubble t={t02} t0={8.30} t1={D['02'] - 0.38} x={b02X} y={b02Y} scale={b02Scale} />
          {/* 02後半の主役の藍の点の外接（検査用） */}
          {t02 > 11.4 && t02 < D['02'] - 0.35 ? (
            <FigBox cam={cam} x={POS['01'][0] + wx(480)} y={POS['01'][1] + wy(520)} w={168 * PX} h={168 * PX} z={1.2} />
          ) : null}
        </>
      ) : null}

      {/* ===== 03 ===== */}
      {t03 >= -0.05 && t03 <= D['03'] + 0.1 ? (
        <>
          <Line
            t={t03}
            text="悪意ではない。"
            x={1780}
            y={260}
            size={78}
            weight={700}
            color={C.grayDark}
            anchor="r"
            t0={3.10}
            t1={5.30}
            dir="left"
            dx={Math.max(0, t03 - 3.1) * -6}
          />
          <G dx={s03Margin.dx + Math.max(0, t03 - 8.9) * 5} dy={s03Margin.dy} mv={s03Margin.mv}>
            <Txt
              text="余裕がない。"
              x={110}
              y={420}
              size={162}
              color={C.ink}
              s={s03Margin.s}
              r={s03Margin.r}
              o={s03Margin.o}
              mv={s03Margin.mv}
              shadow={t03 < 10.6 ? '0 2px 26px rgba(244,240,230,0.75)' : undefined}
            />
          </G>
        </>
      ) : null}

      {/* ===== 04 ===== */}
      {t04 >= -0.05 && t04 <= D['04'] + 0.1 ? (
        <>
          <Line
            t={t04}
            text="知らせなければ、"
            x={110}
            y={185}
            size={58}
            weight={700}
            color={C.grayDark}
            t0={2.30}
            t1={7.65}
            dir="up"
            dx={Math.max(0, t04 - 2.3) * 4}
          />
          <G dx={s04None.dx} dy={s04None.dy} mv={s04None.mv}>
            <Txt text="存在しない。" x={110} y={625} size={160} color={C.ink} s={s04None.s} r={s04None.r} o={s04None.o} mv={s04None.mv} />
          </G>
          <Line
            t={t04}
            text="通り道に、出す。"
            x={1520}
            y={120}
            size={84}
            color={C.ink}
            vertical
            t0={8.35}
            t1={D['04'] - 0.34}
            dir="down"
            dy={Math.max(0, t04 - 8.4) * 5}
          />
          {/* 通り道の線の外接（検査用） */}
          {t04 > 2.2 && t04 < D['04'] - 0.35 ? (
            <FigBox cam={cam} x={POS['04'][0] + wx(675)} y={POS['04'][1] + wy(510)} w={1130 * PX} h={14 * PX} />
          ) : null}
        </>
      ) : null}

      {/* ===== 05 ===== */}
      {t05 >= -0.05 && t05 <= D['05'] + 0.1 ? (
        <>
          <Line
            t={t05}
            text="話を聞かせて。"
            x={110}
            y={155}
            size={112}
            color={C.ink}
            t0={4.20}
            t1={6.88}
            dir="up"
            dx={Math.max(0, t05 - 4.2) * 8}
          />
          <Line
            t={t05}
            text="まず、知る人へ。"
            x={175}
            y={205}
            size={84}
            color={C.ink}
            vertical
            t0={12.05}
            t1={D['05'] - 0.34}
            dir="down"
            dy={drift05}
            shadow={t05 < 13.15 ? '0 2px 24px rgba(244,240,230,0.8)' : undefined}
          />
        </>
      ) : null}

      {/* ===== 06 ===== */}
      {t06 >= -0.05 && t06 <= D['06'] + 0.1 ? (
        <>
          <Line
            t={t06}
            text="打算的だ、"
            x={110}
            y={695}
            size={96}
            weight={700}
            color={C.grayDark}
            t0={0.55}
            t1={6.65}
            dir="up"
            dx={Math.max(0, t06 - 0.6) * 5}
          />
          <G dx={s06Not.dx + Math.max(0, t06 - 7.1) * 4} dy={s06Not.dy} mv={s06Not.mv}>
            <Txt text="打算ではない。" x={110} y={260} size={146} color={C.ink} s={s06Not.s} r={s06Not.r} o={s06Not.o} mv={s06Not.mv} />
          </G>
          <Line
            t={t06}
            text="雑音は、流す。"
            x={110}
            y={525}
            size={58}
            weight={700}
            color={C.grayDark}
            t0={13.55}
            t1={D['06'] - 0.34}
            dir="left"
          />
          <Line
            t={t06}
            text="真摯な意見は、受け取る。"
            x={110}
            y={640}
            size={58}
            weight={700}
            color={C.grayDark}
            t0={11.50}
            t1={D['06'] - 0.34}
            dir="up"
          />
        </>
      ) : null}

      {/* ===== 07 ===== */}
      {t07 >= -0.05 && t07 <= D['07'] + 0.1 ? (
        <G s={endPush} ox={860} oy={560}>
          <Line
            t={t07}
            text="恐れて、やめる"
            x={110}
            y={515}
            size={122}
            weight={700}
            color={C.grayDark}
            t0={2.35}
            t1={6.85}
            dir="up"
          />
          <Line
            t={t07}
            text="恥ずかしがらず、"
            x={110}
            y={400}
            size={70}
            weight={700}
            color={C.amber}
            t0={10.65}
            dir="up"
            shadow={t07 < 15.1 ? '0 2px 24px rgba(244,240,230,0.85)' : undefined}
          />
          <G dx={s07Own.dx} dy={s07Own.dy} mv={s07Own.mv}>
            <Txt
              text="自分の言葉で。"
              x={110}
              y={540}
              size={170}
              color={C.ink}
              s={s07Own.s}
              r={s07Own.r}
              o={s07Own.o}
              mv={s07Own.mv}
              shadow={t07 < 15.1 ? '0 3px 28px rgba(244,240,230,0.88)' : undefined}
            />
          </G>
        </G>
      ) : null}
    </G>
  );
};

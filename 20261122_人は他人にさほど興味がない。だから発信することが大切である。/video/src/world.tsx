// Three.js の図の層。カメラは図の層だけに掛ける。すべて時刻 T から決まる純関数。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {applyCam, type CamS} from './cam';
import {C, clamp, hash, hashR, inOut, lerp, mix, out3, outBack, prog} from './kit';
import {POS, PX, wx, wy} from './score';
import {at, D} from './timeline';

const Ring: React.FC<{r: number; thick: number; color: string; opacity?: number; pos?: [number, number, number]}> = ({
  r, thick, color, opacity = 1, pos = [0, 0, 0],
}) => {
  if (opacity <= 0.001 || r <= 0.001) return null;
  return (
    <mesh position={pos}>
      <ringGeometry args={[Math.max(0.001, r - thick), r, 64]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

const Dot: React.FC<{r: number; color: string; opacity?: number; pos?: [number, number, number]; glow?: number}> = ({
  r, color, opacity = 1, pos = [0, 0, 0], glow = 0,
}) => {
  if (opacity <= 0.001 || r <= 0.001) return null;
  return (
    <group position={pos}>
      {glow > 0.01 ? (
        <>
          <mesh position={[0, 0, -0.02]}>
            <circleGeometry args={[r * 1.9, 48]} />
            <meshBasicMaterial color={color} transparent opacity={opacity * glow * 0.14} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <circleGeometry args={[r * 1.38, 48]} />
            <meshBasicMaterial color={color} transparent opacity={opacity * glow * 0.24} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      <mesh>
        <circleGeometry args={[r, 48]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  );
};

const Bar: React.FC<{x0: number; y0: number; x1: number; y1: number; thick: number; color: string; opacity?: number; z?: number}> = ({
  x0, y0, x1, y1, thick, color, opacity = 1, z = 0,
}) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.001 || opacity <= 0.001) return null;
  const ang = Math.atan2(dy, dx);
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, z]} rotation={[0, 0, ang]}>
      <planeGeometry args={[len, thick]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

// 01後半〜02: 奥行きのある3層パララックス点の列 (s15) ＋ 減速する藍の2点 ＋ ピント送り風ボケ (t10)
const Cut0102Dots: React.FC<{T: number}> = ({T}) => {
  const t01 = T - at('01', 0);
  const t02 = T - at('02', 0);
  if (t01 < 4.7 || T > at('03', 0.4)) return null;

  const [ox, oy] = POS['01'];
  const appear = out3(prog(t01, 4.95, 5.55));
  const fadeOut02 = 1 - inOut(prog(T, at('03', -0.25), at('03', 0.15)));
  // 02 動画インサート中は図形を優しく落とす
  const clip02Mask = 1 - out3(prog(t02, 5.05, 5.45)) + out3(prog(t02, 10.75, 11.15));
  const baseOp = clamp(appear * fadeOut02 * clamp(clip02Mask, 0, 1));

  // 01後半は上段 (y=250px)、02前半は下段 (y=750px) へ滑らかに移動
  const shiftTo02 = inOut(prog(t02, -0.5, 0.8));
  const lineYpx = lerp(255, 760, shiftTo02);
  // 02後半 (10.8s~) は下の細い線 (y=880px) へ下がり、主役の1点だけが中央左 (590, 520) へ迫り出す
  const heroPhase = out3(prog(t02, 10.75, 11.55));
  const railY = wy(lerp(lineYpx, 880, heroPhase));

  // 3層パララックスの灰の点（近い点ほど大きく・速く流れる）
  const streamDots = useMemo(() => {
    return Array.from({length: 26}, (_, i) => {
      const layer = i % 3; // 0:奥, 1:中, 2:手前
      const z = layer === 0 ? -3.6 : layer === 1 ? -1.4 : 0.6;
      const speed = layer === 0 ? 1.55 : layer === 1 ? 2.65 : 4.25;
      const r = (layer === 0 ? 15 : layer === 1 ? 23 : 32) * PX;
      const yOff = (hash(i * 13 + 7) - 0.5) * (layer === 0 ? 110 : layer === 1 ? 70 : 45) * PX;
      const phase = hash(i * 29 + 3) * 24;
      return {i, layer, z, speed, r, yOff, phase};
    });
  }, []);

  // 02 で減速して目に留まる藍の点2つ（1つは最後に左へ抜け、1つは中央左へ大きく迫る）
  const indigo2X = lerp(wx(1480), wx(480), inOut(prog(t02, 0.2, 5.1))) - Math.max(0, t02 - 10.7) * 2.1;
  const indigo1X = lerp(wx(1650), wx(1180), out3(prog(t02, 0.4, 5.0)));
  const heroX = lerp(indigo1X, wx(480), heroPhase);
  const heroY = lerp(railY, wy(520), heroPhase);
  const heroZ = lerp(0.5, 1.2, heroPhase);
  const heroR = lerp(34 * PX, 84 * PX, heroPhase);

  return (
    <group position={[ox, oy, 0]}>
      {/* 細いタイムラインのガイド線 */}
      <Bar
        x0={wx(90)}
        y0={railY}
        x1={wx(1830)}
        y1={railY}
        thick={3 * PX}
        color={C.grayDark}
        opacity={baseOp * lerp(0.32, 0.52, heroPhase)}
        z={-0.3}
      />

      {/* パララックスで右から左へ流れ続ける灰の点群 */}
      {streamDots.map((d) => {
        const span = 24;
        const x = 12 - (((t01 - 4.8) * d.speed + d.phase) % span);
        // 02 後半（heroPhase）は背景の点の不透明度を少し落としてピント送り感（t10）を出す
        const focusDim = lerp(1, d.layer === 2 ? 0.22 : 0.34, heroPhase);
        const softGlow = lerp(d.layer === 0 ? 0.3 : 0, 0.8, heroPhase);
        const yPos = railY + d.yOff * (1 - heroPhase * 0.72);
        return (
          <Dot
            key={d.i}
            r={d.r * lerp(1, 0.78, heroPhase)}
            color={C.gray}
            opacity={baseOp * (d.layer === 0 ? 0.45 : d.layer === 1 ? 0.68 : 0.85) * focusDim}
            pos={[x, yPos, d.z]}
            glow={softGlow}
          />
        );
      })}

      {/* 減速して残る藍の点（もう一つ: 最後に線の上で左へ抜ける） */}
      {t02 > -0.8 ? (
        <Dot
          r={lerp(28, 22, heroPhase) * PX}
          color={C.indigo}
          opacity={baseOp * out3(prog(t02, -0.6, 0.6)) * (1 - prog(t02, 13.4, 14.2))}
          pos={[indigo2X, railY, 0.3]}
          glow={0.35}
        />
      ) : null}

      {/* 主役の藍の点（02後半で手前中央左へ大きく出て「相談したい」の起点になる） */}
      {t02 > -0.5 ? (
        <>
          <Dot
            r={heroR}
            color={C.indigo}
            opacity={baseOp * out3(prog(t02, -0.3, 0.8))}
            pos={[heroX, heroY, heroZ]}
            glow={0.25 + heroPhase * 0.45}
          />
          {heroPhase > 0.05 ? (
            <Ring
              r={heroR * (1.22 + 0.08 * Math.sin(t02 * 2.4))}
              thick={2.5 * PX}
              color={C.indigo}
              opacity={baseOp * heroPhase * 0.32}
              pos={[heroX, heroY, heroZ - 0.05]}
            />
          ) : null}
        </>
      ) : null}
    </group>
  );
};

// 03: 点の間隔が開き、広い余白が画面の半分以上に広がる
const Cut03Space: React.FC<{T: number}> = ({T}) => {
  const t = T - at('03', 0);
  if (t < -0.5 || t > D['03'] + 0.5) return null;
  const [ox, oy] = POS['03'];
  const vis = out3(prog(t, -0.2, 0.35)) * (1 - inOut(prog(t, D['03'] - 0.35, D['03'] + 0.15)));
  const clipMask = 1 - out3(prog(t, 5.5, 5.9)) + out3(prog(t, 10.3, 10.75));
  const op = clamp(vis * clamp(clipMask, 0, 1));

  // 前半は左上に2つの点、後半（動画後）は右上の端に2つの点が遠く流れる
  const post = out3(prog(t, 10.2, 10.9));
  const d1x = lerp(wx(260) - t * 0.14, wx(1580) - Math.max(0, t - 10.3) * 0.32, post);
  const d2x = lerp(wx(440) - t * 0.18, wx(1735) - Math.max(0, t - 10.3) * 0.36, post);
  const dy = wy(200);

  return (
    <group position={[ox, oy, 0]}>
      <Dot r={18 * PX} color={C.gray} opacity={op * 0.72} pos={[d1x, dy, 0]} />
      <Dot r={26 * PX} color={C.gray} opacity={op * 0.85} pos={[d2x, dy, 0.2]} />
    </group>
  );
};

// 04: 水平の通り道の線 (s12) ＋ 線の下の輪郭だけの丸 → 線の上へ昇り琥珀色に灯って右へ進む
const Cut04Path: React.FC<{T: number}> = ({T}) => {
  const t = T - at('04', 0);
  if (t < -0.5 || t > D['04'] + 0.5) return null;
  const [ox, oy] = POS['04'];
  const vis = out3(prog(t, -0.2, 0.35)) * (1 - inOut(prog(t, D['04'] - 0.35, D['04'] + 0.15)));

  // 左から右へ描かれる通り道の線 (x: 110..1240, y: 510)
  const lineK = out3(prog(t, 0.35, 2.2));
  const lineY = wy(510);
  const lineX0 = wx(110);
  const lineX1 = lerp(wx(110), wx(1240), lineK);

  // 丸の挙動: 前半は線の下 (1360, 720) に輪郭だけで漂い、8.05s から線の上 (380, 510) へ昇って琥珀に塗られ右へ進む！
  const riseK = outBack(prog(t, 7.95, 8.85));
  const travelK = inOut(prog(t, 8.80, D['04'] - 0.2));
  const circleX = lerp(wx(1360), wx(340), clamp(riseK, 0, 1)) + travelK * (wx(1140) - wx(340));
  const circleY = lerp(wy(720), lineY, riseK) + (1 - clamp(riseK, 0, 1)) * Math.sin(t * 2.2) * 0.08;
  const fillK = out3(prog(t, 8.10, 8.75));
  const col = mix(C.grayDark, C.amber, fillK);

  return (
    <group position={[ox, oy, 0]}>
      {/* 通り道の水平線 */}
      <Bar x0={lineX0} y0={lineY} x1={lineX1} y1={lineY} thick={5 * PX} color={C.grayDark} opacity={vis * 0.9} />

      {/* 輪郭だけの丸（前半）→ 琥珀の塗りの点（後半） */}
      <Ring
        r={52 * PX}
        thick={5 * PX}
        color={col}
        opacity={vis * (1 - fillK * 0.85)}
        pos={[circleX, circleY, 0.2]}
      />
      <Dot
        r={lerp(6, 48, fillK) * PX}
        color={C.amber}
        opacity={vis * fillK}
        pos={[circleX, circleY, 0.3]}
        glow={fillK * 0.65}
      />

      {/* 通り道の上を進む軌跡の柔らかな琥珀の残光線 */}
      {travelK > 0.01 ? (
        <Bar
          x0={wx(340)}
          y0={lineY}
          x1={circleX}
          y1={lineY}
          thick={6 * PX}
          color={C.amber}
          opacity={vis * 0.72}
          z={0.1}
        />
      ) : null}
    </group>
  );
};

// 05: 右下の藍の点 → 後半に点から左の縦書き語の手前へ美しい藍の弧 (s12) が描かれる
const Cut05Arc: React.FC<{T: number}> = ({T}) => {
  const t = T - at('05', 0);
  if (t < -0.5 || t > D['05'] + 0.5) return null;
  const [ox, oy] = POS['05'];
  const vis = out3(prog(t, -0.2, 0.35)) * (1 - inOut(prog(t, D['05'] - 0.35, D['05'] + 0.15)));
  const clipMask = 1 - out3(prog(t, 7.05, 7.45)) + out3(prog(t, 12.85, 13.25));
  const op = clamp(vis * clamp(clipMask, 0, 1));

  // 弧の定義: 右の点 (1590, 390) から下へ緩やかに膨らみ左の語の手前 (460, 390) で止まる
  const post = out3(prog(t, 12.7, 13.3));
  const dotStartX = lerp(wx(1580), wx(1590), post);
  const dotStartY = lerp(wy(780), wy(390), post);
  const arcProg = out3(prog(t, 13.05, 14.35));
  const dotSlide = inOut(prog(t, 14.35, D['05'] - 0.4)) * 0.22; // 点が弧の上を少し左へ進む
  const jumpOut = inOut(prog(t, D['05'] - 0.45, D['05']));

  const segs = 40;
  const p0 = new THREE.Vector2(wx(1590), wy(390));
  const pc = new THREE.Vector2(wx(1025), wy(760));
  const p1 = new THREE.Vector2(wx(460), wy(390));
  const qPoint = (u: number) => {
    const inv = 1 - u;
    return {
      x: inv * inv * p0.x + 2 * inv * u * pc.x + u * u * p1.x,
      y: inv * inv * p0.y + 2 * inv * u * pc.y + u * u * p1.y + jumpOut * 2.2,
    };
  };

  const activeDot = post > 0.1 ? qPoint(dotSlide) : {x: dotStartX, y: dotStartY};
  const prePulse = 1 + 0.12 * Math.sin(t * 2.6);

  return (
    <group position={[ox, oy, 0]}>
      {/* 05 前半の静かな案内リング（静止区間を作らない） */}
      {post < 0.95 ? (
        <Ring
          r={56 * PX * prePulse}
          thick={2.5 * PX}
          color={C.indigo}
          opacity={op * (1 - post) * 0.35}
          pos={[dotStartX, dotStartY, -0.1]}
        />
      ) : null}

      {/* 藍の弧（s12: 段階的に描かれる） */}
      {arcProg > 0.01
        ? Array.from({length: segs}, (_, i) => {
            const u0 = i / segs;
            const u1 = (i + 1) / segs;
            if (u0 >= arcProg) return null;
            const a = qPoint(u0);
            const b = qPoint(Math.min(u1, arcProg));
            return (
              <Bar
                key={i}
                x0={a.x}
                y0={a.y}
                x1={b.x}
                y1={b.y}
                thick={6 * PX}
                color={C.indigo}
                opacity={op * 0.92}
                z={0.1}
              />
            );
          })
        : null}

      {/* 藍の点 */}
      <Dot
        r={lerp(36, 42, post) * PX}
        color={C.indigo}
        opacity={op}
        pos={[activeDot.x, activeDot.y, 0.25]}
        glow={0.4}
      />
    </group>
  );
};

// 06: 珊瑚色の斜線が語の手前でピタッと切れ、後半は右上の端へ流れて抜けていく
const Cut06Slash: React.FC<{T: number}> = ({T}) => {
  const t = T - at('06', 0);
  if (t < -0.5 || t > D['06'] + 0.5) return null;
  const [ox, oy] = POS['06'];
  const vis = out3(prog(t, -0.2, 0.35)) * (1 - inOut(prog(t, D['06'] - 0.35, D['06'] + 0.15)));

  // 前半の大きな珊瑚の斜線 (x: 1780..360, y: 170..480 -> 下の「打算的だ、」y=690に絶対届かない)
  const inK = out3(prog(t, 0.4, 1.35));
  const pushBack = Math.sin(Math.PI * prog(t, 4.10, 5.20)) * 0.85; // 声「それでも、」で反発
  const outK = inOut(prog(t, 6.75, 7.45));
  const sway = Math.sin(t * 2.1) * 0.14;
  const s1x0 = wx(1780) + pushBack + outK * 8.5;
  const s1y0 = wy(175) + pushBack * 0.4 + outK * 3.8;
  const s1x1 = lerp(s1x0, wx(420), inK) + pushBack + outK * 8.5;
  const s1y1 = lerp(s1y0, wy(455) + sway, inK) + pushBack * 0.4 + outK * 3.8;

  // 後半（9.25s〜「心ない批判もあります」〜「雑音は、流す。」）に右上隅を流れ続ける複数の細い斜線
  const sideIn = out3(prog(t, 9.15, 9.95));
  const flow = Math.max(0, t - 9.2) * 0.45;
  const dropTo07 = inOut(prog(t, D['06'] - 0.5, D['06']));

  return (
    <group position={[ox, oy, 0]}>
      {/* 前半の主斜線 */}
      {outK < 0.99 ? (
        <Bar
          x0={s1x0}
          y0={s1y0}
          x1={s1x1}
          y1={s1y1}
          thick={12 * PX}
          color={C.coral}
          opacity={vis * (1 - outK)}
          z={0.2}
        />
      ) : null}

      {/* 後半の右上端を流れる雑音の斜線（文字ブロック左110..1140pxに一切触れない右1320..1860px） */}
      {sideIn > 0.01
        ? [0, 1, 2].map((k) => {
            const shift = ((flow + k * 0.95) % 2.85) - 0.6;
            const bx0 = wx(1340) + shift * 1.1;
            const by0 = wy(135 + k * 48) - dropTo07 * 2.5;
            const bx1 = bx0 + 3.4;
            const by1 = by0 - 0.95;
            const edgeFade = clamp(1 - Math.abs(shift - 0.8) / 1.7, 0.15, 1);
            return (
              <Bar
                key={k}
                x0={bx0}
                y0={by0}
                x1={bx1}
                y1={by1}
                thick={(k === 0 ? 10 : 6) * PX}
                color={C.coral}
                opacity={vis * sideIn * edgeFade * (k === 0 ? 0.9 : 0.55)}
                z={0.15}
              />
            );
          })
        : null}
    </group>
  );
};

// 07: 上の短い線に固まって止まった点群 → ほどけて鮮やかな琥珀の点が力強く流れ出す
const Cut07Resume: React.FC<{T: number}> = ({T}) => {
  const t = T - at('07', 0);
  if (t < -0.5 || t > D['07'] + 0.5) return null;
  const [ox, oy] = POS['07'];
  const vis = out3(prog(t, -0.2, 0.35));
  const clipMask = 1 - out3(prog(t, 9.55, 9.95)) + out3(prog(t, 14.55, 15.10));
  const op = clamp(vis * clamp(clipMask, 0, 1));

  // 線の伸び: 前半は左寄りの短い線 (110..760)、6.8sから全幅 (110..1810) へ伸びる
  const unfreeze = inOut(prog(t, 6.85, 8.60));
  const postClip = out3(prog(t, 14.45, 15.10));
  const lineY = wy(248);
  const lineX1 = lerp(wx(780), wx(1810), unfreeze);

  const dots = useMemo(
    () => [
      {clumpX: 210, r: 22, speed: 2.8, phase: 0.0},
      {clumpX: 270, r: 30, speed: 3.1, phase: 2.9},
      {clumpX: 335, r: 24, speed: 2.7, phase: 5.8},
      {clumpX: 395, r: 34, speed: 3.3, phase: 8.7},
      {clumpX: 465, r: 25, speed: 2.9, phase: 11.6},
      {clumpX: 525, r: 28, speed: 3.0, phase: 14.5},
      {clumpX: 585, r: 22, speed: 2.8, phase: 17.4},
    ],
    [],
  );

  // 結びの拡大 (14.8s〜)
  const endScale = 1 + 0.04 * inOut(prog(t, 14.8, D['07'] - 0.5));

  return (
    <group position={[ox, oy, 0]} scale={[endScale, endScale, 1]}>
      <Bar x0={wx(110)} y0={lineY} x1={lineX1} y1={lineY} thick={5 * PX} color={C.grayDark} opacity={op * 0.85} />
      {dots.map((d, i) => {
        const col = mix(C.gray, C.amber, clamp(unfreeze * 0.7 + postClip * 0.5));
        const flowT = Math.max(0, t - 6.9);
        // 前半は固まって微かに揺れるだけ → 後半は左から右へ（あるいは軽やかに全幅を）流れ続ける
        const flowX = -9.5 + ((flowT * d.speed + d.phase) % 19.0);
        const x = lerp(wx(d.clumpX) + Math.sin(t * 2.2 + i) * 0.03, flowX, clamp(unfreeze * 0.65 + postClip * 0.45));
        const r = d.r * PX * lerp(1, i === 3 ? 1.25 : 1.0, postClip);
        return <Dot key={i} r={r} color={col} opacity={op * 0.95} pos={[x, lineY, 0.2]} glow={postClip * 0.55} />;
      })}
    </group>
  );
};

export const World: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const {camera} = useThree();
  applyCam(camera as THREE.PerspectiveCamera, cam);
  return (
    <>
      <Cut0102Dots T={T} />
      <Cut03Space T={T} />
      <Cut04Path T={T} />
      <Cut05Arc T={T} />
      <Cut06Slash T={T} />
      <Cut07Resume T={T} />
    </>
  );
};

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {FPS, DEG, H, W} from '../lib/anim';
import {CamPose} from '../lib/camera';
import {PHRASES, STYLE_SCALE, parseToken} from '../lib/copy';
import {tokenTexture, tokenTexturePad} from '../lib/textures';
import {groupPose, tokenPose} from '../lib/textAnim';

const RIG_DIST = 12;
const BASE_FOV = 34;
const LINE_GAP = 0.16;
const TOKEN_GAP = 0.1;

type LaidToken = {
  key: string;
  tex: THREE.CanvasTexture;
  w: number; // 影込みの面の大きさ
  h: number;
  x: number;
  y: number;
  emphasized: boolean;
  j: number;
};

function layout() {
  return PHRASES.map((p) => {
    const lines = p.lines.map((line) =>
      line.map((raw) => {
        const {text, style} = parseToken(raw);
        const size = p.size * STYLE_SCALE[style];
        const tt = tokenTexture(text, style, size);
        return {tt, emphasized: style !== 'body'};
      }),
    );
    const lineH = lines.map((l) => Math.max(...l.map((x) => x.tt.h)));
    const totalH = lineH.reduce((a, b) => a + b, 0) + LINE_GAP * (lines.length - 1);
    const tokens: LaidToken[] = [];
    let y = totalH / 2;
    let j = 0;
    lines.forEach((l, li) => {
      const lw = l.reduce((a, x) => a + x.tt.w, 0) + TOKEN_GAP * (l.length - 1);
      let x = -lw / 2;
      const cy = y - lineH[li] / 2;
      l.forEach((tok, ti) => {
        tokens.push({
          key: `${p.id}-${li}-${ti}`,
          tex: tok.tt.tex,
          w: tok.tt.w + tokenTexturePad * 2,
          h: tok.tt.h + tokenTexturePad * 2,
          x: x + tok.tt.w / 2,
          y: cy,
          emphasized: tok.emphasized,
          j: j++,
        });
        x += tok.tt.w + TOKEN_GAP;
      });
      y -= lineH[li] + LINE_GAP;
    });
    return {p, tokens};
  });
}

// 安全域（画面の90%）。リグ面での半幅・半高（距離12・画角34°）
const SAFE_X = RIG_DIST * Math.tan((BASE_FOV / 2) * DEG) * (W / H) * 0.9;
const SAFE_Y = RIG_DIST * Math.tan((BASE_FOV / 2) * DEG) * 0.9;

// 語が展開し終えてから退場が始まるまでの全フレームで、句の外接矩形が安全域に収まるかを検査する。
// 群れの回転（Y±13°程度）による遠近の膨らみは係数 1.06 で見込む。結果は描画ログに出す。
function checkSafeArea(laid: ReturnType<typeof layout>) {
  const report = laid.map(({p, tokens}, idx) => {
    const settled = p.start + tokens.length * 0.08 + 0.6;
    const leave = p.keep ? p.end : p.end - 0.5;
    let worstX = 0;
    let worstY = 0;
    for (let t = settled; t <= leave; t += 1 / FPS) {
      const g = groupPose(p, idx, t);
      const k = g.scale * 1.06;
      for (const tk of tokens) {
        const pop = tk.emphasized ? 1.07 : 1.025;
        const hw = ((tk.w - tokenTexturePad * 2) / 2) * pop;
        const hh = ((tk.h - tokenTexturePad * 2) / 2) * pop;
        worstX = Math.max(worstX, Math.abs(g.x + (tk.x + Math.sign(tk.x || 1) * hw) * k), Math.abs(g.x + (tk.x - Math.sign(tk.x || 1) * hw) * k));
        worstY = Math.max(worstY, Math.abs(g.y + (tk.y + hh) * k), Math.abs(g.y + (tk.y - hh) * k));
      }
    }
    const ok = worstX <= SAFE_X && worstY <= SAFE_Y;
    return `${p.id}:${ok ? 'OK' : 'NG'} x${worstX.toFixed(2)}/${SAFE_X.toFixed(2)} y${worstY.toFixed(2)}/${SAFE_Y.toFixed(2)}`;
  });
  console.log(`[safe-area] ${report.join(' | ')}`);
}

// 文字はカメラの前の面（リグ）に置く。カメラが大きく回っても読める位置に保ち、
// 文字自身は群れごとに回転・寄り・流れで動く（背景のカードとの速度差＝S15 の翻訳）。
export const TextRig: React.FC<{cam: CamPose}> = ({cam}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const laid = useMemo(() => {
    const l = layout();
    checkSafeArea(l);
    return l;
  }, []);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const fwd = new THREE.Vector3(0, 0, -RIG_DIST).applyQuaternion(cam.quat);
  const pos = cam.pos.clone().add(fwd);
  const rigScale = Math.tan((cam.fov / 2) * DEG) / Math.tan((BASE_FOV / 2) * DEG);

  return (
    <group position={pos} quaternion={cam.quat} scale={rigScale}>
      {laid.map(({p, tokens}, idx) => {
        if (t < p.start - 0.05 || t > p.end + 0.05) return null;
        const g = groupPose(p, idx, t);
        return (
          <group key={p.id} position={[g.x, g.y, g.z]} rotation={[g.rx, g.ry, g.rz]} scale={g.scale}>
            {tokens.map((tk) => {
              const tp = tokenPose(p, tk.j, tokens.length, tk.emphasized, t);
              if (tp.opacity <= 0.001) return null;
              return (
                <mesh
                  key={tk.key}
                  geometry={geo}
                  position={[tk.x + tp.x, tk.y + tp.y, tp.z]}
                  rotation={[tp.rx, tp.ry, tp.rz]}
                  scale={[tk.w * tp.sx, tk.h * tp.sy, 1]}
                  renderOrder={20 + tk.j}
                >
                  <meshBasicMaterial
                    map={tk.tex}
                    transparent
                    opacity={tp.opacity}
                    depthTest={false}
                    depthWrite={false}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

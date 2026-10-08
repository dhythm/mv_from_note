// 流れ続ける世界: 空・地面（畑⇔格子）・草・街・流れの線・バージョン番号。
// すべて世界座標に置かれ、カメラが流れ F(t) に乗って進むことで画面全体が流れる。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {TOTAL, Key, clamp, cut, pE, pS, prog, rnd, smooth, track} from '../lib/anim';
import {flowX} from '../lib/flow';
import {groundMaterial, skyMaterial} from '../lib/shaders';
import {FONT} from '../lib/glyphs';

export const GROUND_Y = -3.2;

// 環境の推移（カットごとの色・地面の種類）
function envAt(t: number) {
  const c = (n: number) => cut(n);
  const field: Key[] = [[0, 1], [c(2).start - 0.2, 1], [c(2).start + 0.4, 0, 'inOut'], [c(10).start - 0.3, 0], [c(10).start + 0.3, 1, 'inOut'], [TOTAL, 1]];
  const wild: Key[] = [[0, 0], [pS(1, 'field'), 0.05], [pE(1, 'run') + 0.4, 0.92, 'inOut'], [c(2).start, 0.95], [c(10).start, 0], [TOTAL, 0]];
  const split: Key[] = [[0, 0], [c(10).start - 0.1, 0], [c(10).start + 0.1, 1], [TOTAL, 1]];
  // 0=昼の畑 1=夕方の街 2=暗い格子 3=金色の循環 4=結論の畑
  const mood: Key[] = [
    [0, 0], [c(2).start - 0.3, 0], [c(2).start + 0.3, 1, 'inOut'], [c(3).start - 0.3, 1], [c(3).start + 0.3, 2, 'inOut'],
    [c(9).start - 0.3, 2], [c(9).start + 0.6, 3, 'inOut'], [c(10).start - 0.3, 3], [c(10).start + 0.4, 4, 'inOut'], [TOTAL, 4],
  ];
  return {field: track(t, field), wild: track(t, wild), split: track(t, split), mood: track(t, mood)};
}

const MOODS = [
  {top: '#3b86b8', hor: '#cfe9f2', bot: '#203a2a', fog: '#a9d0dc', near: 40, far: 170, cloud: 1, grid: '#38d0e8', base: '#061520'},
  {top: '#0c2236', hor: '#3a5a6c', bot: '#0a1118', fog: '#1d3443', near: 25, far: 120, cloud: 0.15, grid: '#f08a3a', base: '#0b0f14'},
  {top: '#04121c', hor: '#0e3446', bot: '#03090e', fog: '#082230', near: 20, far: 110, cloud: 0, grid: '#38c8e0', base: '#041019'},
  {top: '#071a20', hor: '#2c4a3e', bot: '#05100f', fog: '#14302c', near: 22, far: 115, cloud: 0, grid: '#e8b04a', base: '#061210'},
  {top: '#3f88b3', hor: '#f3e2bd', bot: '#2b3a20', fog: '#d7d9c2', near: 45, far: 190, cloud: 1, grid: '#38d0e8', base: '#061520'},
];
const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
function moodColor(m: number, key: 'top' | 'hor' | 'bot' | 'fog' | 'grid' | 'base', out: THREE.Color) {
  const i = Math.min(MOODS.length - 2, Math.floor(m));
  const k = m - i;
  tmpA.set(MOODS[i][key]);
  tmpB.set(MOODS[i + 1][key]);
  return out.copy(tmpA).lerp(tmpB, k);
}
function moodNum(m: number, key: 'near' | 'far' | 'cloud') {
  const i = Math.min(MOODS.length - 2, Math.floor(m));
  const k = m - i;
  return MOODS[i][key] * (1 - k) + MOODS[i + 1][key] * k;
}

export const Sky: React.FC<{t: number}> = ({t}) => {
  const mat = useMemo(() => skyMaterial(), []);
  const camera = useThree((s) => s.camera);
  const e = envAt(t);
  moodColor(e.mood, 'top', mat.uniforms.uTop.value);
  moodColor(e.mood, 'hor', mat.uniforms.uHor.value);
  moodColor(e.mood, 'bot', mat.uniforms.uBot.value);
  mat.uniforms.uCloud.value = moodNum(e.mood, 'cloud');
  mat.uniforms.uShift.value = flowX(t) * 0.004;
  return (
    <mesh position={camera.position.toArray()} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[300, 32, 16]} />
    </mesh>
  );
};

export const Ground: React.FC<{t: number}> = ({t}) => {
  const mat = useMemo(() => groundMaterial(), []);
  const camera = useThree((s) => s.camera);
  const e = envAt(t);
  const u = mat.uniforms;
  u.uField.value = e.field;
  u.uWild.value = e.wild;
  u.uSplit.value = e.split;
  u.uCam.value.copy(camera.position);
  moodColor(e.mood, 'fog', u.uFog.value);
  moodColor(e.mood, 'grid', u.uGrid.value);
  moodColor(e.mood, 'base', u.uGridBase.value);
  u.uFogNear.value = moodNum(e.mood, 'near');
  u.uFogFar.value = moodNum(e.mood, 'far');
  u.uWarm.value = clamp(e.mood - 3);
  return (
    <mesh position={[camera.position.x, GROUND_Y, camera.position.z - 120]} rotation={[-Math.PI / 2, 0, 0]} material={mat} frustumCulled={false}>
      <planeGeometry args={[700, 520]} />
    </mesh>
  );
};

// 手入れされているかどうか（地面のシェーダーと同じ整数規則）
export function plotKept(x: number, z: number) {
  const ix = Math.floor(x / 16);
  const iz = Math.floor(z / 11);
  return (((ix * 7 + iz * 3) % 5) + 5) % 5 < 2;
}

// ---- 草（荒れていく畑） ----
const BLADES = 5200;
export const Grass: React.FC<{t: number}> = ({t}) => {
  const {mesh, data} = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // 細い三角形の葉（根元が原点）
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.11, 0, 0, 0.11, 0, 0, 0.02, 1, 0.03], 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({vertexColors: false, side: THREE.DoubleSide, color: '#ffffff'});
    const m = new THREE.InstancedMesh(geo, mat, BLADES);
    m.frustumCulled = false;
    const x0 = flowX(cut(1).start) - 30;
    const x1 = flowX(cut(2).start) + 40;
    const y0 = flowX(cut(10).start) - 20;
    const y1 = flowX(TOTAL) + 60;
    const d: {x: number; z: number; h: number; th: number; ph: number; zone: number; col: THREE.Color}[] = [];
    for (let i = 0; i < BLADES; i++) {
      const zone = i < BLADES * 0.55 ? 1 : 10;
      let x = zone === 1 ? x0 + rnd(i, 1) * (x1 - x0) : y0 + rnd(i, 1) * (y1 - y0);
      let z = -30 + rnd(i, 2) * 38;
      if (zone === 10) {
        // 荒れた区画だけに草を置く
        let guard = 0;
        while (plotKept(x, z) && guard < 8) {
          x = y0 + rnd(i, 11 + guard) * (y1 - y0);
          z = -36 + rnd(i, 21 + guard) * 46;
          guard++;
        }
      }
      const col = new THREE.Color().setHSL(0.11 + rnd(i, 4) * 0.14, 0.5 + rnd(i, 5) * 0.25, 0.16 + rnd(i, 6) * 0.16);
      d.push({x, z, h: 0.7 + rnd(i, 3) * 1.6, th: rnd(i, 7), ph: rnd(i, 8) * 6.28, zone, col});
      m.setColorAt(i, col);
    }
    return {mesh: m, data: d};
  }, []);
  const g1 = prog(t, pS(1, 'field') - 0.3, pE(1, 'run') + 0.6);
  const g10 = 1;
  const camera = useThree((s) => s.camera);
  const show = t < cut(2).start + 0.35 || t > cut(10).start - 1;
  if (!show) return null;
  const o = new THREE.Object3D();
  for (let i = 0; i < BLADES; i++) {
    const b = data[i];
    let grow = 0;
    if (b.zone === 1) {
      // 画面の外側（カメラの視線から遠い所）から先に伸びる
      const dx = b.x - camera.position.x;
      const off = clamp(Math.abs(dx) / 22 + Math.abs(b.z + 6) / 30);
      grow = smooth((g1 * 1.6 - (1 - off) * 0.8 - b.th * 0.3) * 2);
    } else {
      grow = g10 * (0.6 + 0.4 * b.th);
    }
    const s = grow * b.h;
    o.position.set(b.x, GROUND_Y, b.z);
    o.rotation.set(0.25 * Math.sin(t * 2 + b.ph + b.x * 0.1), b.ph, 0.18 * Math.sin(t * 1.3 + b.ph));
    o.scale.set(1 + b.th, Math.max(0.0001, s), 1);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---- 街（カット2の背景） ----
const BUILDINGS = 140;
export const City: React.FC<{t: number}> = ({t}) => {
  const {mesh, mat} = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {uOpacity: {value: 1}},
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vN; varying vec3 vS;
        void main(){ vUv = uv; vN = normal; vS = vec3(instanceMatrix[0][0], instanceMatrix[1][1], instanceMatrix[2][2]);
          gl_Position = projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vS;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 cell = floor(vUv*vec2(vS.x*2.5, vS.y*2.2));
          vec2 f = fract(vUv*vec2(vS.x*2.5, vS.y*2.2));
          float win = step(.25,f.x)*step(f.x,.75)*step(.3,f.y)*step(f.y,.8) * step(.55, h(cell + vS.xy));
          vec3 body = vec3(.05,.08,.11) * (abs(vN.y) > .5 ? 1.6 : 1.);
          vec3 lit = mix(vec3(1.,.72,.38), vec3(.55,.85,1.), step(.7,h(cell*1.7)));
          vec3 col = body + lit*win*(abs(vN.z) > .5 ? 1. : .4);
          gl_FragColor = vec4(col, uOpacity);
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.InstancedMesh(geo, mat, BUILDINGS);
    m.frustumCulled = false;
    const x0 = flowX(cut(2).start) - 40;
    const x1 = flowX(cut(3).start) + 60;
    const o = new THREE.Object3D();
    for (let i = 0; i < BUILDINGS; i++) {
      const row = i % 3;
      o.position.set(x0 + rnd(i, 1) * (x1 - x0), GROUND_Y, -24 - row * 14 - rnd(i, 2) * 8);
      o.scale.set(2 + rnd(i, 3) * 4, 4 + rnd(i, 4) * (10 + row * 8), 2 + rnd(i, 5) * 4);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    return {mesh: m, mat};
  }, []);
  const op = smooth(prog(t, cut(2).start - 0.6, cut(2).start + 0.3)) * (1 - smooth(prog(t, cut(3).start - 0.2, cut(3).start + 0.8)));
  if (op <= 0.001) return null;
  mat.uniforms.uOpacity.value = op;
  return <primitive object={mesh} />;
};

// ---- 流れの線 ----
const STREAKS = 420;
export const Streaks: React.FC<{t: number; amount: number; color: string}> = ({t, amount, color}) => {
  const {mesh, mat} = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    // 流れの線は字面域（画面中央）では細く薄くなり、要点の文字を横切らない
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {color: {value: new THREE.Color('#ffffff')}, opacity: {value: 1}},
      vertexShader: /* glsl */ `
        varying vec3 vClip;
        void main(){ vec4 p = projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); vClip = p.xyw; gl_Position = p; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color; uniform float opacity; varying vec3 vClip;
        void main(){ vec2 n = vClip.xy/max(.01, vClip.z); float r = length(n*vec2(.85, 1.25));
          float keep = .1 + .9*smoothstep(.4, .78, r);
          gl_FragColor = vec4(color, opacity*keep);
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.InstancedMesh(geo, mat, STREAKS);
    m.frustumCulled = false;
    return {mesh: m, mat};
  }, []);
  if (amount <= 0.001) return null;
  const fx = flowX(t);
  const span = 240;
  const o = new THREE.Object3D();
  for (let i = 0; i < STREAKS; i++) {
    // 世界に固定した線を、カメラの前後 span の範囲で繰り返す（流れの速さがそのまま画面の速さになる）
    const base = rnd(i, 1) * span;
    const x = fx - span * 0.35 + ((((base - fx) % span) + span) % span);
    const y = -2.6 + rnd(i, 2) * 12;
    const z = -30 + rnd(i, 3) * 38;
    o.position.set(x, y, z);
    o.rotation.set(rnd(i, 6) > 0.5 ? Math.PI / 2 : 0, 0, 0);
    o.scale.set(3 + rnd(i, 4) * 10, 0.025 + rnd(i, 5) * 0.05, 1);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mat.uniforms.color.value.set(color);
  mat.uniforms.opacity.value = amount;
  return <primitive object={mesh} />;
};

// ---- バージョン番号（周りの環境は進み続ける） ----
const CELLS = 64;
const NUMS = 260;
function atlasLabels() {
  const out: string[] = [];
  for (let i = 0; i < 48; i++) out.push(`v${Math.floor(i / 8) + 1}.${(i * 3) % 10}`);
  const tags = ['[core]', '[utils]', '[auth]', '[types]', '[events]', '[http]', '[crypto]', '[ui]', 'npm', 'deps', 'CVE', 'patch', '2.0.3', '1.9.0', 'lib', 'api'];
  return out.concat(tags);
}
export const Numbers: React.FC<{t: number; amount: number; x0: number; x1: number}> = ({t, amount, x0, x1}) => {
  const {mesh, mat} = useMemo(() => {
    const labels = atlasLabels();
    const cv = document.createElement('canvas');
    const cw = 256, ch = 96;
    cv.width = cw * 8;
    cv.height = ch * 8;
    const g = cv.getContext('2d')!;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    labels.forEach((s, i) => {
      const cx = (i % 8) * cw + cw / 2, cy = Math.floor(i / 8) * ch + ch / 2;
      g.font = `700 ${s.startsWith('[') || s.length > 4 ? 46 : 62}px ${FONT}`;
      g.fillStyle = s.startsWith('[') || s === 'npm' || s === 'deps' || s === 'lib' || s === 'api' ? '#7fb6c8' : '#bff3ff';
      if (s === 'CVE' || s === 'patch') g.fillStyle = '#ff8a5c';
      g.fillText(s, cx, cy);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const geo = new THREE.PlaneGeometry(1, 0.375);
    const cell = new Float32Array(NUMS);
    const rate = new Float32Array(NUMS);
    for (let i = 0; i < NUMS; i++) {
      const tag = rnd(i, 9) > 0.72;
      cell[i] = tag ? 48 + Math.floor(rnd(i, 10) * 16) : Math.floor(rnd(i, 10) * 20);
      rate[i] = tag ? 0 : 0.8 + rnd(i, 11) * 2.2;
    }
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 1));
    geo.setAttribute('aRate', new THREE.InstancedBufferAttribute(rate, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {map: {value: tex}, uT: {value: 0}, uOpacity: {value: 1}},
      vertexShader: /* glsl */ `
        attribute float aCell; attribute float aRate; uniform float uT; varying vec2 vUv; varying float vFlash; varying vec2 vNdc; varying float vDepth;
        void main(){
          float idx = aCell;
          float step0 = floor(uT*aRate);
          if (aRate > 0.) idx = mod(aCell + step0, 48.);
          vFlash = aRate > 0. ? 1. - fract(uT*aRate) : 0.;
          vec2 c = vec2(mod(idx, 8.), 7. - floor(idx/8.));
          vUv = (c + uv)/8.;
          // 札の中心の画面位置（要点の字面域では薄くする）
          vec4 cc = projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
          vNdc = cc.xy/max(.01, cc.w); vDepth = cc.w;
          gl_Position = projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map; uniform float uOpacity; varying vec2 vUv; varying float vFlash; varying vec2 vNdc; varying float vDepth;
        void main(){ vec4 c = texture2D(map, vUv); c.rgb *= 1. + .8*pow(vFlash, 6.);
          float r = length(vNdc*vec2(.85, 1.25));
          float keep = (.08 + .92*max(smoothstep(.62, .85, abs(vNdc.x)), smoothstep(.55, .95, r)*step(.95, abs(vNdc.y)))) * smoothstep(7., 13., vDepth);
          gl_FragColor = vec4(c.rgb, c.a*uOpacity*keep);
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.InstancedMesh(geo, mat, NUMS);
    m.frustumCulled = false;
    return {mesh: m, mat};
  }, []);
  if (amount <= 0.001) return null;
  const o = new THREE.Object3D();
  for (let i = 0; i < NUMS; i++) {
    let y = -2 + rnd(i, 2) * 11;
    let z = -28 + rnd(i, 3) * 36;
    // 被写体の通り道は空ける
    if (Math.abs(z) < 4 && y < 5) z += z < 0 ? -5 : 5;
    o.position.set(x0 + rnd(i, 1) * (x1 - x0), y, z);
    o.rotation.set(0, (rnd(i, 4) - 0.5) * 0.5, 0);
    const s = 1.3 + rnd(i, 5) * 2.2;
    o.scale.set(s, s, s);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mat.uniforms.uT.value = t;
  mat.uniforms.uOpacity.value = amount;
  return <primitive object={mesh} />;
};

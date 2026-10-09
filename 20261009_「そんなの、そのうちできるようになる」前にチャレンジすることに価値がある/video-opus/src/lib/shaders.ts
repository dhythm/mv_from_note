// シェーダー。時間に関わる値はすべて uniform で渡す（シェーダー内で実時間を参照しない）。
export const FOG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
float fogK(vec3 wp) {
  float d = distance(wp, cameraPosition);
  return smoothstep(uFogNear, uFogFar, d);
}
`;

const NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = h21(i), b = h21(i + vec2(1, 0)), c = h21(i + vec2(0, 1)), d = h21(i + vec2(1, 1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
`;

export const groundVert = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
export const groundFrag = /* glsl */ `
${FOG}
${NOISE}
varying vec3 vW;
uniform float uGrid;
uniform float uLight;
uniform vec3 uSpot;
uniform float uSpotR;
void main() {
  vec2 p = vW.xz;
  float n = fbm(p * 0.35);
  float n2 = fbm(p * 2.2 + 9.0);
  float speck = step(0.93, h21(floor(p * 9.0)));
  vec3 soil = mix(vec3(0.085, 0.072, 0.060), vec3(0.17, 0.145, 0.118), n);
  soil *= 0.82 + 0.36 * n2;
  soil += speck * 0.035;
  // 細い格子（測量の目安）
  vec2 g = abs(fract(p / 4.0 - 0.5) - 0.5) * 4.0;
  float line = 1.0 - smoothstep(0.0, 0.06, min(g.x, g.y));
  soil += vec3(0.55, 0.65, 0.25) * line * uGrid * 0.10;
  // 動くスポット（カメラの注視点のまわりを明るく）
  float sp = exp(-pow(distance(p, uSpot.xz) / uSpotR, 2.0));
  soil *= (0.55 + 0.75 * sp) * uLight;
  float f = fogK(vW);
  gl_FragColor = vec4(mix(soil, uFogColor, f), 1.0);
}
`;

// 溝（帯の四角形をインスタンスで並べ、断片側でカプセルの距離を計算）
export const grooveVert = /* glsl */ `
attribute vec2 iA;
attribute vec2 iB;
attribute vec2 iD;
attribute vec2 iK;
uniform float uGrow;
uniform float uDetour;
uniform float uHalf;
uniform float uWidth;
varying vec2 vP;
varying vec2 vA;
varying vec2 vB;
varying float vF;
varying float vAge;
varying float vKind;
varying float vDepth;
varying vec3 vW;
void main() {
  float prog = iK.y < 0.5 ? uGrow : uDetour;
  float f = clamp((prog - iD.x) / max(iD.y - iD.x, 1e-4), 0.0, 1.0);
  vF = f;
  vKind = iK.x;
  vAge = prog - iD.y;
  vDepth = iD.y;
  if (f <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 B = mix(iA, iB, f);
  vec2 d = B - iA;
  float L = length(d);
  vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = uHalf * uWidth * (iK.x > 0.5 ? 0.6 : 1.0);
  // position.x: 0..1 で A から B、position.y: -1..1 で横
  vec2 c = mix(iA - dir * hw, B + dir * hw, position.x) + nrm * position.y * hw;
  vP = c; vA = iA; vB = B;
  vec4 w = modelMatrix * vec4(c.x, position.z, c.y, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
export const grooveGlowFrag = /* glsl */ `
${FOG}
uniform float uWidth;
uniform float uCore;
uniform float uHalf;
uniform float uPulse;
uniform float uFlood;
uniform float uIntensity;
varying vec2 vP;
varying vec2 vA;
varying vec2 vB;
varying float vF;
varying float vAge;
varying float vKind;
varying float vDepth;
varying vec3 vW;
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float d = sdSeg(vP, vA, vB);
  float cw = uCore * uWidth * (vKind > 0.5 ? 0.5 : 1.0);
  float hw = uHalf * uWidth;
  float core = 1.0 - smoothstep(cw * 0.55, cw, d);
  float halo = exp(-pow(d / (hw * 0.42), 2.0));
  float hot = exp(-max(vAge, 0.0) * 0.22);
  // 掘っている最中の先端は白く強い
  float tip = vF < 1.0 ? exp(-pow(distance(vP, vB) / (cw * 2.2), 2.0)) * 1.6 : 0.0;
  // 光の走行
  float run = exp(-pow((uPulse - vDepth) / 7.0, 2.0)) + exp(-pow((uPulse - 120.0 - vDepth) / 7.0, 2.0));
  vec3 lime = vec3(0.824, 1.0, 0.102);
  vec3 col = lime * (core * (1.15 + 0.9 * hot + 0.8 * run) + halo * (0.26 + 0.3 * hot + 0.5 * run));
  col += vec3(1.0) * (core * hot * 0.55 + tip);
  col *= (vKind > 0.5 ? 0.4 : 1.0) * uIntensity;
  col = mix(col, lime * (core + halo) * 1.4, uFlood);
  float f = fogK(vW);
  gl_FragColor = vec4(col * (1.0 - f), 1.0);
}
`;
export const grooveTrenchFrag = /* glsl */ `
${FOG}
uniform float uWidth;
uniform float uHalf;
varying vec2 vP;
varying vec2 vA;
varying vec2 vB;
varying float vKind;
varying vec3 vW;
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float d = sdSeg(vP, vA, vB);
  float tw = uHalf * uWidth * 0.48;
  float a = 1.0 - smoothstep(tw * 0.75, tw, d);
  if (a < 0.01) discard;
  float rim = smoothstep(tw * 0.55, tw * 0.95, d) * a;
  vec3 c = mix(vec3(0.02, 0.018, 0.016), vec3(0.24, 0.2, 0.15), rim);
  float f = fogK(vW);
  gl_FragColor = vec4(mix(c, uFogColor, f), a * 0.92);
}
`;

// × 印（インスタンス。到達した深さで弾けるように現れる）
export const crossVert = /* glsl */ `
attribute vec3 iC;
attribute vec2 iK;
uniform float uGrow;
uniform float uDetour;
uniform float uSize;
varying vec2 vUv;
varying float vS;
varying vec3 vW;
void main() {
  float prog = iK.x < 0.5 ? uGrow : uDetour;
  float k = clamp((prog - iC.z) / 2.5, 0.0, 1.0);
  float s = k <= 0.0 ? 0.0 : 1.0 + 2.70158 * pow(k - 1.0, 3.0) + 1.70158 * pow(k - 1.0, 2.0);
  vS = k;
  vUv = position.xz;
  float sz = uSize * s * iK.y;
  vec4 w = modelMatrix * vec4(iC.x + position.x * sz, 0.03, iC.y + position.z * sz, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
export const crossFrag = /* glsl */ `
${FOG}
uniform float uIntensity;
varying vec2 vUv;
varying float vS;
varying vec3 vW;
void main() {
  if (vS <= 0.0) discard;
  vec2 p = vUv;
  float d1 = abs(p.x - p.y) / 1.4142;
  float d2 = abs(p.x + p.y) / 1.4142;
  float inside = step(max(abs(p.x), abs(p.y)), 0.42);
  float d = min(d1, d2);
  float core = (1.0 - smoothstep(0.05, 0.09, d)) * inside;
  float halo = exp(-pow(d / 0.2, 2.0)) * (1.0 - smoothstep(0.3, 0.5, max(abs(p.x), abs(p.y))));
  vec3 col = vec3(0.824, 1.0, 0.102) * (core * 1.4 + halo * 0.45) + vec3(1.0) * core * 0.45;
  float f = fogK(vW);
  gl_FragColor = vec4(col * uIntensity * (1.0 - f), 1.0);
}
`;

// 字形の下の光（マスク×掘った深さ）。新しい板を出すのではなく、掘られた格子だけが内側から灯る
export const glyphVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
export const glyphFrag = /* glsl */ `
${FOG}
uniform sampler2D uMask;
uniform sampler2D uDepth;
uniform float uGrow;
uniform float uMaxD;
uniform float uGlow;
uniform float uFlood;
varying vec2 vUv;
varying vec3 vW;
void main() {
  float m = texture2D(uMask, vUv).r;
  float dd = texture2D(uDepth, vUv).r * uMaxD;
  float lit = smoothstep(dd - 6.0, dd + 2.0, uGrow);
  vec3 lime = vec3(0.824, 1.0, 0.102);
  vec3 col = lime * m * lit * (uGlow * 0.16 + uFlood * 0.5);
  float f = fogK(vW);
  gl_FragColor = vec4(col * (1.0 - f), 1.0);
}
`;

// 舗装（先端より先は描かない）。道の向きは uAxis（0: x 方向、1: z 方向）
export const roadVert = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
export const roadFrag = /* glsl */ `
${FOG}
${NOISE}
uniform float uFront;
uniform float uStart;
uniform float uAxis;
uniform float uCenter;
uniform float uHalfW;
uniform float uSheen;
varying vec3 vW;
varying vec3 vN;
void main() {
  float along = uAxis < 0.5 ? vW.x : -vW.z;
  if (along > uFront) discard;
  float across = (uAxis < 0.5 ? vW.z : vW.x) - uCenter;
  vec3 c = vec3(0.30, 0.30, 0.295) * (0.86 + 0.22 * vnoise(vW.xz * 3.0));
  float top = step(0.5, vN.y);
  // 中央の破線と路肩の線
  float dash = step(0.5, fract(along / 3.2)) * (1.0 - smoothstep(0.07, 0.11, abs(across)));
  float edge = 1.0 - smoothstep(0.05, 0.09, abs(abs(across) - (uHalfW - 0.35)));
  c = mix(c, vec3(0.92, 0.92, 0.88), (dash + edge) * top);
  c *= mix(0.55, 1.0, top);
  // 敷きたての先端の明るさ
  c += vec3(0.5, 0.55, 0.45) * exp(-(uFront - along) * 0.35) * uSheen * top;
  float f = fogK(vW);
  gl_FragColor = vec4(mix(c, uFogColor, f), 1.0);
}
`;

// 断面の板: 地層と、層ごとに残った溝の断面（光るジグザグ）
export const slabFrag = /* glsl */ `
${FOG}
${NOISE}
uniform float uReveal;
uniform vec3 uBox;
uniform vec3 uCenterW;
varying vec3 vW;
varying vec3 vN;
void main() {
  vec3 lp = vW - uCenterW;
  float top = step(0.5, vN.y);
  float y01 = (lp.y + uBox.y * 0.5) / uBox.y;
  float u = (abs(vN.x) > 0.5 ? lp.z : lp.x);
  float band = fbm(vec2(u * 0.15, y01 * 9.0));
  vec3 strata = mix(vec3(0.11, 0.09, 0.075), vec3(0.27, 0.215, 0.16), smoothstep(0.25, 0.85, band));
  strata *= 0.8 + 0.25 * step(0.5, fract(y01 * 6.0 + band * 0.4));
  vec3 lime = vec3(0.824, 1.0, 0.102);
  float glow = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float yl = 0.14 + fi * 0.17;
    float freq = 0.55 + fi * 0.13;
    float zig = abs(fract(u * freq * 0.25 + fi * 0.37) - 0.5) * 2.0;
    float yy = yl + (zig - 0.5) * 0.09 + (vnoise(vec2(u * 0.6, fi)) - 0.5) * 0.04;
    float vis = smoothstep(fi * 0.2, fi * 0.2 + 0.2, uReveal);
    float d = abs(y01 - yy) * uBox.y;
    glow += vis * (exp(-pow(d / 0.09, 2.0)) * 1.4 + exp(-pow(d / 0.35, 2.0)) * 0.35);
  }
  vec3 c = mix(strata + lime * glow, vec3(0.13, 0.11, 0.09) * (0.8 + 0.4 * fbm(vW.xz)), top);
  float f = fogK(vW);
  gl_FragColor = vec4(mix(c, uFogColor, f), 1.0);
}
`;

// 柱: 暗い石と光る稜線
export const pillarFrag = /* glsl */ `
${FOG}
${NOISE}
uniform vec3 uBox;
uniform vec3 uCenterW;
uniform float uHeat;
varying vec3 vW;
varying vec3 vN;
void main() {
  vec3 lp = (vW - uCenterW) / (uBox * 0.5);
  vec3 a = abs(lp);
  float e1 = (abs(vN.x) > 0.5) ? max(a.y, a.z) : (abs(vN.y) > 0.5 ? max(a.x, a.z) : max(a.x, a.y));
  float edge = smoothstep(0.86, 0.97, e1);
  vec3 c = vec3(0.13, 0.125, 0.115) * (0.8 + 0.4 * fbm(vW.xy * 1.3 + vW.zy));
  c += vec3(0.824, 1.0, 0.102) * edge * (0.7 + uHeat);
  float f = fogK(vW);
  gl_FragColor = vec4(mix(c, uFogColor, f), 1.0);
}
`;

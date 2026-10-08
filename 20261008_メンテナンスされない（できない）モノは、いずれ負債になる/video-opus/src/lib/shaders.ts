// シェーダー。時間に関わる値はすべて uniform で渡し、シェーダー内で勝手に進めない。
import * as THREE from 'three';

const NOISE = /* glsl */ `
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float h31(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.-2.*f);
  float a=mix(mix(h31(i),h31(i+vec3(1,0,0)),u.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),u.x), u.y);
  float b=mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),u.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),u.x), u.y);
  return mix(a,b,u.z); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }
float fbm3(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vnoise3(p); p=p*2.07+vec3(17.1,9.2,3.7); a*=.5; } return s; }
vec3 rustColor(float n){
  vec3 dark = vec3(0.20,0.07,0.03);
  vec3 mid = vec3(0.62,0.22,0.06);
  vec3 hi = vec3(0.93,0.48,0.16);
  return n < .5 ? mix(dark, mid, n*2.) : mix(mid, hi, (n-.5)*2.);
}
`;

// ---- 地面（畑 ⇔ 格子）----
export function groundMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uField: {value: 1},
      uWild: {value: 0},
      uSplit: {value: 0},
      uCam: {value: new THREE.Vector3()},
      uFog: {value: new THREE.Color('#0b2230')},
      uFogNear: {value: 30},
      uFogFar: {value: 150},
      uGrid: {value: new THREE.Color('#38d0e8')},
      uGridBase: {value: new THREE.Color('#061520')},
      uWarm: {value: 0},
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uField, uWild, uSplit, uFogNear, uFogFar, uWarm;
      uniform vec3 uCam, uFog, uGrid, uGridBase;
      varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        // 区画（畑）
        vec2 plot = vec2(16., 11.);
        vec2 id = floor(p/plot);
        vec2 f = fract(p/plot);
        float ph = h21(id);
        float rows = 0.5+0.5*sin(p.y*7.0 + ph*6.);
        vec3 g1 = mix(vec3(0.10,0.42,0.16), vec3(0.22,0.62,0.20), ph);
        vec3 g2 = g1*0.55;
        vec3 crop = mix(g2, g1, smoothstep(.2,.8,rows));
        crop *= 0.85 + 0.3*fbm(p*0.6);
        float path = 1. - smoothstep(0., .035, min(min(f.x,1.-f.x)*1.4, min(f.y,1.-f.y)));
        vec3 dirt = vec3(0.45,0.38,0.27);
        // 荒れ: 手入れがなくなると草が伸び、乾いた茶色と濃い雑草が広がる
        // 結論の畑: 手入れされた区画と荒れた区画（World.tsx の plotKept と同じ整数規則）
        float kept = step(mod(id.x*7. + id.y*3., 5.), 1.5);
        float wildPlot = mix(uWild, 1. - kept, uSplit);
        float n = fbm(p*0.35 + ph*3.);
        float wm = smoothstep(n - .15, n + .05, wildPlot*1.25 - .1);
        float clump = fbm(p*2.3);
        vec3 dry = mix(vec3(0.42,0.34,0.17), vec3(0.62,0.52,0.28), clump);
        vec3 weed = mix(vec3(0.16,0.20,0.08), vec3(0.30,0.33,0.12), fbm(p*5.));
        vec3 wild = mix(dry, weed, smoothstep(.45,.7,clump));
        vec3 field = mix(crop, wild, wm);
        field = mix(field, dirt*(0.8+0.3*clump), path*(1.-wm*.7));
        field = mix(field, field*vec3(1.15,0.95,0.75), uWarm);
        // 格子（ソフトウェアの世界）
        vec2 gq = abs(fract(p/2.) - .5);
        float minor = 1. - smoothstep(0., .03, min(gq.x,gq.y));
        vec2 gm = abs(fract(p/10.) - .5);
        float major = 1. - smoothstep(0., .012, min(gm.x,gm.y));
        vec3 grid = uGridBase + uGrid*(minor*.18 + major*.55);
        vec3 col = mix(grid, field, uField);
        float d = length(vW - uCam);
        float fog = smoothstep(uFogNear, uFogFar, d);
        gl_FragColor = vec4(mix(col, uFog, fog), 1.);
        #include <colorspace_fragment>
      }`,
  });
}

// ---- 空（カメラを包む球）----
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: {value: new THREE.Color('#2a6f95')},
      uHor: {value: new THREE.Color('#bfe3ef')},
      uBot: {value: new THREE.Color('#0b2230')},
      uCloud: {value: 1},
      uShift: {value: 0},
    },
    vertexShader: /* glsl */ `
      varying vec3 vD;
      void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uTop, uHor, uBot; uniform float uCloud, uShift;
      varying vec3 vD;
      void main(){
        float y = vD.y;
        vec3 c = y > 0. ? mix(uHor, uTop, smoothstep(0., .55, y)) : mix(uHor, uBot, smoothstep(0., .12, -y));
        float az = atan(vD.z, vD.x);
        float cl = fbm(vec2(az*3. + uShift, y*9.));
        float band = smoothstep(.02,.12,y) * (1.-smoothstep(.18,.4,y));
        c = mix(c, vec3(1.), uCloud*band*smoothstep(.5,.8,cl)*.7);
        gl_FragColor = vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  });
}

// ---- 錆びて崩れる文字 ----
export function rustTextMaterial(map: THREE.Texture, aspect: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: {value: map},
      uRust: {value: 0},
      uCrumble: {value: 0},
      uTint: {value: new THREE.Color('#ffffff')},
      uOpacity: {value: 1},
      uAspect: {value: aspect},
      uSeed: {value: 0},
      uGlow: {value: 0},
      uShade: {value: 0.85},
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform sampler2D map; uniform float uRust, uCrumble, uOpacity, uAspect, uSeed, uGlow, uShade; uniform vec3 uTint;
      varying vec2 vUv;
      float A(vec2 o){ return texture2D(map, vUv + o).a; }
      void main(){
        float a = A(vec2(0.));
        // 字形の内側の深さ（周囲の不透明度の平均）。縁ほど小さい
        vec2 r1 = vec2(0.012/uAspect, 0.012), r2 = r1*2.4;
        float d = (A(vec2(r1.x,0.))+A(vec2(-r1.x,0.))+A(vec2(0.,r1.y))+A(vec2(0.,-r1.y))
                 + A(vec2(r2.x,r2.y))+A(vec2(-r2.x,r2.y))+A(vec2(r2.x,-r2.y))+A(vec2(-r2.x,-r2.y)))/8.;
        float edge = 1. - d;
        vec2 q = vec2(vUv.x*uAspect, vUv.y)*7. + uSeed;
        float n = fbm(q);
        float n2 = fbm(q*2.7 + 5.);
        // 錆: 縁から内側へ（反応拡散のように斑に）進む
        float front = uRust*1.55 - (1.-edge)*0.85 - n*0.45;
        float rm = smoothstep(0., .18, front);
        vec3 clean = uTint * (uShade + (1.-uShade)*vUv.y);
        vec3 rc = rustColor(clamp(n2*1.2 - .1 + rm*.2, 0., 1.));
        vec3 col = mix(clean, rc, rm);
        // 錆の前線は熱を帯びたように少し明るい
        col += vec3(1.,.45,.12) * smoothstep(.0,.06,front)*(1.-smoothstep(.06,.2,front)) * (.35 + uGlow);
        // 崩落: 錆びたところから欠けていく
        float gone = uCrumble*1.5 - (1.-edge)*0.5 - n2*0.6 - (1.-rm)*0.4;
        if (gone > 0.) discard;
        float alpha = a * uOpacity;
        if (alpha < .01) discard;
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`,
  });
}

// ---- 金属（歯車など）: 錆の進行と金継ぎの修繕線 ----
export function metalMaterial(base = '#c9d3da') {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: {value: new THREE.Color(base)},
      uRust: {value: 0},
      uRadial: {value: 1},
      uR: {value: 3},
      uSeam: {value: 0},
      uLight: {value: new THREE.Vector3(0.4, 0.75, 0.55).normalize()},
      uEmit: {value: 0},
      uEmitColor: {value: new THREE.Color('#ffffff')},
      uScale: {value: 1.6},
    },
    vertexShader: /* glsl */ `
      varying vec3 vL; varying vec3 vN; varying vec3 vV;
      void main(){ vL = position; vN = normalize(mat3(modelMatrix)*normal);
        vec4 w = modelMatrix*vec4(position,1.); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uBase, uLight, uEmitColor; uniform float uRust, uRadial, uR, uSeam, uEmit, uScale;
      varying vec3 vL; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 N = normalize(vN);
        float dif = clamp(dot(N, uLight), 0., 1.);
        float rim = pow(1. - clamp(dot(N, normalize(vV)), 0., 1.), 3.);
        vec3 H = normalize(uLight + normalize(vV));
        float n = fbm3(vL*uScale);
        float n2 = fbm3(vL*uScale*3.1 + 7.);
        // 歯先（外周）から錆びる
        float r = length(vL.xy)/uR;
        float front = uRust*1.6 - (1.-r)*uRadial*0.9 - n*0.55;
        float rm = smoothstep(0., .2, front);
        float spec = pow(clamp(dot(N,H),0.,1.), mix(60., 6., rm)) * mix(1.1, .08, rm);
        vec3 metal = uBase*(.28 + .8*dif) + spec;
        vec3 rc = rustColor(clamp(n2*1.3 - .15, 0., 1.)) * (.45 + .75*dif);
        vec3 col = mix(metal, rc, rm) + rim*mix(vec3(.35,.5,.6), vec3(.4,.15,.05), rm)*.6;
        // 金継ぎ: 錆は残したまま、修繕の線が光る
        float seam = 1. - smoothstep(0., .035, abs(fbm3(vL*1.1 + 3.) - .5));
        col = mix(col, vec3(1.,.78,.32)*(1.1+spec), seam*uSeam*rm);
        col += uEmitColor*uEmit;
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  });
}

// ---- 外見は無傷の箱（スキャン帯の中だけ表層が消え、内部が見える）----
export function shellMaterial(label: THREE.Texture | null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: {value: label},
      uHasMap: {value: label ? 1 : 0},
      uScanY: {value: -99},
      uBand: {value: 0},
      uLight: {value: new THREE.Vector3(0.35, 0.8, 0.5).normalize()},
      uBase: {value: new THREE.Color('#f4f7fa')},
      uDim: {value: 0},
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vLN;
      void main(){ vUv = uv; vLN = normal; vN = normalize(mat3(modelMatrix)*normal);
        vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uHasMap, uScanY, uBand, uDim; uniform vec3 uLight, uBase;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vLN;
      void main(){
        float dy = abs(vW.y - uScanY);
        if (dy < uBand*.5) discard;
        vec3 N = normalize(vN);
        float dif = clamp(dot(N,uLight),0.,1.);
        vec3 V = normalize(cameraPosition - vW);
        float spec = pow(clamp(dot(N, normalize(uLight+V)),0.,1.), 40.)*.35;
        vec3 col = uBase*(.55 + .5*dif) + spec;
        if (uHasMap > .5 && vLN.z > .9) {
          vec4 t = texture2D(map, vUv);
          col = mix(col, t.rgb, t.a);
        }
        // 帯の縁は光る
        float edgeGlow = (1. - smoothstep(0., .07, dy - uBand*.5)) * step(.001, uBand);
        col = mix(col, vec3(.45,.95,1.), edgeGlow*.9);
        col *= 1. - uDim;
        gl_FragColor = vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
}

// ---- 内部の腐食（暗い芯に錆と亀裂）----
export function coreMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRot: {value: 1},
      uLight: {value: new THREE.Vector3(0.35, 0.8, 0.5).normalize()},
      uPulse: {value: 0},
    },
    vertexShader: /* glsl */ `
      varying vec3 vL; varying vec3 vN;
      void main(){ vL = (modelMatrix*vec4(position,1.)).xyz; vN = normalize(mat3(modelMatrix)*normal);
        gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uRot, uPulse; uniform vec3 uLight;
      varying vec3 vL; varying vec3 vN;
      void main(){
        vec3 p = vL*1.7;
        float n = fbm3(p);
        float n2 = fbm3(p*3.3 + 2.);
        float dif = .35 + .65*clamp(dot(normalize(vN),uLight),0.,1.);
        vec3 base = mix(vec3(.10,.12,.14), rustColor(clamp(n2*1.3-.1,0.,1.)), smoothstep(.35,.6,n + uRot*.3 - .15));
        float crack = 1. - smoothstep(0., .03, abs(n - .5));
        vec3 col = base*dif + vec3(1.,.42,.1)*crack*(.6 + .6*uPulse)*uRot;
        gl_FragColor = vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
}

// ---- 粒子 ----
export function pointsMaterial(size = 0.12) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {uSize: {value: size}, uOpacity: {value: 1}, uScale: {value: 720}},
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float alpha; attribute float psize;
      uniform float uSize, uScale; varying vec3 vC; varying float vA;
      void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix*vec4(position,1.);
        gl_PointSize = uSize*psize*uScale/max(.1,-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){ vec2 q = gl_PointCoord - .5; float d = length(q); if (d > .5) discard;
        float a = smoothstep(.5, .1, d) * vA * uOpacity; gl_FragColor = vec4(vC, a);
        #include <colorspace_fragment>
      }`,
  });
}

// ---- 波（OS更新）----
export function waveMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {uT: {value: 0}, uAmp: {value: 1}, uOpacity: {value: 1}},
    vertexShader: /* glsl */ `
      uniform float uT, uAmp; varying vec2 vUv; varying float vH;
      void main(){ vUv = uv; vec3 p = position;
        float crest = exp(-pow((uv.x - .75)*4.,2.));
        float h = uAmp*(crest*(1.+.25*sin(uv.y*18. + uT*6.)) + .12*sin(uv.x*20. - uT*8. + uv.y*7.));
        p.z += h; p.y += crest*uAmp*.6*(1.-uv.x); vH = h;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uT, uOpacity; varying vec2 vUv; varying float vH;
      void main(){
        float foam = smoothstep(.75,1.,vH) + smoothstep(.55,.8,fbm(vUv*vec2(30.,8.) + vec2(-uT*3.,0.)))*.4;
        vec3 c = mix(vec3(.05,.35,.6), vec3(.3,.85,1.), clamp(vH*.8,0.,1.));
        c = mix(c, vec3(.95,1.,1.), clamp(foam*.55,0.,1.));
        float a = uOpacity * smoothstep(0.,.08,vUv.x) * smoothstep(1.,.92,vUv.x) * smoothstep(0.,.1,vUv.y)*smoothstep(1.,.9,vUv.y);
        gl_FragColor = vec4(c, a*.62);
        #include <colorspace_fragment>
      }`,
  });
}

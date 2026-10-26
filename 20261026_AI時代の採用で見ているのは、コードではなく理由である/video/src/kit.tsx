// 文字と面の部品（DOM／CSS）。文字は行のマスクから入り、読む間は形を崩さない。
// 動きは行・塊・面・画面全体の移動／拡縮／回転で出す。すべてフレーム時刻から決まる純関数。
// 出発点: 20261021 の kit.tsx（さらに元は 20261018 の v2/kit.tsx）。配色・書体・コードの壁・手元のコマ送りは本作用。
import React from 'react';
import {Img, staticFile} from 'remotion';
import {clamp, ease, hash, lerp, prog} from './lib/anim';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// 1 記号 = 1 意味（plan.html「記号・色の一覧」）
export const C = {
  paper: '#fbf8f1', // 背景
  ink: '#1e2430', // 主文
  red: '#e8452c', // 理由・問い
  gray: '#8c93a0', // 借りたもの・中身のないもの
  gray2: '#b9bec7',
  gray3: '#dfe1e5',
  blue: '#2f6fe4', // AI という道具
  blueLight: '#dce7fb',
  card: '#ffffff',
  lime: '#d2ff1a',
};

export const F = {
  jp: 'NotoSansJPv',
  // コードの等幅。企画の第一候補 IBM Plex Mono は手元に無く、制作機の Menlo（macOS 標準）を使う
  mono: 'Menlo, "SF Mono", Monaco, monospace',
};

export const outExpo = ease.outExpo;
export const inExpo = ease.inExpo;
export const inOut = ease.inOut;
export const out3 = ease.out;
export const outBack = ease.outBack;
export {clamp, lerp, prog};

export const typeBase: React.CSSProperties = {
  fontFeatureSettings: '"palt" 1',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  position: 'absolute',
};

// キー列の補間（区間ごとにイージングを指定できる。既定は inOut）
export type K = [number, number, ((k: number) => number)?];
export function kv(t: number, keys: K[]) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va, e] = keys[i];
    const [b, vb] = keys[i + 1];
    if (t <= b) return lerp(va, vb, (e ?? inOut)(prog(t, a, b)));
  }
  return keys[keys.length - 1][1];
}

// 層: 位置・回転・拡縮。原点は (ox, oy)
export const Lay: React.FC<{x?: number; y?: number; s?: number; r?: number; ox?: number; oy?: number; o?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({x = 0, y = 0, s = 1, r = 0, ox = W / 2, oy = H / 2, o = 1, style, children}) =>
  o <= 0.001 ? null : (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: o, transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, transformOrigin: `${ox}px ${oy}px`, ...style}}>{children}</div>
  );

export const Bg: React.FC<{color?: string}> = ({color = C.paper}) => <div style={{position: 'absolute', inset: -600, background: color}} />;

// ---- 行のマスク表示 ----
// t0 から1文字ずつマスクの外からせり出し、t1 からマスクの外へ抜ける。dir は入ってくる向き。
// anchor は x が行のどこを指すか（左端・中央・右端）。y は行の上端。
type Dir = 'up' | 'down' | 'left' | 'right';
export const Line: React.FC<{
  t: number;
  text: string;
  x: number;
  y: number;
  size: number;
  font?: string;
  weight?: number;
  color?: string;
  t0: number;
  t1?: number;
  dir?: Dir;
  stagger?: number;
  dur?: number;
  outDur?: number;
  spacing?: number;
  anchor?: 'l' | 'c' | 'r';
  colorAt?: (i: number) => string | undefined;
  style?: React.CSSProperties;
}> = ({t, text, x, y, size, font = F.jp, weight = 900, color = C.ink, t0, t1 = 1e9, dir = 'up', stagger = 0.025, dur = 0.5, outDur = 0.38, spacing = 0, anchor = 'l', colorAt, style}) => {
  if (t < t0 - 0.01) return null;
  const chars = Array.from(text);
  const n = chars.length;
  if (t > t1 + outDur + n * stagger * 0.6 + 0.05) return null;
  const pad = size * 0.18;
  const tx = anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  return (
    <div style={{...typeBase, left: x, top: y - pad, transform: `translateX(${tx})`, overflow: 'hidden', padding: `${pad}px ${size * 0.04}px`, margin: `0 ${-size * 0.04}px`, fontFamily: font, fontSize: size, fontWeight: weight, color, letterSpacing: `${spacing}em`, ...style}}>
      {chars.map((ch, i) => {
        const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
        const kout = inExpo(prog(t, t1 + i * stagger * 0.6, t1 + i * stagger * 0.6 + outDur));
        const a = (1 - kin) * 125;
        const b = kout * 125;
        const tr = dir === 'up' ? `translateY(${a - b}%)` : dir === 'down' ? `translateY(${-a + b}%)` : dir === 'left' ? `translateX(${a * 1.2 - b * 1.2}%)` : `translateX(${-a * 1.2 + b * 1.2}%)`;
        return (
          <span key={i} data-ch="1" style={{display: 'inline-block', transform: tr, color: colorAt?.(i) ?? color}}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </div>
  );
};

// ---- 叩き込む主役の語（大きく速く着地。1字ずつ跳ねさせない）。x, y は語の中心 ----
// 塊ごと 1.9 倍から縮んで着地し、着地の瞬間に少し沈む。退場は t1 から縮んで消える。
export const Slam: React.FC<{t: number; text: string; x: number; y: number; size: number; color?: string; t0: number; t1?: number; weight?: number; from?: number; anchor?: 'l' | 'c' | 'r'; style?: React.CSSProperties}> = ({t, text, x, y, size, color = C.ink, t0, t1 = 1e9, weight = 900, from = 1.9, anchor = 'c', style}) => {
  if (t < t0) return null;
  const k = prog(t, t0, t0 + 0.32);
  const ko = inExpo(prog(t, t1, t1 + 0.3));
  if (ko >= 1) return null;
  const s = lerp(from, 1, outExpo(k)) * (1 - 0.04 * Math.sin(Math.PI * prog(t, t0 + 0.28, t0 + 0.55))) * (1 - 0.6 * ko);
  const o = clamp(k * 4) * (1 - ko);
  const tx = anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  const orig = anchor === 'c' ? '50% 50%' : anchor === 'r' ? '100% 50%' : '0% 50%';
  return (
    <div style={{...typeBase, left: x, top: y, transform: `translate(${tx}, -50%) scale(${s})`, transformOrigin: orig, opacity: o, fontFamily: F.jp, fontWeight: weight, fontSize: size, color, ...style}}>
      {Array.from(text).map((ch, i) => (
        <span key={i} data-ch="1" style={{display: 'inline-block'}}>
          {ch}
        </span>
      ))}
    </div>
  );
};

// ---- 縦組みの列（1文字ずつ上下から列のマスクに入る）。x は列の中心、y は上端 ----
export const VLine: React.FC<{t: number; text: string; x: number; y: number; size: number; weight?: number; color?: string; t0: number; t1?: number; dir?: 'up' | 'down'; stagger?: number; gap?: number}> = ({t, text, x, y, size, weight = 900, color = C.ink, t0, t1 = 1e9, dir = 'down', stagger = 0.05, gap = 0.04}) => {
  if (t < t0 - 0.01) return null;
  const chars = Array.from(text);
  if (t > t1 + 0.4 + chars.length * stagger + 0.05) return null;
  const ch1 = size * (1 + gap);
  const n = chars.length;
  return (
    <div style={{position: 'absolute', left: x - size * 0.6, top: y, width: size * 1.2, height: ch1 * n, overflow: 'hidden', fontFamily: F.jp, fontWeight: weight, fontSize: size, color, lineHeight: 1, fontFeatureSettings: '"vpal" 1', writingMode: 'horizontal-tb'}}>
      {chars.map((ch, i) => {
        const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + 0.55));
        const kout = inExpo(prog(t, t1 + i * stagger * 0.5, t1 + i * stagger * 0.5 + 0.4));
        const off = dir === 'down' ? -(1 - kin) * (i + 1.1) * ch1 + kout * (n - i + 0.1) * ch1 : (1 - kin) * (n - i + 0.1) * ch1 - kout * (i + 1.1) * ch1;
        // 句読点は縦組みの位置（右上）へ寄せる
        const punct = ch === '、' || ch === '。';
        return (
          <div key={i} data-ch="1" style={{height: ch1, textAlign: 'center', transform: `translateY(${off}px)${punct ? ` translate(${size * 0.55}px, ${-size * 0.55}px)` : ''}`}}>
            {ch}
          </div>
        );
      })}
    </div>
  );
};

// ---- 色の面（矩形、左右・上下から伸びる）。k: 0→1 で開く ----
export const Plate: React.FC<{x: number; y: number; w: number; h: number; k: number; color: string; from?: 'l' | 'r' | 't' | 'b'; radius?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, w, h, k, color, from = 'l', radius = 0, style, children}) => {
  if (k <= 0.001) return null;
  const kk = clamp(k);
  const clip = from === 'l' ? `inset(0 ${(1 - kk) * 100}% 0 0)` : from === 'r' ? `inset(0 0 0 ${(1 - kk) * 100}%)` : from === 't' ? `inset(0 0 ${(1 - kk) * 100}% 0)` : `inset(${(1 - kk) * 100}% 0 0 0)`;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, clipPath: clip, ...style}}>
      <div style={{position: 'absolute', inset: 0, background: color, borderRadius: radius}} />
      {children}
    </div>
  );
};

// ---- 線を描く（SVG）。左から描かれる。矢印の先端つき可 ----
export const DrawLine: React.FC<{x1: number; y1: number; x2: number; y2: number; k: number; color?: string; w?: number; head?: number; cap?: 'round' | 'butt'}> = ({x1, y1, x2, y2, k, color = C.red, w = 8, head = 0, cap = 'round'}) => {
  if (k <= 0) return null;
  const ex = lerp(x1, x2, clamp(k));
  const ey = lerp(y1, y2, clamp(k));
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hb = head * 0.85;
  const lx = head ? ex - Math.cos(a) * hb : ex;
  const ly = head ? ey - Math.sin(a) * hb : ey;
  const p1 = [ex - Math.cos(a - 0.45) * head, ey - Math.sin(a - 0.45) * head];
  const p2 = [ex - Math.cos(a + 0.45) * head, ey - Math.sin(a + 0.45) * head];
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
      <line x1={x1} y1={y1} x2={lx} y2={ly} stroke={color} strokeWidth={w} strokeLinecap={cap} />
      {head > 0 && <path d={`M${ex},${ey} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]} Z`} fill={color} stroke={color} strokeWidth={w * 0.5} strokeLinejoin="round" />}
    </svg>
  );
};

// ---- コードの壁 ----
// 企画側のダミーコード（assets/code/dummy-code.ts）の本文。冒頭の説明コメントと HIGHLIGHT の印は画面に出さない。
export const CODE_LINES = `type Task = { id: string; run: () => Promise<Response> };
type RetryOptions = {
  retries: number;
  base: number;
  maxDelay: number;
  shouldRetry?: (res: Response) => boolean;
};
const DEFAULTS: RetryOptions = {
  retries: 5,
  base: 200,
  maxDelay: 8_000,
  shouldRetry: (res) => res.status === 429 || res.status >= 500,
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms: number) => ms / 2 + Math.random() * (ms / 2);
export async function withRetry(task: Task, opts: Partial<RetryOptions> = {}) {
  const o = { ...DEFAULTS, ...opts };
  let last: Response | undefined;
  for (let attempt = 0; attempt <= o.retries; attempt++) {
    last = await task.run();
    if (last.ok) return last;
    if (!o.shouldRetry?.(last)) break;
    const delay = Math.min(o.base * 2 ** attempt, o.maxDelay);
    await sleep(jitter(delay));
  }
  throw new Error(\`task \${task.id} failed: \${last?.status}\`);
}
export async function runQueue(tasks: Task[], concurrency = 4) {
  const results = new Map<string, Response>();
  const queue = [...tasks];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const t = queue.shift();
      if (!t) return;
      results.set(t.id, await withRetry(t));
    }
  });
  await Promise.all(workers);
  return results;
}
export function summarize(results: Map<string, Response>) {
  const byStatus: Record<number, number> = {};
  for (const res of results.values()) {
    byStatus[res.status] = (byStatus[res.status] ?? 0) + 1;
  }
  return Object.entries(byStatus)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([status, n]) => \`\${status}: \${n}\`)
    .join("\\n");
}`.split('\n');
export const HL_TEXT = 'const delay = Math.min(o.base * 2 ** attempt, o.maxDelay);';
export const HL_INDEX = CODE_LINES.findIndex((l) => l.trim() === HL_TEXT);

// 壁の格子: 行の高さ・字の大きさ・行数。問われる 1 行は HL_ROW の行に置く
export const WALL = {size: 24, lh: 38, rows: 30, top: -30, hlRow: 15};
export const wallRowY = (row: number) => WALL.top + row * WALL.lh;
export const HL_Y = wallRowY(WALL.hlRow) + WALL.lh / 2; // 問われる行の中心の y
export const HL_X = 330; // 問われる行の左端の x（壁の中）
const MONO_W = 0.602; // Menlo の字幅（em）

// 行ごとに左右逆向きに流れる壁（s22）。問われる行は流さず、少し濃い。
// flow: 流れる量（秒に比例させて渡す）。hl: 問われる行の色。fade: 問われる行以外の濃さ
export const CodeWall: React.FC<{flow: number; hl?: string; fade?: number; hlWeight?: number; split?: number; hideHl?: boolean}> = ({flow, hl = '#5d6573', fade = 1, hlWeight = 700, split = 0, hideHl = false}) => {
  const rows = [];
  for (let r = 0; r < WALL.rows; r++) {
    const isHl = r === WALL.hlRow;
    if (isHl && hideHl) continue;
    const src = isHl ? HL_INDEX : (r * 7 + 3) % CODE_LINES.length;
    // 1 行を長く: 3 行ぶんを続けて並べる（読ませない、量で見せる）
    const text = isHl ? CODE_LINES[HL_INDEX].trim() : [0, 1, 2, 3].map((j) => CODE_LINES[(src + j * 11) % CODE_LINES.length].trim()).join('     ');
    const dir = r % 2 === 0 ? 1 : -1;
    const speed = 40 + 50 * hash(r + 3);
    const x0 = isHl ? HL_X : -((hash(r) * 900) | 0) - 400;
    const x = isHl ? x0 : x0 + dir * speed * flow;
    const y = wallRowY(r);
    const sideX = split * (r < WALL.hlRow ? -1 : r > WALL.hlRow ? 1 : 0);
    rows.push(
      <div key={r} style={{position: 'absolute', left: 0, top: y, height: WALL.lh, whiteSpace: 'pre', fontFamily: F.mono, fontSize: WALL.size, lineHeight: `${WALL.lh}px`, fontWeight: isHl ? hlWeight : 400, color: isHl ? hl : C.gray, opacity: isHl ? 1 : 0.55 * fade, transform: `translateX(${x + sideX}px)`}}>
        {text}
      </div>,
    );
  }
  return <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>{rows}</div>;
};
export const HL_W = HL_TEXT.length * WALL.size * MONO_W; // 問われる行の幅（px、壁の倍率 1 のとき）

// ---- 手元の実写（06）。書き出したコマ（public/typing/f001.jpg…、30fps、原本 0:09 から）を時刻で選ぶ ----
// ft: 原本 0:09 からの秒。cover で窓を埋める。素材は 1120×490
export const TYPING_FRAMES = 390;
export const TypingFrame: React.FC<{ft: number; w: number; h: number; sat?: number; fx?: number; fy?: number}> = ({ft, w, h, sat = 1, fx = 0.5, fy = 0.5}) => {
  const i = Math.max(1, Math.min(TYPING_FRAMES, Math.floor(ft * FPS) + 1));
  const aspect = 1120 / 490;
  let vw = w;
  let vh = w / aspect;
  if (vh < h) {
    vh = h;
    vw = h * aspect;
  }
  return <Img src={staticFile(`typing/f${String(i).padStart(3, '0')}.jpg`)} style={{position: 'absolute', left: (w - vw) * fx, top: (h - vh) * fy, width: vw, height: vh, filter: `saturate(${sat}) contrast(${lerp(0.92, 1.04, sat)})`}} />;
};

// ---- 札（借りた答え）。角丸の灰色の枠 ----
export const Card: React.FC<{text: string; size?: number; style?: React.CSSProperties}> = ({text, size = 46, style}) => (
  <div style={{position: 'absolute', left: 0, top: 0, padding: `${size * 0.42}px ${size * 0.7}px`, background: '#f1f2f4', border: `3px solid ${C.gray2}`, borderRadius: size * 0.32, fontFamily: F.jp, fontWeight: 700, fontSize: size, color: C.gray, whiteSpace: 'nowrap', lineHeight: 1, fontFeatureSettings: '"palt" 1', boxShadow: '0 10px 24px rgba(30,36,48,0.08)', ...style}}>
    {Array.from(text).map((ch, i) => (
      <span key={i} data-ch="1" style={{display: 'inline-block'}}>
        {ch}
      </span>
    ))}
  </div>
);

// 06–10: 休日の「好き」が仕事に → 評価 → 肯定 → 選び直す → 好きが広がる
import React from 'react';
import {Bg, C, DrawLine, F, H, Lay, Line, Plate, VLine, VideoWindow, W, inOut, kv, outExpo, prog} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s;

// ---- 06 休日の「好き」が、平日の仕事に。 ----
export const Cut06: React.FC<CutProps> = ({t, start}) => {
  // 04 と同じ窓・同じ手元から始め、窓が画面の反対側へ移る
  const mv = inOut(prog(t, v(2.35), v(3.25)));
  const exit = inOut(prog(t, v(8.3), v(8.9)));
  const x = 820 - mv * 720 - exit * 1400 + kv(t, [[v(3.25), 0], [v(8.3), 200]]);
  const y = 110;
  const w = 1000;
  const h = 560;
  const sk = 70;
  const clip = `polygon(${sk}px 0, ${w}px 0, ${w - sk}px ${h}px, 0 ${h}px)`;
  const tx = kv(t, [[v(3.25), 60], [v(8.3), -100]]); // 読む間は窓と文字の塊を逆向きに流す
  const cam = kv(t, [[-0.5, 1.0], [v(2.3), 1.04], [v(3.3), 1.0], [11, 1.07]]);
  const fin = inOut(prog(t, v(8.4), v(9.1)));
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={cam}>
      <VLine t={t} text="休日" x={260} y={150} size={250} font={F.dela} color={C.ink} t0={-1} t1={v(2.2)} dir="down" />
      <VideoWindow vStart={start - 0.5} x={x} y={y} w={w} h={h} clip={clip} fy={0.55} until={10} />
      <div style={{position: 'absolute', left: x + w - 300, top: y - 40, fontFamily: F.noto, fontWeight: 500, fontSize: 24, color: C.mute, opacity: 1 - exit}}>手元のイメージ映像</div>
      <VLine t={t} text="平日" x={1640} y={150} size={250} font={F.dela} color={C.ink} t0={v(2.7)} dir="up" />
      <Lay x={tx * (1 - fin) + fin * 40} y={-fin * 260} s={1 + fin * 0.2} ox={180} oy={900}>
        <Plate x={180} y={660} w={900} h={140} k={outExpo(prog(t, v(-0.4), v(0.3)))} color={C.white} from="l">
          <Line t={t} text="休日の「好き」が" x={44} y={24} size={96} color={C.ink} t0={v(-0.2)} colorAt={(i) => (i >= 3 && i <= 6 ? C.amberDeep : undefined)} />
        </Plate>
        <Plate x={180} y={810} w={1340} h={215} k={outExpo(prog(t, v(2.6), v(3.2)))} color={C.amber} from="r">
          <Line t={t} text="平日の仕事に。" x={50} y={26} size={164} font={F.dela} color={C.ink} t0={v(2.8)} dir="left" />
        </Plate>
      </Lay>
      </Lay>
    </>
  );
};

// ---- 07 楽しい仕事でも、評価された。 ----
export const Cut07: React.FC<CutProps> = ({t}) => {
  const lab = inOut(prog(t, v(1.4), v(2.0)));
  const open = outExpo(prog(t, -0.2, 0.8));
  const zoom = inOut(prog(t, v(5.6), v(7.6)));
  const qx = kv(t, [[v(2.0), 40], [10, -110]]);
  const close = outExpo(prog(t, v(5.6), v(6.2)));
  return (
    <>
      <Bg color={C.ink} />
      {/* 誰の言葉か: 最初は大きく、引用が入ると上の札へ */}
      <Lay y={-lab * 330} x={-lab * 470} s={1 - lab * 0.55} ox={W / 2} oy={500}>
        <Line t={t} text="当時のリードエンジニアの言葉" x={W / 2} y={460} size={90} color={C.white} t0={0.05} anchor="c" stagger={0.02} />
      </Lay>
      <Lay x={qx} s={1 + zoom * 0.1} ox={700} oy={600}>
        {/* 開き括弧が額縁のように広がる */}
        <Lay s={0.4 + 0.6 * open} r={(1 - open) * -25} ox={150} oy={300} o={open}>
          <div style={{position: 'absolute', left: 70, top: 220, fontFamily: F.dela, fontSize: 380, color: C.blue, lineHeight: 1}}>「</div>
        </Lay>
        <Line t={t} text="リリースが" x={340} y={300} size={128} color={C.white} t0={v(1.85)} />
        <Line t={t} text="6ヶ月" x={330} y={470} size={260} font={F.dela} color={C.amber} t0={v(3.95)} stagger={0.07} />
        <Line t={t} text="も早くなった" x={1130} y={640} size={96} color={C.white} t0={v(4.55)} />
        <Lay x={(1 - close) * 260} o={close}>
          <div style={{position: 'absolute', left: 1620, top: 640, fontFamily: F.dela, fontSize: 220, color: C.blue, lineHeight: 1}}>」</div>
        </Lay>
      </Lay>
      <Plate x={160} y={905} w={1040} h={112} k={outExpo(prog(t, v(6.2), v(6.8)))} color={C.blue} from="l">
        <Line t={t} text="楽しい仕事でも、評価された。" x={40} y={22} size={70} color={C.white} t0={v(6.3)} />
      </Plate>
    </>
  );
};

// ---- 08 楽しい。しかも、仕事になる。 ----
// 同じ配置を二つの色で描き、反転の面が広がる範囲だけ反転側を見せる
const Cut08Layer: React.FC<{t: number; inv: boolean}> = ({t, inv}) => {
  const fly = outExpo(prog(t, v(-0.1), v(0.9)));
  const bx = kv(t, [[v(1), 40], [10, -60]]);
  const fg = inv ? C.amber : C.ink;
  return (
    <>
      <Bg color={inv ? C.ink : C.amber} />
      <Lay x={bx + (1 - fly) * 700} y={(1 - fly) * -160} s={0.3 + 0.7 * fly + kv(t, [[v(1), 0], [10, 0.08]])} ox={700} oy={360}>
        <Line t={t} text="楽しい。" x={200} y={210} size={330} font={F.dela} color={fg} t0={v(-0.05)} dur={0.4} stagger={0.04} />
      </Lay>
      <Lay x={-bx * 0.8}>
        <Plate x={560} y={650} w={1200} h={180} k={outExpo(prog(t, v(1.4), v(2.0)))} color={inv ? C.amber : C.ink} from="l">
          <Line t={t} text="しかも、仕事になる。" x={60} y={36} size={110} color={inv ? C.ink : C.white} t0={v(1.55)} />
        </Plate>
      </Lay>
    </>
  );
};
export const Cut08: React.FC<CutProps> = ({t}) => {
  // 面の反転: 下段の帯から全面へ
  const k = inOut(prog(t, v(4.3), v(5.3)));
  const top = 650 * (1 - k);
  const bot = (H - 830) * (1 - k);
  return (
    <>
      <Cut08Layer t={t} inv={false} />
      {k > 0 && (
        <div style={{position: 'absolute', inset: 0, clipPath: `polygon(0 ${top}px, ${W}px ${top - 120 * (1 - k)}px, ${W}px ${H - bot}px, 0 ${H - bot + 120 * (1 - k)}px)`}}>
          <Cut08Layer t={t} inv />
        </div>
      )}
    </>
  );
};

// ---- 09 楽しめる仕事を、自分で選び直す。 ----
export const Cut09: React.FC<CutProps> = ({t}) => {
  const turn = inOut(prog(t, v(5.25), v(6.05))); // 明るい面が斜めに抜ける
  const front = inOut(prog(t, v(6.05), v(7.0)));
  const widen = inOut(prog(t, v(8.5), v(9.6)));
  const sweepX = (1 - turn) * (W + 900) - 450;
  return (
    <>
      <Bg color={C.ink} />
      {/* 前半: 二段を斜めに押し込む */}
      <Lay r={kv(t, [[0, -9], [v(5.6), -5]])} x={kv(t, [[0, 120], [v(5.6), -40]])} y={kv(t, [[0, -20], [v(5.6), 30]])}>
        <Line t={t} text="帰国 / PM" x={160} y={330} size={210} font={F.dela} color={C.white} t0={0.05} t1={v(2.3)} spacing={0.06} style={{fontFeatureSettings: 'normal'}} />
        <Line t={t} text="帰国 / PM" x={160} y={150} size={48} weight={700} color={C.mute} t0={v(2.6)} />
        <Line t={t} text="成果だけでは、" x={160} y={330} size={140} color={C.white} t0={v(2.8)} dir="right" />
        <Line t={t} text="決めない。" x={760} y={540} size={200} font={F.dela} color={C.amber} t0={v(4.2)} dir="left" />
      </Lay>
      {turn > 0 && (
        <div style={{position: 'absolute', inset: 0, clipPath: `polygon(${sweepX + 450}px 0, ${W + 900}px 0, ${W + 900}px ${H}px, ${sweepX - 450}px ${H}px)`}}>
          <Bg color={C.paper} />
          {/* 右下から広がるアンバーの斜面 */}
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, background: C.amber, clipPath: `polygon(${W}px ${700 - widen * 520}px, ${W}px ${H}px, ${700 - widen * 760}px ${H}px)`}} />
          <Lay r={(1 - front) * -8} x={(1 - front) * 200 - widen * 60} ox={200} oy={400}>
            <Line t={t} text="自分の「楽しい」を" x={170} y={260} size={120} color={C.ink} t0={v(6.15)} colorAt={(i) => (i >= 3 && i <= 6 ? C.amberDeep : undefined)} />
          </Lay>
          <Lay s={1 + widen * 0.18} x={widen * 120} ox={760} oy={560}>
            <Line t={t} text="選ぶ。" x={560} y={440} size={270} font={F.dela} color={C.ink} t0={v(6.7)} stagger={0.06} />
          </Lay>
          <Line t={t} text="自ら異動" x={1720} y={930} size={56} weight={700} color={C.ink} t0={v(7.0)} anchor="r" />
        </div>
      )}
    </>
  );
};

// ---- 10 「好き」は、広がっていく。 ----
export const Cut10: React.FC<CutProps> = ({t}) => {
  const px = 150;
  const py = 330; // 扇の要（コードの行の左端）
  const a = outExpo(prog(t, v(3.2), v(4.1)));
  const b = outExpo(prog(t, v(3.8), v(4.8)));
  const spread = inOut(prog(t, v(5.8), v(7.0)));
  const drift = kv(t, [[v(4.8), 0], [12, -110]]);
  return (
    <>
      <Bg color={C.paper} />
      <Lay x={drift} s={kv(t, [[0, 1.06], [12, 1.0]])} ox={px} oy={py}>
        <Line t={t} text="コードを書く。" x={px} y={170} size={120} font={F.dot} weight={400} color={C.ink} t0={v(0.0)} stagger={0.05} />
        <DrawLine x1={px} y1={py} x2={1160} y2={py} k={outExpo(prog(t, v(1.5), v(2.7)))} color={C.blue} w={8} />
        {/* 面の層は要を中心に大きく回り込み、文字は面と一緒に正面へ向き直る */}
        <Lay r={(1 - a) * -70 - spread * 3} ox={px} oy={py}>
          <Plate x={px + 140} y={400} w={1180} h={180} k={a > 0 ? 1 : 0} color={C.blue}>
            <Line t={t} text="チームをつくる。" x={56} y={36} size={110} font={F.dela} color={C.white} t0={v(3.4)} />
          </Plate>
        </Lay>
        <Lay r={(1 - b) * -95 + spread * 4} ox={px} oy={py}>
          <Plate x={px + 240} y={640} w={1180} h={180} k={b > 0 ? 1 : 0} color={C.amber}>
            <Line t={t} text="ビジネスを創る。" x={56} y={36} size={110} font={F.dela} color={C.ink} t0={v(4.0)} />
          </Plate>
        </Lay>
      </Lay>
    </>
  );
};

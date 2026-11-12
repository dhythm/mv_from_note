// 01–10 の図と文字。各カットは t（カットの頭からの秒）と v（声の頭からの秒）で決まる。語の時刻は audio/voice/words.json。
// 図（盤・地図・コマ・十字キー）は自分のカットの区間だけ描き、カットの境目では前のカットの終わりの状態と
// 次のカットの始まりの状態を一致させて受け渡す。文字の層は境目の前後 0.6 秒を重ねて、行のマスクで受け渡す。
// 動きの言語（plan.html）: 吸着（E_SNAP）、回す（盤だけが回り、コマと文字は正立）、着地（slam）、寄り（読む間の線形の移動）、押し出す。
// 文字は行・語の塊で動かし、字形は崩さない（常時の揺れ・脈動なし）。
import React from 'react';
import {C, E_SINK, E_SLAM, Lay, Line, VBlur, inOut, kv, lerp, outExpo, prog, slam} from './kit';
import {Arrow, Block, Board, DPad, E_SNAP, EdgeLabel, Geo, MapWin, Piece, Poly, cell, edgePt, lerpGeo, pieceAt, pivotGeo, pt} from './figs';

export type CutProps = {t: number; v: number; start: number; dur: number; vo: number};
const own = (p: CutProps) => p.t >= 0 && p.t < p.dur;
const lin = (k: number) => k;
// 盤のコマの大きさ（盤の一辺に対する比）
const PB = 0.1;
// 地図のコマ（rpg-map の道幅に合わせる）
const PM = 0.072;

// ---------------------------------------------------------------- 01 地図、回してますか？
// 地図だけがコマを中心に時計回りに 90° 回り、北のラベルも上から右へ移る。コマと問いは正立のまま。
// 終わりで北が上へ戻りながら右へ押し出され、02 の位置（G2）へ受け渡す。
const P1: [number, number] = [960, 655];
const G2: Geo = {x: 1340, y: 560, size: 600, rot: 0};
const MAP_PIECE: [number, number] = [0.5, 0.6];
function map01(t: number): Geo {
  const z = kv(t, [[0, 0.78], [3.9, 1.12, E_SINK], [5.9, 0.9], [7.6, 1.0], [8.3, 1.0]]);
  const rot = kv(t, [[4.6, 0], [7.2, 90, inOut]]);
  const g = pivotGeo(P1[0], P1[1], MAP_PIECE[0], MAP_PIECE[1], 560 * z, rot);
  // 終わり: 北を上へ戻しながら右へ押し出す
  const k = E_SINK(prog(t, 8.2, 9.5));
  return k > 0 ? lerpGeo(g, G2, k) : g;
}
export const Cut01: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const g = map01(t);
  const [px, py] = pt(g, MAP_PIECE[0], MAP_PIECE[1]);
  const [nx, ny] = edgePt(g, 'n', 36);
  return (
    <>
      {own(p) && (
        <>
          <MapWin g={g} />
          <Piece x={px} y={py} size={g.size * PM} s={outExpo(prog(t, 0.3, 0.8))} />
          <EdgeLabel t={v} text="北" x={nx} y={ny} t0={0.9} />
        </>
      )}
      <Lay x={kv(t, [[0.2, 60], [1.4, 0, E_SINK], [8.5, 50, lin]])}>
        <Line t={t} text="地図、回してますか？" x={120} y={84} size={116} t0={0.25} t1={8.15} dir="up" />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 02 上に行く。
// 01 と同じ地図。北は画面の上に固定し、コマが道を上へ進む。「上に行く。」も下から上へ着地。
// 等式は外周の方位に吸着。終わりに地図の上へ格子を描き、紙の図解（03 の固定盤）へ整理する。
const FB3: Geo = {x: 1390, y: 650, size: 420, rot: 0};
function map02(t: number): Geo {
  return {x: kv(t, [[0, 1340], [9.2, 1310, lin]]), y: kv(t, [[0, 560], [9.2, 575, lin]]), size: kv(t, [[0, 600], [2.9, 610, lin], [3.5, 640, E_SINK], [9.2, 670, lin]]), rot: 0};
}
export const Cut02: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const mg = map02(t);
  const pc = pieceAt(v, [[-9, 0.5, 0.6], [2.4, 0.5, 0.38]], 0.7);
  // 格子への整理: 交差点（コマ）を中心マスにした格子を描き、地図を消しながら 03 の固定盤へ寄せる
  const gridAtMap: Geo = (() => {
    const [cx, cy] = pt(mg, 0.5, 0.38);
    return {x: cx, y: cy, size: mg.size * 0.62, rot: 0};
  })();
  const kc = E_SINK(prog(t, 9.5, 10.5));
  const gg = lerpGeo(gridAtMap, FB3, kc);
  // 地図は格子と一緒に縮み、移る
  const sc = gg.size / gridAtMap.size;
  const mapG: Geo = {x: gg.x + (mg.x - gridAtMap.x) * sc, y: gg.y + (mg.y - gridAtMap.y) * sc, size: mg.size * sc, rot: 0};
  const draw = prog(t, 8.9, 9.8);
  const mapO = 1 - prog(t, 9.4, 10.2);
  const [px, py] = draw > 0 ? (([a, b]) => [lerp(pt(mapG, pc.u, pc.v)[0], a, kc), lerp(pt(mapG, pc.u, pc.v)[1], b, kc)])(pt(gg, 0.5, 0.5)) : pt(mapG, pc.u, pc.v);
  const pSize = lerp(mapG.size * PM, gg.size * PB, prog(t, 9.4, 10.5));
  const lab = (side: 'n' | 'e' | 's' | 'w', off: number) => edgePt(mapG, side, off);
  const T1 = 8.95; // ラベルが退く（v）
  const up = slam(v, 2.4, 0.6, {y: 260, s: 1.3, r: 0});
  return (
    <>
      {own(p) && (
        <>
          <MapWin g={mapG} o={mapO} />
          <Board g={gg} draw={draw} fill={prog(t, 9.4, 10.3)} o={draw > 0 ? 1 : 0} />
          <Piece x={px} y={py} size={pSize} lift={pc.lift} />
          <EdgeLabel t={v} text="北" x={lab('n', 36)[0]} y={lab('n', 36)[1]} t0={-5} t1={2.2} />
          <EdgeLabel t={v} text="北＝上" x={lab('n', 36)[0]} y={lab('n', 36)[1]} t0={2.6} t1={T1} />
          <EdgeLabel t={v} text="東＝右" x={lab('e', 84)[0]} y={lab('e', 84)[1]} t0={4.9} t1={T1} dir="left" />
          <EdgeLabel t={v} text="西＝左" x={lab('w', 84)[0]} y={lab('w', 84)[1]} t0={6.3} t1={T1} dir="right" />
          <EdgeLabel t={v} text="南＝下" x={lab('s', 36)[0]} y={lab('s', 36)[1]} t0={7.6} t1={T1} dir="down" />
        </>
      )}
      <Lay x={kv(v, [[0.3, 50], [1.3, 0, E_SINK], [9.6, 70, lin]])}>
        <Line t={v} text="北に行く、じゃない。" x={120} y={290} size={80} color={C.gray} t0={0.35} t1={9.3} dir="up" />
      </Lay>
      <Lay y={up.y} s={up.s} r={up.r} o={up.o} ox={460} oy={520}>
        <Lay x={kv(v, [[2.4, 0], [9.6, -30, lin]])}>
          <Line t={v} text="上に行く。" x={120} y={420} size={150} color={C.red} t0={2.4} t1={9.35} dur={0.3} stagger={0.02} dir="up" />
        </Lay>
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 03 回る派、回らない派。
// 回る盤（暖灰）が画面いっぱいに回りながら左から入り、左へ収まってからも回り続ける。
// 右の固定盤（青）は正立のまま、「北を上に固定」でコマが 1 マス上へ吸着。終わりは固定盤のコマへ寄って 04 へ。
const TB3: Geo = {x: 520, y: 660, size: 420, rot: 0};
function turn03(t: number, v: number): Geo {
  const k = E_SINK(prog(t, 0, 2.3));
  const base: Geo = {x: lerp(-260, TB3.x, k), y: lerp(560, TB3.y, k), size: lerp(1150, TB3.size, k), rot: 0};
  let rot = lerp(-150, -30, k) + Math.max(0, t - 2.3) * 16;
  rot += 90 * E_SNAP(prog(v, 7.5, 8.2));
  // 終わり: 左へ回りながら抜ける
  const ko = E_SINK(prog(t, 11.5, 12.5));
  return {x: lerp(base.x, -420, ko), y: base.y, size: base.size, rot: rot - ko * 120};
}
// 終わりに固定盤のコマへ寄る（ズームの通過で 04 の盤へ受け渡す）
function fixedZoom03(t: number) {
  return E_SINK(prog(t, 11.6, 12.5));
}
export const Cut03: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  // 読む間のカメラ: 二面をゆっくり寄せ、「回らない派ですか」で固定盤へ押し込む（幾何に掛け、ラベルも追う）
  const cz = kv(v, [[1.9, 1], [8.6, 1.05, lin], [9.4, 1.13, E_SINK], [11.2, 1.16, lin]]);
  const cfx = kv(v, [[1.9, 960], [8.6, 1000, lin], [9.4, 1300, E_SINK]]);
  const cam = (g: Geo): Geo => ({x: cfx + (g.x - cfx) * cz, y: 640 + (g.y - 640) * cz, size: g.size * cz, rot: g.rot});
  const tg = cam(turn03(t, v));
  const drift = kv(t, [[0, 0], [12.5, -30, lin]]);
  const zf = fixedZoom03(t);
  const pc = pieceAt(v, [[-9, ...cell(1, 1)], [4.55, ...cell(1, 0)]] as [number, number, number][], 0.55);
  let fg: Geo = cam({...FB3, x: FB3.x + drift});
  const [ppx, ppy] = pt(fg, pc.u, pc.v);
  // ズームの通過: コマを画面の中央へ運びながら拡大
  const zz = lerp(1, 3.2, zf * zf);
  const cx = lerp(ppx, 960, zf);
  const cy = lerp(ppy, 560, zf);
  fg = {x: cx + (fg.x - ppx) * zz, y: cy + (fg.y - ppy) * zz, size: fg.size * zz, rot: 0};
  const [px, py] = pt(fg, pc.u, pc.v);
  const [tnx, tny] = edgePt(tg, 'n', 34);
  const [fnx, fny] = edgePt(fg, 'n', 34);
  const T1 = 11.0;
  const s2 = slam(v, 3.9, 0.55, {y: 160, s: 1.35, r: 0});
  const body = (
    <>
      <Board g={fg} />
      <Piece x={px} y={py} size={fg.size * PB} lift={pc.lift} />
      <Board g={tg} turnK={1} />
      <Piece x={tg.x} y={tg.y} size={tg.size * PB} />
    </>
  );
  return (
    <>
      {own(p) && (
        <>
          <VBlur id="z03" n={zf * 10}>{body}</VBlur>
          <EdgeLabel t={t} text="北" x={tnx} y={tny} color={C.turnLine} t0={2.0} t1={11.4} />
          <EdgeLabel t={t} text="北" x={fnx} y={fny} t0={-5} t1={11.4} />
        </>
      )}
      <Lay x={kv(v, [[1.5, 40], [2.5, 0, E_SINK], [11.5, 70, lin]])} y={kv(v, [[2.5, 0], [11.5, 24, lin]])}>
        <Line t={v} text="回る派" x={120} y={100} size={56} color={C.gray} t0={1.6} t1={T1} />
        <Line t={v} text="進行方向が、上。" x={120} y={182} size={84} color={C.gray} t0={2.3} t1={T1} />
      </Lay>
      <Lay x={kv(v, [[3.4, 40], [4.4, 0, E_SINK], [8.6, -30, lin], [9.4, -90, E_SINK], [11.5, -100, lin]])}>
        <Line t={v} text="回らない派" x={1110} y={100} size={56} t0={3.5} t1={T1} />
      </Lay>
      <Lay y={s2.y} s={s2.s} r={s2.r} o={s2.o} ox={1380} oy={250}>
        <Lay x={kv(v, [[3.9, 0], [8.6, -30, lin], [9.4, -90, E_SINK], [11.5, -100, lin]])}>
          <Line t={v} text="北が、上。" x={1110} y={182} size={110} color={C.red} t0={3.9} t1={T1} dur={0.3} stagger={0.02} />
        </Lay>
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 04 動くのは、自分。
// 「頭の中で地図を回します」で盤がコマを中心に傾き（暖灰へ寄る）、「私は回しません」で正立の青へ吸着して戻る。
// コマが上へ 1 マス、右へ 1 マス吸着し、その拍で「北＝上」「東＝右」が軸に付く。終わりは地図へ受け渡す。
const FB4: Geo = {x: 1370, y: 600, size: 600, rot: 0};
const MAP5: Geo = {x: 1340, y: 590, size: 570, rot: 0};
export const Cut04: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  // 入り: 03 の拡大から引く
  const zin = 1 - E_SINK(prog(t, 0, 0.75));
  const tilt = kv(v, [[0.9, 0], [2.6, -32, inOut], [2.95, -32], [3.5, 0, E_SNAP]]);
  const turnK = kv(v, [[0.9, 0], [2.0, 0.85], [2.95, 0.85], [3.3, 0]]);
  const pc = pieceAt(v, [[-9, ...cell(1, 1)], [6.95, ...cell(1, 0)], [7.6, ...cell(2, 0)]] as [number, number, number][], 0.5);
  // 読む間の寄り: コマに沿って少し寄る
  const z = kv(v, [[0, 0.94], [2.9, 1.0, lin], [3.5, 1, E_SINK], [6.0, 1.06, lin], [6.6, 1.07, E_SINK], [9.5, 1.1, lin]]);
  let g: Geo = {...FB4, size: FB4.size * z, rot: tilt};
  g = pivotGeo(FB4.x, FB4.y, 0.5, 0.5, g.size, tilt);
  g = {...g, x: g.x - (z - 1) * 450, y: g.y + (z - 1) * 300};
  // 終わり: 盤を地図の位置へ寄せ、地図に置き換える
  const ko = E_SINK(prog(t, 9.5, 10.5));
  g = lerpGeo(g, MAP5, ko);
  // 入りの拡大（コマ＝中心マスを画面の中央から運ぶ）
  if (zin > 0) {
    const zz = lerp(1, 2.6, zin * zin);
    g = {x: lerp(g.x, 960, zin) , y: lerp(g.y, 560, zin), size: g.size * zz, rot: g.rot};
  }
  const [px, py] = pt(g, pc.u, pc.v);
  const pO = 1 - prog(t, 9.6, 10.1);
  const T1 = 9.1;
  const mv = slam(v, 6.1, 0.6, {y: 220, s: 1.4, r: -4});
  return (
    <>
      {own(p) && (
        <>
          <VBlur id="z04" n={zin * 9}>
            {ko > 0 && <MapWin g={g} o={prog(t, 9.7, 10.3)} />}
            <Board g={g} turnK={turnK} fill={1 - ko} o={1 - prog(t, 10.0, 10.5)} />
            <Piece x={px} y={py} size={g.size * PB} lift={pc.lift} o={pO} />
          </VBlur>
          <EdgeLabel t={v} text="北" x={edgePt(g, 'n', 36)[0]} y={edgePt(g, 'n', 36)[1]} color={turnK > 0.4 ? C.turnLine : C.blue} t0={0.2} t1={6.6} />
          <EdgeLabel t={v} text="北＝上" x={edgePt(g, 'n', 36)[0]} y={edgePt(g, 'n', 36)[1]} t0={7.0} t1={T1} />
          <EdgeLabel t={v} text="東＝右" x={edgePt(g, 'e', 84)[0]} y={edgePt(g, 'e', 84)[1]} t0={7.65} t1={T1} dir="left" />
        </>
      )}
      <Lay x={kv(v, [[2.8, 40], [3.8, 0, E_SINK], [9.8, -40, lin]])}>
        <Line t={v} text="地図は、" x={120} y={150} size={104} t0={2.9} t1={9.3} />
        <Line t={v} text="回さない。" x={120} y={280} size={104} t0={3.75} t1={9.35} />
      </Lay>
      <Lay y={mv.y} s={mv.s} r={mv.r} o={mv.o} ox={400} oy={700}>
        <Lay x={kv(v, [[6.1, 0], [9.8, -50, lin]])}>
          <Line t={v} text="動くのは、" x={120} y={510} size={118} color={C.red} t0={6.1} t1={9.4} dur={0.3} stagger={0.02} />
          <Line t={v} text="自分。" x={120} y={660} size={190} color={C.red} t0={6.15} t1={9.45} dur={0.3} stagger={0.02} />
        </Lay>
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 05 上を押せば、北。
// 左に一体型の十字キー、右に 01・02 と同じ地図。「見下ろし」で地図が手前へ倒れてから真上の視点へ戻る。
// 上のキーを沈める拍でコマが北の交差点へ、右のキーでコマが東へ。地図は北が上のまま。終わりは 06 の盤へ。
const BIG6: Geo = {x: 1400, y: 420, size: 380, rot: 0};
export const Cut05: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const kin = outExpo(prog(t, 0, 1.0));
  const tilt = kv(v, [[3.1, 0], [3.7, 42, inOut], [4.4, 42], [5.0, 0, E_SNAP]]);
  let mg: Geo = {...MAP5, size: kv(t, [[0, MAP5.size], [5.4, 600, lin], [6.2, 630, E_SINK], [11, 660, lin]]), x: kv(t, [[0, MAP5.x], [11, 1300, lin]]), y: kv(t, [[0, MAP5.y], [11, 610, lin]])};
  const ko = E_SINK(prog(t, 10.9, 12));
  const pc = pieceAt(v, [[-9, ...MAP_PIECE], [5.75, 0.5, 0.38], [7.35, 0.72, 0.38]] as [number, number, number][], 0.55);
  const [mx, my] = pt(mg, pc.u, pc.v);
  const bg = lerpGeo(mg, BIG6, ko);
  mg = bg;
  const [bx, by] = pt(BIG6, 0.5, 0.5);
  const px = lerp(mx, bx, ko);
  const py = lerp(my, by, ko);
  const state = v >= 5.6 && v < 6.5 ? 'up' : v >= 7.2 && v < 8.1 ? 'right' : 'n';
  const press = kv(v, [[5.6, 0], [5.72, 1], [6.35, 1], [6.5, 0], [7.2, 0], [7.32, 1], [7.95, 1], [8.1, 0]]);
  const dsize = kv(t, [[0, 420], [5.4, 450, lin], [6.2, 500, E_SINK], [11, 540, lin]]);
  const dx = lerp(-320, 480, kin) - ko * 900;
  const T1 = 10.0;
  return (
    <>
      {own(p) && (
        <>
          <DPad x={dx} y={kv(t, [[0, 700], [11, 660, lin]])} size={dsize} state={state} press={press} r={lerp(-30, 0, kin)} />
          <MapWin g={mg} tilt={tilt} imgO={1 - prog(t, 11.0, 11.8)} />
          <Board g={mg} draw={prog(t, 10.9, 11.8)} fill={prog(t, 11.2, 12)} o={ko > 0 ? 1 : 0} />
          <Piece x={px} y={py} size={lerp(mg.size * PM, BIG6.size * PB, ko)} lift={pc.lift} s={outExpo(prog(t, 0.2, 0.7))} />
          <EdgeLabel t={v} text="北" x={edgePt(mg, 'n', 36)[0]} y={edgePt(mg, 'n', 36)[1]} t0={5.7} />
          <EdgeLabel t={v} text="東" x={edgePt(mg, 'e', 40)[0]} y={edgePt(mg, 'e', 40)[1]} t0={7.5} t1={T1 + 0.6} dir="left" />
        </>
      )}
      <Lay x={kv(v, [[5.2, 40], [6.0, 0, E_SINK], [11.4, 50, lin]])}>
        <Line t={v} text="上を押せば、北。" x={120} y={100} size={108} color={C.red} t0={5.2} t1={T1} dur={0.35} stagger={0.02} />
      </Lay>
      <Lay x={kv(v, [[6.7, 40], [7.5, 0, E_SINK], [11.4, 90, lin]])}>
        <Line t={v} text="右を押せば、東。" x={120} y={236} size={108} color={C.red} t0={6.7} t1={T1 + 0.05} dir="right" dur={0.35} stagger={0.02} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 06 8割以上は、回す。
// 左に大きな「8割以上」。右の盤から下へ小さな固定盤が出て、コマはそちらへ移る。
// コマが離れてから、大きな盤は暖灰へ変わって回る（多数派）。自分のコマは下の固定盤に残る。
const SMALL6: Geo = {x: 1400, y: 850, size: 230, rot: 0};
function big06(t: number, v: number): Geo {
  const rot = -26 * inOut(prog(v, 7.6, 8.6)) - Math.max(0, v - 8.6) * 5;
  // 読む間の寄り: 05 から受け取った盤が左上から少し沈みながら大きくなる
  return {...BIG6, x: kv(t, [[0, BIG6.x], [4.4, 1440, E_SINK], [14.5, 1420, lin]]), y: kv(t, [[0, BIG6.y], [4.4, 400, E_SINK], [14.5, 410, lin]]), size: kv(t, [[0, BIG6.size], [4.4, 430, E_SINK], [14.5, 400, lin]]), rot};
}
export const Cut06: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const bg = big06(t, v);
  const turnK = prog(v, 7.4, 8.0);
  const ks = E_SINK(prog(v, 6.3, 7.0));
  const sg: Geo = {...SMALL6, y: lerp(1300, SMALL6.y, ks)};
  // コマの跳び移り（大きな盤の中央 → 小さな盤の中央）
  const kj = E_SINK(prog(v, 6.95, 7.55));
  const [ax, ay] = pt({...bg, rot: 0}, 0.5, 0.5);
  const [bx, by] = pt(sg, 0.5, 0.5);
  const px = lerp(ax, bx, kj);
  const py = lerp(ay, by, kj) - Math.sin(Math.PI * kj) * 120;
  const pSize = lerp(bg.size * PB, sg.size * PB * 1.2, kj);
  const n8 = slam(v, 4.0, 0.6, {y: 240, s: 1.3, r: -5});
  const E = p.dur - p.vo;
  return (
    <>
      {own(p) && (
        <>
          <Board g={bg} turnK={turnK} />
          <Board g={sg} o={ks > 0 ? 1 : 0} />
          <Piece x={px} y={py} size={pSize} lift={Math.sin(Math.PI * kj)} />
          <EdgeLabel t={v} text="北" x={edgePt(bg, 'n', 34)[0]} y={edgePt(bg, 'n', 34)[1]} color={turnK > 0.5 ? C.turnLine : C.blue} t0={-5} />
          <EdgeLabel t={v} text="北" x={edgePt(sg, 'n', 30)[0]} y={edgePt(sg, 'n', 30)[1]} size={34} t0={6.8} />
        </>
      )}
      <Lay y={n8.y} s={n8.s * kv(v, [[4.6, 1], [E, 1.1, lin]])} r={n8.r} o={n8.o} ox={120} oy={300}>
        <Lay x={kv(v, [[4.0, 0], [E, -40, lin]])}>
          <Line t={v} text="8割以上" x={110} y={170} size={230} t0={4.0} t1={E - 0.8} dur={0.3} stagger={0.02} />
        </Lay>
      </Lay>
      <Lay x={kv(v, [[7.2, 40], [8.2, 0, E_SINK], [E, 70, lin]])}>
        <Line t={v} text="回した方が、" x={120} y={500} size={72} color={C.gray} t0={7.35} t1={E - 0.75} />
        <Line t={v} text="使いやすい。" x={120} y={592} size={72} color={C.gray} t0={8.15} t1={E - 0.7} />
      </Lay>
      <Lay x={kv(v, [[11.2, -40], [12.0, 0, E_SINK], [E, -40, lin]])}>
        <Line t={v} text="少数派らしい。" x={120} y={744} size={80} color={C.gray} t0={11.35} t1={E - 0.65} dir="right" />
      </Lay>
      <Line t={v} text="江戸川大学・2015" x={120} y={952} size={36} weight={400} color={C.gray} t0={4.9} t1={E - 0.6} />
    </>
  );
};

// ---------------------------------------------------------------- 07 上は、前。
// 回る盤が回り切り、北が画面の外へ流れて抜ける。中央に巨大な「前」が着地。
// 小さな固定盤は左下へ移り、回さないまま、コマが北へ 1 マス進む。
const SMALL7: Geo = {x: 330, y: 800, size: 250, rot: 0};
export const Cut07: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const b6end = big06(14.5, 14.5 - 0.4);
  const k1 = E_SINK(prog(v, -0.4, 2.4));
  let tg: Geo = {x: lerp(b6end.x, 1260, k1), y: lerp(b6end.y, 560, k1), size: lerp(b6end.size, 560, k1), rot: lerp(b6end.rot, -90, k1)};
  const kout = prog(v, 3.5, 4.4);
  tg = {x: tg.x + kout * kout * 900, y: tg.y - kout * kout * 600, size: tg.size * (1 + kout * 0.8), rot: tg.rot - kout * kout * 80};
  const ks = E_SINK(prog(v, 0.3, 2.0));
  let sg = lerpGeo(SMALL6, SMALL7, ks);
  // 終わり: 左下へ押し出す
  const ko = E_SINK(prog(t, 8.3, 9.0));
  sg = {...sg, x: sg.x - ko * 700};
  const pc = pieceAt(v, [[-9, ...cell(1, 1)], [5.95, ...cell(1, 0)]] as [number, number, number][], 0.5);
  const [px, py] = pt(sg, pc.u, pc.v);
  const mae = slam(v, 4.25, 0.6, {y: 260, s: 1.5, r: -6});
  const read = kv(v, [[4.9, 1], [8.3, 1.13, lin]]);
  const E = p.dur - p.vo;
  return (
    <>
      {own(p) && (
        <>
          <Board g={tg} turnK={1} o={1 - kout} />
          <Board g={sg} />
          <Piece x={px} y={py} size={sg.size * PB * 1.1} lift={pc.lift} />
          <EdgeLabel t={v} text="北" x={edgePt(tg, 'n', 34)[0]} y={edgePt(tg, 'n', 34)[1]} color={C.turnLine} t0={-5} t1={3.3} />
          <EdgeLabel t={v} text="北" x={edgePt(sg, 'n', 30)[0]} y={edgePt(sg, 'n', 30)[1]} size={34} t0={-5} />
        </>
      )}
      <Lay x={kv(v, [[2.6, 40], [3.4, 0, E_SINK], [4.3, -20, lin]])}>
        <Line t={v} text="上は、前。" x={120} y={100} size={100} color={C.gray} t0={2.75} t1={3.95} />
      </Lay>
      <Lay y={mae.y} s={mae.s * read} r={mae.r} o={mae.o} ox={1010} oy={300}>
        <Line t={v} text="前" x={1010} y={150} size={400} anchor="c" t0={4.25} t1={E - 0.6} dur={0.3} />
        <Line t={v} text="方角ではなくなる。" x={1010} y={640} size={64} color={C.gray} anchor="c" t0={5.0} t1={E - 0.55} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 08 江東区の、上。
// 下に江東区、上は空の枠。「墨田区」で上の面が上から吸着し、コマが江東区から墨田区へ 1 マス進む。
// 脇の二語は左右から逆向きに入る。盤は回さない。終わりはブロックが奥（09 の盤の位置）へ小さくなる。
const BX = 650;
const BW = 620;
const BH = 180;
const BY_TOP = 380;
const BY_LOW = BY_TOP + BH + 22;
export const Cut08: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const kin = E_SINK(prog(t, 0, 0.9));
  const yIn = lerp(700, 0, kin);
  const kTop = E_SNAP(prog(v, 2.25, 2.85));
  const frameO = prog(v, 0.75, 1.1);
  const kp = E_SNAP(prog(v, 2.6, 3.15));
  const lift = Math.sin(Math.PI * prog(v, 2.6, 3.15));
  const z = kv(t, [[0.9, 0.96], [2.6, 1.0, lin], [3.2, 1.06, E_SINK], [9.5, 1.14, lin]]);
  const ko = E_SINK(prog(t, 9.6, 10.5));
  const zz = z * lerp(1, 0.32, ko);
  const ox = lerp(960, 1480, ko);
  const oy = lerp(BY_LOW, 300, ko);
  const S = (x: number, y: number): [number, number] => [ox + (x - 960) * zz, oy + (y - BY_LOW) * zz + yIn];
  const [lx, ly] = S(BX, BY_LOW);
  const [ux, uy] = S(BX, lerp(BY_TOP - 150, BY_TOP, kTop));
  const [fx, fy] = S(BX, BY_TOP);
  const [p0x, p0y] = S(BX + BW - 70, BY_LOW + BH / 2);
  const [p1x, p1y] = S(BX + BW - 70, BY_TOP + BH / 2);
  const E = p.dur - p.vo;
  return (
    <>
      {own(p) && (
        <>
          {frameO > 0 && <div style={{position: 'absolute', left: fx, top: fy, width: BW * zz, height: BH * zz, border: `4px dashed ${C.blue}`, boxSizing: 'border-box', opacity: frameO * (1 - kTop) * (1 - ko)}} />}
          <Block x={lx} y={ly} w={BW * zz} h={BH * zz} fill={C.koto} label="江東区" labelK={E_SINK(prog(v, 0.7, 1.2))} o={1 - ko} />
          {kTop > 0 && <Block x={ux} y={uy} w={BW * zz} h={BH * zz} fill={C.blueFill} label="墨田区" labelK={E_SINK(prog(v, 2.5, 3.0))} o={prog(v, 2.25, 2.4) * (1 - ko)} />}
          <Piece x={lerp(p0x, p1x, kp)} y={lerp(p0y, p1y, kp)} size={44 * zz} lift={lift} o={1 - ko} />
        </>
      )}
      <Lay x={kv(v, [[0.6, 40], [1.5, 0, E_SINK], [E, 60, lin]])}>
        <Line t={v} text="江東区の、上。" x={120} y={100} size={110} t0={0.75} t1={E - 0.8} />
      </Lay>
      <Lay x={kv(v, [[4.5, 40], [5.3, 0, E_SINK], [E, -40, lin]])}>
        <Line t={v} text="東京の左" x={150} y={470} size={46} color={C.gray} t0={4.6} t1={E - 0.75} dir="right" />
      </Lay>
      <Lay x={kv(v, [[3.1, 40], [3.9, 0, E_SINK], [E, 120, lin]])}>
        <Line t={v} text="千葉の右下" x={1330} y={690} size={46} color={C.gray} t0={3.2} t1={E - 0.7} dir="left" />
      </Lay>
      <Line t={v} text="頭の中の配置" x={120} y={950} size={34} weight={400} color={C.gray} t0={0.3} t1={E - 0.65} />
    </>
  );
};

// ---------------------------------------------------------------- 09 仮説です。
// 固定盤は奥に小さく、手前に「前」の矢印が着地。地下の一文で明るい折れ線を描く。
// 「それでも」で矢印が退き、盤が手前へ戻ってコマが北へ 1 マス進む。留保の間も盤か矢印が動く。
const FAR9: Geo = {x: 1480, y: 300, size: 260, rot: 0};
const NEAR9: Geo = {x: 1380, y: 560, size: 460, rot: 0};
export const Cut09: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const kin = E_SINK(prog(t, 0, 0.8));
  const kNear = E_SINK(prog(v, 8.6, 9.7));
  const far = kv(t, [[0, 1], [6.2, 0.94, lin], [8.9, 0.86, lin]]);
  const g: Geo = lerpGeo({...FAR9, size: FAR9.size * far * lerp(0.6, 1, kin)}, NEAR9, kNear);
  const pc = pieceAt(v, [[-9, ...cell(1, 2)], [10.35, ...cell(1, 1)]] as [number, number, number][], 0.55);
  const [px, py] = pt(g, pc.u, pc.v);
  // 矢印: 「矢印」で手前に着地し、読む間は手前へ寄り続け、「それでも」で奥へ退く
  const aIn = E_SLAM(prog(v, 1.75, 2.35));
  const aOut = E_SINK(prog(v, 8.5, 9.3));
  const aS = lerp(1.7, 1, aIn) * kv(v, [[2.35, 1], [5.6, 1.12, lin], [6.2, 1.22, E_SINK], [8.5, 1.3, lin]]) * lerp(1, 0.35, aOut);
  const aO = prog(v, 1.75, 1.85) * (1 - aOut);
  const E = p.dur - p.vo;
  const call = slam(v, 10.35, 0.6, {y: 200, s: 1.35, r: -4});
  return (
    <>
      {own(p) && (
        <>
          <Board g={g} o={lerp(0.75, 1, kNear) * prog(t, 0, 0.3)} />
          <Piece x={px} y={py} size={g.size * PB} lift={pc.lift} o={prog(t, 0, 0.3)} />
          <Arrow x={lerp(1180, 1420, aOut)} y={lerp(720, 420, aOut)} w={300} h={360} s={aS} o={aO} />
          <Poly pts={[[1170, 930], [1350, 930], [1350, 975], [1640, 975]]} k={prog(v, 5.9, 7.6)} />
          <EdgeLabel t={v} text="北" x={edgePt(g, 'n', 26 + kNear * 8)[0]} y={edgePt(g, 'n', 26 + kNear * 8)[1]} size={lerp(32, 40, kNear)} t0={0.3} />
        </>
      )}
      <Lay x={kv(v, [[0.9, 40], [1.8, 0, E_SINK], [8.6, 80, lin]])}>
        <Line t={v} text="仮説です。" x={120} y={140} size={118} color={C.gray} t0={1.05} t1={8.35} />
        <Line t={v} text="全員の話ではない。" x={120} y={300} size={60} color={C.gray} t0={3.6} t1={8.4} />
      </Lay>
      <Lay x={kv(v, [[5.6, -30], [6.4, 0, E_SINK], [E, 40, lin]])}>
        <Line t={v} text="地下では、私も失う。" x={120} y={880} size={44} color={C.gray} t0={5.75} t1={E - 0.6} dir="right" />
      </Lay>
      <Lay x={kv(v, [[9.0, 30], [9.8, 0, E_SINK], [E, -30, lin]])}>
        <Line t={v} text="固定した地図を、" x={120} y={330} size={72} color={C.red} t0={9.05} t1={E - 0.7} />
      </Lay>
      <Lay y={call.y} s={call.s} r={call.r} o={call.o} ox={130} oy={520}>
        <Line t={v} text="呼び出す。" x={120} y={440} size={130} color={C.red} t0={10.35} t1={E - 0.65} dur={0.3} stagger={0.02} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 10 少し、誇らしい。
// 左に結論の行、右に固定盤。盤は回さず、読む間は盤ごと寄り、「使い続けます」でコマが北へ 1 マス進む。
// 最後は画面ごと上へ押し出してロゴへ渡す（Main）。
const B10: Geo = {x: 1450, y: 560, size: 480, rot: 0};
export const Cut10: React.FC<CutProps> = (p) => {
  const {t, v} = p;
  const kin = E_SINK(prog(t, 0, 1.0));
  const z = kv(t, [[1.0, 1], [5.0, 1.06, lin], [5.6, 1.12, E_SINK], [p.dur, 1.18, lin]]);
  let g = lerpGeo(NEAR9, B10, kin);
  g = {...g, size: g.size * z, y: g.y - (z - 1) * 150, x: g.x + (z - 1) * 120};
  const pc = pieceAt(v, [[-9, ...cell(1, 1)], [7.75, ...cell(1, 0)]] as [number, number, number][], 0.55);
  const [px, py] = pt(g, pc.u, pc.v);
  const s1 = slam(v, 0.8, 0.55, {y: 200, s: 1.3, r: 3});
  const s2 = slam(v, 4.6, 0.6, {y: 240, s: 1.4, r: -5});
  return (
    <>
      {own(p) && (
        <>
          <Board g={g} />
          <Piece x={px} y={py} size={g.size * PB} lift={pc.lift} />
          <EdgeLabel t={v} text="北" x={edgePt(g, 'n', 36)[0]} y={edgePt(g, 'n', 36)[1]} t0={-5} />
        </>
      )}
      <Lay x={kv(v, [[-0.2, -40], [0.6, 0, E_SINK], [11, 90, lin]])}>
        <Line t={v} text="わかる人には、" x={120} y={240} size={84} t0={-0.15} dir="down" />
      </Lay>
      <Lay y={s1.y} s={s1.s} r={s1.r} o={s1.o} ox={130} oy={430}>
        <Lay x={kv(v, [[0.8, 0], [11, -50, lin]])}>
          <Line t={v} text="痛いほどわかる。" x={120} y={360} size={118} t0={0.8} dur={0.3} stagger={0.02} />
        </Lay>
      </Lay>
      <Lay y={s2.y} s={s2.s} r={s2.r} o={s2.o} ox={600} oy={650}>
        <Lay x={kv(v, [[4.6, 0], [11, 60, lin]])}>
          <Line t={v} text="少し、誇らしい。" x={120} y={580} size={122} color={C.red} t0={4.6} dur={0.3} stagger={0.02} />
        </Lay>
      </Lay>
    </>
  );
};

export const SCENES: Record<string, React.FC<CutProps>> = {
  '01': Cut01,
  '02': Cut02,
  '03': Cut03,
  '04': Cut04,
  '05': Cut05,
  '06': Cut06,
  '07': Cut07,
  '08': Cut08,
  '09': Cut09,
  '10': Cut10,
};

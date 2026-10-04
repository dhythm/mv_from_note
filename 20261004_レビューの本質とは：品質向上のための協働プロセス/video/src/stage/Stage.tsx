import type { CSSProperties } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Book } from "./Book";
import { BASE_SCALE, ERASER_GRIP, ERASER_HOME, HAND_POINTS, OUT_H, OUT_W, PLATE_H, PLATE_W, SPRITES } from "./geometry";
import type { Camera, HandState, StageState } from "./types";

const gen = (p: string) => staticFile(`gen/${p}`);

/** カメラ：机の (cx, cy) を画面中央に、zoom 倍で映す（机の外が見えないよう中心を制限） */
export function cameraTransform(c: Camera): { s: number; tx: number; ty: number } {
  const s = BASE_SCALE * c.zoom;
  const halfW = OUT_W / s / 2;
  const halfH = OUT_H / s / 2;
  const cx = Math.min(PLATE_W - halfW, Math.max(halfW, c.cx));
  const cy = Math.min(PLATE_H - halfH, Math.max(halfH, c.cy));
  return { s, tx: OUT_W / 2 - cx * s, ty: OUT_H / 2 - cy * s };
}

function abs(x: number, y: number, w: number, h: number): CSSProperties {
  return { position: "absolute", left: x, top: y, width: w, height: h };
}

/** 手の部品。影は回転しない外側の箱に付ける（光は左上から） */
function Hand({ h }: { h: HandState }) {
  const sp = SPRITES[h.id];
  const pivot = h.pivot ?? [sp.x + sp.w * 0.45, Math.min(sp.y + sp.h, PLATE_H + 40)];
  const ox = 4 + 16 * h.lift;
  const oy = 6 + 20 * h.lift;
  const blur = 3 + 12 * h.lift;
  const alpha = 0.5 - 0.22 * h.lift;
  const eraser = SPRITES.eraser;
  const [px, py] = HAND_POINTS.pinch;
  return (
    <div style={{ ...abs(0, 0, PLATE_W, PLATE_H), filter: `drop-shadow(${ox}px ${oy}px ${blur}px rgba(14,18,28,${alpha}))`, opacity: h.opacity ?? 1 }}>
      <div
        style={{
          ...abs(0, 0, PLATE_W, PLATE_H),
          transform: h.matrix ? `matrix(${h.matrix.join(",")})` : `translate(${h.dx}px, ${h.dy}px) rotate(${h.rot ?? 0}deg)`,
          transformOrigin: h.matrix ? "0 0" : `${pivot[0]}px ${pivot[1]}px`,
        }}
      >
        {h.holding === "eraser" ? (
          <Img src={gen(eraser.file)} style={{ ...abs(px - ERASER_GRIP[0], py - ERASER_GRIP[1], eraser.w, eraser.h), transformOrigin: "0 0", transform: "rotate(-8deg)" }} />
        ) : null}
        <Img src={gen(sp.file)} style={abs(sp.x, sp.y, sp.w, sp.h)} />
      </div>
    </div>
  );
}

export function Stage({ state }: { state: StageState }) {
  const { s, tx, ty } = cameraTransform(state.camera);
  const { desk } = state;
  const pencil = SPRITES.pencil;
  const eraser = SPRITES.eraser;
  const stamp = SPRITES.stamp;
  const eraserPos = desk.eraser === true ? ERASER_HOME : desk.eraser || null;
  const cx = Math.min(PLATE_W, Math.max(0, state.camera.cx));
  const cy = Math.min(PLATE_H, Math.max(0, state.camera.cy));
  return (
    <AbsoluteFill style={{ backgroundColor: "#141820", overflow: "hidden" }}>
      <div style={{ ...abs(0, 0, PLATE_W, PLATE_H), transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        <Img src={gen("parts/plate.webp")} style={{ ...abs(0, 0, PLATE_W, PLATE_H), filter: state.camera.blur ? `blur(${state.camera.blur}px)` : undefined }} />
        {desk.stamp === true ? <Img src={gen(stamp.file)} style={abs(stamp.x, stamp.y, stamp.w, stamp.h)} /> : null}
        {eraserPos ? <Img src={gen(eraser.file)} style={abs(eraserPos[0], eraserPos[1], eraser.w, eraser.h)} /> : null}
        {desk.pencil ? <Img src={gen(pencil.file)} style={abs(pencil.x, pencil.y, pencil.w, pencil.h)} /> : null}
        <Book book={state.book} cx={cx} cy={cy} />
        {Array.isArray(desk.stamp) ? (
          <Img src={gen(stamp.file)} style={{ ...abs(desk.stamp[0], desk.stamp[1], stamp.w, stamp.h), filter: "drop-shadow(6px 9px 6px rgba(14,18,28,0.4))" }} />
        ) : null}
        {state.hands.map((h, i) => (
          <Hand key={`${h.id}-${i}`} h={h} />
        ))}
        {(state.markers ?? []).map(([x, y], i) => (
          <div key={`m${i}`} style={{ ...abs(x - 4, y - 4, 8, 8), borderRadius: 4, background: "red", border: "1px solid yellow" }} />
        ))}
        {state.passShadow && state.passShadow.amount > 0 ? (
          <div
            style={{
              ...abs(0, 0, PLATE_W, PLATE_H),
              background: `radial-gradient(ellipse 480px 600px at ${state.passShadow.x}px ${state.passShadow.y}px, rgba(8,11,18,${0.72 * state.passShadow.amount}), rgba(8,11,18,${0.28 * state.passShadow.amount}) 55%, rgba(8,11,18,0) 100%)`,
            }}
          />
        ) : null}
      </div>
      {state.fade ? <AbsoluteFill style={{ backgroundColor: `rgba(8,9,12,${state.fade})` }} /> : null}
    </AbsoluteFill>
  );
}

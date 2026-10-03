import { ip, outExpo } from "./anim";
import { sans } from "./fonts";

// 企画書の各ブロックの見出し。各シーン冒頭の数秒だけ右下に出す。
const CHAPTERS: [number, string][] = [
  [0.4, "朝の机が空"],
  [18.2, "一日が始まる"],
  [40.2, "山が自重で崩れる"],
  [60.2, "1つだけ残る"],
  [80.2, "それだけが机にある"],
];

export function Chapter({ t }: { t: number }) {
  return (
    <>
      {CHAPTERS.map(([at, label], i) => {
        const p = ip(t, [at, at + 0.9], [0, 1], outExpo);
        const out = ip(t, [at + 3.4, at + 4.0], [0, 1]);
        if (p <= 0 || out >= 1) return null;
        return (
          <div
            key={label}
            style={{
              position: "absolute",
              right: 44,
              bottom: 34,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: sans,
              fontWeight: 500,
              fontSize: 17,
              letterSpacing: "0.12em",
              color: "#fff",
              textShadow: "0 1px 6px rgba(0,0,0,0.55)",
              opacity: 1 - out,
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 14 }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ width: 56 * p, height: 1.5, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }} />
            <span style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{label}</span>
          </div>
        );
      })}
    </>
  );
}

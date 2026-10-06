import React from "react";
import { interpolate } from "remotion";
import { jpFont, EASE_OUT } from "./ui";

// 端末に合成する架空の作業記録画面（assets/tablet-ui.svg を元にした作画）。
// チェックが順に入る＝支えられた機能を現場で使う。文言は原稿の引用ではない。

export const TabletScreen: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const rows = ["記録を確認する", "重複した入力をまとめる", "次の作業へ"];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#f4f0e8",
        padding: "7% 8%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "4%",
      }}
    >
      <div style={{ fontSize: 36, color: "#292d31", ...jpFont(800) }}>作業記録</div>
      {rows.map((r, i) => {
        const check = interpolate(localFrame, [30 + i * 22, 50 + i * 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE_OUT,
        });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: "2%" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                border: "3px solid #405868",
                background: check > 0.5 ? "#405868" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f4f0e8",
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {check > 0.5 ? "✓" : ""}
            </div>
            <div style={{ fontSize: 26, whiteSpace: "nowrap", color: "#292d31", ...jpFont(400) }}>{r}</div>
          </div>
        );
      })}
    </div>
  );
};

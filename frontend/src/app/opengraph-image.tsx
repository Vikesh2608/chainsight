import { ImageResponse } from "next/og";

export const alt = "ChainSight — Supply Chain Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #020617 0%, #0b1220 55%, #06283d 100%)",
          padding: "72px 80px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(34,211,238,0.12)",
              color: "#22d3ee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            CS
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>
            ChainSight
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            Open the app and it has already found the problem.
          </div>
          <div style={{ fontSize: 30, color: "#94a3b8", maxWidth: 900 }}>
            Reads your inventory position, flags what will stock out before a
            reorder can arrive, and drafts the purchase order.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            fontSize: 22,
            color: "#67e8f9",
          }}
        >
          <span>Inventory</span>
          <span style={{ color: "#334155" }}>·</span>
          <span>Demand Forecast</span>
          <span style={{ color: "#334155" }}>·</span>
          <span>Procurement</span>
          <span style={{ color: "#334155" }}>·</span>
          <span>Production &amp; Quality</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

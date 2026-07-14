import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const gainSymbols = [
  { label: "AAPL", value: "317.31", change: "+0.74%", up: true },
  { label: "MSFT", value: "390.99", change: "+1.46%", up: true },
  { label: "NVDA", value: "210.96", change: "+4.27%", up: true },
  { label: "TSLA", value: "412.55", change: "-1.12%", up: false },
];

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0A0A0B",
          backgroundImage:
            "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(212,175,55,0.22), transparent 65%)",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -1,
              color: "#F2CE5B",
            }}
          >
            Aurum
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 30,
              color: "#F5F5F7",
              maxWidth: 880,
              lineHeight: 1.4,
            }}
          >
            A live equity research terminal with an interactive DCF valuation
            model
          </div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {gainSymbols.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                border: "1px solid #2A2A31",
                backgroundColor: "#141417",
                borderRadius: 16,
                padding: "20px 26px",
                flex: 1,
              }}
            >
              <div style={{ display: "flex", fontSize: 20, color: "#8A7433", fontWeight: 700 }}>
                {s.label}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  color: "#F5F5F7",
                  marginTop: 6,
                  fontWeight: 600,
                }}
              >
                ${s.value}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  marginTop: 4,
                  color: s.up ? "#16C784" : "#EA3943",
                }}
              >
                {s.change}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

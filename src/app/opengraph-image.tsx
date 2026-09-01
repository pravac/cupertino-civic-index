import { ImageResponse } from "next/og";

/** The card that renders when someone pastes a link into a group chat or a
 *  neighborhood list, which is how a civic site actually spreads. Generated
 *  rather than a static file so the wordmark stays in step with the site.
 *  System fonts only: no font file to load, and nothing to break at build. */
export const alt = "Cupertino Eye: meetings, agendas, elections and local news for Cupertino, California";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#fbfcfe",
          color: "#1b2130",
        }}
      >
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: "-0.03em" }}>
          <span>Cupertino</span>
          <span style={{ color: "#6b7488", marginLeft: 20 }}>Eye</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 38, color: "#4a5162", lineHeight: 1.35 }}>
          Meetings, agendas, roll-call votes, commissions and local news, from the
          city&rsquo;s own records.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 52,
            fontSize: 26,
            color: "#6b7488",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Cupertino, California
        </div>
      </div>
    ),
    size,
  );
}

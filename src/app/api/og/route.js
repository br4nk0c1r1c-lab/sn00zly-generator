import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { buildSchedule, ageLabel, fmt, parseHM, weeksOld } from "@/lib/schedule-engine";
import { poss, rangeStr } from "@/lib/schedule-format";
import { parseShareSearchParams } from "@/lib/share-params";

const FORMATS = {
  og: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
  pin: { width: 1000, height: 1500 },
};

let fontsPromise = null;
function loadFonts() {
  if (!fontsPromise) {
    const dir = join(process.cwd(), "src", "assets", "fonts");
    fontsPromise = Promise.all([
      readFile(join(dir, "Poppins-Regular.ttf")),
      readFile(join(dir, "Poppins-SemiBold.ttf")),
    ]).then(([regular, semibold]) => [
      { name: "Poppins", data: regular, weight: 400, style: "normal" },
      { name: "Poppins", data: semibold, weight: 600, style: "normal" },
    ]);
  }
  return fontsPromise;
}

function defaultDob() {
  const d = new Date();
  d.setDate(d.getDate() - 133);
  return d.toISOString().slice(0, 10);
}

function scheduleRows(s, wakeMin) {
  const rows = [{ label: "Wake", value: fmt(wakeMin) }];
  s.items.forEach((it, i) => {
    rows.push({
      label: it.bridge ? "Catnap" : `Nap ${i + 1}`,
      value: `${fmt(it.start)} – ${fmt(it.end)}`,
    });
  });
  rows.push({
    label: "Bedtime",
    value: s.rhythm ? "No fixed bedtime" : rangeStr(s.bedLow, s.bedHigh),
  });
  return rows;
}

function PortraitCard({ name, weeks, wakeMin, s }) {
  const rows = scheduleRows(s, wakeMin);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(165deg, #3A5A8C 0%, #1C3257 100%)",
        padding: "76px 64px",
        fontFamily: "Poppins",
        color: "#F7F1E8",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -140,
          top: -140,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(218,212,242,0.09)",
          display: "flex",
        }}
      />
      <div style={{ fontSize: 22, letterSpacing: 8, fontWeight: 600, color: "rgba(247,241,232,0.62)" }}>
        SN00ZLY
      </div>
      <div style={{ fontSize: 58, fontWeight: 600, marginTop: 34, lineHeight: 1.18, display: "flex", flexDirection: "column" }}>
        <span>{poss(name)}</span>
        <span>starting schedule</span>
      </div>
      <div style={{ fontSize: 30, color: "#E7D6AE", marginTop: 12 }}>
        {`${ageLabel(weeks)} · ${s.items.length} naps`}
      </div>
      <div style={{ width: 70, height: 5, background: "#C9A463", borderRadius: 3, margin: "36px 0 34px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
            <span style={{ color: "rgba(247,241,232,0.72)" }}>{r.label}</span>
            <span style={{ fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 20, letterSpacing: 3, color: "rgba(247,241,232,0.5)", textAlign: "center", justifyContent: "center" }}>
        A FLEXIBLE STARTING POINT · SN00ZLY.COM
      </div>
    </div>
  );
}

function LandscapeCard({ name, weeks, wakeMin, s }) {
  const rows = scheduleRows(s, wakeMin);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #3A5A8C 0%, #1C3257 100%)",
        padding: "56px 64px",
        fontFamily: "Poppins",
        color: "#F7F1E8",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "44%" }}>
        <div style={{ fontSize: 20, letterSpacing: 6, fontWeight: 600, color: "rgba(247,241,232,0.62)" }}>
          SN00ZLY
        </div>
        <div style={{ fontSize: 46, fontWeight: 600, marginTop: 18, lineHeight: 1.22, display: "flex", flexDirection: "column" }}>
          <span>A starting schedule</span>
          <span>{`for ${name}`}</span>
        </div>
        <div style={{ fontSize: 24, color: "#E7D6AE", marginTop: 14 }}>
          {`${ageLabel(weeks)} · ${s.items.length} naps`}
        </div>
      </div>
      <div style={{ width: 2, background: "rgba(247,241,232,0.18)", margin: "0 44px" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 25 }}>
            <span style={{ color: "rgba(247,241,232,0.72)" }}>{r.label}</span>
            <span style={{ fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedFormat = searchParams.get("format");
  const formatKey = FORMATS[requestedFormat] ? requestedFormat : "og";
  const { width, height } = FORMATS[formatKey];

  const parsed = parseShareSearchParams(searchParams);
  const name = parsed.name || "Your baby";
  const dob = parsed.dob || defaultDob();
  const wakeStr = parsed.wake || "06:45";
  const weeks = Math.min(112, weeksOld(dob));
  const wakeMin = parseHM(wakeStr);
  const s = buildSchedule(weeks, wakeMin);
  const fonts = await loadFonts();

  const card =
    formatKey === "og" ? (
      <LandscapeCard name={name} weeks={weeks} wakeMin={wakeMin} s={s} />
    ) : (
      <PortraitCard name={name} weeks={weeks} wakeMin={wakeMin} s={s} />
    );

  return new ImageResponse(card, {
    width,
    height,
    fonts,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

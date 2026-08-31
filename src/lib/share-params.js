const STRUGGLE_KEYS = ["short", "bedtime", "night", "early"];

function getParam(searchParams, key) {
  if (!searchParams) return undefined;
  if (typeof searchParams.get === "function") return searchParams.get(key) ?? undefined;
  const v = searchParams[key];
  return Array.isArray(v) ? v[0] : v;
}

export function parseNameParam(n) {
  if (typeof n !== "string") return null;
  const trimmed = n.trim().slice(0, 18);
  return trimmed || null;
}

export function parseDobParam(d) {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(d + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== day) return null;
  if (date.getTime() > Date.now()) return null;
  return d;
}

export function parseWakeParam(w) {
  if (typeof w !== "string" || !/^\d{4}$/.test(w)) return null;
  const h = Number(w.slice(0, 2));
  const m = Number(w.slice(2));
  if (h > 23 || m > 59) return null;
  return `${w.slice(0, 2)}:${w.slice(2)}`;
}

export function formatWakeParam(hhmm) {
  return typeof hhmm === "string" ? hhmm.replace(":", "") : "";
}

export function parseStruggleParam(s) {
  return STRUGGLE_KEYS.includes(s) ? s : null;
}

export function parseShareSearchParams(searchParams) {
  return {
    name: parseNameParam(getParam(searchParams, "n")),
    dob: parseDobParam(getParam(searchParams, "d")),
    wake: parseWakeParam(getParam(searchParams, "w")),
    struggle: parseStruggleParam(getParam(searchParams, "s")),
  };
}

export function buildShareQuery({ name, dob, wake, struggle }) {
  const params = new URLSearchParams();
  if (name) params.set("n", name);
  if (dob) params.set("d", dob);
  if (wake) params.set("w", formatWakeParam(wake));
  if (struggle) params.set("s", struggle);
  return params.toString();
}

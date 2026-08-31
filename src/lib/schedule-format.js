import { fmt } from "@/lib/schedule-engine";

export function poss(name) {
  return /[sxz]$/i.test(name) ? name + "'" : name + "'s";
}

export function rangeStr(a, b) {
  const A = fmt(a);
  const B = fmt(b);
  return A.slice(-2) === B.slice(-2) ? A.slice(0, -2).trim() + "–" + B : A + " – " + B;
}

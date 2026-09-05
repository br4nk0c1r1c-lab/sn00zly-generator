import { fmt } from "@/lib/schedule-engine";

export function poss(name) {
  return /[sxz]$/i.test(name) ? name + "'" : name + "'s";
}

export function rangeStr(a, b) {
  const A = fmt(a);
  const B = fmt(b);
  return A.slice(-2) === B.slice(-2) ? A.slice(0, -2).trim() + "–" + B : A + " – " + B;
}

export function monthsAndWeeks(weeks) {
  if (weeks < 14) return `${weeks} week${weeks === 1 ? "" : "s"}`;
  const months = Math.floor(weeks / 4.345);
  const remainder = Math.round(weeks - months * 4.345);
  if (remainder <= 0) return `${months} month${months === 1 ? "" : "s"}`;
  return `${months} month${months === 1 ? "" : "s"}, ${remainder} week${remainder === 1 ? "" : "s"}`;
}

/**
 * Sn00zly — schedule engine test suite
 * Run: node snoozly_engine_tests.js      (exit 1 on any failure)
 *
 * Run this after EVERY edit to the age-band data. The arithmetic check at the
 * bottom is the one that catches C32-class errors: a table whose wake window,
 * day sleep and bedtime window cannot all hold at the same time.
 */
const E = require("./snoozly_schedule_engine.js");
const { buildSchedule, parseHM, fmt } = E;

let fails = 0, checks = 0;
const chk = (cond, msg) => { checks++; if (!cond) { console.log("  FAIL: " + msg); fails++; } };

const WAKES = ["04:00","05:00","06:00","06:45","07:30","08:30","09:30","10:30","11:30"];
let cases = 0, rhythmCases = 0;

for (let w = 0; w <= 110; w++) for (const t of WAKES) {
  cases++;
  const wake = parseHM(t), s = buildSchedule(w, wake), tag = `@${w}w ${t}`;
  if (s.rhythm) rhythmCases++;

  let prev = wake;
  s.items.forEach((it, i) => {
    chk(it.start > prev,            `nap ${i+1} overlaps the previous sleep ${tag}`);
    chk(it.len >= 25 && it.len <= 150, `nap length ${it.len} out of bounds ${tag}`);
    chk(it.end < 1440,              `nap runs past midnight ${tag}`);
    prev = it.end;
  });
  chk(s.daySleep >= 55 && s.daySleep <= 9*60, `day sleep ${(s.daySleep/60).toFixed(1)}h implausible ${tag}`);
  chk(s.items.length <= s.realNaps + 1,       `too many naps ${tag}`);

  if (s.rhythm) {
    chk(s.bedLow === null && s.bedHigh === null, `rhythm mode must not produce a bedtime ${tag}`);
  } else {
    chk(s.bedHigh > s.bedLow && s.bedHigh - s.bedLow <= 60, `bedtime range malformed ${tag}`);
    chk(s.bedLow < 1440 && s.bedHigh < 1440,                `bedtime past midnight ${tag}`);
    chk(s.bedLow > prev,                                    `bedtime falls before the last nap ends ${tag}`);
  }

  // a parent reporting a real nap 45 min longer than estimated
  if (s.items.length) {
    const a = buildSchedule(w, wake, { index: 0, end: s.items[0].end + 45 });
    chk(a.items[0].actual === true,               `reported nap not applied ${tag}`);
    chk(a.items[0].len === s.items[0].len + 45,   `reported nap length wrong ${tag}`);
    let pv = wake;
    a.items.forEach(it => { chk(it.start > pv, `overlap after reported nap ${tag}`); pv = it.end; });
    if (!a.rhythm) chk(a.bedLow > pv, `bedtime before last nap after reported nap ${tag}`);
    // and one 30 min shorter
    const b = buildSchedule(w, wake, { index: 0, end: s.items[0].end - 30 });
    chk(b.items.every(it => it.len >= 20), `shortened reported nap broke nap lengths ${tag}`);
  }
}

/* ── C32 guard: does each band's own arithmetic close? ─────────────────────
   (naps + 1) x wake window + day sleep must land inside the band's own
   bedtime window for a typical 7:00 am start. */
console.log("\nArithmetic check (7:00 am wake):");
let over = 0;
for (let w = 0; w <= 104; w++) {
  const s = buildSchedule(w, 420);
  if (s.rhythm) continue;
  if (s.late) { over++; console.log(`  OUTSIDE WINDOW: ${s.band.label} -> ${fmt(s.bedLow)}`); }
}
chk(over === 0, `${over} weeks land outside their own bedtime window`);
if (over === 0) console.log("  every band closes inside its own bedtime window");

console.log(`\n${cases} schedules - ${checks} assertions - ${rhythmCases} in rhythm mode`);
console.log(fails === 0 ? "ALL PASSED" : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);

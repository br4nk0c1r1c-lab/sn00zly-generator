"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  AGE_NOTES,
  STRUGGLE_TIPS,
  ageLabel,
  buildSchedule,
  dur,
  fmt,
  nextTransition,
  parseHM,
  weeksOld,
} from "@/lib/schedule-engine";
import { monthsAndWeeks, poss, rangeStr } from "@/lib/schedule-format";
import { bundleForWeeks } from "@/lib/bundles";
import { buildShareQuery } from "@/lib/share-params";
import { trackEvent } from "@/lib/analytics";
import { BASE_PATH } from "@/lib/base-path";

const STRUGGLE_CHIPS = [
  { k: "short", label: "Short naps" },
  { k: "bedtime", label: "Bedtime battles" },
  { k: "night", label: "Night wakings" },
  { k: "early", label: "Early rising" },
];

function toHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function ShareLinkButton({ name, dob, wake, struggle }) {
  const [label, setLabel] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleClick() {
    trackEvent("share_click");
    const query = buildShareQuery({ name, dob, wake, struggle });
    const url = `${window.location.origin}${BASE_PATH}/${query ? `?${query}` : ""}`;
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = false;
    }
    setLabel(copied ? "Link copied!" : url);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setLabel(null), 2200);
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={handleClick}>
      {label ?? "Share link"}
    </button>
  );
}

function SaveImageButton({ name, dob, wake, struggle }) {
  const [label, setLabel] = useState(null);
  const [busy, setBusy] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleClick() {
    trackEvent("image_save");
    setBusy(true);
    try {
      const query = buildShareQuery({ name, dob, wake, struggle });
      const res = await fetch(`${BASE_PATH}/api/og?format=story&${query}`);
      if (!res.ok) throw new Error("image request failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "baby"}-sleep-schedule.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLabel("Saved!");
    } catch {
      setLabel("Couldn't save — try again");
    } finally {
      setBusy(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setLabel(null), 2200);
    }
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={handleClick} disabled={busy}>
      {label ?? (busy ? "Saving…" : "Save as image")}
    </button>
  );
}

function PdfCaptureCard({ name, dob }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, dob }),
      });
      if (!res.ok) throw new Error("request failed");
      trackEvent("email_capture");
      setStatus("done");
    } catch {
      setStatus("error");
      timeoutRef.current = setTimeout(() => setStatus("idle"), 2200);
    }
  }

  if (status === "done") {
    return (
      <div className="capture reveal" style={{ marginTop: 16 }}>
        <h3>Check your inbox</h3>
        <p>
          We just sent {poss(name)} wake window cheat sheet to {email}.
        </p>
      </div>
    );
  }

  return (
    <div className="capture reveal" style={{ marginTop: 16 }}>
      <h3>Want to stay one step ahead of {poss(name)} sleep changes?</h3>
      <p>
        We’ll email you our printable 0–24 month Wake Window Cheat Sheet, then send helpful updates as {name} approaches new wake windows and nap transitions.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <input
            type="email"
            placeholder="you@email.com"
            aria-label="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="submit" className="btn" disabled={status === "loading"}>
            {status === "error" ? "Couldn't send — try again" : status === "loading" ? "Sending…" : "Send me Wake Windows PDF"}
          </button>
        </div>
      </form>
      <p className="no-signup">Helpful sleep emails as {name} grows. Unsubscribe anytime.</p>
    </div>
  );
}

function TimelineRow({ timeStr, kind, title, sub, exact }) {
  return (
    <div className="tl-row">
      <div className="tl-time">
        {timeStr}
        {exact ? <span className="exact">exact</span> : null}
      </div>
      <div className="tl-body">
        <span className="tl-dot" />
        <div className={`block ${kind}`}>
          <span className="bt">{title}</span>
          <span className="bs">{sub}</span>
        </div>
      </div>
    </div>
  );
}

function OutOfRangeCard({ name }) {
  return (
    <div className="card reveal" style={{ marginTop: 24 }}>
      <div className="note note-dyk">
        <strong>Past our range</strong>
        <p>
          Sn00zly schedules cover birth to 24 months. {name} has grown out of
          them — which is the good kind of problem.
        </p>
      </div>
    </div>
  );
}

function ScheduleResult({ name, dob, wake, weeks, wakeMin, struggle, anchor, onRecalc }) {
  const s = buildSchedule(weeks, wakeMin, anchor ?? undefined);
  const b = s.band;
  const nt = nextTransition(weeks);
  const ageNotes = AGE_NOTES.filter((an) => weeks >= an.from && weeks <= an.to);
  const struggleTip = struggle ? STRUGGLE_TIPS[struggle] : null;
  const hasComingNextNote = ageNotes.length > 0 || !!struggleTip;
  const bundle = bundleForWeeks(weeks);

  const selectRef = useRef(null);
  const endRef = useRef(null);
  const defIndex = anchor ? anchor.index : 0;
  const defEnd = s.items.length ? s.items[0].end : wakeMin + 120;

  function handleRecalcClick() {
    const idxRaw = selectRef.current ? selectRef.current.value : null;
    const timeVal = endRef.current ? endRef.current.value : null;
    if (idxRaw === null || !timeVal) return;
    onRecalc({ index: Number(idxRaw), end: parseHM(timeVal) });
  }

  function handleResetClick() {
    onRecalc(null);
  }

  return (
    <>
      <div className="result-head reveal">
        <span className="age-pill">{ageLabel(weeks)}</span>
        <h2>Starting schedule for {name}</h2>
        <p className="lede">
          Built from an age of {weeks} weeks and this morning’s {fmt(wakeMin)} wake-up.
        </p>
        <p className="honest">
          Use this as a flexible starting point, not a strict schedule. Follow your baby’s individual sleep cues.
        </p>
      </div>

      <div className="tiles reveal">
        <div className="tile">
          <span className="tv">{s.items.length}</span>
          <span className="tl">Naps</span>
        </div>
        <div className="tile">
          <span className="tv">{Math.round(s.daySleep / 6) / 10}h</span>
          <span className="tl">Target day sleep</span>
        </div>
        {s.rhythm ? (
          <div className="tile">
            <span className="tv sm">
              no fixed
              <br />
              bedtime
            </span>
            <span className="tl">Bedtime</span>
          </div>
        ) : (
          <div className="tile">
            <span className="tv sm">{rangeStr(s.bedLow, s.bedHigh)}</span>
            <span className="tl">Bedtime window</span>
          </div>
        )}
        <div className="tile">
          <span className="tv">{b.total}</span>
          <span className="tl">Total / 24h</span>
        </div>
      </div>

      <div className="card reveal">
        <div className="card-label">{name}’s day</div>
        {s.anchored ? <span className="anchor-on">Rebuilt from a real nap you reported</span> : null}
        <div className="tl-list">
          <TimelineRow
            timeStr={fmt(wakeMin)}
            kind="awake"
            title="Wake for the day"
            sub={`Wake window ~${dur(s.ww[0])}`}
            exact
          />
          {s.items.map((it, i) => {
            const title = it.bridge ? "Bridging catnap (suggested)" : `Nap ${i + 1}`;
            const nextWW = s.ww[Math.min(i + 1, s.realNaps)];
            const isLast = i === s.items.length - 1;
            return (
              <Fragment key={i}>
                <TimelineRow
                  timeStr={rangeStr(it.start, it.start + 20)}
                  kind="sleep"
                  title={title}
                  sub={`${it.actual ? "You reported " : "About "}${dur(it.len)}`}
                />
                <TimelineRow
                  timeStr={it.actual ? fmt(it.end) : rangeStr(it.end, it.end + 20)}
                  kind="awake"
                  title="Awake"
                  sub={isLast ? "Last wake window before bed" : `Wake window ~${dur(nextWW)}`}
                  exact={it.actual}
                />
              </Fragment>
            );
          })}
          {s.rhythm ? (
            <TimelineRow
              timeStr="…"
              kind="bed"
              title="The rhythm continues"
              sub="Feed · short wake window · sleep — around the clock"
            />
          ) : (
            <TimelineRow
              timeStr={rangeStr(s.bedLow, s.bedHigh)}
              kind="bed"
              title="Bedtime window"
              sub="Depends on how naps actually run"
            />
          )}
        </div>

        {!s.rhythm ? (
          <p className="honest">
            Treat each time as a ±15 minute guide. Nap lengths naturally vary — follow your baby’s cues.
          </p>
        ) : null}

        {s.rhythm ? (
          <div className="note note-expert">
            <strong>No bedtime shown — and that is deliberate</strong>
            <p>
              {b.flex
                ? "At this age there is no fixed bedtime yet. Sleep follows feeds around the clock, and the day does not reset in the evening the way it will later."
                : "With a wake-up this late, a full day of naps cannot fit before a reasonable bedtime. Rather than invent one, the schedule shows the rhythm and stops."}{" "}
              The times above are the first cycles from {fmt(wakeMin)}; after that, keep repeating the pattern and follow sleepy cues.
            </p>
          </div>
        ) : null}

        {s.late ? (
          <div className="note note-expert">
            <strong>Today the arithmetic runs late</strong>
            <p>
              If the naps go the full length above, bedtime drifts past the age-appropriate window. That is the day to cap the last nap rather than let it run — an overlong afternoon nap is the most common cause of a hard bedtime.
            </p>
          </div>
        ) : null}

        {s.bridged ? (
          <div className="note note-expert">
            <strong>Why a catnap is suggested</strong>
            <p>
              {name} woke early enough that {s.realNaps} naps leave a very long stretch before bed. Many babies this age need a short bridging catnap on days like this. It is a suggestion for an early start, not a fixed part of the day.
            </p>
          </div>
        ) : null}

        {b.feeds[1] > 0 ? (
          <div className="note note-dyk">
            <strong>Night feeds at this age</strong>
            <p>
              {b.feeds[0] === b.feeds[1] ? b.feeds[0] : `${b.feeds[0]}–${b.feeds[1]}`} night feeds is within the normal range for {ageLabel(weeks)}. Anything in that band is a feeding pattern, not a sleep problem.
            </p>
          </div>
        ) : null}
      </div>

      <div className="card reveal">
        <div className="card-label">How did it actually go?</div>
        <p style={{ fontSize: "13.5px", color: "var(--ink-soft)" }}>
          The times above assume average-length naps. Real naps are not average. Tell us when one actually ended and the rest of the day is rebuilt from that number.
        </p>
        <div className="recalc">
          <select ref={selectRef} aria-label="Which nap" defaultValue={defIndex}>
            {s.items.map((it, q) => (
              <option key={q} value={q}>
                {it.bridge ? "Catnap" : `Nap ${q + 1}`}
              </option>
            ))}
          </select>
          <input ref={endRef} type="time" aria-label="Ended at" defaultValue={toHHMM(defEnd)} />
        </div>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button type="button" className="btn" onClick={handleRecalcClick}>
            Rebuild the rest of the day
          </button>
          {anchor ? (
            <button type="button" className="btn btn-ghost" onClick={handleResetClick}>
              Back to the estimate
            </button>
          ) : null}
        </div>
      </div>

      <div className="card reveal">
        <div className="card-label">What comes next</div>
        {nt ? (
          <div className="note note-next">
            <strong>
              {name} will likely drop to {nt.naps} nap{nt.naps > 1 ? "s" : ""}
            </strong>
            <p>
              Roughly {nt.weeks} week{nt.weeks === 1 ? "" : "s"} from now, going from {nt.from} naps to {nt.naps}. The signs come before the date: naps refused at the same time for a week or more, and bedtime drifting later.
            </p>
          </div>
        ) : (
          <div className="note note-next">
            <strong>One nap holds from here</strong>
            <p>
              No more nap transitions ahead — the single midday nap typically lasts into the third year, then shortens before it disappears.
            </p>
          </div>
        )}

        {ageNotes.map((an, i) => (
          <div key={i} className={`note note-${an.kind === "alert" ? "alert" : "dyk"}`}>
            <strong>{an.t}</strong>
            <p>{an.b}</p>
          </div>
        ))}

        {struggleTip ? (
          <div className="note note-expert">
            <strong>Sn00zly Expert Tip · {struggleTip.t}</strong>
            <p>{struggleTip.b}</p>
          </div>
        ) : null}

        {!hasComingNextNote ? (
          <div className="note note-dyk">
            <strong>Watch the baby, not the clock</strong>
            <p>These windows are a starting frame. Sleepy cues beat the schedule every time in the first year.</p>
          </div>
        ) : null}

        <div className="note note-dyk">
          <strong>And on sick days, ignore all of it</strong>
          <p>A baby who is unwell does not follow a schedule, and should not be made to. Extra sleep on those days is the point, not a setback.</p>
        </div>
      </div>

      <div className="card reveal">
        <div className="card-label">Save it · share it</div>
        <div className="share-stage">
          <div className="share-card">
            <div className="sc-brand">Sn00zly</div>
            <div className="sc-name">
              {poss(name)}
              <br />
              starting schedule
            </div>
            <div className="sc-age">
              {monthsAndWeeks(weeks)} · {s.items.length} naps
            </div>
            <div className="sc-rule" />
            <div className="sc-rows">
              <div className="sc-row">
                <span>Wake</span>
                <span>{fmt(wakeMin)}</span>
              </div>
              {s.items.map((it, k) => (
                <div className="sc-row" key={k}>
                  <span>{it.bridge ? "Catnap" : `Nap ${k + 1}`}</span>
                  <span>
                    {fmt(it.start)} – {fmt(it.end)}
                  </span>
                </div>
              ))}
              <div className="sc-row">
                <span>Bedtime</span>
                <span>{s.rhythm ? "No fixed bedtime" : rangeStr(s.bedLow, s.bedHigh)}</span>
              </div>
            </div>
            <div className="sc-foot">A flexible starting point · sn00zly.com</div>
          </div>
        </div>
        <div className="btn-row">
          <SaveImageButton name={name} dob={dob} wake={wake} struggle={struggle} />
          <ShareLinkButton name={name} dob={dob} wake={wake} struggle={struggle} />
        </div>
        <p className="no-signup">Every shared schedule carries the baby’s name and your brand. That is the traffic engine.</p>
      </div>

      <PdfCaptureCard name={name} dob={dob} />

      <div className="upsell reveal" style={{ marginTop: 16 }}>
        <span className="tag">The next step</span>
        <h3>The schedule says roughly when. The guide says how.</h3>
        <p>
          Knowing the window is the easy half. If {name} fights the last nap, or the window keeps sliding, that is what the {b.label} guide is for — settling, wake-window troubleshooting, and the full nap-transition protocol, reviewed by a pediatrician.
        </p>
        <div className="price">
          <span className="p">${bundle.price}</span>
          <span className="was">${bundle.wasPrice}</span>
        </div>
        <a
          className="btn btn-gold"
          href={bundle.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("product_click", { band: b.label, bundle: bundle.range })}
        >
          See the {bundle.displayRange} bundle
        </a>
      </div>

      <p className="disclaimer">
        Sn00zly schedules are general educational guidance reviewed against AAP safe-sleep principles. They are a flexible starting point based on age and morning wake time — not medical advice, and not a substitute for your pediatrician.
      </p>
    </>
  );
}

function computeResultView({ name, dob, wake, struggle, anchor }) {
  const w = weeksOld(dob);
  const trimmedName = name.trim() || "Your baby";
  if (w > 112) {
    return { kind: "range", name: trimmedName };
  }
  return {
    kind: "schedule",
    name: trimmedName,
    dob,
    wake,
    weeks: w,
    wakeMin: parseHM(wake),
    struggle,
    anchor,
  };
}

export default function ScheduleGenerator({ initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [dob, setDob] = useState(initial?.dob || "");
  const [wake, setWake] = useState(initial?.wake || "06:45");
  const [struggle, setStruggle] = useState(initial?.struggle || "short");
  const [resultView, setResultView] = useState(null);
  const [renderId, setRenderId] = useState(0);
  const [maxDob, setMaxDob] = useState(undefined);
  const resultRef = useRef(null);
  const pendingScrollRef = useRef(false);

  function commit(anchorValue, { scroll = false } = {}) {
    if (!dob || !wake) return;
    setResultView(computeResultView({ name, dob, wake, struggle, anchor: anchorValue }));
    setRenderId((id) => id + 1);
    if (scroll) pendingScrollRef.current = true;
  }

  // On first mount, use a shared link's params directly (dob/wake/name/struggle
  // are already known, no SSR concern), or fall back to a ~19-week-old demo so
  // the page opens on a real result. weeksOld() depends on the viewer's local
  // date, which must not be computed during SSR, so this can't be a lazy
  // useState initializer even when dob comes from the URL.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    trackEvent("generator_start");
    const now = new Date();
    setMaxDob(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    );
    let effectiveDob = initial?.dob;
    if (!effectiveDob) {
      const d = new Date();
      d.setDate(d.getDate() - 133);
      effectiveDob = d.toISOString().slice(0, 10);
      setDob(effectiveDob);
    }
    setResultView(
      computeResultView({
        name: initial?.name || "Sarah",
        dob: effectiveDob,
        wake: initial?.wake || "06:45",
        struggle: initial?.struggle || "short",
        anchor: null,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (pendingScrollRef.current && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    pendingScrollRef.current = false;
  }, [resultView]);

  function handleSubmit(e) {
    e.preventDefault();
    trackEvent("generator_complete", { struggle: struggle || undefined });
    commit(null, { scroll: true });
  }

  function handleChipClick(k) {
    setStruggle((current) => (current === k ? null : k));
  }

  return (
    <>
      <form className="card" onSubmit={handleSubmit} autoComplete="off">
        <div className="card-label">Tell us about your baby</div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="babyName">Baby&apos;s first name</label>
            <input
              type="text"
              id="babyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              maxLength={18}
              required
            />
          </div>
          <div className="two-up">
            <div className="field">
              <label htmlFor="dob">Date of birth</label>
              <input
                type="date"
                id="dob"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={maxDob}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="wake">Woke up today at</label>
              <input
                type="time"
                id="wake"
                value={wake}
                onChange={(e) => setWake(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="field">
            <label id="strugLabel">Biggest struggle right now</label>
            <div className="chips" role="group" aria-labelledby="strugLabel">
              {STRUGGLE_CHIPS.map((c) => (
                <button
                  key={c.k}
                  type="button"
                  className="chip"
                  aria-pressed={struggle === c.k}
                  onClick={() => handleChipClick(c.k)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <span className="hint">Optional — it changes which tips you see, not the times.</span>
          </div>
          <button type="submit" className="btn">
            Build my schedule
          </button>
          <p className="no-signup">No email needed. Your schedule appears right below.</p>
        </div>
      </form>

      <section ref={resultRef} aria-live="polite" hidden={!resultView}>
        {resultView?.kind === "range" ? <OutOfRangeCard name={resultView.name} /> : null}
        {resultView?.kind === "schedule" ? (
          <ScheduleResult
            key={renderId}
            name={resultView.name}
            dob={resultView.dob}
            wake={resultView.wake}
            weeks={resultView.weeks}
            wakeMin={resultView.wakeMin}
            struggle={resultView.struggle}
            anchor={resultView.anchor}
            onRecalc={(anchorValue) => commit(anchorValue, { scroll: false })}
          />
        ) : null}
      </section>
    </>
  );
}

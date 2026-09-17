import { Fragment } from "react";
import BuyButton from "@/components/BuyButton";
import { Brandmark, TopBar } from "@/components/BrandHeader";
import { PageShell } from "@/components/TrustCards";
import { buildSchedule, dur, fmt, parseHM } from "@/lib/schedule-engine";
import { rangeStr } from "@/lib/schedule-format";
import { COUPON_VALUE, PLANNER_PRICE } from "@/lib/site";

// Public page: what the planner is, a worked example, and the one-time offer.
// The example is computed by the same engine members use, for a sample
// 5-month-old, so the demo can never drift from the real product.

const SAMPLE = { name: "Mia", weeks: 22, wake: "06:45", ageText: "5 months" };

function SampleDay() {
  const wakeMin = parseHM(SAMPLE.wake);
  const s = buildSchedule(SAMPLE.weeks, wakeMin);
  return (
    <div className="example">
      <div className="example-head">
        <span className="example-tag">Example</span>
        <span>{SAMPLE.name} · {SAMPLE.ageText} · woke at {fmt(wakeMin)}</span>
      </div>
      <div className="tl-list">
        <Row time={fmt(wakeMin)} kind="awake" title="Wake for the day" sub={`Wake window ~${dur(s.ww[0])}`} />
        {s.items.map((it, i) => (
          <Fragment key={i}>
            <Row time={rangeStr(it.start, it.start + 20)} kind="sleep" title={`Nap ${i + 1}`} sub={`About ${dur(it.len)}`} />
          </Fragment>
        ))}
        <Row time={rangeStr(s.bedLow, s.bedHigh)} kind="bed" title="Bedtime window" sub="Depends on how naps actually run" />
      </div>
    </div>
  );
}

function RebuildExample() {
  const wakeMin = parseHM(SAMPLE.wake);
  const plan = buildSchedule(SAMPLE.weeks, wakeMin);
  const shortEnd = plan.items[0].end - 40;
  const rebuilt = buildSchedule(SAMPLE.weeks, wakeMin, { index: 0, end: shortEnd });
  return (
    <div className="example">
      <div className="example-head">
        <span className="example-tag">Example</span>
        <span>Nap 1 ended at {fmt(shortEnd)} instead of {fmt(plan.items[0].end)}</span>
      </div>
      <div className="compare">
        <div>
          <span className="compare-label">Planned nap 2</span>
          <span className="compare-old">{fmt(plan.items[1].start)}</span>
        </div>
        <span className="compare-arrow" aria-hidden="true">→</span>
        <div>
          <span className="compare-label">Rebuilt nap 2</span>
          <span className="compare-new">{fmt(rebuilt.items[1].start)}</span>
        </div>
      </div>
      <p className="example-note">The rest of the day moves with it, so the short nap doesn&apos;t snowball into a hard bedtime.</p>
    </div>
  );
}

function Row({ time, kind, title, sub }) {
  return (
    <div className="tl-row">
      <div className="tl-time">{time}</div>
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

const PERKS = [
  ["Today’s plan, every morning", "Naps, wake windows, a bedtime window and a day-sleep target, built from your baby’s age and this morning’s wake-up."],
  ["Rebuild the day", "A nap ran short or long? Enter when it ended and the rest of the day is recalculated."],
  ["A heads-up before things change", "When the next nap transition is likely, plus age-specific notes and a tip for your biggest struggle."],
  ["Save it or share it", "Save the plan as an image, or send a link to your partner, a grandparent or the nanny."],
  ["Wake Window Cheat Sheet", "Our printable 0–24 month PDF. Yours to keep."],
  [`A $${COUPON_VALUE} code for any Sn00zly guide`, `Use it once on any guide or bundle — it is worth more than the planner costs.`],
];

const FAQ = [
  [
    "Why isn’t it free?",
    "Free tools usually pay for themselves with your email address. We’d rather charge a small, honest price once: you pay, and the planner, the cheat sheet and your code are there straight away.",
  ],
  [
    "Is it really a one-time payment?",
    `Yes. You pay $${PLANNER_PRICE} once. No subscription, nothing renews, nothing to cancel. Use the planner every day until your baby turns 2.`,
  ],
  [
    "Which ages does it cover?",
    "Birth to 24 months. For the first weeks the plan follows a feeding rhythm instead of a fixed bedtime — that is deliberate, because newborn sleep doesn’t run on a clock yet.",
  ],
  [
    "Can my partner use it too?",
    "Yes. Sign in with your email on any phone or computer and we send a sign-in link — no password to remember.",
  ],
  [
    `How does the $${COUPON_VALUE} code work?`,
    `It is in your planner and in your welcome email. It works once on anything at sn00zly.com — a $49 bundle becomes $${49 - COUPON_VALUE}. The shop links in the planner apply it for you.`,
  ],
  [
    "Is this medical advice?",
    "No. The planner is general educational guidance built from our pediatrician-reviewed guides. It is a flexible starting point — follow your baby’s cues, and talk to your pediatrician about any concern.",
  ],
];

export default function SalesPage({ signedIn, checkoutNote }) {
  return (
    <PageShell>
      <TopBar signedIn={signedIn} />
      <header className="app-head">
        <Brandmark />
        <div className="eyebrow">Sn00zly Daily Sleep Planner</div>
        <h1>Your baby&apos;s sleep plan for today, in ten seconds</h1>
        <p className="lede">
          Enter this morning&apos;s wake-up. Get today&apos;s naps, wake windows and bedtime — and a
          rebuilt plan when a nap doesn&apos;t go to plan.
        </p>
        <div className="trustline">
          <span className="chip-trust">Built from pediatrician-reviewed guides</span>
          <span className="chip-trust">0–24 months</span>
          <span className="chip-trust">One-time payment</span>
        </div>
      </header>

      {checkoutNote ? <div className="notice">{checkoutNote}</div> : null}

      <div className="hero-cta">
        <BuyButton placement="hero" />
        <p className="no-signup">One-time ${PLANNER_PRICE} · no subscription · includes the Wake Window Cheat Sheet and a ${COUPON_VALUE} guide code</p>
      </div>

      <section className="card step-card">
        <div className="card-label">How it works</div>
        <ol className="steps">
          <li>
            <strong>Tell us about your baby once.</strong>
            <span>First name and birthday. The planner remembers them.</span>
          </li>
          <li>
            <strong>Each morning, enter the wake-up time.</strong>
            <span>Today&apos;s plan appears right away.</span>
          </li>
        </ol>
        <SampleDay />
      </section>

      <section className="card step-card">
        <div className="card-label">When the day goes sideways</div>
        <ol className="steps" start={3}>
          <li>
            <strong>Nap ran short? Rebuild the day.</strong>
            <span>Tell the planner when the nap really ended.</span>
          </li>
        </ol>
        <RebuildExample />
      </section>

      <section className="card">
        <div className="card-label">Everything you get</div>
        <ul className="perks">
          {PERKS.map(([t, d]) => (
            <li key={t}>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="pricing" className="upsell price-card reveal" style={{ marginTop: 16 }}>
        <span className="tag">Sn00zly Daily Sleep Planner</span>
        <div className="price">
          <span className="p">${PLANNER_PRICE}</span>
          <span className="was" style={{ textDecoration: "none" }}>one-time · no subscription</span>
        </div>
        <p>Use it every day until your baby turns 2. Includes the Wake Window Cheat Sheet and a ${COUPON_VALUE} code for any Sn00zly guide.</p>
        <BuyButton placement="pricing" />
        <p className="fine-print">
          Secure checkout by Stripe. One payment of ${PLANNER_PRICE} — no subscription, nothing renews.
          Your planner opens the moment you pay.
        </p>
      </section>

      <section className="card faq" style={{ marginTop: 16 }}>
        <div className="card-label">Questions</div>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <p className="disclaimer">
        Sn00zly plans are general educational guidance reviewed against AAP safe-sleep principles. They are a
        flexible starting point based on age and morning wake time — not medical advice, and not a substitute for
        your pediatrician.
      </p>
    </PageShell>
  );
}

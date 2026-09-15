import { redirect } from "next/navigation";
import ScheduleGenerator from "@/components/ScheduleGenerator";
import { Brandmark } from "@/components/BrandHeader";
import { PageShell } from "@/components/TrustCards";
import MemberPerks from "@/components/planner/MemberPerks";
import WelcomeBanner from "@/components/planner/WelcomeBanner";
import { BASE_PATH } from "@/lib/base-path";
import { getMember } from "@/lib/membership";

export const metadata = {
  title: "My Daily Sleep Planner — Sn00zly",
  robots: { index: false, follow: false },
};

function formatDate(unix) {
  if (!unix) return null;
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const ERRORS = {
  portal: "We couldn't open subscription settings just now. Please try again in a minute.",
  cheatsheet: "The cheat sheet link isn't available right now — it is also in your welcome email.",
};

export default async function PlannerPage({ searchParams }) {
  const member = await getMember();
  if (!member) redirect("/login");

  const sp = await searchParams;
  const welcome = sp?.welcome === "1";
  const eventId = typeof sp?.eid === "string" && sp.eid.startsWith("cs_") ? sp.eid : null;
  const error = typeof sp?.error === "string" ? ERRORS[sp.error] : null;
  const endDate = formatDate(member.periodEnd);

  return (
    <PageShell>
      <div className="member-bar">
        <span className="member-email">{member.email}</span>
        <div className="member-actions">
          <form action={`${BASE_PATH}/api/portal`} method="post">
            <button type="submit" className="link-btn">Manage subscription</button>
          </form>
          <form action={`${BASE_PATH}/api/auth/logout`} method="post">
            <button type="submit" className="link-btn">Sign out</button>
          </form>
        </div>
      </div>

      <header className="app-head">
        <Brandmark />
        <div className="eyebrow">Daily Sleep Planner</div>
        <h1>Good morning. When did your baby wake up?</h1>
      </header>

      {welcome ? <WelcomeBanner eventId={eventId} /> : null}
      {error ? <div className="notice">{error}</div> : null}
      {member.status === "past_due" ? (
        <div className="notice">
          Your last payment didn&apos;t go through. Update your card under &ldquo;Manage subscription&rdquo; to keep
          the planner open.
        </div>
      ) : null}
      {member.cancelAtPeriodEnd && endDate ? (
        <div className="notice">
          Your subscription is cancelled. The planner stays open until {endDate}.
        </div>
      ) : null}

      <ScheduleGenerator mode="member" couponCode={member.couponCode} />

      <MemberPerks couponCode={member.couponCode} />
    </PageShell>
  );
}

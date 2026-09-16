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

const ERRORS = {
  cheatsheet: "The cheat sheet link isn't available right now — it is also in your welcome email.",
};

export default async function PlannerPage({ searchParams }) {
  const member = await getMember();
  if (!member) redirect("/login");

  const sp = await searchParams;
  const welcome = sp?.welcome === "1";
  const eventId = typeof sp?.eid === "string" && sp.eid.startsWith("cs_") ? sp.eid : null;
  const error = typeof sp?.error === "string" ? ERRORS[sp.error] : null;

  return (
    <PageShell>
      <div className="member-bar">
        <span className="member-email">{member.email}</span>
        <div className="member-actions">
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

      <ScheduleGenerator mode="member" couponCode={member.couponCode} />

      <MemberPerks couponCode={member.couponCode} />
    </PageShell>
  );
}

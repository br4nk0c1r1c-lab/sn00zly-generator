import { Brandmark } from "@/components/BrandHeader";
import LoginForm from "@/components/planner/LoginForm";
import { BASE_PATH } from "@/lib/base-path";

export const metadata = {
  title: "Sign in — Sn00zly Daily Sleep Planner",
  robots: { index: false, follow: false },
};

const ERRORS = {
  expired: "That sign-in link has expired or was already replaced. Enter your email for a fresh one.",
  inactive: "We couldn't find an active planner subscription for that link.",
  checkout: "We couldn't sign you in automatically. If you just paid, enter the email you used at checkout and we'll send a sign-in link.",
  server: "Something went wrong on our side. Please try again.",
};

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const error = typeof sp?.error === "string" ? ERRORS[sp.error] : null;

  return (
    <div className="wrap">
      <header className="app-head">
        <Brandmark />
        <div className="eyebrow">Daily Sleep Planner</div>
        <h1>Sign in</h1>
        <p className="lede">Enter the email you subscribed with and we&apos;ll send you a sign-in link.</p>
      </header>
      {error ? <div className="notice">{error}</div> : null}
      <LoginForm />
      <p className="no-signup" style={{ marginTop: 20 }}>
        Not a member yet? <a href={`${BASE_PATH}/`}>See the Daily Sleep Planner</a>
      </p>
    </div>
  );
}

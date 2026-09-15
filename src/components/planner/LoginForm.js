"use client";

import { useState } from "react";
import { BASE_PATH } from "@/lib/base-path";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`${BASE_PATH}/api/auth/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      setStatus("sent");
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="card">
        <div className="card-label">Check your inbox</div>
        <p style={{ fontSize: "14px", color: "var(--ink-soft)" }}>
          If {email} has an active planner subscription, a sign-in link is on its way. It works for 30 minutes.
          Nothing there after a couple of minutes? Check spam, or try the email you used at checkout.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="you@email.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" className="btn" style={{ marginTop: 14 }} disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}

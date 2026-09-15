import { signToken, verifyToken } from "@/lib/signing";

// The session cookie only says "this browser belongs to Stripe customer X".
// Whether X may use the planner is checked against Stripe on every page load
// (see membership.js), so a cancelled subscription locks the planner even if
// the cookie is still valid.

export const SESSION_COOKIE = "sn_session";
const SESSION_DAYS = 60;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export function createSessionValue(customerId) {
  return signToken("session", { cid: customerId }, SESSION_MAX_AGE);
}

export function readSessionValue(value) {
  const payload = verifyToken("session", value);
  return payload && typeof payload.cid === "string" ? payload.cid : null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

// Login links: short-lived, single purpose.
const LOGIN_TTL_SECONDS = 30 * 60;

export function createLoginToken(customerId) {
  return signToken("login", { cid: customerId }, LOGIN_TTL_SECONDS);
}

export function readLoginToken(token) {
  const payload = verifyToken("login", token);
  return payload && typeof payload.cid === "string" ? payload.cid : null;
}

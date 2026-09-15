import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC signing for the few things that must not be forgeable from the
// browser: the session cookie, login links and shared schedule links.
// AUTH_SECRET must be a long random string (see SETUP_PLANNER.md).

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters");
  }
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

export function hmac(purpose, data) {
  return createHmac("sha256", secret()).update(`${purpose}:${data}`).digest("base64url");
}

function safeEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
}

export function verifyHmac(purpose, data, signature) {
  if (typeof signature !== "string" || !signature) return false;
  try {
    return safeEqual(hmac(purpose, data), signature);
  } catch {
    return false;
  }
}

/** Signed, expiring token carrying a small JSON payload. */
export function signToken(purpose, payload, ttlSeconds) {
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${body}.${hmac(purpose, body)}`;
}

export function verifyToken(purpose, token) {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !verifyHmac(purpose, body, sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

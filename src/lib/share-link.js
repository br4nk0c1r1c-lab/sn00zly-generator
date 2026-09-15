import { hmac, verifyHmac } from "@/lib/signing";
import { buildShareQuery, parseShareSearchParams } from "@/lib/share-params";

// Shared schedules are free to view, so the link is signed: otherwise anyone
// could edit the birth date and wake-up in the URL and use the planner for
// free. The signature covers exactly the fields the schedule is built from.

const PURPOSE = "share";

export function signedShareQuery(fields) {
  const query = buildShareQuery(fields);
  if (!query) return "";
  return `${query}&k=${hmac(PURPOSE, query)}`;
}

/** Parsed share fields if the signature matches, otherwise null. */
export function verifiedShare(searchParams) {
  const fields = parseShareSearchParams(searchParams);
  if (!fields.dob || !fields.wake) return null;
  const k = typeof searchParams?.get === "function" ? searchParams.get("k") : searchParams?.k;
  const sig = Array.isArray(k) ? k[0] : k;
  if (!verifyHmac(PURPOSE, buildShareQuery(fields), sig)) return null;
  return fields;
}

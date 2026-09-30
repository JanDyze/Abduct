import "server-only";
import { headers } from "next/headers";

// The address people reach Abduct at, for links that leave and come back (Google
// sign-in). SITE_URL pins it (e.g. https://abduct.example.com); without it, the address the request
// came in on is used, as a proxy reports it. Behind some hosts the raw request looks like
// localhost:3000, which is why production should set SITE_URL.
export async function siteOrigin() {
  const pinned = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (pinned) return pinned;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}

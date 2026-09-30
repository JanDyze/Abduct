import "server-only";
import { notFound } from "next/navigation";
import { requireUser, type SessionUser } from "@/lib/auth";

// Who may open /admin: the emails in ADMIN_EMAILS (comma-separated). No one when it's unset.
export function isAdmin(user: Pick<SessionUser, "email"> | null) {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
}

// For admin pages: anyone else gets a plain 404, so the page doesn't show it exists.
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();
  return user;
}

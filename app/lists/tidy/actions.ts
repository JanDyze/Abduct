"use server";

import { requireUser } from "@/lib/auth";
import { applyTidy, proposeTidy, restoreSnapshot } from "@/lib/lists/tidy";

// Tidy with AI (lib/lists/tidy.ts): ask Claude for a plan, apply it, or undo the last one.

export async function proposeTidyAction(instructions: string) {
  const user = await requireUser();
  return proposeTidy(user.id, typeof instructions === "string" ? instructions : "");
}

export async function applyTidyAction(plan: unknown) {
  const user = await requireUser();
  return applyTidy(user.id, plan);
}

export async function undoTidyAction(snapshot: unknown) {
  const user = await requireUser();
  return restoreSnapshot(user.id, snapshot);
}

// The name shown with someone's public lists and comments until they choose one: the first name
// Google gave, else the part of their email before the @, else "Someone". Guests are "Guest".
export function defaultDisplayName(user: { name: string | null; email: string | null; guest: boolean }) {
  if (user.guest) return "Guest";
  const first = user.name?.trim().split(/\s+/)[0];
  if (first) return first.slice(0, 30);
  const local = user.email?.split("@")[0]?.trim();
  return local ? local.slice(0, 30) : "Someone";
}

export const MAX_DISPLAY_NAME = 30;

// A chosen display name, tidied: trimmed, inner spaces collapsed. Null if there's nothing left or
// it's too long.
export function cleanDisplayName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  return name && name.length <= MAX_DISPLAY_NAME ? name : null;
}

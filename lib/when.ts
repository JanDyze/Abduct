// "Today, 9:14 PM", "Yesterday, 8:02 AM", "Sep 21, 7:30 PM", "Mar 3, 2025", in the given zone.
export function when(at: Date, timeZone: string, now = new Date()) {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone });
  const time = at.toLocaleTimeString("en", { timeZone, hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now.getTime() - 864e5);
  if (day(at) === day(now)) return `Today, ${time}`;
  if (day(at) === day(yesterday)) return `Yesterday, ${time}`;
  const sameYear = at.toLocaleDateString("en", { timeZone, year: "numeric" }) === now.toLocaleDateString("en", { timeZone, year: "numeric" });
  const date = at.toLocaleDateString("en", { timeZone, month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  return sameYear ? `${date}, ${time}` : date;
}

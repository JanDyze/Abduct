import { describe, expect, it } from "vitest";
import { when } from "./when";

const now = new Date("2026-09-30T12:00:00Z");

describe("when", () => {
  it("says today and yesterday in the viewer's zone", () => {
    expect(when(new Date("2026-09-30T13:14:00Z"), "Asia/Manila", now)).toBe("Today, 9:14 PM");
    expect(when(new Date("2026-09-29T00:02:00Z"), "Asia/Manila", now)).toBe("Yesterday, 8:02 AM");
  });

  it("gives the date for older comments, with the year once it's another year", () => {
    expect(when(new Date("2026-09-21T11:30:00Z"), "Asia/Manila", now)).toBe("Sep 21, 7:30 PM");
    expect(when(new Date("2025-03-03T02:00:00Z"), "Asia/Manila", now)).toBe("Mar 3, 2025");
  });

  it("follows the zone across midnight", () => {
    // 20:00 UTC on the 29th is already 4 AM on the 30th in Manila
    expect(when(new Date("2026-09-30T10:00:00Z"), "UTC", now)).toBe("Today, 10:00 AM");
    expect(when(new Date("2026-09-29T20:00:00Z"), "Asia/Manila", now)).toBe("Today, 4:00 AM");
  });
});

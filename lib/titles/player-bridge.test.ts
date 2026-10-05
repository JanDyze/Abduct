import { describe, expect, it } from "vitest";
import { formatClock, readPlayerMessage, skipTo } from "./player-bridge";

describe("readPlayerMessage", () => {
  it("reads the bridge's state", () => {
    expect(readPlayerMessage({ abduct: 1, type: "state", playing: true, time: 61.5, duration: 8880, muted: false })).toEqual({
      playing: true,
      buffering: false,
      ended: false,
      time: 61.5,
      duration: 8880,
      muted: false,
    });
  });

  it("ignores anything else", () => {
    expect(readPlayerMessage(null)).toBeNull();
    expect(readPlayerMessage("play")).toBeNull();
    expect(readPlayerMessage({ type: "state", playing: true })).toBeNull();
    expect(readPlayerMessage({ abduct: 1, type: "hello" })).toBeNull();
  });

  it("treats odd numbers as unknown", () => {
    const s = readPlayerMessage({ abduct: 1, type: "ready", time: Number.NaN, duration: -3 });
    expect(s?.time).toBe(0);
    expect(s?.duration).toBe(0);
  });
});

describe("skipTo", () => {
  it("stays inside the movie", () => {
    expect(skipTo(5, 100, -10)).toBe(0);
    expect(skipTo(50, 100, 10)).toBe(60);
    expect(skipTo(95, 100, 10)).toBe(99);
    expect(skipTo(30, 0, 10)).toBe(40);
  });
});

describe("formatClock", () => {
  it("writes times like a player", () => {
    expect(formatClock(7)).toBe("0:07");
    expect(formatClock(754)).toBe("12:34");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });
});

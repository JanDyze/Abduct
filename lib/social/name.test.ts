import { describe, expect, it } from "vitest";
import { cleanDisplayName, defaultDisplayName } from "./name";

describe("display names", () => {
  it("starts from the first name Google gave, then the email", () => {
    expect(defaultDisplayName({ name: "Jan de la Cruz", email: "jan@example.com", guest: false })).toBe("Jan");
    expect(defaultDisplayName({ name: null, email: "movie.fan@example.com", guest: false })).toBe("movie.fan");
    expect(defaultDisplayName({ name: " ", email: null, guest: false })).toBe("Someone");
  });

  it("calls guests Guest, whatever else is known", () => {
    expect(defaultDisplayName({ name: "Jan", email: null, guest: true })).toBe("Guest");
  });

  it("tidies a chosen name and refuses empty or long ones", () => {
    expect(cleanDisplayName("  Jan   D.  ")).toBe("Jan D.");
    expect(cleanDisplayName("   ")).toBeNull();
    expect(cleanDisplayName("x".repeat(31))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { serviceKey, serviceLink } from "./services";

describe("services", () => {
  it("treats a service's plans and spellings as one", () => {
    expect(serviceKey("Netflix")).toBe("netflix");
    expect(serviceKey("Netflix Standard with Ads")).toBe("netflix");
    expect(serviceKey("Amazon Prime Video")).toBe("primevideo");
    expect(serviceKey("Amazon Prime Video with Ads")).toBe("primevideo");
    expect(serviceKey("Disney Plus")).toBe("disneyplus");
    expect(serviceKey("Disney+")).toBe("disneyplus");
    expect(serviceKey("HBO Max")).toBe("max");
    expect(serviceKey("Max")).toBe("max");
    expect(serviceKey("Crunchyroll")).toBe("crunchyroll");
    expect(serviceKey("Tubi TV")).toBe("tubi");
    expect(serviceKey("Some Local Service")).toBe("somelocalservice");
  });

  it("links into a service's search, or falls back", () => {
    expect(serviceLink("Netflix", "Spirited Away", "https://x")).toBe("https://www.netflix.com/search?q=Spirited%20Away");
    expect(serviceLink("Tubi TV", "Alien", "https://x")).toBe("https://tubitv.com/search/Alien");
    expect(serviceLink("Some Local Service", "Alien", "https://x")).toBe("https://x");
  });
});

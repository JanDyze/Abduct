import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the home Wi-Fi (e.g. 192.168.1.10:3000) load dev scripts. Without it Next.js
  // blocks them for non-localhost origins and taps stop working. Dev server only.
  allowedDevOrigins: ["192.168.*.*"],
  // What's new reads the changelog at runtime (lib/releases.ts), so it ships with every route.
  outputFileTracingIncludes: {
    "/*": ["./CHANGELOG.md"],
  },
  // The service worker must always be fetched fresh so an update reaches installed apps.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;

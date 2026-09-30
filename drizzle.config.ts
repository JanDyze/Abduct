import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations run over the session pooler; the app uses the transaction pooler. Both share a
  // host, so the session URL defaults to DATABASE_URL on port 5432 instead of 6543.
  dbCredentials: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!.replace(":6543/", ":5432/"),
  },
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});

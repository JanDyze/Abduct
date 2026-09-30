import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Reuse the clients across hot reloads in dev so connections don't pile up.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql; pgTxClient?: postgres.Sql };

// prepare: false is required by Supabase's transaction pooler. So is max_pipeline: 0: once every
// connection is busy, postgres.js pipelines further queries onto them, and the pooler hands those
// back the wrong rows or none.
// (max_pipeline is read by postgres.js but missing from its types, hence the cast.)
const client = globalForDb.pgClient ?? postgres(url, { prepare: false, max_pipeline: 0 } as Parameters<typeof postgres>[1]);
// max_pipeline: 0 breaks sql.begin() (postgres.js never learns the transaction's connection), so
// transactions get their own small client with the default.
const txClient = globalForDb.pgTxClient ?? postgres(url, { prepare: false, max: 3 });
if (process.env.NODE_ENV !== "production") Object.assign(globalForDb, { pgClient: client, pgTxClient: txClient });

const txDb = drizzle(txClient, { schema });
export const db = Object.assign(drizzle(client, { schema }), { transaction: txDb.transaction.bind(txDb) });

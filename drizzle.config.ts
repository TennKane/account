import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...(process.env.TURSO_DATABASE_URL
    ? {
        driver: "turso",
        dbCredentials: {
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
    : {
        dbCredentials: {
          url: "file:local.db",
        },
      }),
} satisfies Config;

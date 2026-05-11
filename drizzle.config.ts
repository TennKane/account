import type { Config } from "drizzle-kit";

const isTurso = !!process.env.TURSO_DATABASE_URL;

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: isTurso ? process.env.TURSO_DATABASE_URL! : "file:local.db",
    authToken: isTurso ? process.env.TURSO_AUTH_TOKEN : undefined,
  },
} satisfies Config;

import type { Config } from "drizzle-kit";

const isTurso = !!process.env.TURSO_DATABASE_URL;

const config: Config = {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: isTurso ? process.env.TURSO_DATABASE_URL! : "file:local.db",
  },
};

export default config;

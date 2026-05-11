import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

let client: ReturnType<typeof createClient>;

if (tursoUrl) {
  client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });
} else {
  // 本地开发用 SQLite 文件
  client = createClient({
    url: "file:local.db",
  });
}

export const db = drizzle(client, { schema });

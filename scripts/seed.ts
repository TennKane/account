import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { users, accounts, categories } from "../src/db/schema";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  console.error("TURSO_DATABASE_URL is required");
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

const db = drizzle(client);

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || "我";

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/seed.ts <email> <password> [name]");
    process.exit(1);
  }

  console.log(`Creating user: ${email} (${name})...`);

  const hashedPassword = await hash(password, 12);
  const userId = randomUUID();

  await db.insert(users).values({
    id: userId,
    name,
    email,
    hashedPassword,
  });

  // Default accounts
  const accountIds = {
    cash: randomUUID(),
    bank: randomUUID(),
    wallet: randomUUID(),
  };

  await db.insert(accounts).values([
    { id: accountIds.cash, name: "现金", type: "cash", balance: 0, userId },
    { id: accountIds.bank, name: "银行卡", type: "bank", balance: 0, userId },
    { id: accountIds.wallet, name: "微信钱包", type: "wallet", balance: 0, userId },
  ]);

  // Expense categories
  const expenseCats = [
    { name: "餐饮", icon: "🍽️", color: "#ef4444" },
    { name: "交通", icon: "🚗", color: "#f97316" },
    { name: "购物", icon: "🛒", color: "#eab308" },
    { name: "住房", icon: "🏠", color: "#22c55e" },
    { name: "娱乐", icon: "🎮", color: "#3b82f6" },
    { name: "医疗", icon: "🏥", color: "#ec4899" },
    { name: "教育", icon: "📚", color: "#8b5cf6" },
    { name: "其他支出", icon: "📦", color: "#6b7280" },
  ];

  for (const cat of expenseCats) {
    await db.insert(categories).values({
      id: randomUUID(), name: cat.name, type: "expense", icon: cat.icon, color: cat.color, userId,
    });
  }

  // Income categories
  const incomeCats = [
    { name: "工资", icon: "💰", color: "#22c55e" },
    { name: "兼职", icon: "💼", color: "#3b82f6" },
    { name: "红包", icon: "🧧", color: "#ef4444" },
    { name: "其他收入", icon: "📦", color: "#6b7280" },
  ];

  for (const cat of incomeCats) {
    await db.insert(categories).values({
      id: randomUUID(), name: cat.name, type: "income", icon: cat.icon, color: cat.color, userId,
    });
  }

  console.log("Done! You can now log in.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

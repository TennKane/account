import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "请填写所有字段" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existingUser) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);
    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      name,
      email,
      hashedPassword,
    });

    // 为新用户创建默认分类和账户
    await seedUserData(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}

async function seedUserData(userId: string) {
  const { accounts, categories } = await import("@/db/schema");

  // 默认账户
  await db.insert(accounts).values({
    id: randomUUID(),
    name: "现金",
    type: "cash",
    balance: 0,
    userId,
  });

  await db.insert(accounts).values({
    id: randomUUID(),
    name: "银行卡",
    type: "bank",
    balance: 0,
    userId,
  });

  await db.insert(accounts).values({
    id: randomUUID(),
    name: "微信钱包",
    type: "wallet",
    balance: 0,
    userId,
  });

  // 默认支出分类
  const expenseCategories = [
    { name: "餐饮", icon: "🍽️", color: "#ef4444" },
    { name: "交通", icon: "🚗", color: "#f97316" },
    { name: "购物", icon: "🛒", color: "#eab308" },
    { name: "住房", icon: "🏠", color: "#22c55e" },
    { name: "娱乐", icon: "🎮", color: "#3b82f6" },
    { name: "医疗", icon: "🏥", color: "#ec4899" },
    { name: "教育", icon: "📚", color: "#8b5cf6" },
    { name: "其他支出", icon: "📦", color: "#6b7280" },
  ];

  for (const cat of expenseCategories) {
    await db.insert(categories).values({
      id: randomUUID(),
      name: cat.name,
      type: "expense",
      icon: cat.icon,
      color: cat.color,
      userId,
    });
  }

  // 默认收入分类
  const incomeCategories = [
    { name: "工资", icon: "💰", color: "#22c55e" },
    { name: "兼职", icon: "💼", color: "#3b82f6" },
    { name: "红包", icon: "🧧", color: "#ef4444" },
    { name: "其他收入", icon: "📦", color: "#6b7280" },
  ];

  for (const cat of incomeCategories) {
    await db.insert(categories).values({
      id: randomUUID(),
      name: cat.name,
      type: "income",
      icon: cat.icon,
      color: cat.color,
      userId,
    });
  }
}

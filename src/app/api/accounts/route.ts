import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id!))
    .orderBy(sql`${accounts.isDefault} DESC`)
    .all();

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, type, balance } = await req.json();
    if (!name) return NextResponse.json({ error: "请输入账户名称" }, { status: 400 });

    await db.insert(accounts).values({
      id: randomUUID(),
      name,
      type: type || "cash",
      balance: Number(balance) || 0,
      userId: session.user.id!,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, name, type, isDefault, isDefaultTx, isDefaultRepay, isDefaultReceive } = await req.json();
    const userId = session.user.id!;

    // 验证账户归属
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();
    if (!account || account.userId !== userId) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;

    // 通用默认（排序用）
    if (isDefault === true) {
      await db.update(accounts).set({ isDefault: 0 }).where(eq(accounts.userId, userId));
      updates.isDefault = 1;
    } else if (isDefault === false) {
      updates.isDefault = 0;
    }

    // 账单默认（各自独立，互不干扰）
    if (isDefaultTx === true) {
      await db.update(accounts).set({ isDefaultTx: 0 }).where(eq(accounts.userId, userId));
      updates.isDefaultTx = 1;
    } else if (isDefaultTx === false) {
      updates.isDefaultTx = 0;
    }

    if (isDefaultRepay === true) {
      await db.update(accounts).set({ isDefaultRepay: 0 }).where(eq(accounts.userId, userId));
      updates.isDefaultRepay = 1;
    } else if (isDefaultRepay === false) {
      updates.isDefaultRepay = 0;
    }

    if (isDefaultReceive === true) {
      await db.update(accounts).set({ isDefaultReceive: 0 }).where(eq(accounts.userId, userId));
      updates.isDefaultReceive = 1;
    } else if (isDefaultReceive === false) {
      updates.isDefaultReceive = 0;
    }

    await db.update(accounts).set(updates).where(eq(accounts.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(accounts).where(eq(accounts.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

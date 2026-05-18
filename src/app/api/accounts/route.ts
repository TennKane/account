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
    const { id, name, type, isDefault } = await req.json();
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

    // 设为默认：清除其他账户的默认标记
    if (isDefault === true) {
      await db
        .update(accounts)
        .set({ isDefault: 0 })
        .where(eq(accounts.userId, userId));
      updates.isDefault = 1;
    } else if (isDefault === false) {
      updates.isDefault = 0;
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

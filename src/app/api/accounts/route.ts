import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id!))
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
    const { id, name, type } = await req.json();
    await db.update(accounts).set({ name, type }).where(eq(accounts.id, id));
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

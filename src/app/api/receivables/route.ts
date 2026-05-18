import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { receivables } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(receivables)
    .where(eq(receivables.userId, session.user.id!))
    .orderBy(sql`${receivables.date} DESC`)
    .all();

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { amount, person, description, date } = await req.json();
    if (!amount || !person) {
      return NextResponse.json({ error: "请填写金额和欠款人" }, { status: 400 });
    }

    const numAmount = Number(amount);
    await db.insert(receivables).values({
      id: randomUUID(),
      amount: numAmount,
      remainingAmount: numAmount,
      person,
      description: description || "",
      date: date ? new Date(date) : new Date(),
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
    const { id, amount, person, description, date } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const userId = session.user.id!;
    const bill = await db.select().from(receivables).where(eq(receivables.id, id)).get();
    if (!bill || bill.userId !== userId) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    const newAmount = Number(amount);
    const updates: Record<string, unknown> = { person, description: description || "" };
    if (date) updates.date = new Date(date);

    // 如果未还过款，金额变化时同步更新剩余金额
    if (bill.remainingAmount === bill.amount) {
      updates.amount = newAmount;
      updates.remainingAmount = newAmount;
    } else {
      updates.amount = newAmount;
    }

    await db.update(receivables).set(updates).where(eq(receivables.id, id));
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

    const bill = await db.select().from(receivables).where(eq(receivables.id, id)).get();
    if (!bill || bill.userId !== session.user.id!) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(receivables).where(eq(receivables.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

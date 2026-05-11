import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creditBills, categories } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = session.user.id!;
    const filters: any[] = [eq(creditBills.userId, userId)];

    const list = await db
      .select({
        id: creditBills.id,
        amount: creditBills.amount,
        remainingAmount: creditBills.remainingAmount,
        description: creditBills.description,
        source: creditBills.source,
        date: creditBills.date,
        categoryId: creditBills.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
      })
      .from(creditBills)
      .leftJoin(categories, eq(creditBills.categoryId, categories.id))
      .where(and(...filters))
      .orderBy(sql`${creditBills.date} DESC`)
      .all();

    return NextResponse.json(list);
  } catch (error) {
    console.error("Get credit bills error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, source, description, date, categoryId } = body;

    if (!amount || !source || !categoryId) {
      return NextResponse.json({ error: "请填写必要字段" }, { status: 400 });
    }

    await db.insert(creditBills).values({
      id: randomUUID(),
      amount: Number(amount),
      remainingAmount: Number(amount),
      source,
      description: description || "",
      date: date ? new Date(date) : new Date(),
      categoryId,
      userId: session.user.id!,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create credit bill error:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const bill = await db
      .select()
      .from(creditBills)
      .where(eq(creditBills.id, id))
      .get();

    if (!bill || bill.userId !== session.user.id!) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(creditBills).where(eq(creditBills.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete credit bill error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

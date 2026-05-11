import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creditBills, categories } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const userId = session.user.id!;
    const filters: any[] = [eq(creditBills.userId, userId)];

    const source = searchParams.get("source");
    const month = searchParams.get("month");

    if (source) filters.push(eq(creditBills.source, source));
    if (month) {
      const [year, mon] = month.split("-");
      const start = new Date(Number(year), Number(mon) - 1, 1);
      const end = new Date(Number(year), Number(mon), 1);
      filters.push(gte(creditBills.date, start));
      filters.push(lt(creditBills.date, end));
    }

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

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, amount, source, description, categoryId } = body;

    if (!id || !amount || !source || !categoryId) {
      return NextResponse.json({ error: "请填写必要字段" }, { status: 400 });
    }

    const userId = session.user.id!;

    const bill = await db
      .select()
      .from(creditBills)
      .where(eq(creditBills.id, id))
      .get();

    if (!bill || bill.userId !== userId) {
      return NextResponse.json({ error: "账单不存在" }, { status: 404 });
    }

    // 如果还没还过款，总金额变化时同步更新剩余金额
    const newAmount = Number(amount);
    const updates: Record<string, unknown> = {
      amount: newAmount,
      source,
      description: description || "",
      categoryId,
    };

    if (bill.remainingAmount === bill.amount) {
      updates.remainingAmount = newAmount;
    }

    await db.update(creditBills).set(updates).where(eq(creditBills.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update credit bill error:", error);
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

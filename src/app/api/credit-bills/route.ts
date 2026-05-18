import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creditBills, categories, accounts } from "@/db/schema";
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
    const q = searchParams.get("q");

    if (source) filters.push(eq(creditBills.source, source));
    if (q) filters.push(sql`${creditBills.description} LIKE '%' || ${q} || '%'`);
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

    const billId = randomUUID();
    const numAmount = Number(amount);

    await db.insert(creditBills).values({
      id: billId,
      amount: numAmount,
      remainingAmount: numAmount,
      source,
      description: description || "",
      date: date ? new Date(date) : new Date(),
      categoryId,
      userId: session.user.id!,
    });

    // 关联对应的 advance 账户并更新负债
    const advanceAccount = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.name, source), eq(accounts.userId, session.user.id!), eq(accounts.type, "advance")))
      .get();

    if (advanceAccount) {
      await db
        .update(creditBills)
        .set({ accountId: advanceAccount.id })
        .where(eq(creditBills.id, billId));

      await db
        .update(accounts)
        .set({ balance: advanceAccount.balance - numAmount })
        .where(eq(accounts.id, advanceAccount.id));
    }

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

    const newAmount = Number(amount);
    const updates: Record<string, unknown> = {
      source,
      description: description || "",
      categoryId,
    };

    // Handle amount change
    if (bill.remainingAmount === bill.amount) {
      updates.amount = newAmount;
      updates.remainingAmount = newAmount;
    } else {
      updates.amount = newAmount;
    }

    // Handle source change — relink to different advance account
    if (source !== bill.source) {
      // Unlink from old account
      if (bill.accountId) {
        const oldAccount = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, bill.accountId))
          .get();
        if (oldAccount) {
          await db
            .update(accounts)
            .set({ balance: oldAccount.balance + bill.remainingAmount })
            .where(eq(accounts.id, oldAccount.id));
        }
      }

      // Link to new account
      const newAccount = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.name, source), eq(accounts.userId, userId), eq(accounts.type, "advance")))
        .get();

      if (newAccount) {
        const newRemaining = bill.remainingAmount === bill.amount ? newAmount : bill.remainingAmount;
        updates.accountId = newAccount.id;
        await db
          .update(accounts)
          .set({ balance: newAccount.balance - newRemaining })
          .where(eq(accounts.id, newAccount.id));
      } else {
        updates.accountId = null;
      }
    } else if (bill.accountId && bill.remainingAmount === bill.amount && newAmount !== bill.amount) {
      // Same source, amount changed, not yet repaid — sync balance difference
      const diff = newAmount - bill.amount;
      await db
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${diff}` })
        .where(eq(accounts.id, bill.accountId));
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

    // 删除前恢复 advance 账户的负债（减去这笔债务）
    if (bill.accountId) {
      const acct = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, bill.accountId))
        .get();
      if (acct) {
        await db
          .update(accounts)
          .set({ balance: acct.balance + bill.remainingAmount })
          .where(eq(accounts.id, bill.accountId));
      }
    }

    await db.delete(creditBills).where(eq(creditBills.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete credit bill error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

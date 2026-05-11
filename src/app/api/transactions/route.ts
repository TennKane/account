import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts, categories } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const month = searchParams.get("month");
  const q = searchParams.get("q");

  const userId = session.user.id!;
  const filters: any[] = [
    eq(transactions.userId, userId),
  ];

  if (type) filters.push(eq(transactions.type, type as "income" | "expense"));
  if (accountId) filters.push(eq(transactions.accountId, accountId));
  if (categoryId) filters.push(eq(transactions.categoryId, categoryId));
  if (month) {
    const [year, mon] = month.split("-");
    const start = new Date(Number(year), Number(mon) - 1, 1);
    const end = new Date(Number(year), Number(mon), 1);
    filters.push(gte(transactions.date, start));
    filters.push(lt(transactions.date, end));
  }
  if (q) filters.push(sql`${transactions.description} LIKE '%' || ${q} || '%'`);

  const list = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      description: transactions.description,
      date: transactions.date,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(sql`${transactions.date} DESC`)
    .all();

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, type, description, date, accountId, categoryId } = body;

    if (!amount || !type || !accountId || !categoryId) {
      return NextResponse.json({ error: "请填写必要字段" }, { status: 400 });
    }

    const userId = session.user.id!;

    // 创建交易
    const txId = randomUUID();
    await db.insert(transactions).values({
      id: txId,
      amount: Number(amount),
      type,
      description: description || "",
      date: date ? new Date(date) : new Date(),
      accountId,
      categoryId,
      userId,
    });

    // 更新账户余额
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .get();

    if (account) {
      const balanceChange = type === "income" ? Number(amount) : -Number(amount);
      await db
        .update(accounts)
        .set({ balance: account.balance + balanceChange })
        .where(eq(accounts.id, accountId));
    }

    return NextResponse.json({ success: true, id: txId });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, type, amount, description, categoryId, accountId } = body;

    if (!id || !amount || !type || !accountId || !categoryId) {
      return NextResponse.json({ error: "请填写必要字段" }, { status: 400 });
    }

    const userId = session.user.id!;

    // 获取原交易
    const oldTx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .get();

    if (!oldTx || oldTx.userId !== userId) {
      return NextResponse.json({ error: "交易不存在" }, { status: 404 });
    }

    // 撤销原交易对旧账户的余额影响
    const oldAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, oldTx.accountId))
      .get();

    if (oldAccount) {
      const reverseAmount = oldTx.type === "income" ? -oldTx.amount : oldTx.amount;
      await db
        .update(accounts)
        .set({ balance: oldAccount.balance + reverseAmount })
        .where(eq(accounts.id, oldTx.accountId));
    }

    // 应用新交易对新账户的余额影响（即使账户没变也重新计算）
    const newAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .get();

    if (newAccount) {
      const balanceChange = type === "income" ? Number(amount) : -Number(amount);
      await db
        .update(accounts)
        .set({ balance: newAccount.balance + balanceChange })
        .where(eq(accounts.id, accountId));
    }

    // 更新交易记录
    await db
      .update(transactions)
      .set({
        type,
        amount: Number(amount),
        description: description || "",
        categoryId,
        accountId,
      })
      .where(eq(transactions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update transaction error:", error);
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

    // 获取交易信息以回滚余额
    const tx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .get();

    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, tx.accountId))
      .get();

    if (account) {
      // 反向调整余额
      const balanceAdjust = tx.type === "income" ? -tx.amount : tx.amount;
      await db
        .update(accounts)
        .set({ balance: account.balance + balanceAdjust })
        .where(eq(accounts.id, tx.accountId));
    }

    await db.delete(transactions).where(eq(transactions.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

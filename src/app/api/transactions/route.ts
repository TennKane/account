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
      toAccountId: transactions.toAccountId,
      categoryId: transactions.categoryId,
      accountName: accounts.name,
      toAccountName: sql`(SELECT name FROM accounts WHERE id = ${transactions.toAccountId})`,
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
    const { amount, type, description, date, accountId, categoryId, toAccountId } = body;

    if (!amount || !type || !accountId) {
      return NextResponse.json({ error: "请填写必要字段" }, { status: 400 });
    }

    const userId = session.user.id!;
    const numAmount = Number(amount);
    const isTransfer = toAccountId && toAccountId !== accountId;

    // 创建交易
    const txId = randomUUID();
    await db.insert(transactions).values({
      id: txId,
      amount: numAmount,
      type: isTransfer ? "expense" : type,
      description: description || "",
      date: date ? new Date(date) : new Date(),
      accountId,
      toAccountId: isTransfer ? toAccountId : null,
      categoryId: isTransfer ? "" : (categoryId || ""),
      userId,
    });

    // 更新账户余额
    const fromAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .get();

    if (!fromAccount) {
      return NextResponse.json({ error: "账户不存在" }, { status: 400 });
    }

    if (isTransfer) {
      // 转账：扣减 source
      await db
        .update(accounts)
        .set({ balance: fromAccount.balance - numAmount })
        .where(eq(accounts.id, accountId));
      // 转账：增加 target
      const toAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, toAccountId))
        .get();
      if (toAccount) {
        await db
          .update(accounts)
          .set({ balance: toAccount.balance + numAmount })
          .where(eq(accounts.id, toAccountId));
      }
    } else {
      // 标准收入/支出
      const balanceChange = type === "income" ? numAmount : -numAmount;
      await db
        .update(accounts)
        .set({ balance: fromAccount.balance + balanceChange })
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
    const { id, type, amount, description, categoryId, accountId, toAccountId } = body;

    if (!id || !amount || !accountId) {
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

    // 撤销原交易的余额影响
    const wasTransfer = !!oldTx.toAccountId;
    const oldFromAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, oldTx.accountId))
      .get();
    if (oldFromAccount) {
      if (wasTransfer) {
        // 原转账：加回扣款
        await db.update(accounts).set({ balance: oldFromAccount.balance + oldTx.amount }).where(eq(accounts.id, oldTx.accountId));
      } else {
        const reverse = oldTx.type === "income" ? -oldTx.amount : oldTx.amount;
        await db.update(accounts).set({ balance: oldFromAccount.balance + reverse }).where(eq(accounts.id, oldTx.accountId));
      }
    }
    if (wasTransfer && oldTx.toAccountId) {
      const oldToAccount = await db.select().from(accounts).where(eq(accounts.id, oldTx.toAccountId)).get();
      if (oldToAccount) {
        // 撤销原入账
        await db.update(accounts).set({ balance: oldToAccount.balance - oldTx.amount }).where(eq(accounts.id, oldTx.toAccountId));
      }
    }

    // 应用新交易
    const numAmount = Number(amount);
    const isTransfer = toAccountId && toAccountId !== accountId;

    const newFromAccount = await db.select().from(accounts).where(eq(accounts.id, accountId)).get();
    if (newFromAccount) {
      if (isTransfer) {
        await db.update(accounts).set({ balance: newFromAccount.balance - numAmount }).where(eq(accounts.id, accountId));
      } else {
        const change = type === "income" ? numAmount : -numAmount;
        await db.update(accounts).set({ balance: newFromAccount.balance + change }).where(eq(accounts.id, accountId));
      }
    }
    if (isTransfer) {
      const newToAccount = await db.select().from(accounts).where(eq(accounts.id, toAccountId)).get();
      if (newToAccount) {
        await db.update(accounts).set({ balance: newToAccount.balance + numAmount }).where(eq(accounts.id, toAccountId));
      }
    }

    // 更新交易记录
    const updates: Record<string, unknown> = {
      amount: numAmount,
      description: description || "",
      accountId,
      toAccountId: isTransfer ? toAccountId : null,
    };
    if (isTransfer) {
      updates.type = "expense";
      updates.categoryId = "";
    } else {
      updates.type = type;
      updates.categoryId = categoryId || "";
    }

    await db.update(transactions).set(updates).where(eq(transactions.id, id));

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

    if (tx.toAccountId) {
      // 转账：加回扣款方
      const fromAcct = await db.select().from(accounts).where(eq(accounts.id, tx.accountId)).get();
      if (fromAcct) {
        await db.update(accounts).set({ balance: fromAcct.balance + tx.amount }).where(eq(accounts.id, tx.accountId));
      }
      // 转账：扣减收款方
      const toAcct = await db.select().from(accounts).where(eq(accounts.id, tx.toAccountId)).get();
      if (toAcct) {
        await db.update(accounts).set({ balance: toAcct.balance - tx.amount }).where(eq(accounts.id, tx.toAccountId));
      }
    } else {
      const account = await db.select().from(accounts).where(eq(accounts.id, tx.accountId)).get();
      if (account) {
        const balanceAdjust = tx.type === "income" ? -tx.amount : tx.amount;
        await db.update(accounts).set({ balance: account.balance + balanceAdjust }).where(eq(accounts.id, tx.accountId));
      }
    }

    await db.delete(transactions).where(eq(transactions.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

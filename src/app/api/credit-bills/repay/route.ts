import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creditBills, transactions, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { billId, amount, accountId } = body;

    if (!billId || !amount || !accountId) {
      return NextResponse.json({ error: "请填写必要字段" }, { status: 400 });
    }

    const userId = session.user.id!;
    const repayAmount = Number(amount);

    // 获取账单
    const bill = await db
      .select()
      .from(creditBills)
      .where(eq(creditBills.id, billId))
      .get();

    if (!bill || bill.userId !== userId) {
      return NextResponse.json({ error: "账单不存在" }, { status: 404 });
    }

    if (repayAmount <= 0 || repayAmount > bill.remainingAmount) {
      return NextResponse.json({ error: "还款金额无效" }, { status: 400 });
    }

    // 获取账户
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .get();

    if (!account || account.userId !== userId) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 });
    }

    // 1. 创建还款交易记录
    const txId = randomUUID();
    await db.insert(transactions).values({
      id: txId,
      amount: repayAmount,
      type: "expense",
      description: `还款：${bill.description || bill.source}账单`,
      date: new Date(),
      accountId,
      categoryId: bill.categoryId,
      userId,
    });

    // 2. 扣减账户余额
    await db
      .update(accounts)
      .set({ balance: account.balance - repayAmount })
      .where(eq(accounts.id, accountId));

    // 3. 更新账单剩余金额
    const newRemaining = bill.remainingAmount - repayAmount;
    await db
      .update(creditBills)
      .set({ remainingAmount: newRemaining })
      .where(eq(creditBills.id, billId));

    // 4. 同步 advance 账户负债（负债减少）
    if (bill.accountId) {
      const advanceAcct = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, bill.accountId))
        .get();
      if (advanceAcct) {
        await db
          .update(accounts)
          .set({ balance: advanceAcct.balance + repayAmount })
          .where(eq(accounts.id, bill.accountId));
      }
    }

    return NextResponse.json({
      success: true,
      remainingAmount: newRemaining,
    });
  } catch (error) {
    console.error("Repay error:", error);
    return NextResponse.json({ error: "还款失败" }, { status: 500 });
  }
}

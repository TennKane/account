import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { receivables, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, amount, date, accountId } = await req.json();
    if (!id || !amount || !date || !accountId) {
      return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
    }

    const userId = session.user.id!;
    const repayAmount = Number(amount);

    const bill = await db.select().from(receivables).where(eq(receivables.id, id)).get();
    if (!bill || bill.userId !== userId) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    if (repayAmount <= 0 || repayAmount > bill.remainingAmount) {
      return NextResponse.json({ error: "还款金额无效" }, { status: 400 });
    }

    const newRemaining = bill.remainingAmount - repayAmount;
    const updates: Record<string, unknown> = {
      remainingAmount: newRemaining,
      accountId, // 记录入款账户
    };
    if (newRemaining <= 0) {
      updates.settledDate = new Date(date);
    }

    await db.update(receivables).set(updates).where(eq(receivables.id, id));

    // 入款到指定账户
    const account = await db.select().from(accounts).where(eq(accounts.id, accountId)).get();
    if (account) {
      await db
        .update(accounts)
        .set({ balance: account.balance + repayAmount })
        .where(eq(accounts.id, accountId));
    }

    return NextResponse.json({ success: true, remainingAmount: newRemaining });
  } catch (error) {
    console.error("Repay error:", error);
    return NextResponse.json({ error: "收款登记失败" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id!;
  const body = await req.json();

  // 修改名称
  if (body.name) {
    await db.update(users).set({ name: body.name }).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }

  // 修改密码
  if (body.currentPassword && body.newPassword) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const isValid = await compare(body.currentPassword, user.hashedPassword);
    if (!isValid) return NextResponse.json({ error: "当前密码错误" }, { status: 400 });

    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少需要 6 位" }, { status: 400 });
    }

    const hashedPassword = await hash(body.newPassword, 12);
    await db.update(users).set({ hashedPassword }).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "参数错误" }, { status: 400 });
}

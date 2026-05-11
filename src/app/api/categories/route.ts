import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, session.user.id!))
    .all();

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, type, icon, color } = await req.json();
    if (!name || !type) {
      return NextResponse.json({ error: "请输入分类名称和类型" }, { status: 400 });
    }

    // 检查是否已存在同名分类
    const existing = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, session.user.id!),
          eq(categories.name, name),
          eq(categories.type, type)
        )
      )
      .get();

    if (existing) {
      return NextResponse.json({ error: "该分类已存在" }, { status: 400 });
    }

    await db.insert(categories).values({
      id: randomUUID(),
      name,
      type,
      icon: icon || "📦",
      color: color || "#6b7280",
      userId: session.user.id!,
    });

    return NextResponse.json({ success: true });
  } catch {
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

    await db.delete(categories).where(eq(categories.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

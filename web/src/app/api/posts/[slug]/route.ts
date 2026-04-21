import { NextResponse } from "next/server";
import { deletePost } from "@/lib/posts-store";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function DELETE(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const deleted = deletePost(slug);

  if (!deleted) {
    return NextResponse.json({ error: "Post not found or is not removable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, slug });
}

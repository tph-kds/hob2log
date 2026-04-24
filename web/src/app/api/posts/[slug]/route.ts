import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-session";
import { deletePost, updatePost } from "@/lib/posts-store";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function DELETE(_: Request, context: RouteContext) {
  if (!(await isAdminSessionAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const deleted = await deletePost(slug);

  if (!deleted) {
    return NextResponse.json({ error: "Post not found or is not removable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, slug });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isAdminSessionAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await context.params;
    const body = await request.json();

    const post = await updatePost(slug, {
      slug: body.slug ?? "",
      title: body.title ?? "",
      summary: body.summary ?? "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      content: body.content ?? "",
      coverImage: body.coverImage ?? "",
      media: Array.isArray(body.media) ? body.media : [],
      published: Boolean(body.published),
    });

    return NextResponse.json({ item: post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

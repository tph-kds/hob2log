import { NextResponse } from "next/server";
import { createPost, listPosts } from "@/lib/posts-store";

export async function GET() {
  const postPreviews = listPosts().map((post) => ({
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    createdAt: post.createdAt,
    tags: post.tags,
    coverImage: post.coverImage,
  }));

  return NextResponse.json({ items: postPreviews });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const post = createPost({
      slug: body.slug ?? "",
      title: body.title ?? "",
      summary: body.summary ?? "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      content: body.content ?? "",
    });

    return NextResponse.json({ item: post }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
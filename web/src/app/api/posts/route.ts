import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-session";
import { createPost, listPosts } from "@/lib/posts-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wantsDrafts = url.searchParams.get("includeDrafts") === "true";

  if (wantsDrafts && !(await isAdminSessionAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postPreviews = (await listPosts({ includeDrafts: wantsDrafts })).map((post) =>
    wantsDrafts
      ? {
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          createdAt: post.createdAt,
          tags: post.tags,
          coverImage: post.coverImage,
          media: post.media ?? [],
          published: post.published ?? true,
          content: post.content,
        }
      : {
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          createdAt: post.createdAt,
          tags: post.tags,
          coverImage: post.coverImage,
          published: post.published ?? true,
        },
  );

  return NextResponse.json({ items: postPreviews });
}

export async function POST(request: Request) {
  if (!(await isAdminSessionAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const post = await createPost({
      slug: body.slug ?? "",
      title: body.title ?? "",
      summary: body.summary ?? "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      content: body.content ?? "",
      coverImage: body.coverImage ?? "",
      media: Array.isArray(body.media) ? body.media : [],
      published: Boolean(body.published),
    });

    return NextResponse.json({ item: post }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
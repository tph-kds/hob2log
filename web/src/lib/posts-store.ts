import { posts as seedPosts } from "@/content/posts";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Post, PostMedia } from "@/types/content";

interface CreatePostInput {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  content: string;
  coverImage?: string;
  media?: PostMedia[];
  published?: boolean;
}

interface PostRow {
  slug: string;
  title: string;
  summary: string;
  created_at: string;
  tags: string[] | null;
  cover_image: string | null;
  media: PostMedia[] | null;
  published: boolean | null;
  content?: string | null;
}

const runtimePosts: Post[] = [];

function toSafeAssetUrl(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sortByDateDesc(items: Post[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function listFallbackPosts(options?: { includeDrafts?: boolean }) {
  const includeDrafts = options?.includeDrafts ?? false;
  const merged = sortByDateDesc([...runtimePosts, ...seedPosts]);

  if (includeDrafts) {
    return merged;
  }

  return merged.filter((post) => post.published !== false);
}

function mapPostRow(row: PostRow): Post {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    createdAt: row.created_at,
    tags: Array.isArray(row.tags) ? row.tags : [],
    coverImage: toSafeAssetUrl(row.cover_image ?? undefined) ?? undefined,
    media: normalizeMedia(Array.isArray(row.media) ? row.media : undefined),
    published: row.published ?? true,
    content: typeof row.content === "string" ? row.content : "",
  };
}

function normalizeMedia(media: PostMedia[] | undefined): PostMedia[] {
  if (!Array.isArray(media)) {
    return [];
  }

  return media
    .filter((item) => item && (item.type === "image" || item.type === "video"))
    .reduce<PostMedia[]>((result, item) => {
      const safeUrl = toSafeAssetUrl(item.url);

      if (!safeUrl) {
        return result;
      }

      result.push({
        type: item.type,
        url: safeUrl,
        alt: item.alt?.trim() || undefined,
        caption: item.caption?.trim() || undefined,
      });

      return result;
    }, []);
}

function normalizePostInput(input: CreatePostInput) {
  const slug = normalizeSlug(input.slug || input.title);

  if (!slug) {
    throw new Error("Slug is required");
  }

  const title = input.title.trim();
  const summary = input.summary.trim();

  if (!title) {
    throw new Error("Title is required");
  }

  if (!summary) {
    throw new Error("Summary is required");
  }

  if (!input.content.trim()) {
    throw new Error("Content is required");
  }

  return {
    slug,
    title,
    summary,
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    content: input.content,
    coverImage: toSafeAssetUrl(input.coverImage) ?? null,
    media: normalizeMedia(input.media),
    published: input.published ?? false,
  };
}

export async function listPosts(options?: { includeDrafts?: boolean; includeContent?: boolean }) {
  const includeDrafts = options?.includeDrafts ?? false;
  const includeContent = options?.includeContent ?? true;
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return listFallbackPosts({ includeDrafts });
  }

  const query = includeContent
    ? supabase
      .from("posts")
      .select("slug,title,summary,created_at,tags,cover_image,media,published,content")
      .order("created_at", { ascending: false })
    : supabase
      .from("posts")
      .select("slug,title,summary,created_at,tags,cover_image,media,published")
      .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error || !Array.isArray(data)) {
    return listFallbackPosts({ includeDrafts });
  }

  const mapped = data.map((row) => mapPostRow(row as PostRow));

  if (includeDrafts) {
    return mapped;
  }

  return mapped.filter((post) => post.published !== false);
}

export async function getPostBySlug(slug: string, options?: { includeDrafts?: boolean }) {
  const includeDrafts = options?.includeDrafts ?? false;
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const items = listFallbackPosts({ includeDrafts: true });
    const post = items.find((item) => item.slug === slug) ?? null;

    if (!post) {
      return null;
    }

    if (!includeDrafts && post.published === false) {
      return null;
    }

    return post;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("slug,title,summary,created_at,tags,cover_image,media,published,content")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    const fallback = listFallbackPosts({ includeDrafts: true }).find((item) => item.slug === slug) ?? null;

    if (!fallback) {
      return null;
    }

    if (!includeDrafts && fallback.published === false) {
      return null;
    }

    return fallback;
  }

  const post = mapPostRow(data as PostRow);

  if (!includeDrafts && post.published === false) {
    return null;
  }

  return post;
}

export async function createPost(input: CreatePostInput) {
  const normalized = normalizePostInput(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const alreadyExists = listFallbackPosts({ includeDrafts: true }).some((post) => post.slug === normalized.slug);

    if (alreadyExists) {
      throw new Error("A post with this slug already exists");
    }

    const nextPost: Post = {
      slug: normalized.slug,
      title: normalized.title,
      summary: normalized.summary,
      createdAt: new Date().toISOString().slice(0, 10),
      tags: normalized.tags,
      content: normalized.content,
      coverImage: normalized.coverImage ?? undefined,
      media: normalized.media,
      published: normalized.published,
    };

    runtimePosts.unshift(nextPost);

    return nextPost;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      slug: normalized.slug,
      title: normalized.title,
      summary: normalized.summary,
      tags: normalized.tags,
      content: normalized.content,
      cover_image: normalized.coverImage,
      media: normalized.media,
      published: normalized.published,
      created_at: new Date().toISOString().slice(0, 10),
    })
    .select("slug,title,summary,created_at,tags,cover_image,media,published,content")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create post");
  }

  return mapPostRow(data as PostRow);
}

export async function updatePost(currentSlug: string, input: CreatePostInput) {
  const normalized = normalizePostInput(input);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const index = runtimePosts.findIndex((post) => post.slug === currentSlug);

    if (index === -1) {
      throw new Error("Post not found or is not editable");
    }

    const current = runtimePosts[index];

    const nextPost: Post = {
      slug: normalized.slug,
      title: normalized.title,
      summary: normalized.summary,
      createdAt: current.createdAt,
      tags: normalized.tags,
      coverImage: normalized.coverImage ?? undefined,
      media: normalized.media,
      published: normalized.published,
      content: normalized.content,
    };

    runtimePosts[index] = nextPost;
    return nextPost;
  }

  const { data, error } = await supabase
    .from("posts")
    .update({
      slug: normalized.slug,
      title: normalized.title,
      summary: normalized.summary,
      tags: normalized.tags,
      content: normalized.content,
      cover_image: normalized.coverImage,
      media: normalized.media,
      published: normalized.published,
    })
    .eq("slug", currentSlug)
    .select("slug,title,summary,created_at,tags,cover_image,media,published,content")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update post");
  }

  return mapPostRow(data as PostRow);
}

export async function deletePost(slug: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const index = runtimePosts.findIndex((post) => post.slug === slug);

    if (index === -1) {
      return false;
    }

    runtimePosts.splice(index, 1);
    return true;
  }

  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("slug", slug)
    .select("slug")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }

    throw new Error(error.message);
  }

  return Boolean(data);
}

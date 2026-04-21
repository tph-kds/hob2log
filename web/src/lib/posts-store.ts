import { posts as seedPosts } from "@/content/posts";
import { Post } from "@/types/content";

interface CreatePostInput {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  content: string;
}

const runtimePosts: Post[] = [];

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

export function listPosts() {
  return sortByDateDesc([...runtimePosts, ...seedPosts]);
}

export function getPostBySlug(slug: string) {
  return listPosts().find((post) => post.slug === slug) ?? null;
}

export function createPost(input: CreatePostInput) {
  const slug = normalizeSlug(input.slug || input.title);

  if (!slug) {
    throw new Error("Slug is required");
  }

  const alreadyExists = listPosts().some((post) => post.slug === slug);

  if (alreadyExists) {
    throw new Error("A post with this slug already exists");
  }

  const nextPost: Post = {
    slug,
    title: input.title.trim(),
    summary: input.summary.trim(),
    createdAt: new Date().toISOString().slice(0, 10),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    content: input.content,
  };

  runtimePosts.unshift(nextPost);

  return nextPost;
}

export function deletePost(slug: string) {
  const index = runtimePosts.findIndex((post) => post.slug === slug);

  if (index === -1) {
    return false;
  }

  runtimePosts.splice(index, 1);
  return true;
}

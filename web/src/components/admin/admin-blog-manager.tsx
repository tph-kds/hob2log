"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MarkdownRenderer } from "@/components/blog/markdown-renderer";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { PostMedia } from "@/types/content";

interface PostPreview {
  slug: string;
  title: string;
  summary: string;
  createdAt: string;
  tags: string[];
  content: string;
  coverImage?: string;
  media: PostMedia[];
  published: boolean;
}

interface FormState {
  slug: string;
  title: string;
  summary: string;
  tags: string;
  content: string;
  coverImage: string;
  media: PostMedia[];
  published: boolean;
}

const initialForm: FormState = {
  slug: "",
  title: "",
  summary: "",
  tags: "",
  content: "",
  coverImage: "",
  media: [],
  published: false,
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AdminBlogManager() {
  const router = useRouter();
  const [items, setItems] = useState<PostPreview[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const isEditing = Boolean(activeSlug);

  async function loadPosts() {
    const response = await fetch("/api/posts?includeDrafts=true", { cache: "no-store" });

    if (!response.ok) {
      if (response.status === 401) {
        setStatus("Session expired. Please log in again.");
      }
      return;
    }

    const data = await response.json();
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const previewPost = useMemo(
    () => ({
      ...form,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    }),
    [form],
  );
  const previewSlug = useMemo(() => {
    const explicitSlug = normalizeSlug(form.slug);
    if (explicitSlug) {
      return explicitSlug;
    }

    return normalizeSlug(form.title);
  }, [form.slug, form.title]);
  const hasPreviewRoute = useMemo(
    () => items.some((item) => item.slug === previewSlug) || (activeSlug !== null && activeSlug === previewSlug),
    [activeSlug, items, previewSlug],
  );

  function resetEditor() {
    setForm(initialForm);
    setActiveSlug(null);
    setPreviewMode(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    const endpoint = isEditing ? `/api/posts/${activeSlug}` : "/api/posts";
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        content: form.content,
        coverImage: form.coverImage,
        media: form.media,
        published: form.published,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Failed to save post");
      setIsSaving(false);
      return;
    }

    setStatus(isEditing ? "Post updated successfully." : "Post created successfully.");
    resetEditor();
    await loadPosts();
    setIsSaving(false);
  }

  function startEdit(item: PostPreview) {
    setActiveSlug(item.slug);
    setForm({
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      tags: item.tags.join(", "),
      content: item.content,
      coverImage: item.coverImage ?? "",
      media: Array.isArray(item.media) ? item.media : [],
      published: item.published,
    });
  }

  async function handleDelete(slug: string) {
    setStatus("");

    const response = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Failed to delete post");
      return;
    }

    setStatus(`Deleted ${slug}`);

    if (activeSlug === slug) {
      resetEditor();
    }

    await loadPosts();
  }

  function addMedia() {
    setForm((prev) => ({
      ...prev,
      media: [...prev.media, { type: "image", url: "", alt: "", caption: "" }],
    }));
  }

  function updateMedia(index: number, patch: Partial<PostMedia>) {
    setForm((prev) => ({
      ...prev,
      media: prev.media.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeMedia(index: number) {
    setForm((prev) => ({
      ...prev,
      media: prev.media.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="page-shell">
      <main className="page-main mx-auto w-full max-w-6xl px-6 pb-12 pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Admin Blog Manager</p>
          <h1 className="mt-2 text-4xl font-semibold">Create, Update, and Publish Blog Posts</h1>
          <p className="mt-2 text-sm text-(--muted)">
            Add markdown articles with images and videos, then preview before publishing.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="dynamic-theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18 9 12l6-6" />
              </svg>
              Back
            </button>
            <Link
              href="/admin"
              className="dynamic-theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => setPreviewMode((prev) => !prev)}
              className="dynamic-theme-button-outline rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
            >
              {previewMode ? "Back to Editor" : "Preview Mode"}
            </button>
            <button
              type="button"
              onClick={resetEditor}
              className="dynamic-theme-button-outline rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
            >
              New Draft
            </button>
            <AdminLogoutButton />
          </div>

          {!previewMode ? (
            <form onSubmit={handleSave} className="mt-6 grid gap-3">
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
                placeholder="Title"
                required
              />
              <input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
                placeholder="Slug (optional, auto from title)"
              />
              <input
                value={form.summary}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
                placeholder="Summary"
                required
              />
              <input
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
                placeholder="Tags (comma separated)"
              />
              <input
                value={form.coverImage}
                onChange={(event) => setForm((prev) => ({ ...prev, coverImage: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
                placeholder="Cover image URL (optional)"
              />
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                className="min-h-40 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
                placeholder="Markdown content"
                required
              />

              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Media Attachments</p>
                  <button
                    type="button"
                    onClick={addMedia}
                    className="dynamic-theme-button-outline rounded-full px-4 py-1 text-xs uppercase tracking-[0.12em]"
                  >
                    Add Media
                  </button>
                </div>

                <div className="mt-3 grid gap-3">
                  {form.media.map((item, index) => (
                    <div key={`${index}-${item.url}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/10 p-3">
                      <select
                        value={item.type}
                        onChange={(event) => updateMedia(index, { type: event.target.value as PostMedia["type"] })}
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                      <input
                        value={item.url}
                        onChange={(event) => updateMedia(index, { url: event.target.value })}
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                        placeholder="Media URL"
                      />
                      <input
                        value={item.alt ?? ""}
                        onChange={(event) => updateMedia(index, { alt: event.target.value })}
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                        placeholder="Alt text (for image)"
                      />
                      <input
                        value={item.caption ?? ""}
                        onChange={(event) => updateMedia(index, { caption: event.target.value })}
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                        placeholder="Caption"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="dynamic-theme-button-danger w-fit rounded-full border border-red-300/30 px-4 py-1 text-xs uppercase tracking-widest text-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="mt-1 flex items-center gap-2 text-sm text-sky-100/85">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
                />
                Publish immediately
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="dynamic-theme-button w-fit rounded-full px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : isEditing ? "Update Post" : "Create Post"}
              </button>
            </form>
          ) : (
            <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-(--accent)">
                {previewPost.published ? "Public Preview" : "Draft Preview"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {hasPreviewRoute ? (
                  <Link
                    href={`/blog/${previewSlug}?preview=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="dynamic-theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
                  >
                    Full Page Review
                    <span aria-hidden="true">-&gt;</span>
                  </Link>
                ) : (
                  <p className="text-xs text-sky-100/75">
                    Save this draft first to open the full page review route.
                  </p>
                )}
              </div>
              <h2 className="mt-2 text-3xl font-semibold">{previewPost.title || "Untitled"}</h2>
              <p className="mt-2 text-sm text-(--muted)">{previewPost.summary || "No summary yet"}</p>
              <p className="mt-2 text-xs text-sky-100/80">{previewPost.tags.join(" · ") || "No tags"}</p>

              {previewPost.coverImage ? (
                <img src={previewPost.coverImage} alt={previewPost.title || "Cover"} className="mt-4 w-full rounded-xl object-cover" />
              ) : null}

              <div className="mt-6">
                <MarkdownRenderer content={previewPost.content} />
              </div>

              {previewPost.media.length > 0 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {previewPost.media.map((item, index) => (
                    <figure key={`${item.url}-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-black/10 p-2">
                      {item.type === "video" ? (
                        <video src={item.url} controls className="h-auto w-full rounded-lg" />
                      ) : (
                        <img src={item.url} alt={item.alt || "Attachment"} className="h-auto w-full rounded-lg object-cover" />
                      )}
                      {item.caption ? <figcaption className="mt-2 text-xs text-sky-100/75">{item.caption}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {status ? <p className="mt-4 text-sm text-sky-100/90">{status}</p> : null}

          <div className="mt-8 grid gap-3">
            {items.map((item) => (
              <article key={item.slug} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-(--accent)">
                      {item.createdAt} · {item.published ? "Published" : "Draft"}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
                    <p className="mt-1 text-xs text-sky-100/80">/{item.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="dynamic-theme-button-outline rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.12em]"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/blog/${item.slug}?preview=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="dynamic-theme-button-outline inline-flex rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.12em]"
                    >
                      Review
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.slug)}
                      className="dynamic-theme-button-danger rounded-full border border-red-300/30 px-4 py-1.5 text-xs uppercase tracking-widest text-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </LiquidSection>
      </main>
      <SiteFooter />
    </div>
  );
}

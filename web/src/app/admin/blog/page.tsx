"use client";

import { FormEvent, useEffect, useState } from "react";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";

interface PostPreview {
  slug: string;
  title: string;
  summary: string;
  createdAt: string;
  tags: string[];
}

interface FormState {
  slug: string;
  title: string;
  summary: string;
  tags: string;
  content: string;
}

const initialForm: FormState = {
  slug: "",
  title: "",
  summary: "",
  tags: "",
  content: "",
};

export default function AdminBlogPage() {
  const [items, setItems] = useState<PostPreview[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadPosts() {
    const response = await fetch("/api/posts", { cache: "no-store" });
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        content: form.content,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Failed to create post");
      setIsSaving(false);
      return;
    }

    setStatus("Post created successfully.");
    setForm(initialForm);
    await loadPosts();
    setIsSaving(false);
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
    await loadPosts();
  }

  return (
    <div className="page-shell">
      <main className="page-main mx-auto w-full max-w-6xl px-6 pb-12 pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Admin Blog Manager</p>
          <h1 className="mt-2 text-4xl font-semibold">Create and Delete Publications</h1>
          <p className="mt-2 text-sm text-(--muted)">
            Public readers use /blog. Admin actions happen here.
          </p>

          <form onSubmit={handleCreate} className="mt-6 grid gap-3">
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
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              className="min-h-40 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
              placeholder="Markdown content"
              required
            />
            <button
              type="submit"
              disabled={isSaving}
              className="dynamic-theme-button w-fit rounded-full px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Post"}
            </button>
          </form>

          {status ? <p className="mt-4 text-sm text-sky-100/90">{status}</p> : null}

          <div className="mt-8 grid gap-3">
            {items.map((item) => (
              <article key={item.slug} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-(--accent)">{item.createdAt}</p>
                    <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
                    <p className="mt-1 text-xs text-sky-100/80">/{item.slug}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.slug)}
                    className="dynamic-theme-button-danger rounded-full border border-red-300/30 px-4 py-1.5 text-xs uppercase tracking-widest text-red-100"
                  >
                    Delete
                  </button>
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

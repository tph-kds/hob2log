"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { Project } from "@/types/content";

interface FormState {
  currentSlug: string;
  slug: string;
  name: string;
  description: string;
  stack: string;
  status: Project["status"];
}

const initialForm: FormState = {
  currentSlug: "",
  slug: "",
  name: "",
  description: "",
  stack: "",
  status: "planned",
};

export function AdminProjectsManager() {
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(form.currentSlug);

  async function loadProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await response.json();
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProjects();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function resetForm() {
    setForm(initialForm);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSaving(true);

    const method = isEditing ? "PUT" : "POST";
    const response = await fetch("/api/projects", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentSlug: form.currentSlug,
        slug: form.slug,
        name: form.name,
        description: form.description,
        stack: form.stack.split(",").map((part) => part.trim()).filter(Boolean),
        status: form.status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Failed to save project");
      setIsSaving(false);
      return;
    }

    setStatus(isEditing ? "Project updated." : "Project created.");
    resetForm();
    await loadProjects();
    setIsSaving(false);
  }

  async function handleDelete(slug: string) {
    setStatus("");

    const response = await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Failed to delete project");
      return;
    }

    setStatus(`Deleted ${slug}`);

    if (form.currentSlug === slug) {
      resetForm();
    }

    await loadProjects();
  }

  function startEdit(item: Project) {
    setForm({
      currentSlug: item.slug,
      slug: item.slug,
      name: item.name,
      description: item.description,
      stack: item.stack.join(", "),
      status: item.status,
    });
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
      <main className="page-main mx-auto w-full max-w-6xl px-4 pb-10 pt-[4.5rem] sm:px-6 sm:pb-12 sm:pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Admin Projects Manager</p>
          <h1 className="mt-2 text-4xl font-semibold">Manage Side Projects</h1>
          <p className="mt-2 text-sm text-(--muted)">
            Create, update, and delete projects with secured admin-only write access.
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
              onClick={resetForm}
              className="dynamic-theme-button-outline rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
            >
              New Project
            </button>
            <AdminLogoutButton />
          </div>

          <form onSubmit={handleSave} className="mt-6 grid gap-3">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
              placeholder="Project name"
              required
            />
            <input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
              placeholder="Slug (optional, auto from name)"
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-28 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
              placeholder="Description"
              required
            />
            <input
              value={form.stack}
              onChange={(event) => setForm((prev) => ({ ...prev, stack: event.target.value }))}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
              placeholder="Stack (comma separated)"
            />
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as Project["status"] }))}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
            >
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <button
              type="submit"
              disabled={isSaving}
              className="dynamic-theme-button w-fit rounded-full px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : isEditing ? "Update Project" : "Create Project"}
            </button>
          </form>

          {status ? <p className="mt-4 text-sm text-sky-100/90">{status}</p> : null}

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.slug} className="interactive-gradient-card rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-(--accent)">{item.status}</p>
                <h2 className="mt-2 text-2xl font-medium">{item.name}</h2>
                <p className="mt-2 text-sm text-(--muted)">{item.description}</p>
                <p className="mt-3 text-xs text-sky-100/80">{item.stack.join(" · ")}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="dynamic-theme-button-outline rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.12em]"
                  >
                    Edit
                  </button>
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

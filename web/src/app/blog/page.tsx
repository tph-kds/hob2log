import Link from "next/link";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { listPosts } from "@/lib/posts-store";

export const dynamic = "force-dynamic";

export default function BlogPage() {
  const posts = listPosts();

  return (
    <div className="page-shell">
      <SiteHeader />

      <main className="page-main mx-auto w-full max-w-5xl px-6 pb-12 pt-20 md:px-10 md:pt-24">
        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Knowledge Archive</p>
          <h1 className="mt-2 text-4xl font-semibold">Blog Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-(--muted)">
            A private stream of build decisions, experiments, and lessons. Keep each entry focused on one outcome.
          </p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-sky-100/85">
            Productive writing format: context -&gt; attempt -&gt; result -&gt; next step.
          </div>

          <div className="mt-8 grid gap-4">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="interactive-gradient-card rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-(--accent)">{post.createdAt}</p>
                <h2 className="mt-2 text-2xl font-medium">{post.title}</h2>
                <p className="mt-2 text-sm text-(--muted)">{post.summary}</p>
                <p className="mt-3 text-xs text-sky-100/80">{post.tags.join(" · ")}</p>
              </Link>
            ))}
          </div>
        </LiquidSection>
      </main>

      <SiteFooter />
    </div>
  );
}
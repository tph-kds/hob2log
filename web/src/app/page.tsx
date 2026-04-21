import Link from "next/link";
import { BlogLandingHero } from "@/components/blog/blog-landing-hero";
import { FloatingCardExperience } from "@/components/cards/floating-card-experience";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { listPosts } from "@/lib/posts-store";

export const dynamic = "force-dynamic";

export default function Home() {
  const featuredPosts = listPosts().slice(0, 3);
  const cardImage1 =
    process.env.NEXT_PUBLIC_CARD_IMAGE_1 ??
    "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/sample.jpg";
  const cardImage2 =
    process.env.NEXT_PUBLIC_CARD_IMAGE_2 ??
    "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/animals/cat.jpg";

  const floatingCards = [
    {
      id: "dark-magician",
      title: "Dark Magician",
      imageUrl: cardImage1,
      phaseOffset: 0,
    },
    {
      id: "pikachu",
      title: "Pikachu",
      imageUrl: cardImage2,
      phaseOffset: 1.8,
    },
  ];

  return (
    <div className="page-shell">
      <FloatingCardExperience cards={floatingCards} />
      <SiteHeader />

      <BlogLandingHero ctaHref="#home-main" ctaLabel="Enter Workspace" scrollHint="Scroll down for latest notes" />

      <main id="home-main" className="page-main mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-12 pt-20 md:px-10 md:pt-24">
        <LiquidSection className="relative rounded-3xl p-8 md:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-75">
            <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-emerald-300/20 blur-3xl" />
          </div>

          <p className="relative mb-4 text-xs uppercase tracking-[0.24em] text-sky-200/85">Mysterious Private Workspace</p>
          <h1 className="relative max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Quietly capture ideas, transform them into projects, and keep every decision searchable.
          </h1>
          <p className="relative mt-6 max-w-2xl text-base text-(--muted) md:text-lg">
            Designed for solo makers: frictionless writing flow, visual focus, and a stable archive for technical and creative experiments.
          </p>

          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link className="dynamic-theme-button rounded-full px-6 py-3 font-semibold text-slate-950" href="/blog">
              Start Writing
            </Link>
            <Link className="dynamic-theme-button-outline rounded-full px-6 py-3 font-medium text-slate-100" href="/projects">
              Review Projects
            </Link>
          </div>
        </LiquidSection>

        <section className="grid gap-6 md:grid-cols-3">
          <LiquidSection className="rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-(--accent)">Capture</p>
            <h2 className="mt-2 text-lg font-semibold">Daily Log Habit</h2>
            <p className="mt-2 text-sm text-(--muted)">Turn rough thoughts into concise notes with a repeatable structure: context, action, and outcome.</p>
          </LiquidSection>
          <LiquidSection className="rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-(--accent)">Build</p>
            <h2 className="mt-2 text-lg font-semibold">Project Cadence</h2>
            <p className="mt-2 text-sm text-(--muted)">Each side project gets status, stack, and next milestone so progress never gets lost.</p>
          </LiquidSection>
          <LiquidSection className="rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-(--accent)">Reflect</p>
            <h2 className="mt-2 text-lg font-semibold">Decision Memory</h2>
            <p className="mt-2 text-sm text-(--muted)">Preserve trade-offs and lessons learned to speed up future implementation decisions.</p>
          </LiquidSection>
        </section>

        <section className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <LiquidSection className="rounded-3xl p-6 md:p-8">
            <h2 className="text-2xl font-semibold">Recent Logs</h2>
            <div className="mt-6 grid gap-4">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="interactive-gradient-card rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm uppercase tracking-[0.14em] text-(--accent-2)">{post.tags.join(" · ")}</p>
                  <h3 className="mt-2 text-xl font-medium">{post.title}</h3>
                  <p className="mt-2 text-sm text-(--muted)">{post.summary}</p>
                </Link>
              ))}
            </div>
          </LiquidSection>

          <LiquidSection className="rounded-3xl p-6 md:p-8">
            <h2 className="text-2xl font-semibold">Visual Identity Layer</h2>
            <p className="mt-3 text-sm text-(--muted)">
              Floating cards create your mysterious atmosphere without reducing readability. Keep motion decorative, never informational.
            </p>
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-sky-50/85">
              Productivity tip: publish one short build log at the end of every coding session, even if the feature is incomplete.
            </div>
          </LiquidSection>
        </section>

        <LiquidSection className="rounded-3xl p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Execution Blueprint</h2>
          <div className="mt-5 grid gap-4 text-sm text-(--muted) md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-base font-semibold text-sky-100">Story + Code</h3>
              <p className="mt-2">Log what you tried, why you chose it, and what changed after testing.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-base font-semibold text-sky-100">Media Pipeline</h3>
              <p className="mt-2">Use optimized assets and consistent cover ratios for a clean index and quick scanning.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-base font-semibold text-sky-100">Balanced Motion</h3>
              <p className="mt-2">Maintain depth effects on desktop with reduced-motion fallback and mobile-friendly simplicity.</p>
            </article>
          </div>
        </LiquidSection>
      </main>

      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import { BlogLandingHero } from "@/components/blog/blog-landing-hero";
import { CardTopicWrapper } from "@/components/cards/card-topic-wrapper";
import { MagneticCardLink } from "@/components/cards/magnetic-card";
import { LiquidSection } from "@/components/layout/liquid-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { listPosts } from "@/lib/posts-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await listPosts();
  const featuredPosts = Array.isArray(posts) ? posts.slice(0, 3) : [];
  const yugiohCards = [
    {
      id: "ygo-a", title: "Dark Magician", phaseOffset: 0.0,
      imageUrl: process.env.NEXT_PUBLIC_YUGIOH_CARD_IMAGE_1 ?? process.env.NEXT_PUBLIC_CARD_IMAGE_1 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/sample.jpg",
      backImageUrl: process.env.NEXT_PUBLIC_YUGIOH_BACKCARD_IMAGE_1 ?? process.env.NEXT_PUBLIC_BACKCARD_IMAGE_1 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/landscapes/beach-boat.jpg"
    },
    {
      id: "ygo-b", title: "Blue Eyes", phaseOffset: 1.8,
      imageUrl: process.env.NEXT_PUBLIC_YUGIOH_CARD_IMAGE_2 ?? process.env.NEXT_PUBLIC_CARD_IMAGE_2 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/animals/cat.jpg",
      backImageUrl: process.env.NEXT_PUBLIC_YUGIOH_BACKCARD_IMAGE_2 ?? process.env.NEXT_PUBLIC_BACKCARD_IMAGE_2 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/food/fish-vegetables.jpg"
    },
    {
      id: "ygo-c", title: "Red Eyes", phaseOffset: 3.2,
      imageUrl: process.env.NEXT_PUBLIC_YUGIOH_CARD_IMAGE_3 ?? process.env.NEXT_PUBLIC_CARD_IMAGE_3 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/landscapes/beach-boat.jpg",
      backImageUrl: process.env.NEXT_PUBLIC_YUGIOH_BACKCARD_IMAGE_3 ?? process.env.NEXT_PUBLIC_BACKCARD_IMAGE_3 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/people/smiling-man.jpg"
    },
    {
      id: "ygo-d", title: "Kuriboh", phaseOffset: 0.9,
      imageUrl: process.env.NEXT_PUBLIC_YUGIOH_CARD_IMAGE_4 ?? process.env.NEXT_PUBLIC_CARD_IMAGE_4 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/food/fish-vegetables.jpg",
      backImageUrl: process.env.NEXT_PUBLIC_YUGIOH_BACKCARD_IMAGE_4 ?? process.env.NEXT_PUBLIC_BACKCARD_IMAGE_4 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/sample.jpg"
    },
    {
      id: "ygo-e", title: "Exodia", phaseOffset: 2.5,
      imageUrl: process.env.NEXT_PUBLIC_YUGIOH_CARD_IMAGE_5 ?? process.env.NEXT_PUBLIC_CARD_IMAGE_5 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/people/smiling-man.jpg",
      backImageUrl: process.env.NEXT_PUBLIC_YUGIOH_BACKCARD_IMAGE_5 ?? process.env.NEXT_PUBLIC_BACKCARD_IMAGE_5 ?? "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill,f_webp/samples/animals/cat.jpg"
    },
  ];

  const pokemonCards = [
    {
      id: "poke-a", title: "Charizard", phaseOffset: 0.0,
      imageUrl: process.env.NEXT_PUBLIC_POKEMON_CARD_IMAGE_1 ?? yugiohCards[0].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_POKEMON_BACKCARD_IMAGE_1 ?? yugiohCards[0].backImageUrl
    },
    {
      id: "poke-b", title: "Pikachu", phaseOffset: 1.8,
      imageUrl: process.env.NEXT_PUBLIC_POKEMON_CARD_IMAGE_2 ?? yugiohCards[1].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_POKEMON_BACKCARD_IMAGE_2 ?? yugiohCards[1].backImageUrl
    },
    {
      id: "poke-c", title: "Mewtwo", phaseOffset: 3.2,
      imageUrl: process.env.NEXT_PUBLIC_POKEMON_CARD_IMAGE_3 ?? yugiohCards[2].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_POKEMON_BACKCARD_IMAGE_3 ?? yugiohCards[2].backImageUrl
    },
    {
      id: "poke-d", title: "Gengar", phaseOffset: 0.9,
      imageUrl: process.env.NEXT_PUBLIC_POKEMON_CARD_IMAGE_4 ?? yugiohCards[3].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_POKEMON_BACKCARD_IMAGE_4 ?? yugiohCards[3].backImageUrl
    },
    {
      id: "poke-e", title: "Lugia", phaseOffset: 2.5,
      imageUrl: process.env.NEXT_PUBLIC_POKEMON_CARD_IMAGE_5 ?? yugiohCards[4].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_POKEMON_BACKCARD_IMAGE_5 ?? yugiohCards[4].backImageUrl
    },
  ];

  const onepieceCards = [
    {
      id: "op-a", title: "Luffy", phaseOffset: 0.0,
      imageUrl: process.env.NEXT_PUBLIC_ONEPIECE_CARD_IMAGE_1 ?? yugiohCards[0].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_ONEPIECE_BACKCARD_IMAGE_1 ?? yugiohCards[0].backImageUrl
    },
    {
      id: "op-b", title: "Zoro", phaseOffset: 1.8,
      imageUrl: process.env.NEXT_PUBLIC_ONEPIECE_CARD_IMAGE_2 ?? yugiohCards[1].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_ONEPIECE_BACKCARD_IMAGE_2 ?? yugiohCards[1].backImageUrl
    },
    {
      id: "op-c", title: "Sanji", phaseOffset: 3.2,
      imageUrl: process.env.NEXT_PUBLIC_ONEPIECE_CARD_IMAGE_3 ?? yugiohCards[2].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_ONEPIECE_BACKCARD_IMAGE_3 ?? yugiohCards[2].backImageUrl
    },
    {
      id: "op-d", title: "Nami", phaseOffset: 0.9,
      imageUrl: process.env.NEXT_PUBLIC_ONEPIECE_CARD_IMAGE_4 ?? yugiohCards[3].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_ONEPIECE_BACKCARD_IMAGE_4 ?? yugiohCards[3].backImageUrl
    },
    {
      id: "op-e", title: "Robin", phaseOffset: 2.5,
      imageUrl: process.env.NEXT_PUBLIC_ONEPIECE_CARD_IMAGE_5 ?? yugiohCards[4].imageUrl,
      backImageUrl: process.env.NEXT_PUBLIC_ONEPIECE_BACKCARD_IMAGE_5 ?? yugiohCards[4].backImageUrl
    },
  ];

  const topics = [
    { id: "yugioh", label: "Yu-Gi-Oh!", cards: yugiohCards },
    { id: "pokemon", label: "Pokémon", cards: pokemonCards },
    { id: "onepiece", label: "One Piece", cards: onepieceCards },
  ];

  return (
    <div className="page-shell page-shell-no-blur">
      <CardTopicWrapper topics={topics} />

      <BlogLandingHero ctaHref="#home-main" ctaLabel="Enter Workspace" scrollHint="Scroll down for latest notes" />

      <main id="home-main" className="page-main mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-10 pt-[4.5rem] sm:gap-14 sm:px-6 sm:pb-12 sm:pt-20 md:px-10 md:pt-24">
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
                <MagneticCardLink
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  {post.coverImage ? (
                    <div
                      className="mb-3 h-40 w-full rounded-xl border border-white/10 bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.coverImage})` }}
                      aria-label={`Cover image for ${post.title}`}
                    />
                  ) : post.media?.[0]?.type === "video" ? (
                    <video src={post.media[0].url} controls className="mb-3 h-40 w-full rounded-xl border border-white/10 object-cover" />
                  ) : post.media?.[0]?.url ? (
                    <div
                      className="mb-3 h-40 w-full rounded-xl border border-white/10 bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.media[0].url})` }}
                      aria-label={`Media preview for ${post.title}`}
                    />
                  ) : null}
                  <div className="post-tags-row">
                    {post.tags.map((tag) => (
                      <span key={tag} className="post-tag-badge">{tag}</span>
                    ))}
                  </div>
                  <h3 className="mt-2 text-xl font-medium">{post.title}</h3>
                  <p className="mt-2 text-sm text-(--muted)">{post.summary}</p>
                </MagneticCardLink>
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

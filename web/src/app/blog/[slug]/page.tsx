import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownRenderer } from "@/components/blog/markdown-renderer";
import { PostChatbot } from "@/components/blog/post-chatbot";
import { SiteFooter } from "@/components/layout/site-footer";
import { isAdminSessionAuthorized } from "@/lib/admin-session";
import { getPostBySlug, listPosts } from "@/lib/posts-store";
import { Post } from "@/types/content";

export const dynamic = "force-dynamic";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

interface TocItem {
  depth: 2 | 3;
  text: string;
  id: string;
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function makeSlugGenerator() {
  const seen = new Map<string, number>();

  return (value: string) => {
    const base = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const key = base || "section";
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);

    return count === 0 ? key : `${key}-${count}`;
  };
}

function getTableOfContents(markdown: string): TocItem[] {
  const slugify = makeSlugGenerator();
  const matches = markdown.matchAll(/^(#{2,3})\s+(.+)$/gm);

  return Array.from(matches, (match) => {
    const depth = match[1].length as 2 | 3;
    const text = stripInlineMarkdown(match[2]);

    return {
      depth,
      text,
      id: slugify(text),
    };
  });
}

function getRelatedPosts(currentPost: Post, items: Post[]) {
  return items
    .filter((item) => item.slug !== currentPost.slug)
    .map((item) => {
      const sharedTags = item.tags.filter((tag) => currentPost.tags.includes(tag)).length;
      const titleWords = currentPost.title.toLowerCase().split(/\s+/).filter((part) => part.length > 3);
      const titleOverlap = titleWords.reduce((score, word) => (item.title.toLowerCase().includes(word) ? score + 1 : score), 0);

      return {
        item,
        score: sharedTags * 3 + titleOverlap,
      };
    })
    .sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt))
    .map(({ item }) => item)
    .slice(0, 3);
}

function sanitizeAssetSrc(value: string | undefined) {
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

export default async function BlogPostPage({ params, searchParams }: BlogPostPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const wantsPreview = query.preview === "1" || query.preview === "true";
  const canViewDraft = wantsPreview && await isAdminSessionAuthorized();
  const allPosts = await listPosts({ includeDrafts: canViewDraft, includeContent: false });
  const post = await getPostBySlug(slug, { includeDrafts: canViewDraft });

  if (!post) {
    notFound();
  }

  const tableOfContents = getTableOfContents(post.content);
  const relatedPosts = getRelatedPosts(post, allPosts);
  const safeCoverImage = sanitizeAssetSrc(post.coverImage);

  return (
    <div className="page-shell">
      <main className="page-main mx-auto w-full max-w-6xl px-4 pb-10 pt-[4.5rem] sm:px-6 sm:pb-12 sm:pt-20 md:px-10 md:pt-24">
        <section className="liquid-panel rounded-3xl p-6 md:p-10">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/85">Article Workspace</p>

          <nav aria-label="Breadcrumb" className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-sky-100/90">
            <span className="text-sky-100/60">Current Path</span>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>
              <span>/</span>
              <Link href="/blog" className="transition hover:text-white">
                Blog
              </Link>
              <span>/</span>
              <span className="text-sky-50">{post.slug}</span>
            </p>
          </nav>

          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <article>
              {canViewDraft && post.published === false ? (
                <p className="mb-3 inline-flex rounded-full border border-amber-300/35 bg-amber-200/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-100">
                  Draft Review Mode
                </p>
              ) : null}
              <p className="text-xs uppercase tracking-[0.16em] text-(--accent)">{post.createdAt}</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight">{post.title}</h1>
              <p className="mt-3 text-sm text-(--muted)">{post.tags.join(" · ")}</p>

              {safeCoverImage ? (
                <div className="relative mt-6 h-56 w-full overflow-hidden rounded-2xl border border-white/10 md:h-72">
                  <img
                    src={safeCoverImage}
                    alt={`Cover image for ${post.title}`}
                    loading="eager"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="mt-8">
                <MarkdownRenderer content={post.content} />
              </div>

              {post.media && post.media.length > 0 ? (
                <section className="mt-8 space-y-4">
                  <h2 className="text-xl font-semibold">Media Attachments</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {post.media.map((item, index) => {
                      const safeMediaSrc = sanitizeAssetSrc(item.url);

                      return (
                        <figure key={`${item.url}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3">
                          {item.type === "video" ? (
                            safeMediaSrc ? <video src={safeMediaSrc} controls preload="metadata" className="h-auto w-full rounded-xl" /> : null
                          ) : (
                            <div className="relative h-56 w-full overflow-hidden rounded-xl sm:h-64">
                              {safeMediaSrc ? (
                                <img
                                  src={safeMediaSrc}
                                  alt={item.alt || post.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                          )}
                          {item.caption ? <figcaption className="mt-2 text-xs text-sky-100/75">{item.caption}</figcaption> : null}
                        </figure>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {relatedPosts.length > 0 ? (
                <section className="mt-10">
                  <h2 className="text-xl font-semibold">Related Changes</h2>
                  <p className="mt-2 text-sm text-(--muted)">Recent updates connected to this article by topic and implementation context.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {relatedPosts.map((related) => (
                      <Link
                        key={related.slug}
                        href={`/blog/${related.slug}`}
                        className="interactive-gradient-card rounded-2xl border border-white/12 bg-white/5 p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.12em] text-(--accent)">{related.createdAt}</p>
                        <h3 className="mt-2 text-base font-semibold text-slate-100">{related.title}</h3>
                        <p className="mt-2 text-sm text-(--muted)">{related.summary}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <Link
                href="/blog"
                className="dynamic-theme-button-outline mt-10 inline-flex rounded-full px-5 py-2 text-sm"
              >
                Back to blog
              </Link>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-30 lg:self-start">
              <section className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-sky-100/75">Table of Contents</p>
                {tableOfContents.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-sky-50/95">
                    {tableOfContents.map((item) => (
                      <li key={item.id} className={item.depth === 3 ? "pl-3" : ""}>
                        <a href={`#${item.id}`} className="transition hover:text-cyan-200">
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-(--muted)">No secondary headings found in this article.</p>
                )}
              </section>

              <section className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-sky-100/75">Recommended Blogs</p>
                <div className="mt-3 grid gap-2">
                  {relatedPosts.length > 0 ? (
                    relatedPosts.map((related) => (
                      <Link
                        key={related.slug}
                        href={`/blog/${related.slug}`}
                        className="interactive-gradient-card rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-slate-100">{related.title}</p>
                        <p className="mt-1 text-xs text-sky-100/75">{related.tags.join(" · ")}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-(--muted)">More recommendations will appear after you publish additional related posts.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />

      <PostChatbot postSlug={post.slug} postTitle={post.title} />
    </div>
  );
}

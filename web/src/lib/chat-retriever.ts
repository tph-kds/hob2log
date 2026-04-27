import { getPostBySlug, listPosts } from "@/lib/posts-store";
import { ChatContextSource } from "@/types/chat";
import { Post } from "@/types/content";

const CURRENT_POST_LIMIT = 8;
const RELATED_POST_LIMIT = 4;
const CHUNK_WORDS = 120;
const CHUNK_OVERLAP = 24;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function dedupeTokens(tokens: string[]) {
  return [...new Set(tokens)];
}

function scoreChunk(chunk: string, queryTokens: string[], post: Post, isCurrent: boolean) {
  const text = normalizeText(chunk);
  const titleText = normalizeText(post.title);
  const tagText = normalizeText(post.tags.join(" "));

  let score = isCurrent ? 1.6 : 0.8;

  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += 1.15;
    }

    if (titleText.includes(token)) {
      score += 0.55;
    }

    if (tagText.includes(token)) {
      score += 0.35;
    }
  }

  if (chunk.length < 60) {
    score -= 0.15;
  }

  return score;
}

function chunkMarkdown(content: string) {
  const words = content.replace(/\n+/g, " ").split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  if (words.length === 0) {
    return chunks;
  }

  let index = 0;

  while (index < words.length) {
    const slice = words.slice(index, index + CHUNK_WORDS);
    chunks.push(slice.join(" "));

    if (index + CHUNK_WORDS >= words.length) {
      break;
    }

    index += CHUNK_WORDS - CHUNK_OVERLAP;
  }

  return chunks;
}

function rankRelatedPosts(currentPost: Post, posts: Post[]) {
  return posts
    .filter((post) => post.slug !== currentPost.slug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) => currentPost.tags.includes(tag)).length;
      const currentTitleTokens = tokenize(currentPost.title);
      const overlap = currentTitleTokens.reduce((sum, token) => {
        return post.title.toLowerCase().includes(token) ? sum + 1 : sum;
      }, 0);

      return {
        post,
        score: (sharedTags * 3) + overlap,
      };
    })
    .sort((a, b) => b.score - a.score || b.post.createdAt.localeCompare(a.post.createdAt))
    .slice(0, 6)
    .map((item) => item.post);
}

function buildSources(question: string, posts: Array<{ post: Post; isCurrent: boolean }>, limit: number): ChatContextSource[] {
  const tokens = dedupeTokens(tokenize(question));
  const ranked: ChatContextSource[] = [];

  for (const item of posts) {
    const chunks = chunkMarkdown(item.post.content);

    for (const chunk of chunks) {
      const score = scoreChunk(chunk, tokens, item.post, item.isCurrent);

      if (score <= 0.4) {
        continue;
      }

      ranked.push({
        slug: item.post.slug,
        title: item.post.title,
        score,
        chunk,
      });
    }
  }

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getChatContext(postSlug: string, question: string) {
  const currentPost = await getPostBySlug(postSlug);

  if (!currentPost) {
    return {
      currentPost: null,
      sources: [] as ChatContextSource[],
    };
  }

  const allPosts = await listPosts({ includeDrafts: false, includeContent: true });
  const relatedPosts = rankRelatedPosts(currentPost, allPosts).slice(0, RELATED_POST_LIMIT);

  const ranked = buildSources(
    question,
    [{ post: currentPost, isCurrent: true }, ...relatedPosts.map((post) => ({ post, isCurrent: false }))],
    CURRENT_POST_LIMIT + RELATED_POST_LIMIT,
  );

  return {
    currentPost,
    sources: ranked,
  };
}

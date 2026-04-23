import { unstable_cache } from "next/cache";
import { MusicCatalog, MusicCatalogFilters, MusicTrack } from "@/types/music";

interface CloudinaryResource {
  asset_id: string;
  public_id: string;
  asset_folder?: string;
  filename?: string;
  display_name?: string;
  secure_url: string;
  duration?: number;
  bytes?: number;
  format?: string;
  resource_type?: string;
  tags?: string[];
  context?: {
    custom?: Record<string, string | undefined>;
  };
}

interface CloudinaryListResponse {
  resources: CloudinaryResource[];
  next_cursor?: string;
}

const DEFAULT_PREFIX = "home/myblog/musics";
const FALLBACK_PREFIXES = ["myblog/musics", "musics"];
const MAX_RESULTS = 100;
const MAX_PAGES = 4;
const CACHE_SECONDS = 300;

function getCloudinaryServerEnv() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary server credentials.");
  }

  return { cloudName, apiKey, apiSecret };
}

function titleCaseFromSlug(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizePrefix(prefix: string) {
  return prefix.trim().replace(/^\/+|\/+$/g, "");
}

function stripPrefix(path: string, prefix: string) {
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  const normalizedPrefix = normalizePrefix(prefix);

  if (!normalizedPrefix) {
    return normalizedPath;
  }

  if (normalizedPath === normalizedPrefix) {
    return "";
  }

  if (normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    return normalizedPath.slice(normalizedPrefix.length + 1);
  }

  const embedded = `/${normalizedPrefix}/`;
  const index = normalizedPath.indexOf(embedded);

  if (index >= 0) {
    return normalizedPath.slice(index + embedded.length);
  }

  return normalizedPath;
}

function getFolderParts(resource: CloudinaryResource, prefixes: string[]) {
  const folder = resource.asset_folder ?? "";
  const publicParts = resource.public_id.split("/").filter(Boolean);
  const publicFolder = publicParts.length > 1 ? publicParts.slice(0, -1).join("/") : "";

  const rawFolder = folder || publicFolder;
  const candidates = [rawFolder, publicFolder].filter(Boolean);

  let bestFolder = rawFolder;
  let bestLength = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    for (const prefix of prefixes) {
      const stripped = stripPrefix(candidate, prefix);

      if (stripped.length < bestLength) {
        bestFolder = stripped;
        bestLength = stripped.length;
      }
    }
  }

  const folderParts = bestFolder.split("/").filter(Boolean);
  const inferredFileName = resource.filename ?? resource.display_name ?? publicParts[publicParts.length - 1] ?? resource.public_id;

  return {
    country: folderParts[0] ?? "global",
    mood: folderParts[1] ?? "ambient",
    fileName: inferredFileName,
  };
}

function parseContextTags(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function parseDuration(value: string | undefined, fallback: number) {
  if (!value) {
    return Number.isFinite(fallback) ? fallback : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNormalizedGain(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0.92;
  }

  return Math.min(1.2, Math.max(0.55, parsed));
}

function normalizeTrack(resource: CloudinaryResource, prefixes: string[]): MusicTrack {
  const metadata = resource.context?.custom ?? {};
  const inferred = getFolderParts(resource, prefixes);

  const title = metadata.title?.trim() || titleCaseFromSlug(inferred.fileName);
  const country = (metadata.country?.trim() || inferred.country).toLowerCase();
  const mood = (metadata.mood?.trim() || inferred.mood).toLowerCase();
  const tags = new Set<string>([
    ...(resource.tags ?? []).map((tag) => tag.toLowerCase()),
    ...parseContextTags(metadata.tags),
  ]);

  return {
    id: resource.public_id,
    publicId: resource.public_id,
    title,
    country,
    mood,
    duration: parseDuration(metadata.duration, resource.duration ?? 0),
    url: resource.secure_url,
    coverImage: metadata.thumbnail ?? metadata.cover ?? null,
    waveformImage: metadata.waveform ?? null,
    tags: [...tags],
    bytes: resource.bytes ?? 0,
    format: resource.format ?? "mp3",
    normalizedGain: parseNormalizedGain(metadata.gain),
  };
}

function getPrefixCandidates() {
  const envPrefixes = (process.env.CLOUDINARY_MUSIC_PREFIX ?? "")
    .split(",")
    .map((value) => normalizePrefix(value))
    .filter(Boolean);

  const defaults = [DEFAULT_PREFIX, ...FALLBACK_PREFIXES].map((value) => normalizePrefix(value));
  return [...new Set([...envPrefixes, ...defaults])];
}

async function fetchSearchBatch(resourceType: "video" | "raw", prefix: string) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryServerEnv();
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const items: CloudinaryResource[] = [];

  let page = 0;
  let nextCursor: string | undefined;

  while (page < MAX_PAGES) {
    const params = new URLSearchParams({
      max_results: String(MAX_RESULTS),
      context: "true",
      tags: "true",
    });

    if (prefix) {
      params.set("prefix", prefix);
    }

    if (nextCursor) {
      params.set("next_cursor", nextCursor);
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload?${params.toString()}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`Cloudinary search request failed with status ${response.status}`);
    }

    const data = (await response.json()) as CloudinaryListResponse;
    items.push(...(data.resources ?? []));

    if (!data.next_cursor) {
      break;
    }

    nextCursor = data.next_cursor;
    page += 1;
  }

  return items;
}

async function loadCloudinaryTracks() {
  const prefixes = getPrefixCandidates();
  const allBatches: CloudinaryResource[] = [];
  let matchedPrefix: string | null = null;

  for (const prefix of prefixes) {
    const [videoResources, rawResources] = await Promise.all([
      fetchSearchBatch("video", prefix),
      fetchSearchBatch("raw", prefix),
    ]);

    const resources = [...videoResources, ...rawResources];

    if (resources.length) {
      matchedPrefix = prefix;
      allBatches.push(...resources);
      break;
    }
  }

  if (!allBatches.length) {
    const [videoFallback, rawFallback] = await Promise.all([
      fetchSearchBatch("video", ""),
      fetchSearchBatch("raw", ""),
    ]);
    allBatches.push(...videoFallback, ...rawFallback);
  }

  const parsingPrefixes = matchedPrefix
    ? [matchedPrefix, ...prefixes.filter((prefix) => prefix !== matchedPrefix)]
    : prefixes;

  const deduped = new Map<string, CloudinaryResource>();

  for (const resource of allBatches) {
    deduped.set(resource.public_id, resource);
  }

  const items = [...deduped.values()]
    .map((resource) => normalizeTrack(resource, parsingPrefixes))
    .sort((a, b) => a.country.localeCompare(b.country) || a.mood.localeCompare(b.mood) || a.title.localeCompare(b.title));

  return items;
}

const getCachedCloudinaryTracks = unstable_cache(loadCloudinaryTracks, ["cloudinary-music-catalog-v2"], {
  revalidate: CACHE_SECONDS,
  tags: ["music-catalog"],
});

function applyFilters(items: MusicTrack[], filters?: MusicCatalogFilters) {
  return items.filter((track) => {
    const byCountry = !filters?.country || filters.country === "all" || track.country === filters.country.toLowerCase();
    const byMood = !filters?.mood || filters.mood === "all" || track.mood === filters.mood.toLowerCase();
    const byTag = !filters?.tag || filters.tag === "all" || track.tags.includes(filters.tag.toLowerCase());
    return byCountry && byMood && byTag;
  });
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.toLowerCase()))].sort((a, b) => a.localeCompare(b));
}

export async function getMusicCatalog(filters?: MusicCatalogFilters): Promise<MusicCatalog> {
  const allTracks = await getCachedCloudinaryTracks();
  const filtered = applyFilters(allTracks, filters);

  return {
    items: filtered,
    countries: uniqueSorted(allTracks.map((track) => track.country)),
    moods: uniqueSorted(allTracks.map((track) => track.mood)),
    tags: uniqueSorted(allTracks.flatMap((track) => track.tags)),
    generatedAt: new Date().toISOString(),
  };
}

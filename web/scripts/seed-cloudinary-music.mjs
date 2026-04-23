import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"]);
const DEFAULT_PREFIX = "myblog/musics";

function parseArgs(argv) {
  const options = {
    dryRun: false,
    source: path.resolve(process.cwd(), "..", "assets", "musics"),
    prefix: process.env.CLOUDINARY_MUSIC_PREFIX || DEFAULT_PREFIX,
    manifest: "",
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--source=")) {
      const value = arg.slice("--source=".length).trim();
      if (value) {
        options.source = path.resolve(process.cwd(), value);
      }
      continue;
    }

    if (arg.startsWith("--prefix=")) {
      const value = arg.slice("--prefix=".length).trim();
      if (value) {
        options.prefix = value;
      }
      continue;
    }

    if (arg.startsWith("--manifest=")) {
      const value = arg.slice("--manifest=".length).trim();
      if (value) {
        options.manifest = path.resolve(process.cwd(), value);
      }
    }
  }

  options.prefix = options.prefix.replace(/^\/+|\/+$/g, "");
  return options;
}

async function loadManifest(manifestPath) {
  if (!manifestPath) {
    return null;
  }

  try {
    const text = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function loadEnvFile(envPath) {
  try {
    const text = await fs.readFile(envPath, "utf8");
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const index = trimmed.indexOf("=");
      if (index <= 0) {
        continue;
      }

      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing .env file
  }
}

function toTitleFromStem(stem) {
  const withoutCountrySuffix = stem.replace(/_[a-z]{2,}$/i, "");
  const spaced = withoutCountrySuffix
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!spaced) {
    return "Untitled";
  }

  return spaced
    .split(" ")
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function collectFiles(sourceDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!AUDIO_EXTENSIONS.has(extension)) {
        continue;
      }

      files.push(fullPath);
    }
  }

  await walk(sourceDir);
  return files;
}

function inferMetadata(filePath, sourceDir, prefix, manifestTrack) {
  const relativePath = path.relative(sourceDir, filePath);
  const parts = relativePath.split(path.sep).filter(Boolean);
  const fileName = parts[parts.length - 1] || "";
  const stem = fileName.replace(path.extname(fileName), "");
  const folderParts = parts.slice(0, -1);

  const country = slugify(manifestTrack?.country || folderParts[0] || "global") || "global";
  const mood = slugify(manifestTrack?.mood || folderParts[1] || "ambient") || "ambient";
  const title = manifestTrack?.title || toTitleFromStem(stem);
  const slug = manifestTrack?.slug || slugify(stem) || slugify(title) || `track-${Date.now()}`;
  const publicId = (manifestTrack?.publicId || `${prefix}/${country}/${mood}/${slug}`).replace(/^\/+|\/+$/g, "");
  const tags = Array.isArray(manifestTrack?.tags)
    ? manifestTrack.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : ["music", country, mood];

  return {
    filePath,
    relativePath,
    country,
    mood,
    title,
    slug,
    publicId,
    tags,
  };
}

function buildSignature(params, apiSecret) {
  const toSign = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex");
}

async function uploadTrack(track, credentials) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const context = `title=${track.title}|country=${track.country}|mood=${track.mood}|tags=${track.tags.join(",")}`;
  const signaturePayload = {
    context,
    invalidate: "true",
    overwrite: "true",
    public_id: track.publicId,
    tags: track.tags.join(","),
    timestamp,
  };

  const signature = buildSignature(signaturePayload, credentials.apiSecret);
  const fileBuffer = await fs.readFile(track.filePath);
  const form = new FormData();

  form.set("file", new Blob([fileBuffer]), path.basename(track.filePath));
  form.set("api_key", credentials.apiKey);
  form.set("timestamp", timestamp);
  form.set("public_id", track.publicId);
  form.set("resource_type", "video");
  form.set("overwrite", "true");
  form.set("invalidate", "true");
  form.set("tags", track.tags.join(","));
  form.set("context", context);
  form.set("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${credentials.cloudName}/video/upload`;
  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Upload failed for ${track.relativePath}: ${response.status} ${message}`);
  }

  const result = await response.json();
  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    duration: result.duration,
    bytes: result.bytes,
    format: result.format,
  };
}

async function run() {
  await loadEnvFile(path.resolve(process.cwd(), ".env"));

  const options = parseArgs(process.argv.slice(2));
  if (!options.manifest) {
    options.manifest = path.resolve(options.source, "cloudinary-seed.json");
  }

  const manifest = await loadManifest(options.manifest);
  const manifestTracks = manifest?.tracks && typeof manifest.tracks === "object" ? manifest.tracks : {};
  if (manifest?.defaultPrefix && !process.argv.some((arg) => arg.startsWith("--prefix="))) {
    options.prefix = String(manifest.defaultPrefix).replace(/^\/+|\/+$/g, "") || options.prefix;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const files = await collectFiles(options.source);
  const tracks = files.map((filePath) => {
    const relativePath = path.relative(options.source, filePath).split(path.sep).join("/");
    return inferMetadata(filePath, options.source, options.prefix, manifestTracks[relativePath]);
  });

  if (!tracks.length) {
    console.log(`[seed-music] No audio files found in ${options.source}`);
    return;
  }

  console.log(`[seed-music] Prepared ${tracks.length} tracks from ${options.source}`);

  if (options.dryRun) {
    for (const track of tracks) {
      console.log(`${track.relativePath} -> ${track.publicId}`);
    }
    return;
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
  }

  const credentials = { cloudName, apiKey, apiSecret };
  const uploaded = [];

  for (const track of tracks) {
    const result = await uploadTrack(track, credentials);
    uploaded.push({
      relativePath: track.relativePath,
      publicId: result.publicId,
      secureUrl: result.secureUrl,
      duration: result.duration,
      bytes: result.bytes,
      format: result.format,
    });

    console.log(`[seed-music] Uploaded ${track.relativePath} -> ${result.publicId}`);
  }

  console.log("[seed-music] Upload complete");
  console.log(JSON.stringify(uploaded, null, 2));
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed-music] ${message}`);
  process.exit(1);
});

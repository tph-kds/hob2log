import { getPublicEnv } from "@/lib/env";

interface CloudinaryImageOptions {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "scale";
  quality?: string;
  format?: "webp" | "avif" | "jpg" | "png";
}

export function buildCloudinaryImageUrl(publicId: string, options?: CloudinaryImageOptions) {
  const env = getPublicEnv();
  const width = options?.width ?? 900;
  const height = options?.height ?? 1200;
  const crop = options?.crop ?? "fill";
  const quality = options?.quality ?? "auto";
  const format = options?.format ?? "webp";

  const transforms = [`c_${crop}`, `w_${width}`, `h_${height}`, `q_${quality}`, `f_${format}`].join(",");

  return `https://res.cloudinary.com/${env.cloudinaryCloudName}/image/upload/${transforms}/${publicId}`;
}
import { NextRequest, NextResponse } from "next/server";
import { getMusicCatalog } from "@/lib/music/cloudinary-music";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get("country") ?? undefined;
    const mood = request.nextUrl.searchParams.get("mood") ?? undefined;
    const tag = request.nextUrl.searchParams.get("tag") ?? undefined;

    const catalog = await getMusicCatalog({ country, mood, tag });

    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load music catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

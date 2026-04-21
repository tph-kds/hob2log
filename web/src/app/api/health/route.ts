import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "hob2log-web",
    timestamp: new Date().toISOString(),
  });
}
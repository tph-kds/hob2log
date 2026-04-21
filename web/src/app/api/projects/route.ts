import { NextResponse } from "next/server";
import { projects } from "@/content/projects";

export async function GET() {
  return NextResponse.json({ items: projects });
}
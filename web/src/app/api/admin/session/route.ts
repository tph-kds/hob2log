import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  isAdminSessionAuthorized,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-session";

export async function GET() {
  const authorized = await isAdminSessionAuthorized();
  return NextResponse.json({ authorized });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(response);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}

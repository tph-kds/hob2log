import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  isAdminSessionAuthorized,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-session";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 20 * 60 * 1000;

type LoginAttemptState = {
  failedCount: number;
  lockUntil: number;
};

const loginAttemptsByClient = new Map<string, LoginAttemptState>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cloudflareIp = request.headers.get("cf-connecting-ip");

  const clientIp =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cloudflareIp?.trim() ||
    "unknown";

  return clientIp.length > 0 ? clientIp : "unknown";
}

function getLockoutResponse(lockUntil: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((lockUntil - Date.now()) / 1000));

  return NextResponse.json(
    {
      error: "Too many failed attempts. Try again in 20 minutes.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export async function GET() {
  const authorized = await isAdminSessionAuthorized();
  return NextResponse.json({ authorized });
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const existingState = loginAttemptsByClient.get(clientKey);
  const now = Date.now();

  if (existingState && existingState.lockUntil > now) {
    return getLockoutResponse(existingState.lockUntil);
  }

  if (existingState && existingState.lockUntil > 0 && existingState.lockUntil <= now) {
    loginAttemptsByClient.delete(clientKey);
  }

  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyAdminPassword(password)) {
      const currentState = loginAttemptsByClient.get(clientKey);
      const failedCount = (currentState?.failedCount ?? 0) + 1;

      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        loginAttemptsByClient.set(clientKey, { failedCount, lockUntil });
        return getLockoutResponse(lockUntil);
      }

      loginAttemptsByClient.set(clientKey, { failedCount, lockUntil: 0 });

      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    loginAttemptsByClient.delete(clientKey);

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

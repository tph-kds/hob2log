import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "hob2log_admin_session";
const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getRequiredAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("Missing required environment variable: ADMIN_PASSWORD");
  }

  return password;
}

function getExpectedSessionToken() {
  const adminPassword = getRequiredAdminPassword();
  return hashValue(`hob2log-admin:${adminPassword}`);
}

export function verifyAdminPassword(password: string) {
  const normalizedInput = password.trim();

  if (!normalizedInput) {
    return false;
  }

  const expectedHash = hashValue(getRequiredAdminPassword());
  const providedHash = hashValue(normalizedInput);

  return safeCompare(providedHash, expectedHash);
}

export async function isAdminSessionAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  return safeCompare(token, getExpectedSessionToken());
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: getExpectedSessionToken(),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

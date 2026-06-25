import { cookies } from "next/headers";
import { headers } from "next/headers";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

async function generateToken(): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(32).toString("hex");
}

export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE)?.value;
  if (!token) {
    token = await generateToken();
    cookieStore.set(CSRF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });
  }
  return token;
}

export async function validateCsrf(): Promise<void> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = hdrs.get(CSRF_HEADER) ?? hdrs.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error("Invalid CSRF token");
  }
}

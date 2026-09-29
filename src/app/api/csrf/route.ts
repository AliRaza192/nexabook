import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCsrfToken } from "@/lib/csrf";

export async function GET() {
  const token = await getCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set("csrf-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });
  return NextResponse.json({ token });
}

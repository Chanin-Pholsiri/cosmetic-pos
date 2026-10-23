import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createMemberSession } from "@/lib/member-auth";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const failUrl = new URL("/account/login?error=google", appUrl);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("google_oauth_state")?.value;
  const next = store.get("google_oauth_next")?.value ?? "/my";
  store.delete("google_oauth_state");
  store.delete("google_oauth_next");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(failUrl);
  }

  try {
    // แลก authorization code เป็น access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return NextResponse.redirect(failUrl);
    const tokens: { access_token: string } = await tokenRes.json();

    const userRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!userRes.ok) return NextResponse.redirect(failUrl);
    const profile: { sub: string; email?: string; name?: string } =
      await userRes.json();

    // หา member จาก googleId → อีเมล → ถ้าไม่พบ สร้างใหม่
    let member = await prisma.member.findUnique({
      where: { googleId: profile.sub },
    });
    if (!member && profile.email) {
      const byEmail = await prisma.member.findUnique({
        where: { email: profile.email },
      });
      if (byEmail) {
        member = await prisma.member.update({
          where: { id: byEmail.id },
          data: { googleId: profile.sub },
        });
      }
    }
    if (!member) {
      const count = await prisma.member.count();
      member = await prisma.member.create({
        data: {
          code: `M-${String(count + 1).padStart(4, "0")}`,
          name: profile.name ?? "สมาชิก Google",
          email: profile.email ?? null,
          googleId: profile.sub,
          notes: "สมัครสมาชิกด้วย Google",
        },
      });
    }

    await createMemberSession(member.id);

    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/my";
    return NextResponse.redirect(new URL(safeNext, appUrl));
  } catch {
    return NextResponse.redirect(failUrl);
  }
}

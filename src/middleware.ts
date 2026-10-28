import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { limitAuthRequest } from "@/lib/rate-limit";

export default auth(async (req) => {
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const { success } = await limitAuthRequest(`auth:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 },
      );
    }
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/api/auth/:path*"],
};

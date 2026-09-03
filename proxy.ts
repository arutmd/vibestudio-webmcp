import { NextRequest, NextResponse } from "next/server";
import { isBlockedDemoPath } from "@/lib/demoMode";

export function proxy(request: NextRequest) {
  if (
    process.env.VIBESTUDIO_DEMO_MODE === "1" &&
    isBlockedDemoPath(request.nextUrl.pathname)
  ) {
    return NextResponse.json(
      {
        error:
          "This capability is disabled in the public judge demo. Creator data and external integrations stay private.",
      },
      { status: 403 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};

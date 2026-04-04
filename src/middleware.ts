import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Protects `/admin/*` when `ADMIN_SECRET` is set.
 * Send `Authorization: Bearer <ADMIN_SECRET>` or cookie `chess_admin=<ADMIN_SECRET>`.
 * If `ADMIN_SECRET` is unset, `/admin` returns 404 so the route is not advertised.
 */
export function middleware(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 404 });
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookie = request.cookies.get("chess_admin")?.value;
  const token = bearer ?? cookie;

  if (token !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

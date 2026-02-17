import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route Protection Middleware (Edge Runtime)
 *
 * Cookie-based auth gating. Does NOT import @/lib/auth because
 * Better Auth + Prisma pull in Node.js built-ins (node:path, crypto)
 * which are unavailable in the Edge Runtime.
 *
 * Strategy:
 * - Public routes → pass through
 * - Protected routes → check for session cookie
 * - Full session validation happens in server components / API routes
 *
 * Public routes:
 * - /login, /accept-invite, /api/health, / (landing)
 * - /api/auth/(.*) (Better Auth endpoints)
 * - Static assets (_next/static, _next/image, favicon.ico)
 */

const PUBLIC_ROUTES = [
  "/login",
  "/accept-invite",
  "/api/health",
  "/",
];

const PUBLIC_ROUTE_PATTERNS = [
  /^\/api\/auth\/.*/,
  /^\/api\/health/,
];

/** Better Auth session cookie name */
const SESSION_COOKIE = "better-auth.session_token";

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie (lightweight Edge-safe check)
  // Full session validation happens server-side in pages/API routes
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Match all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

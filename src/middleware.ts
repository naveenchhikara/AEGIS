import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Route Protection Middleware
 *
 * Protects all routes except public ones with Better Auth session checks.
 *
 * Public routes:
 * - /login
 * - /accept-invite
 * - /api/health
 * - /api/auth/(.*)
 * - / (landing page only)
 *
 * All other routes require authentication.
 * Unauthenticated requests redirect to /login?redirect={original_path}
 */

const PUBLIC_ROUTES = [
  "/login",
  "/accept-invite",
  "/api/health",
  "/",
];

const PUBLIC_ROUTE_PATTERNS = [
  /^\/api\/auth\/.*/,
];

function isPublicRoute(pathname: string): boolean {
  // Exact match for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  // Pattern match for public route patterns
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      // Not authenticated - redirect to login with return URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated - allow request
    return NextResponse.next();
  } catch (error) {
    // Session check failed - redirect to login
    logger.error({ error, path: pathname }, "Middleware session check failed");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
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

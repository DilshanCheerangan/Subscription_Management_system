import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "brightloop_token";
const DEFAULT_SECRET = "brightloop_super_secret_jwt_key_default_32_bytes_min";

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

interface TokenPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  name: string;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as "ADMIN" | "STAFF" | "CUSTOMER",
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;

  // Protect Admin/Operations routes (/admin and operational pages)
  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/quotations") ||
    pathname.startsWith("/subscriptions") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/rules") ||
    pathname.startsWith("/billing-run") ||
    pathname.startsWith("/reports");

  const isPortalRoute = pathname.startsWith("/portal");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password");

  // 1. If trying to access protected admin route
  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user.role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  // 2. If trying to access protected portal route
  if (isPortalRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. If already logged in and visiting login/signup
  if (isAuthRoute && user) {
    if (user.role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/portal", request.url));
    } else {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/quotations/:path*",
    "/subscriptions/:path*",
    "/invoices/:path*",
    "/payments/:path*",
    "/customers/:path*",
    "/catalog/:path*",
    "/rules/:path*",
    "/billing-run/:path*",
    "/reports/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password/:path*",
  ],
};

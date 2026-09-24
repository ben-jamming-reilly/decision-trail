import { NextResponse, type NextRequest } from "next/server";

const RECALL_WEBHOOK_PATH = "/api/webhooks/recall";

export function proxy(request: NextRequest) {
  const publicHostname = getPublicHostname();
  if (!publicHostname || getRequestHostname(request) !== publicHostname) {
    return NextResponse.next();
  }

  if (
    request.method === "POST" &&
    request.nextUrl.pathname === RECALL_WEBHOOK_PATH
  ) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function getRequestHostname(request: NextRequest) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",", 1)[0]
    .trim();
  const host = forwardedHost || request.headers.get("host");
  if (!host) return request.nextUrl.hostname;

  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return request.nextUrl.hostname;
  }
}

function getPublicHostname() {
  const value = process.env.PUBLIC_API_BASE_URL?.trim();
  if (!value) return null;

  try {
    return new URL(value).hostname;
  } catch {
    console.error("PUBLIC_API_BASE_URL must be a valid absolute URL");
    return null;
  }
}

export const config = {
  matcher: "/:path*",
};

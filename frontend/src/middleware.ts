import { NextRequest, NextResponse } from "next/server";

const ADMIN_HOST = "admin.scanpdf.id.vn";
const PUBLIC_HOSTS = new Set(["scanpdf.id.vn", "www.scanpdf.id.vn"]);

function cleanHost(host: string | null) {
  return (host || "").split(":")[0]?.toLowerCase() || "";
}

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith("/_next")
    || pathname.startsWith("/api")
    || pathname.startsWith("/favicon")
    || pathname.startsWith("/scanpdf-")
    || /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml)$/.test(pathname)
  );
}

function adminVisiblePath(pathname: string) {
  if (pathname === "/admin") return "/";
  return pathname.replace(/^\/admin(?=\/|$)/, "") || "/";
}

function adminInternalPath(pathname: string) {
  if (pathname === "/") return "/admin/login";
  return pathname.startsWith("/admin") ? pathname : `/admin${pathname}`;
}

export function middleware(request: NextRequest) {
  const host = cleanHost(request.headers.get("host"));
  const { pathname, search } = request.nextUrl;

  if (isAssetPath(pathname)) return NextResponse.next();

  if (host === ADMIN_HOST) {
    if (pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = adminVisiblePath(pathname);
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = adminInternalPath(pathname);
    url.search = search;
    return NextResponse.rewrite(url);
  }

  if (PUBLIC_HOSTS.has(host) && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.hostname = ADMIN_HOST;
    url.pathname = adminVisiblePath(pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse, type NextRequest } from "next/server";

function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      name.includes("-auth-token") ||
      name.startsWith("sb-") ||
      name.includes("supabase")
    );
  });
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next({ request });
  }

  if (!hasAuthCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

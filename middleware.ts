import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	});

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		return response;
	}

	const supabase = createServerClient(
		supabaseUrl,
		supabaseKey,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value)
					);
					response = NextResponse.next({
						request,
					});
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	// Refresh session if expired - required for Server Components
	await supabase.auth.getUser();

	const { pathname } = request.nextUrl;

	// Allow access to public pages
	if (
		pathname.startsWith("/auth/") ||
		pathname.startsWith("/waiting") ||
		pathname === "/" ||
		pathname.startsWith("/api/") ||
		pathname.startsWith("/_next/") ||
		pathname.includes(".")
	) {
		return response;
	}

	// For now, allow access to all other routes
	// The actual auth checking will be done in the components/pages
	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};

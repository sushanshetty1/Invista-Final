"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthRedirect() {
	const { user, hasCompanyAccess, loading, checkUserAccess } = useAuth();
	const router = useRouter();
	const [hasRedirected, setHasRedirected] = useState(false);

	useEffect(() => {
		const handleRedirect = async () => {
			if (hasRedirected) return;

			if (!loading && user) {
				console.log("AuthRedirect - User found, checking access");
				// Only check user access once if we don't already have access
				if (!hasCompanyAccess) {
					await checkUserAccess();
				}

				// Wait a moment for the access check to complete
				setTimeout(() => {
					if (hasCompanyAccess) {
						console.log(
							"AuthRedirect - User has company access, redirecting to dashboard",
						);
						setHasRedirected(true);
						router.push("/dashboard");
					} else {
						console.log(
							"AuthRedirect - User without company access, redirecting to waiting",
						);
						setHasRedirected(true);
						router.push("/waiting");
					}
				}, 1000);
			} else if (!loading && !user) {
				// Not authenticated - redirect to login
				console.log("AuthRedirect - No user, redirecting to login");
				setHasRedirected(true);
				router.push("/auth/login");
			}
		};

		handleRedirect();
	}, [user, hasCompanyAccess, loading, router, checkUserAccess, hasRedirected]);

	// Show loading while determining redirect
	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
				<p className="text-muted-foreground">
					Determining your access level...
				</p>
			</div>
		</div>
	);
}

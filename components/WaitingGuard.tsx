"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Mail } from "lucide-react";

interface WaitingGuardProps {
	children: React.ReactNode;
}

export default function WaitingGuard({ children }: WaitingGuardProps) {
	const { user, hasCompanyAccess, loading } = useAuth();
	const router = useRouter();
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [hasCheckedInitialAccess, setHasCheckedInitialAccess] = useState(false);

	// Check if user has ever been granted access (persists through page reloads)
	useEffect(() => {
		if (typeof window !== "undefined" && user && !hasCheckedInitialAccess) {
			setHasCheckedInitialAccess(true);

			// Check for permanent access flag - this means we never show waiting page again
			const hasBeenGrantedAccess =
				localStorage.getItem(`invista_has_access_${user.id}`) === "true";

			// Check if user has recently accepted an invite
			const inviteAccepted =
				localStorage.getItem("invista_invite_accepted") === "true";
			const inviteAcceptedTime = parseInt(
				localStorage.getItem("invista_invite_accepted_time") || "0",
				10,
			);
			const oneHourMs = 60 * 60 * 1000;

			// If user was ever granted access or accepted an invite recently, redirect to dashboard
			if (
				hasBeenGrantedAccess ||
				(inviteAccepted && Date.now() - inviteAcceptedTime < oneHourMs)
			) {
				// Always set the permanent access flag
				if (user?.id) {
					localStorage.setItem(`invista_has_access_${user.id}`, "true");
					localStorage.setItem(
						`invista_has_access_time_${user.id}`,
						Date.now().toString(),
					);
				}

				console.log(
					"WaitingGuard - User previously had access or recently accepted invite, redirecting to dashboard",
				);
				setIsRedirecting(true);
				router.push("/dashboard");
			}
		}
	}, [user, hasCheckedInitialAccess, router]);

	// Handle navigation based on auth state - simplified logic
	useEffect(() => {
		if (isRedirecting || !hasCheckedInitialAccess) return; // Avoid multiple redirects

		// Only make navigation decisions after initial loading is complete
		if (!loading) {
			console.log(
				"WaitingGuard - user:",
				user?.email,
				"hasAccess:",
				hasCompanyAccess,
			);

			// User has company access - redirect to dashboard
			if (user && hasCompanyAccess) {
				console.log("WaitingGuard - User has access, redirecting to dashboard");
				// Set permanent access flag
				if (user?.id) {
					localStorage.setItem(`invista_has_access_${user.id}`, "true");
					localStorage.setItem(
						`invista_has_access_time_${user.id}`,
						Date.now().toString(),
					);
				}
				setIsRedirecting(true);
				router.push("/dashboard");
			}

			// Only redirect to login if we're sure user is not authenticated
			if (!user) {
				console.log("WaitingGuard - No user, redirecting to login");
				setIsRedirecting(true);
				router.push("/auth/login");
			}
		}
	}, [
		user,
		hasCompanyAccess,
		loading,
		router,
		isRedirecting,
		hasCheckedInitialAccess,
	]);
	// Show loading state while auth is initializing
	if (loading || isRedirecting) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Mail className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
					<p className="text-muted-foreground text-lg">
						{loading ? "Loading..." : "Redirecting..."}
					</p>
				</div>
			</div>
		);
	}

	// If we get here and there's no user, we'll redirect in the useEffect
	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Mail className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
					<p className="text-muted-foreground text-lg">
						Checking authentication...
					</p>
				</div>
			</div>
		);
	}

	// Render children if user is authenticated and doesn't have company access
	return <>{children}</>;
}

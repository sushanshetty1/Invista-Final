"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { dataPreloader } from "@/hooks/use-data-preloader";
import { logLoginAttempt } from "@/lib/login-history";

type AuthContextType = {
	user: any;
	loading: boolean;
	userType: "company" | "individual" | null;
	hasCompanyAccess: boolean;
	currentSessionId: string | null;
	signUp: (email: string, password: string) => Promise<any>;
	login: (email: string, password: string) => Promise<any>;
	signInWithGoogle: () => Promise<any>;
	logout: () => Promise<void>;
	resetPassword: (email: string) => Promise<any>;
	deleteAccount: () => Promise<any>;
	checkUserAccess: () => Promise<void>;
	refreshAccess: () => Promise<void>;
	logoutAllDevices: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [userType, setUserType] = useState<"company" | "individual" | null>(
		null,
	);
	const [hasCompanyAccess, setHasCompanyAccess] = useState(false);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
	const router = useRouter();

	// Add debouncing to prevent multiple rapid access checks
	const [lastAccessCheck, setLastAccessCheck] = useState<number>(0);
	const [isCheckingAccess, setIsCheckingAccess] = useState(false);
	const ACCESS_CHECK_DEBOUNCE = 2000; // 2 seconds

	// Session creation helper (fire-and-forget)
	const createUserSession = async (userId: string, token?: string) => {
		try {
			const response = await fetch("/api/auth/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, supabaseToken: token }),
			});
			const data = await response.json();
			if (data.success && data.sessionId) {
				setCurrentSessionId(data.sessionId);
				if (typeof window !== "undefined") {
					localStorage.setItem(`invista_session_id_${userId}`, data.sessionId);
				}
			}
		} catch (error) {
			console.error("Failed to create session (non-blocking):", error);
		}
	};

	// Session revocation helper
	const revokeCurrentSession = async (userId: string) => {
		try {
			const sessionId = currentSessionId ||
				(typeof window !== "undefined"
					? localStorage.getItem(`invista_session_id_${userId}`)
					: null);

			if (sessionId) {
				await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
					method: "DELETE",
				});
				if (typeof window !== "undefined") {
					localStorage.removeItem(`invista_session_id_${userId}`);
				}
			}
		} catch (error) {
			console.error("Failed to revoke session (non-blocking):", error);
		}
	};

	const checkUserAccess = async () => {
		if (!user?.email || !user?.id) {
			setUserType(null);
			setHasCompanyAccess(false);
			return;
		}

		// Prevent concurrent checks
		if (isCheckingAccess) {
			console.log("AuthContext - Access check already in progress");
			return;
		}

		// Debouncing - prevent multiple rapid checks
		const now = Date.now();
		if (now - lastAccessCheck < ACCESS_CHECK_DEBOUNCE) {
			console.log("AuthContext - Access check debounced");
			return;
		}
		setLastAccessCheck(now);
		setIsCheckingAccess(true);

		console.log("AuthContext - Checking user access");

		// First check if user previously had access (permanent flag)
		if (typeof window !== "undefined") {
			const hasBeenGrantedAccess =
				localStorage.getItem(`invista_has_access_${user.id}`) === "true";
			if (hasBeenGrantedAccess) {
				console.log(
					"AuthContext - User previously had access, setting hasCompanyAccess to true",
				);
				setUserType("company");
				setHasCompanyAccess(true);
				return;
			}
		}
		try {
			// Optimized single query approach - check for company access first
			const { data: companyUserData, error: companyUserError } = await supabase
				.from("company_users")
				.select(`
                    id,
                    role,
                    isOwner,
                    isActive,
                    companyId,
                    userId,
                    company:companies!inner(id, name, isActive)
                `)
				.eq("userId", user.id)
				.eq("isActive", true)
				.eq("company.isActive", true)
				.limit(1);

			if (!companyUserError && companyUserData && companyUserData.length > 0) {
				console.log("AuthContext - User found in company_users");
				setUserType("company");
				setHasCompanyAccess(true);
				if (typeof window !== "undefined") {
					localStorage.setItem(`invista_has_access_${user.id}`, "true");
				}

				return;
			}

			// If not found as company user, check if user owns a company
			const { data: ownedCompany, error: ownedError } = await supabase
				.from("companies")
				.select("id, name, createdBy")
				.eq("createdBy", user.id)
				.eq("isActive", true)
				.limit(1);

			if (!ownedError && ownedCompany && ownedCompany.length > 0) {
				console.log("AuthContext - User owns a company");
				setUserType("company");
				setHasCompanyAccess(true);
				if (typeof window !== "undefined") {
					localStorage.setItem(`invista_has_access_${user.id}`, "true");
				}

				return;
			}

			// Final fallback - check user invitations by email
			const { data: inviteData, error: inviteError } = await supabase
				.from("user_invitations")
				.select("id, status, email")
				.eq("email", user.email)
				.eq("status", "ACCEPTED")
				.limit(1);

			if (!inviteError && inviteData && inviteData.length > 0) {
				console.log("AuthContext - User has accepted invitation");
				setUserType("individual");
				setHasCompanyAccess(true);
				if (typeof window !== "undefined") {
					localStorage.setItem(`invista_has_access_${user.id}`, "true");
				}
				return;
			}

			// If we reach here, no company access was found
			setUserType("individual");
			setHasCompanyAccess(false);

			console.log(`AuthContext - No access found for user ${user.email}`);
		} catch (error) {
			console.error("AuthContext - Error checking user access:", error);
			setUserType("individual");
			setHasCompanyAccess(false);
		} finally {
			setIsCheckingAccess(false);
		}
	};

	const checkSessionExpiry = () => {
		if (!user?.id) return;
		const loginTime = localStorage.getItem(`invista_login_time_${user.id}`);
		if (loginTime) {
			const elapsed = Date.now() - parseInt(loginTime);
			if (elapsed > 6 * 60 * 60 * 1000) { // 6 hours
				console.log("Session expired, logging out");
				logout();
			}
		}
	};
	useEffect(() => {
		let isMounted = true;
		let subscription: { unsubscribe: () => void } | undefined;

		const initializeAuth = async () => {
			// Check session expiry on mount
			checkSessionExpiry();
			try {
				console.log("AuthContext - Initializing auth state");

				// Set a timeout to prevent infinite loading
				const timeoutId = setTimeout(() => {
					if (isMounted) {
						console.log(
							"AuthContext - Auth initialization timeout, setting loading to false",
						);
						setLoading(false);
					}
				}, 10000); // 10 seconds timeout

				// First, get the current session
				const { data: sessionData, error: sessionError } =
					await supabase.auth.getSession();
				const currentSession = sessionData?.session;

				if (sessionError) {
					console.error("AuthContext - Error getting session:", sessionError);
				}

				if (isMounted) {
					clearTimeout(timeoutId);
					if (currentSession?.user) {
						console.log(
							"AuthContext - Session found:",
							currentSession.user.email,
						);
						setUser(currentSession.user);

						// Check user access and start preloading
						try {
							await checkUserAccess();
							// Start preloading company data in the background
							dataPreloader
								.preloadCompanyData(currentSession.user.id)
								.catch(console.error);
						} catch (accessError) {
							console.error(
								"AuthContext - Error checking user access:",
								accessError,
							);
							// Don't fail initialization if access check fails
						}

						// Check session expiry after access check
						checkSessionExpiry();
					} else {
						console.log("AuthContext - No session found");
						setUser(null);
						setUserType(null);
						setHasCompanyAccess(false);
					}

					// Only set loading to false after we've fully initialized
					setLoading(false);
				}

				// Set up the auth state change listener
				const { data } = supabase.auth.onAuthStateChange(
					async (event, session) => {
						if (!isMounted) return;

						console.log("AuthContext - Auth state change:", event);

						if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
							if (session?.user) {
								console.log(
									"AuthContext - User signed in or token refreshed:",
									session.user.email,
								);
								setUser(session.user);

								// Set login time
								if (typeof window !== "undefined") {
									localStorage.setItem(`invista_login_time_${session.user.id}`, Date.now().toString());
								}

								// Log successful login (for both email/password and OAuth)
								if (event === "SIGNED_IN") {
									await logLoginAttempt({
										userId: session.user.id,
										email: session.user.email || "",
										successful: true,
									});
									// Create UserSession record for OAuth login
									createUserSession(session.user.id, session.access_token);
								}

								// Handle Google sign-in user creation
								const { data: existingUser } = await supabase
									.from("users")
									.select("id")
									.eq("id", session.user.id)
									.single();

								if (!existingUser && isMounted) {
									// Create user record for Google sign-in
									const fullName = session.user.user_metadata?.full_name || "";
									const [firstName = "", lastName = ""] = fullName.split(" ");

									await supabase.from("users").insert({
										id: session.user.id,
										email: session.user.email || "",
										firstName: firstName || null,
										lastName: lastName || null,
										displayName: fullName || null,
										avatar: session.user.user_metadata?.avatar_url || null,
										phone: session.user.user_metadata?.phone || null,
										timezone: "UTC",
										language: "en",
										theme: "system",
										isActive: true,
										isVerified: true,
										emailVerified: session.user.email_confirmed_at
											? true
											: false,
										twoFactorEnabled: false,
										failedLoginCount: 0,
										createdAt: new Date().toISOString(),
										updatedAt: new Date().toISOString(),
									});
								}
								// Only check user access for new sign-ins, not token refreshes
								if (event === "SIGNED_IN" && isMounted) {
									// Small delay to allow user creation to complete, then start preloading
									setTimeout(async () => {
										await checkUserAccess();
										// Start preloading company data in the background
										if (session.user.id) {
											dataPreloader
												.preloadCompanyData(session.user.id)
												.catch(console.error);
										}
									}, 500);
								}
							}
						} else if (event === "SIGNED_OUT") {
							console.log("AuthContext - User signed out");
							if (isMounted) {
								setUser(null);
								setUserType(null);
								setHasCompanyAccess(false);
							}
						}
					},
				);

				subscription = data.subscription;
			} catch (error) {
				console.error("Error initializing auth:", error);
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		initializeAuth();

		return () => {
			isMounted = false;
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, []);

	const signUp = async (email: string, password: string) => {
		return await supabase.auth.signUp({ email, password });
	};

	const login = async (email: string, password: string) => {
		try {
			const result = await supabase.auth.signInWithPassword({ email, password });

			// Log login attempt
			if (result.data?.user) {
				// Successful login
				await logLoginAttempt({
					userId: result.data.user.id,
					email: email,
					successful: true,
				});
				// Set login time for session timeout
				if (typeof window !== "undefined") {
					localStorage.setItem(`invista_login_time_${result.data.user.id}`, Date.now().toString());
				}
				// Create UserSession record (fire-and-forget)
				createUserSession(result.data.user.id, result.data.session?.access_token);
			} else if (result.error) {
				// Failed login - try to get userId by email
				await logLoginAttempt({
					email: email,
					successful: false,
					failReason: result.error.message,
				});
			}

			return result;
		} catch (error) {
			console.error("Login error:", error);
			// Log failed attempt
			await logLoginAttempt({
				email: email,
				successful: false,
				failReason: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	};

	const signInWithGoogle = async () => {
		return await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		});
	};

	const logoutInFlightRef = { current: false } as { current: boolean };

	const logout = async () => {
		if (logoutInFlightRef.current) return; // prevent duplicate triggers
		logoutInFlightRef.current = true;
		try {
			console.log("AuthContext - Starting logout process (optimized)");

			// Optimistic UI: clear state immediately
			const prevUserId = user?.id;
			setUser(null);
			setUserType(null);
			setHasCompanyAccess(false);
			setCurrentSessionId(null);

			// Revoke UserSession record (fire-and-forget)
			if (prevUserId) {
				revokeCurrentSession(prevUserId);
			}

			// Clear localStorage flags ASAP
			if (typeof window !== "undefined" && prevUserId) {
				localStorage.removeItem(`invista_has_access_${prevUserId}`);
				localStorage.removeItem(`invista_login_time_${prevUserId}`);
				localStorage.removeItem(`invista_session_id_${prevUserId}`);
			}

			// Clear prefetched caches
			try { dataPreloader.clearCache(); } catch { /* ignore */ }

			// Perform Supabase sign out with timeout race to avoid hanging UX
			const signOutPromise = supabase.auth.signOut();
			const timeout = new Promise<{ error?: Error | null }>((resolve) =>
				setTimeout(() => resolve({ error: null }), 4000)
			);
			const { error } = await Promise.race([signOutPromise, timeout]);
			if (error) console.warn("AuthContext - Supabase signOut reported error", error);

			// Navigate away (replace to prevent back navigation to authed pages)
			router.replace("/");
		} catch (error) {
			console.error("AuthContext - Logout error (optimized path):", error);
			router.replace("/");
		} finally {
			logoutInFlightRef.current = false;
		}
	};

	const logoutAllDevices = async () => {
		if (!user?.id) return;

		try {
			console.log("AuthContext - Logging out from all devices");

			// Revoke all sessions except current (optional: remove exceptSessionId to revoke all)
			const currentSession = currentSessionId ||
				(typeof window !== "undefined"
					? localStorage.getItem(`invista_session_id_${user.id}`)
					: null);

			await fetch(`/api/auth/sessions?userId=${user.id}&revokeAll=true&exceptSessionId=${currentSession || ""}`, {
				method: "DELETE",
			});

			console.log("AuthContext - All other sessions revoked");
		} catch (error) {
			console.error("AuthContext - Error logging out all devices:", error);
		}
	};

	const resetPassword = async (email: string) => {
		try {
			// Step 1: Send reset email via Supabase Auth
			const result = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${location.origin}/auth/reset-password`,
			});

			if (result.error) {
				return result;
			}

			// Step 2: Log password reset request to password_resets table
			try {
				// Get user ID from email
				const { data: userData } = await supabase
					.from("users")
					.select("id")
					.eq("email", email)
					.single();

				if (userData?.id) {
					// Generate a token placeholder (actual token is in the email link)
					const tokenPlaceholder = `reset_${Date.now()}_${Math.random().toString(36).substring(7)}`;

					// Log to password_resets table
					await supabase.from("password_resets").insert({
						userId: userData.id,
						token: tokenPlaceholder,
						expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
						isUsed: false,
						ipAddress: typeof window !== "undefined" ? window.location.hostname : null,
						userAgent: typeof window !== "undefined" ? window.navigator.userAgent : null,
					});

					console.log("✅ Password reset logged to database");
				}
			} catch (logError) {
				console.error("⚠️ Failed to log password reset:", logError);
				// Don't fail the reset request if logging fails
			}

			return result;
		} catch (error) {
			console.error("❌ Password reset error:", error);
			throw error;
		}
	};

	const deleteAccount = async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (user) {
			return await supabase.rpc("delete_user", { uid: user.id });
		}

		return { error: { message: "No user found" } };
	};

	const refreshAccess = async () => {
		console.log("AuthContext - Manual refresh access requested");
		await checkUserAccess();
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				userType,
				hasCompanyAccess,
				currentSessionId,
				signUp,
				login,
				signInWithGoogle,
				logout,
				resetPassword,
				deleteAccount,
				checkUserAccess,
				refreshAccess,
				logoutAllDevices,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
};

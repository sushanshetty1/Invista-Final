import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export function useUserRole() {
	const { user, hasCompanyAccess } = useAuth();
	const [userRole, setUserRole] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [canAccessCompanyProfile, setCanAccessCompanyProfile] = useState(false);

	useEffect(() => {
		const checkUserRole = async () => {
			if (!user?.id || !hasCompanyAccess) {
				setUserRole(null);
				setCanAccessCompanyProfile(false);
				setLoading(false);
				return;
			}

			try {
				// Check user role in company_users table using Supabase Auth user ID
				const { data: companyUserData, error: companyUserError } =
					await supabase
						.from("company_users")
						.select("role, isOwner, isActive")
						.eq("userId", user.id)
						.eq("isActive", true)
						.single();

				if (companyUserData) {
					const role = companyUserData.isOwner ? "OWNER" : companyUserData.role;
					setUserRole(role);
					setCanAccessCompanyProfile(
						["OWNER", "ADMIN", "MANAGER"].includes(role),
					);
				} else {
					// Fallback: Check with internal user ID
					const { data: userRecords } = await supabase
						.from("users")
						.select("id")
						.eq("email", user.email);

					if (userRecords && userRecords.length > 0) {
						const { data: companyUserByInternalId } = await supabase
							.from("company_users")
							.select("role, isOwner, isActive")
							.eq("userId", userRecords[0].id)
							.eq("isActive", true)
							.single();

						if (companyUserByInternalId) {
							const role = companyUserByInternalId.isOwner
								? "OWNER"
								: companyUserByInternalId.role;
							setUserRole(role);
							setCanAccessCompanyProfile(
								["OWNER", "ADMIN", "MANAGER"].includes(role),
							);
						} else {
							setUserRole("EMPLOYEE"); // Default role
							setCanAccessCompanyProfile(false);
						}
					}
				}
			} catch (error) {
				console.error("Error checking user role:", error);
				setUserRole("EMPLOYEE"); // Default to employee if error
				setCanAccessCompanyProfile(false);
			} finally {
				setLoading(false);
			}
		};

		checkUserRole();
	}, [user, hasCompanyAccess]);

	return {
		userRole,
		loading,
		canAccessCompanyProfile,
	};
}

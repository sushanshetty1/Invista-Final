import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface CompanyProfile {
	id: string;
	name: string;
	displayName?: string;
	description?: string;
	industry?: string;
	website?: string;
	logo?: string;
	address?: any;
	email?: string;
	phone?: string;
	size?: string;
	businessType?: string;
	registrationNumber?: string;
	taxId?: string;
	createdAt: string;
	updatedAt: string;
}

interface TeamMember {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	avatar?: string;
	role: string;
	title?: string;
	status: "PENDING" | "ACTIVE" | "INACTIVE";
	isOwner: boolean;
	joinedAt?: string;
	lastActive?: string;
	departmentId?: string;
	type: "user" | "invite";
	createdAt?: string;
	expiresAt?: string;
}

interface UseCompanyDataResult {
	companyProfile: CompanyProfile | null;
	teamMembers: TeamMember[];
	userRole: string | null;
	isOwner: boolean;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
	updateCompany: (data: Partial<CompanyProfile>) => Promise<boolean>;
	inviteUsers: (emails: string, role: string) => Promise<boolean>;
}

// Simple cache to avoid repeated requests
const cache = new Map<
	string,
	{ data: any; timestamp: number; expiry: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedData(key: string) {
	const cached = cache.get(key);
	if (cached && Date.now() < cached.expiry) {
		return cached.data;
	}
	cache.delete(key);
	return null;
}

function setCachedData(key: string, data: any, duration = CACHE_DURATION) {
	cache.set(key, {
		data,
		timestamp: Date.now(),
		expiry: Date.now() + duration,
	});
}

export function useCompanyData(): UseCompanyDataResult {
	const { user } = useAuth();
	const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
		null,
	);
	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [userRole, setUserRole] = useState<string | null>(null);
	const [isOwner, setIsOwner] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCompanyData = useCallback(async () => {
		if (!user?.id) {
			setLoading(false);
			return;
		}

		try {
			setError(null);

			// Check cache first
			const cacheKey = `company-${user.id}`;
			const cachedData = getCachedData(cacheKey);

			if (cachedData) {
				setCompanyProfile(cachedData.company);
				setUserRole(cachedData.userRole);
				setIsOwner(cachedData.isOwner);
				setLoading(false);

				// Fetch team members separately since they change more frequently
				if (cachedData.company?.id) {
					fetchTeamMembers(cachedData.company.id);
				}
				return;
			}

			const response = await fetch(`/api/companies?userId=${user.id}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					// User doesn't have a company yet
					setCompanyProfile(null);
					setTeamMembers([]);
					setUserRole(null);
					setIsOwner(false);
					setLoading(false);
					return;
				}
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			setCompanyProfile(data.company);
			setUserRole(data.userRole);
			setIsOwner(data.isOwner);

			// Cache the company data
			setCachedData(cacheKey, {
				company: data.company,
				userRole: data.userRole,
				isOwner: data.isOwner,
			});

			// Fetch team members
			if (data.company?.id) {
				await fetchTeamMembers(data.company.id);
			}
		} catch (err) {
			console.error("Error fetching company data:", err);
			setError(
				err instanceof Error ? err.message : "Failed to load company data",
			);
		} finally {
			setLoading(false);
		}
	}, [user?.id]);

	const fetchTeamMembers = useCallback(async (companyId: string) => {
		try {
			// Check cache for team members
			const teamCacheKey = `team-${companyId}`;
			const cachedTeam = getCachedData(teamCacheKey);

			if (cachedTeam) {
				setTeamMembers(cachedTeam);
				return;
			}

			const response = await fetch(`/api/companies/${companyId}/users`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				setTeamMembers(data.teamMembers || []);

				// Cache team data for shorter duration since it changes more frequently
				setCachedData(teamCacheKey, data.teamMembers || [], 2 * 60 * 1000); // 2 minutes
			}
		} catch (err) {
			console.error("Error fetching team members:", err);
		}
	}, []);

	const updateCompany = useCallback(
		async (updateData: Partial<CompanyProfile>): Promise<boolean> => {
			if (!companyProfile?.id || !user?.id) return false;

			try {
				const response = await fetch("/api/companies", {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						companyId: companyProfile.id,
						userId: user.id,
						...updateData,
					}),
				});

				if (response.ok) {
					const data = await response.json();
					setCompanyProfile(data.company);

					// Update cache
					const cacheKey = `company-${user.id}`;
					setCachedData(cacheKey, {
						company: data.company,
						userRole,
						isOwner,
					});

					return true;
				}
				return false;
			} catch (err) {
				console.error("Error updating company:", err);
				return false;
			}
		},
		[companyProfile?.id, user?.id, userRole, isOwner],
	);
	const inviteUsers = useCallback(
		async (emails: string, role: string): Promise<boolean> => {
			if (!companyProfile?.id) return false;

			try {
				// Parse emails into array
				const emailArray = emails
					.split(/[,\n]/)
					.map((email) => email.trim())
					.filter((email) => email && email.includes("@"));

				const response = await fetch("/api/company-invites", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						companyId: companyProfile.id,
						emails: emailArray,
						role,
						invitedById: user?.id,
					}),
				});

				if (response.ok) {
					// Invalidate team cache and refetch
					const teamCacheKey = `team-${companyProfile.id}`;
					cache.delete(teamCacheKey);
					await fetchTeamMembers(companyProfile.id);
					return true;
				}
				return false;
			} catch (err) {
				console.error("Error inviting users:", err);
				return false;
			}
		},
		[companyProfile?.id, user?.id, fetchTeamMembers],
	);

	const refetch = useCallback(async () => {
		// Clear caches
		if (user?.id) {
			cache.delete(`company-${user.id}`);
		}
		if (companyProfile?.id) {
			cache.delete(`team-${companyProfile.id}`);
		}

		setLoading(true);
		await fetchCompanyData();
	}, [fetchCompanyData, user?.id, companyProfile?.id]);

	useEffect(() => {
		fetchCompanyData();
	}, [fetchCompanyData]);

	return {
		companyProfile,
		teamMembers,
		userRole,
		isOwner,
		loading,
		error,
		refetch,
		updateCompany,
		inviteUsers,
	};
}

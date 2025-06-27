import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UseIndustryCategoriesResult {
	categories: string[];
	loading: boolean;
	error: string | null;
	industry: string | null;
}

export const useIndustryCategories = (): UseIndustryCategoriesResult => {
	const { user } = useAuth();
	const [industry, setIndustry] = useState<string | null>(null);
	const [categories, setCategories] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchUserIndustry = async () => {
			if (!user?.id) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				// Get authentication token
				const getAuthToken = async () => {
					// Try to get from localStorage first (client-side)
					let token =
						localStorage.getItem("sb-access-token") ||
						sessionStorage.getItem("sb-access-token");

					// If not found, try to get from document cookies
					if (!token) {
						const cookies = document.cookie.split(";");
						const authCookie = cookies.find((cookie) =>
							cookie.trim().startsWith("sb-access-token="),
						);
						if (authCookie) {
							token = authCookie.split("=")[1];
						}
					}

					return token;
				};

				const token = await getAuthToken();
				if (!token) {
					setError("Authentication required. Please log in again.");
					return;
				} // Call the API endpoint to get user's industry and categories
				const response = await fetch(
					"/api/inventory/industry-categories-test",
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
						},
					},
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to fetch industry");
				}

				const data = await response.json();
				setIndustry(data.industry);
				setCategories(data.categories || []);
			} catch (err) {
				console.error("Error fetching user industry:", err);
				setError("Failed to load company industry");
				setIndustry(null);
				setCategories([]);
			} finally {
				setLoading(false);
			}
		};

		fetchUserIndustry();
	}, [user?.id]);

	return {
		categories,
		loading,
		error,
		industry,
	};
};

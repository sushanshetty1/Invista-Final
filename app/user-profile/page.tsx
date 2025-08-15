"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardGuard from "@/components/DashboardGuard";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	User,
	Building2,
	Shield,
	Settings,
	Moon,
	Sun,
	Monitor,
	MapPin,
	Clock,
	Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface UserProfile {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	avatar?: string;
	phone?: string;
	timezone?: string;
	language?: string;
	theme?: string;
	emailVerified: boolean;
	twoFactorEnabled: boolean;
	createdAt: string;
}

interface CompanyMembership {
	id: string;
	companyName: string;
	role: string;
	status: "PENDING" | "ACTIVE" | "INACTIVE";
	joinedAt: string;
}

const TIMEZONES = [
	"UTC",
	"America/New_York",
	"America/Los_Angeles",
	"Europe/London",
	"Europe/Paris",
	"Asia/Tokyo",
	"Asia/Shanghai",
	"Australia/Sydney",
];

const LANGUAGES = [
	{ code: "en", name: "English" },
	{ code: "es", name: "Spanish" },
	{ code: "fr", name: "French" },
	{ code: "de", name: "German" },
	{ code: "ja", name: "Japanese" },
	{ code: "zh", name: "Chinese" },
];

const THEMES = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

export default function UserProfilePage() {
	const { user } = useAuth();
	const router = useRouter();
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [companyMemberships, setCompanyMemberships] = useState<
		CompanyMembership[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState("profile");

	const fetchUserProfile = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", user?.id)
				.single();

			if (error) throw error;
			setUserProfile(data);
		} catch (error) {
			console.error("Error fetching user profile:", error);
		} finally {
			setLoading(false);
		}
	}, [user?.id]);
	const fetchCompanyMemberships = useCallback(async () => {
		try {
			console.log(
				"Fetching company memberships for user:",
				user?.id,
				user?.email,
			);

			// First, get active company user memberships without join
			const { data: companyUsers, error: companyUsersError } = await supabase
				.from("company_users")
				.select("id, role, isActive, joinedAt, companyId")
				.eq("userId", user?.id)
				.eq("isActive", true)
				.order("joinedAt", { ascending: false });

			console.log("Company users result:", { companyUsers, companyUsersError });

			if (companyUsersError) {
				console.error("Error fetching company users:", companyUsersError);
				throw companyUsersError;
			}

			// Get company details for the user memberships
			const companyIds = (companyUsers || []).map((cu) => cu.companyId);
			let companyDetails: { id: string; name: string }[] = [];

			if (companyIds.length > 0) {
				const { data: companies, error: companiesError } = await supabase
					.from("companies")
					.select("id, name")
					.in("id", companyIds);

				if (companiesError) {
					console.error("Error fetching companies:", companiesError);
				} else {
					companyDetails = companies || [];
				}
			}

			// Then, get accepted invites that haven't been converted to company_users yet
			const { data: acceptedInvites, error: invitesError } = await supabase
				.from("company_invites")
				.select("id, role, status, acceptedAt, companyId")
				.eq("email", user?.email)
				.eq("status", "ACCEPTED")
				.order("acceptedAt", { ascending: false });

			console.log("Company invites result:", { acceptedInvites, invitesError });

			if (invitesError) {
				console.error("Error fetching company invites:", invitesError);
			}

			// Get company details for invites
			const inviteCompanyIds = (acceptedInvites || []).map(
				(invite) => invite.companyId,
			);
			let inviteCompanyDetails: { id: string; name: string }[] = [];

			if (inviteCompanyIds.length > 0) {
				const { data: inviteCompanies, error: inviteCompaniesError } =
					await supabase
						.from("companies")
						.select("id, name")
						.in("id", inviteCompanyIds);

				if (inviteCompaniesError) {
					console.error(
						"Error fetching invite companies:",
						inviteCompaniesError,
					);
				} else {
					inviteCompanyDetails = inviteCompanies || [];
				}
			}

			// Combine both sources
			const memberships: CompanyMembership[] = [
				// Active company users
				...(companyUsers || []).map(
					(companyUser: {
						id: string;
						role: string;
						companyId: string;
						joinedAt: string;
					}) => {
						const company = companyDetails.find(
							(c) => c.id === companyUser.companyId,
						);
						return {
							id: companyUser.id,
							companyName: company?.name || "Unknown Company",
							role: companyUser.role,
							status: "ACTIVE" as const,
							joinedAt: companyUser.joinedAt,
						};
					},
				),
				// Accepted invites (that might not be converted yet)
				...(acceptedInvites || []).map(
					(invite: {
						id: string;
						role: string;
						companyId: string;
						acceptedAt: string;
					}) => {
						const company = inviteCompanyDetails.find(
							(c) => c.id === invite.companyId,
						);
						return {
							id: invite.id,
							companyName: company?.name || "Unknown Company",
							role: invite.role,
							status: "ACTIVE" as const,
							joinedAt: invite.acceptedAt,
						};
					},
				),
			];

			// Remove duplicates (in case an invite was already converted to company_user)
			const uniqueMemberships = memberships.filter(
				(membership, index, self) =>
					index ===
					self.findIndex((m) => m.companyName === membership.companyName),
			);

			console.log("Final memberships:", uniqueMemberships);
			setCompanyMemberships(uniqueMemberships);
		} catch (error) {
			console.error("Error fetching company memberships:", error);
		}
	}, [user?.id, user?.email]);

	useEffect(() => {
		if (user) {
			fetchUserProfile();
			fetchCompanyMemberships();
		}
	}, [user, fetchUserProfile, fetchCompanyMemberships]);

	const updateUserProfile = async (updatedProfile: Partial<UserProfile>) => {
		setSaving(true);
		try {
			const { error } = await supabase
				.from("users")
				.update({
					...updatedProfile,
					updatedAt: new Date().toISOString(),
				})
				.eq("id", user?.id);

			if (error) throw error;

			// Update local state
			setUserProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
		} catch (error) {
			console.error("Error updating user profile:", error);
		} finally {
			setSaving(false);
		}
	};

	const getInitials = (
		firstName?: string,
		lastName?: string,
		email?: string,
	) => {
		if (firstName && lastName) {
			return `${firstName[0]}${lastName[0]}`.toUpperCase();
		}
		if (firstName) {
			return firstName[0].toUpperCase();
		}
		if (email) {
			return email[0].toUpperCase();
		}
		return "U";
	};
	const getRoleColor = (role: string) => {
		switch (role) {
			case "OWNER":
				return "bg-purple-500";
			case "ADMIN":
				return "bg-red-500";
			case "MANAGER":
				return "bg-blue-500";
			case "SUPERVISOR":
				return "bg-green-500";
			case "EMPLOYEE":
				return "bg-yellow-500";
			case "CONTRACTOR":
				return "bg-orange-500";
			case "VIEWER":
				return "bg-gray-500";
			default:
				return "bg-gray-500";
		}
	};

	if (loading) {
		return (
			<div className="container mx-auto p-6">
				<div className="animate-pulse space-y-6">
					<div className="h-8 bg-muted rounded w-1/3"></div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="h-64 bg-muted rounded"></div>
						<div className="h-64 bg-muted rounded"></div>
					</div>
				</div>
			</div>
		);
	}
	return (
		<DashboardGuard>
			<div className="container mx-auto p-6 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">User Profile</h1>
						<p className="text-muted-foreground">
							Manage your personal information and preferences
						</p>
					</div>
					<Button onClick={() => router.push("/dashboard")}>
						Back to Dashboard
					</Button>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-6"
				>
					{" "}
					<TabsList>
						<TabsTrigger value="profile">Personal Information</TabsTrigger>
						<TabsTrigger value="companies">Company Memberships</TabsTrigger>
						<TabsTrigger value="locations">My Locations</TabsTrigger>
						<TabsTrigger value="preferences">Preferences</TabsTrigger>
						<TabsTrigger value="security">Security</TabsTrigger>
					</TabsList>
					<TabsContent value="profile" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<User className="h-5 w-5" />
									Personal Information
								</CardTitle>
								<CardDescription>
									Update your personal details and contact information
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex items-center space-x-4">
									<Avatar className="w-20 h-20">
										<AvatarImage
											src={userProfile?.avatar}
											alt="Profile picture"
										/>
										<AvatarFallback className="text-lg">
											{getInitials(
												userProfile?.firstName,
												userProfile?.lastName,
												userProfile?.email,
											)}
										</AvatarFallback>
									</Avatar>
									<div>
										<Button variant="outline" size="sm">
											Change Photo
										</Button>
										<p className="text-xs text-muted-foreground mt-1">
											JPG, PNG or GIF. Max size 2MB
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="firstName">First Name</Label>
										<Input
											id="firstName"
											value={userProfile?.firstName || ""}
											onChange={(e) =>
												setUserProfile((prev) =>
													prev ? { ...prev, firstName: e.target.value } : null,
												)
											}
											placeholder="Enter your first name"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="lastName">Last Name</Label>
										<Input
											id="lastName"
											value={userProfile?.lastName || ""}
											onChange={(e) =>
												setUserProfile((prev) =>
													prev ? { ...prev, lastName: e.target.value } : null,
												)
											}
											placeholder="Enter your last name"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="displayName">Display Name</Label>
									<Input
										id="displayName"
										value={userProfile?.displayName || ""}
										onChange={(e) =>
											setUserProfile((prev) =>
												prev ? { ...prev, displayName: e.target.value } : null,
											)
										}
										placeholder="How you'd like to be addressed"
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="email">Email Address</Label>
										<div className="flex items-center space-x-2">
											<Input
												id="email"
												type="email"
												value={userProfile?.email || ""}
												disabled
												className="bg-muted"
											/>
											{userProfile?.emailVerified ? (
												<Badge
													variant="secondary"
													className="bg-green-500 text-white"
												>
													Verified
												</Badge>
											) : (
												<Badge variant="destructive">Unverified</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground">
											Email cannot be changed. Contact support if needed.
										</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="phone">Phone Number</Label>
										<Input
											id="phone"
											type="tel"
											value={userProfile?.phone || ""}
											onChange={(e) =>
												setUserProfile((prev) =>
													prev ? { ...prev, phone: e.target.value } : null,
												)
											}
											placeholder="+1 (555) 123-4567"
										/>
									</div>
								</div>

								<Button
									onClick={() => updateUserProfile(userProfile || {})}
									disabled={saving}
									className="w-full md:w-auto"
								>
									{saving ? "Saving..." : "Save Changes"}
								</Button>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="companies" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Building2 className="h-5 w-5" />
									Company Memberships
								</CardTitle>
								<CardDescription>
									Companies you&apos;re a member of and your roles
								</CardDescription>
							</CardHeader>
							<CardContent>
								{companyMemberships.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground">
										<Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<p>You&apos;re not a member of any companies yet</p>
										<p className="text-sm">
											Wait for an invitation from a company admin
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{companyMemberships.map((membership) => (
											<div
												key={membership.id}
												className="flex items-center justify-between p-4 border rounded-lg"
											>
												<div className="flex items-center space-x-3">
													<div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
														<Building2 className="h-6 w-6 text-white" />
													</div>
													<div>
														<p className="font-semibold text-lg">
															{membership.companyName}
														</p>
														<p className="text-sm text-muted-foreground">
															Joined{" "}
															{new Date(
																membership.joinedAt,
															).toLocaleDateString()}
														</p>
													</div>
												</div>
												<Badge
													variant="secondary"
													className={`${getRoleColor(membership.role)} text-white`}
												>
													{membership.role.replace("_", " ")}
												</Badge>
											</div>
										))}
									</div>
								)}
							</CardContent>{" "}
						</Card>
					</TabsContent>
					<TabsContent value="locations" className="space-y-6">
						<UserLocationInfo userProfile={userProfile} />
					</TabsContent>
					<TabsContent value="preferences" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Settings className="h-5 w-5" />
									Preferences
								</CardTitle>
								<CardDescription>
									Customize your experience and regional settings
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="timezone">Timezone</Label>
										<Select
											value={userProfile?.timezone || "UTC"}
											onValueChange={(value) =>
												setUserProfile((prev) =>
													prev ? { ...prev, timezone: value } : null,
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select timezone" />
											</SelectTrigger>
											<SelectContent>
												{TIMEZONES.map((tz) => (
													<SelectItem key={tz} value={tz}>
														{tz}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="language">Language</Label>
										<Select
											value={userProfile?.language || "en"}
											onValueChange={(value) =>
												setUserProfile((prev) =>
													prev ? { ...prev, language: value } : null,
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select language" />
											</SelectTrigger>
											<SelectContent>
												{LANGUAGES.map((lang) => (
													<SelectItem key={lang.code} value={lang.code}>
														{lang.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Theme</Label>
									<div className="grid grid-cols-3 gap-3">
										{THEMES.map((theme) => (
											<button
												key={theme.value}
												type="button"
												onClick={() =>
													setUserProfile((prev) =>
														prev ? { ...prev, theme: theme.value } : null,
													)
												}
												className={`p-3 border rounded-lg flex flex-col items-center space-y-2 hover:bg-accent transition-colors ${
													userProfile?.theme === theme.value
														? "border-primary bg-accent"
														: ""
												}`}
											>
												<theme.icon className="h-5 w-5" />
												<span className="text-sm">{theme.label}</span>
											</button>
										))}
									</div>
								</div>

								<Button
									onClick={() => updateUserProfile(userProfile || {})}
									disabled={saving}
									className="w-full md:w-auto"
								>
									{saving ? "Saving..." : "Save Preferences"}
								</Button>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="security" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Shield className="h-5 w-5" />
									Security Settings
								</CardTitle>
								<CardDescription>
									Manage your account security and authentication
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between p-4 border rounded-lg">
									<div>
										<h4 className="font-medium">Email Verification</h4>
										<p className="text-sm text-muted-foreground">
											Verify your email address for enhanced security
										</p>
									</div>
									<Badge
										variant={
											userProfile?.emailVerified ? "default" : "destructive"
										}
									>
										{userProfile?.emailVerified ? "Verified" : "Unverified"}
									</Badge>
								</div>

								<div className="flex items-center justify-between p-4 border rounded-lg">
									<div>
										<h4 className="font-medium">Two-Factor Authentication</h4>
										<p className="text-sm text-muted-foreground">
											Add an extra layer of security to your account
										</p>
									</div>
									<Button variant="outline" size="sm">
										{userProfile?.twoFactorEnabled ? "Disable" : "Enable"}
									</Button>
								</div>

								<div className="flex items-center justify-between p-4 border rounded-lg">
									<div>
										<h4 className="font-medium">Password</h4>
										<p className="text-sm text-muted-foreground">
											Last changed:{" "}
											{userProfile?.createdAt
												? new Date(userProfile.createdAt).toLocaleDateString()
												: "Never"}
										</p>
									</div>
									<Button variant="outline" size="sm">
										Change Password
									</Button>
								</div>

								<div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
									<h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
										Danger Zone
									</h4>
									<p className="text-sm text-red-600 dark:text-red-300 mb-3">
										Permanently delete your account and all associated data
									</p>
									<Button variant="destructive" size="sm">
										Delete Account
									</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>{" "}
				</Tabs>
			</div>
		</DashboardGuard>
	);
}

// UserLocationInfo Component
function UserLocationInfo({
	userProfile,
}: {
	userProfile: UserProfile | null;
}) {
	const [companyMemberships, setCompanyMemberships] = useState<
		CompanyMembership[]
	>([]);
	const [locationData, setLocationData] = useState<{
		[companyId: string]: {
			primaryLocation?: {
				id: string;
				name: string;
				type: string;
				address?: string | {
					street?: string;
					city?: string;
					state?: string;
					country?: string;
					zip?: string;
				};
				city?: string;
				state?: string;
				country?: string;
			};
			locationAccess?: Array<{
				id: string;
				name: string;
				type: string;
				permissions?: string[];
			}>;
			role?: string;
		};
	}>({});
	const [loading, setLoading] = useState(true);

	const fetchUserLocationData = useCallback(async () => {
		try {
			// Get user's company memberships first
			const { data: memberships, error: membershipError } = await supabase
				.from("company_users")
				.select(`
          id,
          companyId,
          role,
          primaryLocationId,
          company:companies!inner(
            id,
            name
          )
        `)
				.eq("userId", userProfile?.id);

			if (membershipError) throw membershipError;

			// For each company, get location data
			const locationPromises =
				memberships?.map(async (membership) => {
					try {
						// Get primary location info
						let primaryLocation = null;
						if (membership.primaryLocationId) {
							const response = await fetch(
								`/api/companies/${membership.companyId}/locations/${membership.primaryLocationId}`,
							);
							if (response.ok) {
								const result = await response.json();
								primaryLocation = result.data;
							}
						}

						// Get user's location access
						const accessResponse = await fetch(
							`/api/companies/${membership.companyId}/users/${userProfile?.id}/location-access`,
						);
						let locationAccess = [];
						if (accessResponse.ok) {
							const accessResult = await accessResponse.json();
							locationAccess = accessResult.data?.locationAccess || [];
						}
						return {
							companyId: membership.companyId,
							companyName:
								(membership as { company?: { name?: string } }).company?.name || "Unknown Company",
							primaryLocation,
							locationAccess,
							role: membership.role,
						};
					} catch (error) {
						console.error(
							"Error fetching location data for company:",
							membership.companyId,
							error,
						);
						return {
							companyId: membership.companyId,
							companyName:
								(membership as { company?: { name?: string } }).company?.name || "Unknown Company",
							primaryLocation: null,
							locationAccess: [],
							role: membership.role,
						};
					}
				}) || [];

			const locationResults = await Promise.all(locationPromises);

			// Convert to object with companyId as key
			const locationDataObj = locationResults.reduce((acc, result) => {
				acc[result.companyId] = {
					primaryLocation: result.primaryLocation,
					locationAccess: result.locationAccess,
					role: result.role,
				};
				return acc;
			}, {} as {
				[companyId: string]: {
					primaryLocation?: {
						id: string;
						name: string;
						type: string;
						address?: string | {
							street?: string;
							city?: string;
							state?: string;
							country?: string;
							zip?: string;
						};
						city?: string;
						state?: string;
						country?: string;
					};
					locationAccess?: Array<{
						id: string;
						name: string;
						type: string;
						permissions?: string[];
					}>;
					role?: string;
				};
			});

			setLocationData(locationDataObj);
			setCompanyMemberships(
				memberships?.map((m) => ({
					id: m.id,
					companyName: (m as { company?: { name?: string } }).company?.name || "Unknown Company",
					role: m.role,
					status: "ACTIVE" as const,
					joinedAt: new Date().toISOString(), // This should come from the actual data
				})) || [],
			);
		} catch (error) {
			console.error("Error fetching user location data:", error);
		} finally {
			setLoading(false);
		}
	}, [userProfile?.id]);

	useEffect(() => {
		if (userProfile?.id) {
			fetchUserLocationData();
		}
	}, [userProfile?.id, fetchUserLocationData]);

	if (loading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
				</CardContent>
			</Card>
		);
	}

	if (companyMemberships.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<MapPin className="h-5 w-5" />
						My Locations
					</CardTitle>
					<CardDescription>
						Your assigned work locations and access permissions
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8 text-muted-foreground">
						<Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>No location assignments found</p>
						<p className="text-sm">
							You need to be a member of a company to have location assignments
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{companyMemberships.map((membership) => {
				const companyLocationData = locationData[membership.id] || {};

				return (
					<Card key={membership.id}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								{membership.companyName}
							</CardTitle>
							<CardDescription>
								Your location assignments and access permissions
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Primary Location */}
							<div>
								<h4 className="font-semibold mb-3 flex items-center gap-2">
									<MapPin className="h-4 w-4" />
									Primary Work Location
								</h4>
								{companyLocationData.primaryLocation ? (
									<div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
										<div className="flex items-start justify-between">
											<div>
												<h5 className="font-medium">
													{companyLocationData.primaryLocation.name}
												</h5>
												<p className="text-sm text-muted-foreground mb-2">
													{companyLocationData.primaryLocation.type?.replace(
														"_",
														" ",
													)}
												</p>
												{companyLocationData.primaryLocation.address && (
													<div className="text-sm text-muted-foreground">
														{typeof companyLocationData.primaryLocation
															.address === "object" ? (
															<div>
																{companyLocationData.primaryLocation.address
																	.street && (
																	<div>
																		{
																			companyLocationData.primaryLocation
																				.address.street
																		}
																	</div>
																)}
																{(companyLocationData.primaryLocation.address
																	.city ||
																	companyLocationData.primaryLocation.address
																		.state) && (
																	<div>
																		{
																			companyLocationData.primaryLocation
																				.address.city
																		}
																		{companyLocationData.primaryLocation.address
																			.city &&
																			companyLocationData.primaryLocation
																				.address.state &&
																			", "}
																		{
																			companyLocationData.primaryLocation
																				.address.state
																		}{" "}
																		{
																			companyLocationData.primaryLocation
																				.address.zip
																		}
																	</div>
																)}
															</div>
														) : (
															<span>
																{companyLocationData.primaryLocation.address}
															</span>
														)}
													</div>
												)}
											</div>
											<Badge variant="default">Primary</Badge>
										</div>
									</div>
								) : (
									<div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/20">
										<p className="text-muted-foreground">
											No primary location assigned
										</p>
										<p className="text-sm text-muted-foreground mt-1">
											Contact your company admin to assign a primary work
											location
										</p>
									</div>
								)}
							</div>

							{/* Additional Location Access */}
							<div>
								<h4 className="font-semibold mb-3 flex items-center gap-2">
									<Users className="h-4 w-4" />
									Additional Location Access
								</h4>
								{companyLocationData.locationAccess &&
								companyLocationData.locationAccess.length > 0 ? (
									<div className="space-y-3">
										{companyLocationData.locationAccess.map((access: {
											id: string;
											name: string;
											type: string;
											permissions?: string[];
											location?: {
												name: string;
												type: string;
											};
											accessLevel?: string;
											canManage?: boolean;
											endDate?: string;
										}) => (
											<div key={access.id} className="p-4 border rounded-lg">
												<div className="flex items-start justify-between">
													<div>
														<h5 className="font-medium">
															{access.location?.name}
														</h5>
														<p className="text-sm text-muted-foreground">
															{access.location?.type?.replace("_", " ")}
														</p>
													</div>
													<div className="flex flex-col items-end gap-2">
														<Badge variant="outline">
															{access.accessLevel?.replace("_", " ")}
														</Badge>
														{access.canManage && (
															<Badge variant="secondary" className="text-xs">
																Can Manage
															</Badge>
														)}
													</div>
												</div>
												{access.endDate && (
													<div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
														<Clock className="h-3 w-3" />
														Access expires:{" "}
														{new Date(access.endDate).toLocaleDateString()}
													</div>
												)}
											</div>
										))}
									</div>
								) : (
									<div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/20">
										<p className="text-muted-foreground">
											No additional location access
										</p>
										<p className="text-sm text-muted-foreground mt-1">
											You only have access to your primary location
										</p>
									</div>
								)}
							</div>

							{/* Role Information */}
							<div className="pt-4 border-t">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Your role in this company:
									</span>
									<Badge variant="outline">
										{companyLocationData.role?.replace("_", " ")}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

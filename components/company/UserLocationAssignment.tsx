// React Component for Managing User Location Assignments
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Building2,
	MapPin,
	Users,
	Plus,
	Trash2,
	UserCheck,
	Settings,
	Search,
	RefreshCw,
} from "lucide-react";

interface CompanyUser {
	id: string;
	userId: string;
	role: string;
	title?: string;
	employeeId?: string;
	primaryLocationId?: string;
	isActive: boolean;
	user: {
		id: string;
		email: string;
		firstName?: string;
		lastName?: string;
		displayName?: string;
	};
	primaryLocation?: {
		id: string;
		name: string;
		type: string;
		address: {
			street?: string;
			city?: string;
			state?: string;
			zip?: string;
			country?: string;
		} | string;
	};
}

interface LocationAccess {
	id: string;
	userId: string;
	locationId: string;
	accessLevel: string;
	canManage: boolean;
	isActive: boolean;
	location: {
		id: string;
		name: string;
		type: string;
	};
}

interface TeamMember {
	id: string;
	type: string;
	role: string;
	title?: string;
	status: string;
	email: string;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	user?: {
		id: string;
		email: string;
		firstName?: string;
		lastName?: string;
		displayName?: string;
	};
}

interface CompanyLocation {
	id: string;
	name: string;
	type: string;
	description?: string;
	code?: string;
	isActive: boolean;
}

interface UserLocationAssignmentProps {
	companyId: string;
}

const ACCESS_LEVELS = [
	{
		value: "READ_ONLY",
		label: "Read Only",
		description: "Can view location data",
	},
	{
		value: "STANDARD",
		label: "Standard",
		description: "Can perform standard operations",
	},
	{
		value: "SUPERVISOR",
		label: "Supervisor",
		description: "Can supervise operations",
	},
	{
		value: "MANAGER",
		label: "Manager",
		description: "Can manage location settings",
	},
	{ value: "ADMIN", label: "Admin", description: "Full administrative access" },
];

// Simple toast function - you can replace this with your preferred toast library
const showToast = (message: string, type: "success" | "error" = "success") => {
	// Create a simple toast notification
	const toast = document.createElement("div");
	toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white font-medium ${
		type === "success" ? "bg-green-600" : "bg-red-600"
	} transition-all duration-300 transform translate-x-0`;
	toast.textContent = message;

	document.body.appendChild(toast);

	// Remove after 3 seconds
	setTimeout(() => {
		toast.classList.add("translate-x-full", "opacity-0");
		setTimeout(() => {
			document.body.removeChild(toast);
		}, 300);
	}, 3000);
};

export default function UserLocationAssignment({
	companyId,
}: UserLocationAssignmentProps) {
	const [users, setUsers] = useState<CompanyUser[]>([]);
	const [locations, setLocations] = useState<CompanyLocation[]>([]);
	const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
	const [userLocationAccess, setUserLocationAccess] = useState<
		LocationAccess[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (companyId) {
			fetchData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [companyId]);
	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Fetch users
			const usersResponse = await fetch(`/api/companies/${companyId}/users`);
			const usersResult = await usersResponse.json();

			// Fetch locations
			const locationsResponse = await fetch(
				`/api/companies/${companyId}/locations`,
			);
			const locationsResult = await locationsResponse.json();

			if (usersResponse.ok && usersResult.teamMembers) {
				// Transform team members data to match CompanyUser interface
				const transformedUsers = usersResult.teamMembers
					.filter((member: TeamMember) => member.type === "user")
					.map((member: TeamMember) => ({
						id: member.id,
						userId: member.user?.id || member.id,
						role: member.role,
						title: member.title,
						employeeId: null,
						primaryLocationId: null,
						isActive: member.status === "ACTIVE",
						user: {
							id: member.user?.id || member.id,
							email: member.email,
							firstName: member.firstName,
							lastName: member.lastName,
							displayName: member.displayName,
						},
					}));
				setUsers(transformedUsers);
			} else {
				setError("Failed to fetch users");
			}

			if (locationsResponse.ok && locationsResult.success) {
				setLocations(locationsResult.data || []);
			} else {
				setError("Failed to fetch locations");
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			setError("Failed to fetch data");
			showToast("Failed to fetch data", "error");
		} finally {
			setLoading(false);
		}
	};

	const fetchUserLocationAccess = async (userId: string) => {
		try {
			const response = await fetch(
				`/api/companies/${companyId}/users/${userId}/location-access`,
			);
			const result = await response.json();

			if (result.success) {
				setUserLocationAccess(result.data.locationAccess || []);
			} else {
				showToast("Failed to fetch user location access", "error");
			}
		} catch (error) {
			console.error("Error fetching user location access:", error);
			showToast("Failed to fetch user location access", "error");
		}
	};

	const handleAssignPrimaryLocation = async (
		userId: string,
		locationId: string,
	) => {
		try {
			const response = await fetch(
				`/api/companies/${companyId}/users/${userId}/primary-location`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ locationId }),
				},
			);

			const result = await response.json();

			if (result.success) {
				showToast("Primary location assigned successfully");
				await fetchData();
			} else {
				showToast(result.error || "Failed to assign primary location", "error");
			}
		} catch (error) {
			console.error("Error assigning primary location:", error);
			showToast("Failed to assign primary location", "error");
		}
	};

	const handleGrantLocationAccess = async (
		userId: string,
		locationId: string,
		accessLevel: string,
		canManage: boolean,
	) => {
		try {
			const response = await fetch(
				`/api/companies/${companyId}/users/${userId}/location-access`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						locationId,
						accessLevel,
						canManage,
					}),
				},
			);

			const result = await response.json();

			if (result.success) {
				showToast("Location access granted successfully");
				if (selectedUser && selectedUser.userId === userId) {
					await fetchUserLocationAccess(userId);
				}
			} else {
				showToast(result.error || "Failed to grant location access", "error");
			}
		} catch (error) {
			console.error("Error granting location access:", error);
			showToast("Failed to grant location access", "error");
		}
	};

	const filteredUsers = users.filter((user) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			user.user.email.toLowerCase().includes(searchLower) ||
			user.user.firstName?.toLowerCase().includes(searchLower) ||
			user.user.lastName?.toLowerCase().includes(searchLower) ||
			user.user.displayName?.toLowerCase().includes(searchLower) ||
			user.employeeId?.toLowerCase().includes(searchLower)
		);
	});
	if (loading) {
		return (
			<Card>
				<CardContent className="p-8">
					<div className="flex items-center justify-center space-x-2">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
						<span className="text-muted-foreground">
							Loading users and locations...
						</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="p-8 text-center">
					<div className="text-red-600 mb-4">
						<p className="font-medium">Error loading data</p>
						<p className="text-sm">{error}</p>
					</div>
					<Button onClick={fetchData} variant="outline">
						<RefreshCw className="w-4 h-4 mr-2" />
						Try Again
					</Button>
				</CardContent>
			</Card>
		);
	}
	return (
		<div className="space-y-6">
			{/* Main Content */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center">
						<Users className="w-5 h-5 mr-2 text-blue-600" />
						User Location Assignments
					</CardTitle>
					<CardDescription>
						Assign primary work locations and manage access permissions for your
						team members
					</CardDescription>
				</CardHeader>
				<CardContent>
					{users.length === 0 ? (
						<div className="text-center py-12">
							<Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								No team members found
							</h3>
							<p className="text-gray-500 mb-4">
								Add team members to your company before assigning locations.
							</p>
							<Button variant="outline" onClick={fetchData}>
								<RefreshCw className="w-4 h-4 mr-2" />
								Refresh
							</Button>
						</div>
					) : locations.length === 0 ? (
						<div className="text-center py-12">
							<Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								No locations found
							</h3>
							<p className="text-gray-500 mb-4">
								Create company locations before assigning them to employees.
							</p>
							<Button variant="outline" onClick={fetchData}>
								<RefreshCw className="w-4 h-4 mr-2" />
								Refresh
							</Button>
						</div>
					) : (
						<Tabs defaultValue="users" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="users">
									Users & Primary Locations
								</TabsTrigger>
								<TabsTrigger value="access">
									Location Access Management
								</TabsTrigger>
							</TabsList>

							<TabsContent value="users" className="space-y-4 mt-6">
								{/* Search */}
								<div className="flex items-center space-x-2">
									<Search className="h-4 w-4 text-gray-500" />
									<Input
										placeholder="Search users by name, email, or employee ID..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="max-w-sm"
									/>
								</div>

								{/* Users Table */}
								<div className="border rounded-lg overflow-hidden">
									<Table>
										<TableHeader>
											<TableRow className="bg-gray-50">
												<TableHead>Employee</TableHead>
												<TableHead>Role</TableHead>
												<TableHead>Employee ID</TableHead>
												<TableHead>Primary Location</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredUsers.map((user) => (
												<TableRow key={user.id} className="hover:bg-gray-50">
													<TableCell>
														<div>
															<div className="font-medium">
																{user.user.displayName ||
																	`${user.user.firstName} ${user.user.lastName}`.trim() ||
																	"Unnamed User"}
															</div>
															<div className="text-sm text-gray-500">
																{user.user.email}
															</div>
															{user.title && (
																<div className="text-sm text-gray-500">
																	{user.title}
																</div>
															)}
														</div>
													</TableCell>
													<TableCell>
														<Badge variant="outline">{user.role}</Badge>
													</TableCell>
													<TableCell>{user.employeeId || "-"}</TableCell>
													<TableCell>
														{user.primaryLocation ? (
															<div>
																<div className="font-medium">
																	{user.primaryLocation.name}
																</div>
																<div className="text-sm text-gray-500">
																	{user.primaryLocation.type}
																</div>
															</div>
														) : (
															<span className="text-gray-400">
																Not assigned
															</span>
														)}
													</TableCell>
													<TableCell>
														<Badge
															variant={user.isActive ? "default" : "secondary"}
														>
															{user.isActive ? "Active" : "Inactive"}
														</Badge>
													</TableCell>
													<TableCell>
														<div className="flex space-x-2">
															<Dialog>
																<DialogTrigger asChild>
																	<Button variant="outline" size="sm">
																		<MapPin className="h-4 w-4 mr-1" />
																		Assign
																	</Button>
																</DialogTrigger>
																<DialogContent>
																	<DialogHeader>
																		<DialogTitle>
																			Assign Primary Location
																		</DialogTitle>
																		<DialogDescription>
																			Set the primary work location for{" "}
																			{user.user.displayName || user.user.email}
																		</DialogDescription>
																	</DialogHeader>
																	<PrimaryLocationForm
																		user={user}
																		locations={locations}
																		onAssign={(locationId) =>
																			handleAssignPrimaryLocation(
																				user.userId,
																				locationId,
																			)
																		}
																	/>
																</DialogContent>
															</Dialog>
															<Button
																variant="outline"
																size="sm"
																onClick={() => {
																	setSelectedUser(user);
																	fetchUserLocationAccess(user.userId);
																	setIsAssignDialogOpen(true);
																}}
															>
																<Settings className="h-4 w-4 mr-1" />
																Access
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>

									{filteredUsers.length === 0 && (
										<div className="text-center py-8">
											<Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
											<h3 className="text-lg font-semibold mb-2">
												No users found
											</h3>
											<p className="text-gray-600">
												{searchTerm
													? "No users match your search criteria"
													: "No users in this company yet"}
											</p>
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent value="access" className="space-y-4 mt-6">
								<div>
									<h3 className="text-lg font-semibold mb-4">
										Location Access Overview
									</h3>
									<p className="text-gray-600 mb-6">
										View and manage detailed location access permissions for
										each location.
									</p>

									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{locations.map((location) => (
											<Card
												key={location.id}
												className="hover:shadow-md transition-shadow"
											>
												<CardHeader className="pb-2">
													<CardTitle className="text-lg flex items-center">
														<Building2 className="w-5 h-5 mr-2 text-blue-600" />
														{location.name}
													</CardTitle>
													<CardDescription>{location.type}</CardDescription>
												</CardHeader>
												<CardContent>
													<div className="space-y-3">
														<div className="text-sm">
															<span className="font-medium">
																Users with access:{" "}
															</span>
															<span className="text-gray-600">0</span>
														</div>
														<Button
															variant="outline"
															size="sm"
															className="w-full"
														>
															<UserCheck className="h-4 w-4 mr-1" />
															Manage Access
														</Button>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</div>
							</TabsContent>
						</Tabs>
					)}
				</CardContent>
			</Card>

			{/* User Location Access Dialog */}
			{selectedUser && (
				<Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>
								Location Access -{" "}
								{selectedUser.user.displayName || selectedUser.user.email}
							</DialogTitle>
							<DialogDescription>
								Manage detailed location access permissions for this user
							</DialogDescription>
						</DialogHeader>
						<LocationAccessManager
							user={selectedUser}
							locations={locations}
							userLocationAccess={userLocationAccess}
							onGrantAccess={handleGrantLocationAccess}
						/>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}

// Primary Location Assignment Form
function PrimaryLocationForm({
	user,
	locations,
	onAssign,
}: {
	user: CompanyUser;
	locations: CompanyLocation[];
	onAssign: (locationId: string) => void;
}) {
	const [selectedLocationId, setSelectedLocationId] = useState(
		user.primaryLocationId || "",
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedLocationId) {
			onAssign(selectedLocationId);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<Label htmlFor="location">Primary Location</Label>
				<Select
					value={selectedLocationId}
					onValueChange={setSelectedLocationId}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select a location" />
					</SelectTrigger>
					<SelectContent>
						{locations.map((location) => (
							<SelectItem key={location.id} value={location.id}>
								<div className="flex items-center space-x-2">
									<Building2 className="h-4 w-4" />
									<span>
										{location.name} ({location.type})
									</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex justify-end space-x-2">
				<Button type="submit" disabled={!selectedLocationId}>
					Assign Location
				</Button>
			</div>
		</form>
	);
}

// Location Access Manager
function LocationAccessManager({
	user,
	locations,
	userLocationAccess,
	onGrantAccess,
}: {
	user: CompanyUser;
	locations: CompanyLocation[];
	userLocationAccess: LocationAccess[];
	onGrantAccess: (
		userId: string,
		locationId: string,
		accessLevel: string,
		canManage: boolean,
	) => void;
}) {
	const [selectedLocationId, setSelectedLocationId] = useState("");
	const [accessLevel, setAccessLevel] = useState("STANDARD");
	const [canManage, setCanManage] = useState(false);

	const handleGrantAccess = () => {
		if (selectedLocationId) {
			onGrantAccess(user.userId, selectedLocationId, accessLevel, canManage);
			setSelectedLocationId("");
			setAccessLevel("STANDARD");
			setCanManage(false);
		}
	};

	const availableLocations = locations.filter(
		(location) =>
			!userLocationAccess.some(
				(access) => access.locationId === location.id && access.isActive,
			),
	);

	return (
		<div className="space-y-6">
			{/* Current Access */}
			<div>
				<h3 className="text-lg font-semibold mb-3">Current Access</h3>
				{userLocationAccess.length > 0 ? (
					<div className="space-y-2">
						{userLocationAccess.map((access) => (
							<div
								key={access.id}
								className="flex items-center justify-between p-3 border rounded-lg"
							>
								<div>
									<div className="font-medium">{access.location.name}</div>
									<div className="text-sm text-gray-600">
										{access.location.type} • {access.accessLevel}
										{access.canManage && " • Can Manage"}
									</div>
								</div>
								<Button variant="outline" size="sm">
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				) : (
					<p className="text-gray-600">No location access granted yet</p>
				)}
			</div>

			<Separator />

			{/* Grant New Access */}
			<div>
				<h3 className="text-lg font-semibold mb-3">Grant New Access</h3>
				<div className="space-y-4">
					<div>
						<Label>Location</Label>
						<Select
							value={selectedLocationId}
							onValueChange={setSelectedLocationId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a location" />
							</SelectTrigger>
							<SelectContent>
								{availableLocations.map((location) => (
									<SelectItem key={location.id} value={location.id}>
										{location.name} ({location.type})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label>Access Level</Label>
						<Select value={accessLevel} onValueChange={setAccessLevel}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ACCESS_LEVELS.map((level) => (
									<SelectItem key={level.value} value={level.value}>
										<div>
											<div>{level.label}</div>
											<div className="text-sm text-gray-600">
												{level.description}
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<Label>Can Manage Location</Label>
							<p className="text-sm text-gray-600">
								Allow user to manage location settings
							</p>
						</div>
						<Switch checked={canManage} onCheckedChange={setCanManage} />
					</div>

					<Button
						onClick={handleGrantAccess}
						disabled={!selectedLocationId}
						className="w-full"
					>
						<Plus className="h-4 w-4 mr-2" />
						Grant Access
					</Button>
				</div>
			</div>
		</div>
	);
}

"use client";

import Image from "next/image";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
	Building2,
	Users,
	Trash2,
	Send,
	Clock,
	CheckCircle,
	XCircle,
	Upload,
	UserPlus,
	RefreshCw,
	Globe,
	Mail,
	Phone,
	MapPin,
	Calendar,
	Settings,
	Shield,
	Users2,
	Building,
} from "lucide-react";
import { useRouter } from "next/navigation";
import LocationManager from "@/components/company/LocationManager";
import UserLocationAssignment from "@/components/company/UserLocationAssignment";
import { useCompanyData } from "@/hooks/use-company-data";
import {
	CompanyProfileSkeleton,
	TeamMembersSkeleton,
	ErrorState,
} from "@/components/ui/loading-states";

interface CompanyProfile {
	id: string;
	name: string;
	displayName?: string;
	description?: string;
	industry?: string;
	website?: string;
	logo?: string;
	address?: {
		street?: string;
		city?: string;
		state?: string;
		country?: string;
		postalCode?: string;
	};
	email?: string;
	phone?: string;
	size?: string;
	businessType?: string;
	registrationNumber?: string;
	taxId?: string;
	createdAt: string;
	updatedAt: string;
}

interface InviteForm {
	emails: string;
	role: string;
}

const ROLES = [
	"ADMIN",
	"MANAGER",
	"SUPERVISOR",
	"EMPLOYEE",
	"CONTRACTOR",
	"VIEWER",
];

const INDUSTRIES = [
	"Technology",
	"Healthcare",
	"Finance & Banking",
	"Education",
	"Manufacturing",
	"Retail & E-commerce",
	"Construction",
	"Food & Beverage",
	"Transportation & Logistics",
	"Energy & Utilities",
	"Real Estate",
	"Entertainment & Media",
	"Consulting",
	"Non-profit",
	"Government",
	"Other",
];

const COMPANY_SIZES = [
	{ value: "SMALL", label: "1-10 employees" },
	{ value: "MEDIUM", label: "11-50 employees" },
	{ value: "LARGE", label: "51-200 employees" },
	{ value: "ENTERPRISE", label: "200+ employees" },
];

const BUSINESS_TYPES = [
	{ value: "PRIVATE", label: "Private Company" },
	{ value: "PUBLIC", label: "Public Company" },
	{ value: "NONPROFIT", label: "Non-profit" },
	{ value: "PARTNERSHIP", label: "Partnership" },
	{ value: "SOLE_PROPRIETORSHIP", label: "Sole Proprietorship" },
	{ value: "LLC", label: "Limited Liability Company" },
	{ value: "CORPORATION", label: "Corporation" },
];

export default function CompanyProfilePage() {
	const router = useRouter();
	const {
		companyProfile,
		teamMembers,
		userRole,
		isOwner,
		loading,
		error,
		refetch,
		updateCompany,
		inviteUsers,
	} = useCompanyData();

	const [inviteForm, setInviteForm] = useState<InviteForm>({
		emails: "",
		role: "VIEWER",
	});
	const [isInviting, setIsInviting] = useState(false);
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [activeTab, setActiveTab] = useState("profile");
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [editData, setEditData] = useState<Partial<CompanyProfile>>({});

	// Handle loading state
	if (loading) {
		return (
			<DashboardGuard>
				<CompanyProfileSkeleton />
			</DashboardGuard>
		);
	}

	// Handle error state
	if (error) {
		return (
			<DashboardGuard>
				<ErrorState
					message="Failed to load company data"
					description={error}
					onRetry={refetch}
				/>
			</DashboardGuard>
		);
	}

	// Handle no company case
	if (!companyProfile) {
		return (
			<DashboardGuard>
				<div className="container mx-auto py-6">
					<Card>
						<CardHeader>
							<CardTitle>No Company Found</CardTitle>{" "}
							<CardDescription>
								You don&apos;t seem to be associated with any company yet.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button onClick={() => router.push("/auth/company-signup")}>
								Create Company
							</Button>
						</CardContent>
					</Card>
				</div>
			</DashboardGuard>
		);
	}

	const handleInviteUsers = async () => {
		if (!inviteForm.emails.trim() || !inviteForm.role) return;

		setIsInviting(true);
		setMessage(null);

		try {
			const success = await inviteUsers(inviteForm.emails, inviteForm.role);

			if (success) {
				setMessage({ type: "success", text: "Invitations sent successfully!" });
				setInviteForm({ emails: "", role: "VIEWER" });
				setShowInviteDialog(false);
				setTimeout(() => setMessage(null), 5000);
			} else {
				setMessage({
					type: "error",
					text: "Failed to send invitations. Please try again.",
				});
			}
		} catch (error) {
			console.error("Error inviting users:", error);
			setMessage({
				type: "error",
				text: "Failed to send invitations. Please try again.",
			});
		} finally {
			setIsInviting(false);
		}
	};

	const handleUpdateCompany = async () => {
		if (Object.keys(editData).length === 0) return;

		setIsUpdating(true);
		setMessage(null);

		try {
			const success = await updateCompany(editData);

			if (success) {
				setMessage({
					type: "success",
					text: "Company profile updated successfully!",
				});
				setEditData({});
				setTimeout(() => setMessage(null), 5000);
			} else {
				setMessage({
					type: "error",
					text: "Failed to update company profile. Please try again.",
				});
			}
		} catch (error) {
			console.error("Error updating company:", error);
			setMessage({
				type: "error",
				text: "Failed to update company profile. Please try again.",
			});
		} finally {
			setIsUpdating(false);
		}
	};

	const formatLastActive = (date?: string) => {
		if (!date) return "Never";
		const now = new Date();
		const lastActive = new Date(date);
		const diffInHours = Math.floor(
			(now.getTime() - lastActive.getTime()) / (1000 * 60 * 60),
		);

		if (diffInHours < 1) return "Active now";
		if (diffInHours < 24) return `${diffInHours}h ago`;
		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 30) return `${diffInDays}d ago`;
		return lastActive.toLocaleDateString();
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "PENDING":
				return (
					<Badge
						variant="outline"
						className="text-yellow-600 border-yellow-600"
					>
						<Clock className="w-3 h-3 mr-1" />
						Pending
					</Badge>
				);
			case "ACTIVE":
				return (
					<Badge variant="outline" className="text-green-600 border-green-600">
						<CheckCircle className="w-3 h-3 mr-1" />
						Active
					</Badge>
				);
			case "INACTIVE":
				return (
					<Badge variant="outline" className="text-red-600 border-red-600">
						<XCircle className="w-3 h-3 mr-1" />
						Inactive
					</Badge>
				);
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	const handleInputChange = (field: keyof CompanyProfile, value: string) => {
		setEditData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<DashboardGuard>
			<div className="container mx-auto py-6 space-y-6">
				{" "}
				{/* Header */}
				<div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
					<div className="space-y-1">
						<div className="flex items-center space-x-3">
							<div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
								<Building2 className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-3xl font-bold tracking-tight">
									{companyProfile?.displayName ||
										companyProfile?.name ||
										"Company Profile"}
								</h1>
								<p className="text-muted-foreground">
									Manage your company information, team, and locations
								</p>
							</div>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							onClick={refetch}
							disabled={loading}
							className="border-dashed"
						>
							<RefreshCw
								className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
							/>
							Refresh
						</Button>
					</div>
				</div>
				{/* Messages */}
				{message && (
					<Alert
						className={
							message.type === "error"
								? "border-red-500 bg-red-50"
								: "border-green-500 bg-green-50"
						}
					>
						<AlertDescription
							className={
								message.type === "error" ? "text-red-700" : "text-green-700"
							}
						>
							{message.text}
						</AlertDescription>
					</Alert>
				)}
				{/* Main Content */}
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-4"
				>
					<TabsList>
						<TabsTrigger value="profile">Profile</TabsTrigger>
						<TabsTrigger value="team">Team</TabsTrigger>
						<TabsTrigger value="locations">Locations</TabsTrigger>
					</TabsList>{" "}
					<TabsContent value="profile" className="space-y-6">
						<div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
							{/* Company Logo & Quick Info */}
							<Card className="xl:col-span-1">
								<CardContent className="p-6">
									<div className="flex flex-col items-center space-y-4">
										{companyProfile.logo ? (
											<Image
												src={companyProfile.logo}
												alt="Company Logo"
												width={120}
												height={120}
												className="rounded-xl border-2 border-border/50"
											/>
										) : (
											<div className="w-30 h-30 bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-border/50 rounded-xl flex items-center justify-center">
												<Building2 className="w-12 h-12 text-blue-600" />
											</div>
										)}
										<Button variant="outline" size="sm" className="w-full">
											<Upload className="w-4 h-4 mr-2" />
											Upload Logo
										</Button>

										<Separator className="w-full" />

										{/* Quick Info */}
										<div className="w-full space-y-3 text-sm">
											{companyProfile.industry && (
												<div className="flex items-center space-x-2">
													<Building className="w-4 h-4 text-muted-foreground" />
													<span className="text-muted-foreground">
														{companyProfile.industry}
													</span>
												</div>
											)}
											{companyProfile.size && (
												<div className="flex items-center space-x-2">
													<Users2 className="w-4 h-4 text-muted-foreground" />
													<span className="text-muted-foreground">
														{COMPANY_SIZES.find(
															(s) => s.value === companyProfile.size,
														)?.label || companyProfile.size}
													</span>
												</div>
											)}
											{companyProfile.createdAt && (
												<div className="flex items-center space-x-2">
													<Calendar className="w-4 h-4 text-muted-foreground" />
													<span className="text-muted-foreground">
														Founded{" "}
														{new Date(companyProfile.createdAt).getFullYear()}
													</span>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Main Company Information */}
							<Card className="xl:col-span-3">
								<CardHeader>
									<CardTitle className="flex items-center">
										<Settings className="w-5 h-5 mr-2 text-blue-600" />
										Company Information
									</CardTitle>
									<CardDescription>
										Update your company&apos;s basic information and details
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="space-y-2">
											<Label
												htmlFor="company-name"
												className="text-sm font-medium"
											>
												Company Name *
											</Label>
											<Input
												id="company-name"
												value={editData.name ?? companyProfile.name}
												onChange={(e) =>
													handleInputChange("name", e.target.value)
												}
												placeholder="Enter company name"
												className="h-10"
											/>
										</div>
										<div className="space-y-2">
											<Label
												htmlFor="display-name"
												className="text-sm font-medium"
											>
												Display Name
											</Label>
											<Input
												id="display-name"
												value={
													editData.displayName ??
													companyProfile.displayName ??
													""
												}
												onChange={(e) =>
													handleInputChange("displayName", e.target.value)
												}
												placeholder="Public-facing company name"
												className="h-10"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="industry" className="text-sm font-medium">
												Industry
											</Label>
											<Select
												value={editData.industry ?? companyProfile.industry}
												onValueChange={(value) =>
													handleInputChange("industry", value)
												}
											>
												<SelectTrigger className="h-10">
													<SelectValue placeholder="Select industry" />
												</SelectTrigger>
												<SelectContent>
													{INDUSTRIES.map((industry) => (
														<SelectItem key={industry} value={industry}>
															{industry}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label
												htmlFor="company-size"
												className="text-sm font-medium"
											>
												Company Size
											</Label>
											<Select
												value={editData.size ?? companyProfile.size}
												onValueChange={(value) =>
													handleInputChange("size", value)
												}
											>
												<SelectTrigger className="h-10">
													<SelectValue placeholder="Select company size" />
												</SelectTrigger>
												<SelectContent>
													{COMPANY_SIZES.map((size) => (
														<SelectItem key={size.value} value={size.value}>
															{size.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>

									<Separator />

									{/* Contact Information */}
									<div className="space-y-4">
										<h3 className="text-lg font-semibold flex items-center">
											<Mail className="w-4 h-4 mr-2 text-blue-600" />
											Contact Information
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label
													htmlFor="website"
													className="text-sm font-medium"
												>
													Website
												</Label>
												<div className="relative">
													<Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
													<Input
														id="website"
														type="url"
														value={
															editData.website ?? companyProfile.website ?? ""
														}
														onChange={(e) =>
															handleInputChange("website", e.target.value)
														}
														placeholder="https://example.com"
														className="pl-10 h-10"
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label htmlFor="email" className="text-sm font-medium">
													Email
												</Label>
												<div className="relative">
													<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
													<Input
														id="email"
														type="email"
														value={editData.email ?? companyProfile.email ?? ""}
														onChange={(e) =>
															handleInputChange("email", e.target.value)
														}
														placeholder="company@example.com"
														className="pl-10 h-10"
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label htmlFor="phone" className="text-sm font-medium">
													Phone
												</Label>
												<div className="relative">
													<Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
													<Input
														id="phone"
														value={editData.phone ?? companyProfile.phone ?? ""}
														onChange={(e) =>
															handleInputChange("phone", e.target.value)
														}
														placeholder="+1 (555) 123-4567"
														className="pl-10 h-10"
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label
													htmlFor="business-type"
													className="text-sm font-medium"
												>
													Business Type
												</Label>
												<Select
													value={
														editData.businessType ?? companyProfile.businessType
													}
													onValueChange={(value) =>
														handleInputChange("businessType", value)
													}
												>
													<SelectTrigger className="h-10">
														<SelectValue placeholder="Select business type" />
													</SelectTrigger>
													<SelectContent>
														{BUSINESS_TYPES.map((type) => (
															<SelectItem key={type.value} value={type.value}>
																{type.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>
									</div>

									<Separator />

									{/* Company Description */}
									<div className="space-y-4">
										<h3 className="text-lg font-semibold">About Company</h3>
										<div className="space-y-2">
											<Label
												htmlFor="description"
												className="text-sm font-medium"
											>
												Description
											</Label>
											<Textarea
												id="description"
												value={
													editData.description ??
													companyProfile.description ??
													""
												}
												onChange={(e) =>
													handleInputChange("description", e.target.value)
												}
												placeholder="Tell us about your company, mission, and values..."
												rows={4}
												className="resize-none"
											/>
										</div>
									</div>

									<Separator />

									{/* Legal Information */}
									<div className="space-y-4">
										<h3 className="text-lg font-semibold flex items-center">
											<Shield className="w-4 h-4 mr-2 text-blue-600" />
											Legal Information
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label
													htmlFor="registration-number"
													className="text-sm font-medium"
												>
													Registration Number
												</Label>
												<Input
													id="registration-number"
													value={
														editData.registrationNumber ??
														companyProfile.registrationNumber ??
														""
													}
													onChange={(e) =>
														handleInputChange(
															"registrationNumber",
															e.target.value,
														)
													}
													placeholder="Company registration number"
													className="h-10"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="tax-id" className="text-sm font-medium">
													Tax ID
												</Label>
												<Input
													id="tax-id"
													value={editData.taxId ?? companyProfile.taxId ?? ""}
													onChange={(e) =>
														handleInputChange("taxId", e.target.value)
													}
													placeholder="Tax identification number"
													className="h-10"
												/>
											</div>
										</div>
									</div>

									<div className="flex justify-end pt-4">
										<Button
											onClick={handleUpdateCompany}
											disabled={
												isUpdating || Object.keys(editData).length === 0
											}
											className="min-w-[120px]"
										>
											{isUpdating ? (
												<>
													<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
													Updating...
												</>
											) : (
												"Update Profile"
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>{" "}
					<TabsContent value="team" className="space-y-6">
						{loading ? (
							<TeamMembersSkeleton />
						) : (
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="flex items-center">
												<Users className="w-5 h-5 mr-2 text-blue-600" />
												Team Members
												<Badge variant="secondary" className="ml-3">
													{teamMembers.length}{" "}
													{teamMembers.length === 1 ? "member" : "members"}
												</Badge>
											</CardTitle>
											<CardDescription>
												Manage your team members, roles, and access permissions
											</CardDescription>
										</div>
										{(isOwner ||
											["ADMIN", "MANAGER"].includes(userRole || "")) && (
											<Dialog
												open={showInviteDialog}
												onOpenChange={setShowInviteDialog}
											>
												<DialogTrigger asChild>
													<Button className="bg-blue-600 hover:bg-blue-700">
														<UserPlus className="w-4 h-4 mr-2" />
														Invite Members
													</Button>
												</DialogTrigger>
												<DialogContent className="sm:max-w-md">
													<DialogHeader>
														<DialogTitle>Invite Team Members</DialogTitle>
														<DialogDescription>
															Send invitations to join your company. Enter email
															addresses separated by commas.
														</DialogDescription>
													</DialogHeader>
													<div className="space-y-4 pt-4">
														<div className="space-y-2">
															<Label htmlFor="invite-emails">
																Email Addresses
															</Label>
															<Textarea
																id="invite-emails"
																placeholder="user1@example.com, user2@example.com"
																value={inviteForm.emails}
																onChange={(e) =>
																	setInviteForm((prev) => ({
																		...prev,
																		emails: e.target.value,
																	}))
																}
																rows={3}
																className="resize-none"
															/>
															<p className="text-xs text-muted-foreground">
																Separate multiple email addresses with commas
															</p>
														</div>
														<div className="space-y-2">
															<Label htmlFor="invite-role">Role</Label>
															<Select
																value={inviteForm.role}
																onValueChange={(value) =>
																	setInviteForm((prev) => ({
																		...prev,
																		role: value,
																	}))
																}
															>
																<SelectTrigger>
																	<SelectValue placeholder="Select role" />
																</SelectTrigger>
																<SelectContent>
																	{ROLES.map((role) => (
																		<SelectItem key={role} value={role}>
																			{role.replace("_", " ")}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
														<div className="flex justify-end space-x-2 pt-4">
															<Button
																variant="outline"
																onClick={() => setShowInviteDialog(false)}
															>
																Cancel
															</Button>
															<Button
																onClick={handleInviteUsers}
																disabled={
																	isInviting || !inviteForm.emails.trim()
																}
																className="bg-blue-600 hover:bg-blue-700"
															>
																{isInviting ? (
																	<>
																		<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
																		Sending...
																	</>
																) : (
																	<>
																		<Send className="w-4 h-4 mr-2" />
																		Send Invites
																	</>
																)}
															</Button>
														</div>
													</div>
												</DialogContent>
											</Dialog>
										)}
									</div>
								</CardHeader>
								<CardContent>
									{teamMembers.length > 0 ? (
										<div className="space-y-4">
											{teamMembers.map((member) => (
												<div
													key={member.id}
													className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
												>
													<div className="flex items-center space-x-4">
														<div className="relative">
															<div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center ring-2 ring-white">
																{member.avatar ? (
																	<Image
																		src={member.avatar}
																		alt=""
																		width={48}
																		height={48}
																		className="rounded-full"
																	/>
																) : (
																	<span className="text-sm font-semibold text-blue-700">
																		{member.displayName
																			? member.displayName
																					.charAt(0)
																					.toUpperCase()
																			: member.firstName
																				? member.firstName
																						.charAt(0)
																						.toUpperCase()
																				: member.email.charAt(0).toUpperCase()}
																	</span>
																)}
															</div>
															{member.type === "user" &&
																member.status === "ACTIVE" && (
																	<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
																)}
														</div>
														<div className="min-w-0 flex-1">
															<div className="flex items-center space-x-2">
																<div className="font-medium text-sm">
																	{member.displayName ||
																		(member.firstName && member.lastName
																			? `${member.firstName} ${member.lastName}`
																			: member.email)}
																</div>
																{member.isOwner && (
																	<Badge
																		variant="secondary"
																		className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200"
																	>
																		Owner
																	</Badge>
																)}
															</div>
															<div className="text-sm text-muted-foreground">
																{member.email}
															</div>
															<div className="flex items-center space-x-3 mt-1">
																<Badge variant="outline" className="text-xs">
																	{member.role.replace("_", " ")}
																</Badge>
																{member.title && (
																	<span className="text-xs text-muted-foreground">
																		• {member.title}
																	</span>
																)}
																<span className="text-xs text-muted-foreground">
																	•{" "}
																	{member.type === "invite"
																		? "Invited"
																		: "Last active"}
																	:{" "}
																	{formatLastActive(
																		member.lastActive || member.createdAt,
																	)}
																</span>
															</div>
														</div>
													</div>
													<div className="flex items-center space-x-2">
														{getStatusBadge(member.status)}
														{(isOwner || ["ADMIN"].includes(userRole || "")) &&
															!member.isOwner && (
																<Button
																	variant="ghost"
																	size="sm"
																	className="text-red-600 hover:text-red-700 hover:bg-red-50"
																>
																	<Trash2 className="w-4 h-4" />
																</Button>
															)}
													</div>
												</div>
											))}
										</div>
									) : (
										<div className="text-center py-12">
											<div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
												<Users className="w-8 h-8 text-blue-600" />
											</div>
											<h3 className="text-lg font-medium text-gray-900 mb-2">
												No team members yet
											</h3>
											<p className="text-gray-500 mb-6">
												Start building your team by inviting members to join
												your company.
											</p>
											{(isOwner ||
												["ADMIN", "MANAGER"].includes(userRole || "")) && (
												<Button
													onClick={() => setShowInviteDialog(true)}
													className="bg-blue-600 hover:bg-blue-700"
												>
													<UserPlus className="w-4 h-4 mr-2" />
													Invite First Member
												</Button>
											)}
										</div>
									)}
								</CardContent>
							</Card>
						)}
					</TabsContent>{" "}
					<TabsContent value="locations" className="space-y-6">
						<div className="space-y-6">
							<div className="flex items-center space-x-2">
								<MapPin className="w-5 h-5 text-blue-600" />
								<div>
									<h2 className="text-xl font-semibold">Location Management</h2>
									<p className="text-sm text-muted-foreground">
										Manage your company locations and employee access
										assignments
									</p>
								</div>
							</div>

							<LocationManager companyId={companyProfile.id} />

							<Separator />

							<div className="mt-8">
								<div className="flex items-center space-x-2 mb-4">
									<Users2 className="w-5 h-5 text-blue-600" />
									<div>
										<h3 className="text-lg font-semibold">
											User Location Assignments
										</h3>
										<p className="text-sm text-muted-foreground">
											Manage where your employees work and what locations they
											can access
										</p>
									</div>
								</div>
								<UserLocationAssignment companyId={companyProfile.id} />
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</DashboardGuard>
	);
}

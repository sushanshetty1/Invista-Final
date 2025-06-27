// React Component for Managing Company Locations
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
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
// Simple toast function
const showToast = (message: string, type: "success" | "error" = "success") => {
	console.log(`${type.toUpperCase()}: ${message}`);
	// You can replace this with your preferred toast library
};
import {
	Building2,
	MapPin,
	Phone,
	Mail,
	Settings,
	Users,
	Package,
	Plus,
	Edit,
	Trash2,
	Warehouse,
	Store,
	Building,
} from "lucide-react";

interface CompanyLocation {
	id: string;
	name: string;
	description?: string;
	code?: string;
	type: string;
	address: any;
	coordinates?: any;
	timezone: string;
	phone?: string;
	email?: string;
	managerName?: string;
	managerUserId?: string;
	businessHours?: any;
	capacity?: any;
	features?: any;
	storeFormat?: string;
	salesChannels?: any;
	allowsInventory: boolean;
	allowsOrders: boolean;
	allowsReturns: boolean;
	allowsTransfers: boolean;
	isPrimary: boolean;
	isActive: boolean;
	warehouse?: any;
}

interface LocationManagerProps {
	companyId: string;
}

const LOCATION_TYPES = [
	{ value: "HEADQUARTERS", label: "Headquarters", icon: Building },
	{ value: "OFFICE", label: "Office", icon: Building2 },
	{ value: "WAREHOUSE", label: "Warehouse", icon: Warehouse },
	{
		value: "DISTRIBUTION_CENTER",
		label: "Distribution Center",
		icon: Warehouse,
	},
	{ value: "RETAIL_STORE", label: "Retail Store", icon: Store },
	{ value: "FLAGSHIP_STORE", label: "Flagship Store", icon: Store },
	{ value: "OUTLET_STORE", label: "Outlet Store", icon: Store },
	{ value: "POP_UP_STORE", label: "Pop-up Store", icon: Store },
	{ value: "KIOSK", label: "Kiosk", icon: Store },
	{ value: "SHOWROOM", label: "Showroom", icon: Building2 },
	{ value: "FACTORY", label: "Factory", icon: Building },
	{ value: "FULFILLMENT_CENTER", label: "Fulfillment Center", icon: Warehouse },
	{ value: "CROSS_DOCK", label: "Cross Dock", icon: Warehouse },
	{ value: "COLD_STORAGE", label: "Cold Storage", icon: Warehouse },
];

export default function LocationManager({ companyId }: LocationManagerProps) {
	const [locations, setLocations] = useState<CompanyLocation[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedLocation, setSelectedLocation] =
		useState<CompanyLocation | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	useEffect(() => {
		fetchLocations();
	}, [companyId]);

	const fetchLocations = async () => {
		try {
			const response = await fetch(`/api/companies/${companyId}/locations`);
			const result = await response.json();
			if (result.success) {
				setLocations(result.data);
			} else {
				showToast("Failed to fetch locations", "error");
			}
		} catch (error) {
			console.error("Error fetching locations:", error);
			showToast("Failed to fetch locations", "error");
		} finally {
			setLoading(false);
		}
	};

	const getLocationIcon = (type: string) => {
		const locationType = LOCATION_TYPES.find((t) => t.value === type);
		return locationType?.icon || Building;
	};

	const getLocationTypeLabel = (type: string) => {
		const locationType = LOCATION_TYPES.find((t) => t.value === type);
		return locationType?.label || type;
	};

	const handleCreateLocation = async (locationData: any) => {
		try {
			const response = await fetch(`/api/companies/${companyId}/locations`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(locationData),
			});

			const result = await response.json();
			if (result.success) {
				showToast("Location created successfully");
				await fetchLocations();
				setIsCreateDialogOpen(false);
			} else {
				showToast(result.error || "Failed to create location", "error");
			}
		} catch (error) {
			console.error("Error creating location:", error);
			showToast("Failed to create location", "error");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Company Locations
					</h2>
					<p className="text-muted-foreground">
						Manage warehouses, retail outlets, and offices across your
						organization
					</p>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Add Location
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Create New Location</DialogTitle>
							<DialogDescription>
								Add a new warehouse, retail outlet, or office location to your
								company
							</DialogDescription>
						</DialogHeader>
						<LocationForm
							onSubmit={handleCreateLocation}
							onCancel={() => setIsCreateDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>

			{/* Location Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{locations.map((location) => {
					const IconComponent = getLocationIcon(location.type);

					return (
						<Card
							key={location.id}
							className="hover:shadow-lg transition-shadow"
						>
							<CardHeader className="flex flex-row items-center space-y-0 pb-2">
								<div className="flex items-center space-x-2 flex-1">
									<IconComponent className="h-5 w-5 text-blue-600" />
									<div>
										<CardTitle className="text-lg">{location.name}</CardTitle>
										<CardDescription>
											{getLocationTypeLabel(location.type)}
										</CardDescription>
									</div>
								</div>
								{location.isPrimary && <Badge variant="default">Primary</Badge>}
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Address */}
								{location.address && (
									<div className="flex items-start space-x-2">
										<MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
										<div className="text-sm">
											{typeof location.address === "object" ? (
												<div>
													{location.address.street && (
														<div>{location.address.street}</div>
													)}
													{(location.address.city ||
														location.address.state) && (
														<div>
															{location.address.city}
															{location.address.city &&
																location.address.state &&
																", "}
															{location.address.state} {location.address.zip}
														</div>
													)}
													{location.address.country && (
														<div>{location.address.country}</div>
													)}
												</div>
											) : (
												<span>{location.address}</span>
											)}
										</div>
									</div>
								)}

								{/* Contact Info */}
								<div className="space-y-1">
									{location.phone && (
										<div className="flex items-center space-x-2">
											<Phone className="h-4 w-4 text-gray-500" />
											<span className="text-sm">{location.phone}</span>
										</div>
									)}
									{location.email && (
										<div className="flex items-center space-x-2">
											<Mail className="h-4 w-4 text-gray-500" />
											<span className="text-sm">{location.email}</span>
										</div>
									)}
									{location.managerName && (
										<div className="flex items-center space-x-2">
											<Users className="h-4 w-4 text-gray-500" />
											<span className="text-sm">
												Manager: {location.managerName}
											</span>
										</div>
									)}
								</div>

								{/* Capabilities */}
								<div className="flex flex-wrap gap-1">
									{location.allowsInventory && (
										<Badge variant="secondary" className="text-xs">
											<Package className="h-3 w-3 mr-1" />
											Inventory
										</Badge>
									)}
									{location.allowsOrders && (
										<Badge variant="secondary" className="text-xs">
											Orders
										</Badge>
									)}
									{location.allowsReturns && (
										<Badge variant="secondary" className="text-xs">
											Returns
										</Badge>
									)}
									{location.allowsTransfers && (
										<Badge variant="secondary" className="text-xs">
											Transfers
										</Badge>
									)}
								</div>

								{/* Warehouse Info */}
								{location.warehouse && (
									<div className="pt-2 border-t">
										<div className="text-xs text-gray-500">
											Warehouse: {location.warehouse.code}
										</div>
									</div>
								)}

								{/* Actions */}
								<div className="flex space-x-2 pt-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setSelectedLocation(location);
											setIsEditDialogOpen(true);
										}}
									>
										<Edit className="h-4 w-4 mr-1" />
										Edit
									</Button>
									<Button variant="outline" size="sm">
										<Settings className="h-4 w-4 mr-1" />
										Manage
									</Button>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Empty State */}
			{locations.length === 0 && (
				<Card className="text-center py-12">
					<CardContent>
						<Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">No locations found</h3>
						<p className="text-gray-600 mb-4">
							Start by adding your first warehouse, retail outlet, or office
							location
						</p>
						<Button onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add First Location
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Location Form Component
function LocationForm({
	onSubmit,
	onCancel,
	initialData = null,
}: {
	onSubmit: (data: any) => void;
	onCancel: () => void;
	initialData?: any;
}) {
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		code: "",
		type: "WAREHOUSE",
		address: {
			street: "",
			city: "",
			state: "",
			zip: "",
			country: "",
		},
		timezone: "UTC",
		phone: "",
		email: "",
		managerName: "",
		allowsInventory: true,
		allowsOrders: true,
		allowsReturns: true,
		allowsTransfers: true,
		isPrimary: false,
		...initialData,
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Tabs defaultValue="basic" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="basic">Basic Info</TabsTrigger>
					<TabsTrigger value="contact">Contact & Address</TabsTrigger>
					<TabsTrigger value="settings">Settings</TabsTrigger>
				</TabsList>

				<TabsContent value="basic" className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="name">Location Name *</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="e.g., Main Warehouse, Downtown Store"
								required
							/>
						</div>
						<div>
							<Label htmlFor="code">Location Code</Label>
							<Input
								id="code"
								value={formData.code}
								onChange={(e) =>
									setFormData({ ...formData, code: e.target.value })
								}
								placeholder="e.g., WH-001, STORE-NYC"
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="type">Location Type *</Label>
						<Select
							value={formData.type}
							onValueChange={(value) =>
								setFormData({ ...formData, type: value })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{LOCATION_TYPES.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							placeholder="Brief description of this location"
						/>
					</div>
				</TabsContent>

				<TabsContent value="contact" className="space-y-4">
					<div>
						<Label>Address</Label>
						<div className="grid grid-cols-1 gap-2">
							<Input
								placeholder="Street Address"
								value={formData.address.street}
								onChange={(e) =>
									setFormData({
										...formData,
										address: { ...formData.address, street: e.target.value },
									})
								}
							/>
							<div className="grid grid-cols-3 gap-2">
								<Input
									placeholder="City"
									value={formData.address.city}
									onChange={(e) =>
										setFormData({
											...formData,
											address: { ...formData.address, city: e.target.value },
										})
									}
								/>
								<Input
									placeholder="State"
									value={formData.address.state}
									onChange={(e) =>
										setFormData({
											...formData,
											address: { ...formData.address, state: e.target.value },
										})
									}
								/>
								<Input
									placeholder="ZIP Code"
									value={formData.address.zip}
									onChange={(e) =>
										setFormData({
											...formData,
											address: { ...formData.address, zip: e.target.value },
										})
									}
								/>
							</div>
							<Input
								placeholder="Country"
								value={formData.address.country}
								onChange={(e) =>
									setFormData({
										...formData,
										address: { ...formData.address, country: e.target.value },
									})
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="phone">Phone</Label>
							<Input
								id="phone"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								placeholder="+1 (555) 123-4567"
							/>
						</div>
						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="location@company.com"
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="manager">Manager Name</Label>
						<Input
							id="manager"
							value={formData.managerName}
							onChange={(e) =>
								setFormData({ ...formData, managerName: e.target.value })
							}
							placeholder="Location manager's name"
						/>
					</div>
				</TabsContent>

				<TabsContent value="settings" className="space-y-4">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<Label>Allows Inventory</Label>
								<p className="text-sm text-gray-600">
									Can store and manage inventory
								</p>
							</div>
							<Switch
								checked={formData.allowsInventory}
								onCheckedChange={(checked) =>
									setFormData({ ...formData, allowsInventory: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label>Allows Orders</Label>
								<p className="text-sm text-gray-600">
									Can process customer orders
								</p>
							</div>
							<Switch
								checked={formData.allowsOrders}
								onCheckedChange={(checked) =>
									setFormData({ ...formData, allowsOrders: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label>Allows Returns</Label>
								<p className="text-sm text-gray-600">
									Can handle product returns
								</p>
							</div>
							<Switch
								checked={formData.allowsReturns}
								onCheckedChange={(checked) =>
									setFormData({ ...formData, allowsReturns: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label>Allows Transfers</Label>
								<p className="text-sm text-gray-600">
									Can participate in stock transfers
								</p>
							</div>
							<Switch
								checked={formData.allowsTransfers}
								onCheckedChange={(checked) =>
									setFormData({ ...formData, allowsTransfers: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label>Primary Location</Label>
								<p className="text-sm text-gray-600">Main company location</p>
							</div>
							<Switch
								checked={formData.isPrimary}
								onCheckedChange={(checked) =>
									setFormData({ ...formData, isPrimary: checked })
								}
							/>
						</div>
					</div>
				</TabsContent>
			</Tabs>

			<Separator />

			<div className="flex justify-end space-x-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit">
					{initialData ? "Update Location" : "Create Location"}
				</Button>
			</div>
		</form>
	);
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Plus,
	Search,
	Filter,
	Edit,
	Trash2,
	Eye,
	Building2,
	Mail,
	Phone,
	Star,
	TrendingUp,
	Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { useImportExport, FIELD_MAPPINGS } from "@/hooks/use-import-export";
import { ImportExportButtons, ImportProgressCard } from "@/components/ui/import-export-buttons";

// Interface for supplier data
interface Supplier extends Record<string, unknown> {
	id: string;
	name: string;
	code: string;
	email?: string;
	phone?: string;
	website?: string;
	companyType?: string;
	taxId?: string;
	billingAddress: {
		street: string;
		city: string;
		state: string;
		country: string;
		zipCode: string;
	};
	contactName?: string;
	contactEmail?: string;
	contactPhone?: string;
	paymentTerms?: string;
	creditLimit?: number;
	currency: string;
	rating?: number;
	onTimeDelivery?: number;
	qualityRating?: number;
	status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL" | "SUSPENDED" | "BLACKLISTED";
	certifications?: string[];
	notes?: string;
	createdAt: string;
	updatedAt: string;
	_count?: {
		products: number;
		purchaseOrders: number;
	};
	contacts?: Array<{
		id: string;
		name: string;
		email?: string;
		phone?: string;
		isPrimary: boolean;
	}>;
}

export default function SuppliersPage() {
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [companyTypeFilter, setCompanyTypeFilter] = useState<string>("all");
	const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(20);
	const [loading, setLoading] = useState(true);

	// Import/Export functionality
	const {
		exportData,
		handleFileUpload,
		downloadTemplate,
		isImporting,
		isExporting,
		importProgress,
	} = useImportExport<Supplier>({
		exportFilename: `suppliers_${new Date().toISOString().split('T')[0]}.csv`,
		fieldMapping: FIELD_MAPPINGS.suppliers,
		validator: (row) => {
			const errors: string[] = [];
			
			if (!row["Supplier Name"]?.trim()) {
				errors.push("Supplier Name is required");
			}
			
			if (!row["Supplier Code"]?.trim()) {
				errors.push("Supplier Code is required");
			}
			
			if (row["Email Address"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["Email Address"])) {
				errors.push("Invalid email format");
			}
			
			return { valid: errors.length === 0, errors };
		},
		transformImportData: (data) => {
			return data.map(row => ({
				id: `temp_${Date.now()}_${Math.random()}`,
				name: row["Supplier Name"] || "",
				code: row["Supplier Code"] || "",
				email: row["Email Address"] || undefined,
				phone: row["Phone Number"] || undefined,
				website: row["Website"] || undefined,
				companyType: (row["Company Type"] as "CORPORATION" | "LLC" | "PARTNERSHIP" | "SOLE_PROPRIETORSHIP" | "NON_PROFIT" | "GOVERNMENT" | "OTHER") || undefined,
				contactName: row["Contact Name"] || undefined,
				contactEmail: row["Contact Email"] || undefined,
				contactPhone: row["Contact Phone"] || undefined,
				billingAddress: {
					street: row["Billing Street"] || "",
					city: row["Billing City"] || "",
					state: row["Billing State"] || "",
					country: row["Billing Country"] || "",
					zipCode: row["Billing Zip Code"] || "",
				},
				paymentTerms: row["Payment Terms"] || undefined,
				creditLimit: row["Credit Limit"] ? Number(row["Credit Limit"]) : undefined,
				currency: row["Currency"] || "USD",
				status: (row["Status"] as "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL" | "SUSPENDED" | "BLACKLISTED") || "ACTIVE",
				notes: row["Notes"] || undefined,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}));
		},
		onImportSuccess: async (importedSuppliers) => {
			// Here you would typically send the data to your API
			console.log("Imported suppliers:", importedSuppliers);
			// For now, just add to the existing suppliers state
			setSuppliers(prev => [...prev, ...importedSuppliers]);
			toast.success(`Successfully imported ${importedSuppliers.length} suppliers`);
		},
	});

	// Load suppliers data
	const loadSuppliers = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/suppliers");
			if (response.ok) {
				const data = await response.json();
				setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
			} else {
				// If API fails, show some mock data for testing
				console.warn("API failed, using mock data");
				setSuppliers([
					{
						id: "1",
						name: "TechSupply Pro",
						code: "TSP-001",
						email: "orders@techsupplypro.com",
						phone: "+1-555-0123",
						website: "https://techsupplypro.com",
						companyType: "CORPORATION",
						taxId: "12-3456789",
						billingAddress: {
							street: "123 Technology Ave",
							city: "San Francisco",
							state: "CA",
							country: "United States",
							zipCode: "94105",
						},
						contactName: "John Smith",
						contactEmail: "john.smith@techsupplypro.com",
						contactPhone: "+1-555-0124",
						paymentTerms: "NET30",
						creditLimit: 50000,
						currency: "USD",
						rating: 4.8,
						onTimeDelivery: 95.5,
						qualityRating: 4.7,
						status: "ACTIVE" as const,
						certifications: ["ISO 9001", "CE Marking"],
						notes: "Reliable supplier for electronics components",
						createdAt: "2024-01-15T10:00:00Z",
						updatedAt: "2024-01-20T14:30:00Z",
						_count: {
							products: 78,
							purchaseOrders: 45,
						},
					},
				]);
				toast.error("Failed to load suppliers, showing sample data");
			}
		} catch (error) {
			console.error("Error loading suppliers:", error);
			// Ensure we always have an array, even on error
			setSuppliers([]);
			toast.error("Error loading suppliers");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSuppliers();
	}, [loadSuppliers]);

	// Filter suppliers based on search and filters
	const filteredSuppliers = (Array.isArray(suppliers) ? suppliers : []).filter((supplier) => {
		const matchesSearch =
			supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
			supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			supplier.contactName?.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || supplier.status === statusFilter;
		const matchesCompanyType =
			companyTypeFilter === "all" || supplier.companyType === companyTypeFilter;

		return matchesSearch && matchesStatus && matchesCompanyType;
	});

	// Pagination
	const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedSuppliers = filteredSuppliers.slice(
		startIndex,
		startIndex + itemsPerPage,
	);

	const handleSelectSupplier = (supplierId: string, checked: boolean) => {
		if (checked) {
			setSelectedSuppliers([...selectedSuppliers, supplierId]);
		} else {
			setSelectedSuppliers(selectedSuppliers.filter((id) => id !== supplierId));
		}
	};

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedSuppliers(paginatedSuppliers.map((s) => s.id));
		} else {
			setSelectedSuppliers([]);
		}
	};

	const getStatusBadge = (status: string) => {
		const variants = {
			ACTIVE: "default",
			INACTIVE: "secondary",
			PENDING_APPROVAL: "outline",
			SUSPENDED: "destructive",
			BLACKLISTED: "destructive",
		} as const;

		return (
			<Badge variant={variants[status as keyof typeof variants] || "outline"}>
				{status.replace("_", " ")}
			</Badge>
		);
	};

	const getRatingStars = (rating?: number) => {
		if (!rating) return "-";
		return (
			<div className="flex items-center gap-1">
				{Array.from({ length: 5 }, (_, i) => (
					<Star
						key={`star-${rating.toString()}-${i.toString()}`}
						className={`h-3 w-3 ${
							i < rating
								? "fill-yellow-400 text-yellow-400"
								: "text-muted-foreground"
						}`}
					/>
				))}
				<span className="text-sm text-muted-foreground ml-1">({rating})</span>
			</div>
		);
	};

	const handleDeleteSupplier = async (supplierId: string) => {
		if (!confirm("Are you sure you want to delete this supplier?")) return;

		try {
			const response = await fetch(`/api/suppliers/${supplierId}`, {
				method: "DELETE",
			});

			if (response.ok) {
				toast.success("Supplier deleted successfully");
				loadSuppliers();
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to delete supplier");
			}
		} catch (error) {
			console.error("Error deleting supplier:", error);
			toast.error("Error deleting supplier");
		}
	};

	if (loading) {
		return (
			<div className="py-16 px-6 mx-4 md:mx-8 space-y-6">
				<div className="animate-pulse">
					<div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
					<div className="h-4 bg-muted rounded w-1/3 mb-8"></div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
						{Array.from({ length: 4 }, (_, i) => (
							<div key={`skeleton-metric-${i + 1}`} className="h-24 bg-muted rounded"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="py-16 px-6 mx-4 md:mx-8 space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between sm:items-center">
				<div>
					<h1 className="text-3xl font-bold">Suppliers Management</h1>
					<p className="text-sm sm:text-base text-muted-foreground">
						Manage your supplier relationships, contacts, and performance
					</p>
				</div>
				<div className="flex gap-2 mt-2 sm:mt-0">
					<ImportExportButtons
						onExport={() => exportData(filteredSuppliers)}
						onImport={handleFileUpload}
						onDownloadTemplate={() => downloadTemplate()}
						isExporting={isExporting}
						isImporting={isImporting}
						variant="outline"
					/>
					<Link href="/suppliers/add">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Add Supplier
						</Button>
					</Link>
				</div>
			</div>

			{/* Import Progress */}
			<ImportProgressCard show={isImporting} progress={importProgress} />

			{/* Stats Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Suppliers
						</CardTitle>
						<Building2 className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{Array.isArray(suppliers) ? suppliers.length : 0}</div>
						<p className="text-xs text-muted-foreground">
							+5.2% from last month
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 sm:p-4">
						<CardTitle className="text-xs sm:text-sm font-medium">
							Active Suppliers
						</CardTitle>
						<TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="p-2 sm:p-4 pt-0">
						<div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
							{Array.isArray(suppliers) ? suppliers.filter((s) => s.status === "ACTIVE").length : 0}
						</div>
						<p className="text-xs text-muted-foreground">
							{Array.isArray(suppliers) && suppliers.length > 0 ? (
								(suppliers.filter((s) => s.status === "ACTIVE").length /
									suppliers.length) *
								100
							).toFixed(1) : "0"}
							% of total
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 sm:p-4">
						<CardTitle className="text-xs sm:text-sm font-medium">
							Avg Rating
						</CardTitle>
						<Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="p-2 sm:p-4 pt-0">
						<div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">
							{Array.isArray(suppliers) && suppliers.length > 0 ? (
								suppliers
									.filter((s) => s.rating)
									.reduce((acc, s) => acc + (s.rating || 0), 0) /
								suppliers.filter((s) => s.rating).length
							).toFixed(1) : "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">Overall performance</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 sm:p-4">
						<CardTitle className="text-xs sm:text-sm font-medium">
							Total Products
						</CardTitle>
						<Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="p-2 sm:p-4 pt-0">
						<div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
							{Array.isArray(suppliers) ? suppliers.reduce((acc, s) => acc + (s._count?.products || 0), 0) : 0}
						</div>
						<p className="text-xs text-muted-foreground">Supplied products</p>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex gap-4 mb-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search suppliers by name, code, email, or contact..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
						<Button
							variant="outline"
							onClick={() => setShowFilters(!showFilters)}
						>
							<Filter className="h-4 w-4 mr-2" />
							Filters
						</Button>
					</div>

					{showFilters && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
							<div>
								<span className="text-sm font-medium mb-2 block">
									Status
								</span>
								<Select
									value={statusFilter}
									onValueChange={setStatusFilter}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Status</SelectItem>
										<SelectItem value="ACTIVE">Active</SelectItem>
										<SelectItem value="INACTIVE">Inactive</SelectItem>
										<SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
										<SelectItem value="SUSPENDED">Suspended</SelectItem>
										<SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<span className="text-sm font-medium mb-2 block">Company Type</span>
								<Select value={companyTypeFilter} onValueChange={setCompanyTypeFilter}>
									<SelectTrigger>
										<SelectValue placeholder="All Types" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Types</SelectItem>
										<SelectItem value="CORPORATION">Corporation</SelectItem>
										<SelectItem value="LLC">LLC</SelectItem>
										<SelectItem value="PARTNERSHIP">Partnership</SelectItem>
										<SelectItem value="SOLE_PROPRIETORSHIP">Sole Proprietorship</SelectItem>
										<SelectItem value="NON_PROFIT">Non-Profit</SelectItem>
										<SelectItem value="GOVERNMENT">Government</SelectItem>
										<SelectItem value="OTHER">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Bulk Actions */}
			{selectedSuppliers.length > 0 && (
				<Card>
					<CardContent className="p-3 sm:p-6">
						<div className="flex items-center justify-between">
							<span className="text-xs sm:text-sm text-muted-foreground">
								{selectedSuppliers.length} supplier(s) selected
							</span>
							<Button variant="outline" size="sm">
								Bulk Actions
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Suppliers Table */}
			<Card>
				<CardHeader>
					<CardTitle>Suppliers ({filteredSuppliers.length})</CardTitle>
					<CardDescription>
						Manage your supplier relationships and contact information
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">
									<Checkbox
										checked={
											selectedSuppliers.length === paginatedSuppliers.length &&
											paginatedSuppliers.length > 0
										}
										onCheckedChange={handleSelectAll}
									/>
								</TableHead>
								<TableHead>Supplier</TableHead>
								<TableHead className="hidden sm:table-cell">Code</TableHead>
								<TableHead className="hidden md:table-cell">Contact</TableHead>
								<TableHead className="hidden lg:table-cell">Company Type</TableHead>
								<TableHead className="hidden sm:table-cell">Rating</TableHead>
								<TableHead className="hidden md:table-cell">Products</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{paginatedSuppliers.map((supplier) => (
								<TableRow key={supplier.id}>
									<TableCell>
										<Checkbox
											checked={selectedSuppliers.includes(supplier.id)}
											onCheckedChange={(checked) =>
												handleSelectSupplier(supplier.id, checked as boolean)
											}
										/>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2 sm:gap-3">
											<div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
												<Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
											</div>
											<div>
												<div className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-[200px]">
													{supplier.name}
												</div>
												<div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">
													{supplier.billingAddress.city}, {supplier.billingAddress.country}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<code className="text-xs sm:text-sm bg-muted px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
											{supplier.code}
										</code>
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<div className="text-xs sm:text-sm">
											<div className="font-medium">
												{supplier.contactName || "-"}
											</div>
											{supplier.contactEmail && (
												<div className="text-muted-foreground flex items-center gap-1 mt-1">
													<Mail className="h-3 w-3" />
													{supplier.contactEmail}
												</div>
											)}
											{supplier.contactPhone && (
												<div className="text-muted-foreground flex items-center gap-1 mt-1">
													<Phone className="h-3 w-3" />
													{supplier.contactPhone}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell className="hidden lg:table-cell">
										{supplier.companyType ? supplier.companyType.replace("_", " ") : "-"}
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										{getRatingStars(supplier.rating)}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<div className="text-xs sm:text-sm">
											<div className="font-medium">
												{supplier._count?.products || 0}
											</div>
											<div className="text-muted-foreground">
												products
											</div>
										</div>
									</TableCell>
									<TableCell>{getStatusBadge(supplier.status)}</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-7 w-7 p-0"
													aria-label="Open actions menu"
												>
													<span className="sr-only">Open actions menu</span>
													<svg
														width="15"
														height="15"
														viewBox="0 0 15 15"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
														className="h-4 w-4"
														aria-hidden="true"
													>
														<title>More options</title>
														<path
															d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z"
															fill="currentColor"
															fillRule="evenodd"
															clipRule="evenodd"
														></path>
													</svg>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem>
													<Eye className="h-4 w-4 mr-2" />
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem>
													<Edit className="h-4 w-4 mr-2" />
													Edit Supplier
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-red-600"
													onClick={() => handleDeleteSupplier(supplier.id)}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete Supplier
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-4">
							<div className="text-sm text-muted-foreground">
								Showing {startIndex + 1} to{" "}
								{Math.min(startIndex + itemsPerPage, filteredSuppliers.length)}{" "}
								of {filteredSuppliers.length} suppliers
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage - 1)}
									disabled={currentPage === 1}
								>
									Previous
								</Button>
								<span className="text-sm px-3 py-1">
									Page {currentPage} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage + 1)}
									disabled={currentPage === totalPages}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

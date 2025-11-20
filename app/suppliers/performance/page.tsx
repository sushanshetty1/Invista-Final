"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
	TrendingUp,
	TrendingDown,
	Package,
	Clock,
	Award,
	Eye,
	Star,
	StarHalf,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface SupplierPerformance {
	id: string;
	name: string;
	code: string;
	rating: number | null;
	onTimeDelivery: number | null;
	qualityRating: number | null;
	status: string;
	totalOrders: number;
	totalSpent: number;
	certifications: string[];
}

export default function SupplierPerformancePage() {
	const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [sortBy, setSortBy] = useState<string>("rating");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	const loadSuppliers = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/suppliers?includeStats=true");
			if (response.ok) {
				const data = await response.json();
				const supplierArray = Array.isArray(data) ? data : data.suppliers || [];

				// Calculate additional stats for each supplier
				const suppliersWithStats = supplierArray.map((supplier: SupplierPerformance) => ({
					...supplier,
					totalOrders: 0, // This would come from actual order data
					totalSpent: 0, // This would come from actual purchase data
				}));

				setSuppliers(suppliersWithStats);
			}
		} catch (error) {
			console.error("Error loading suppliers:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSuppliers();
	}, [loadSuppliers]);

	// Calculate aggregate stats
	const calculateAggregateStats = () => {
		if (suppliers.length === 0) {
			return {
				avgRating: 0,
				avgOnTime: 0,
				avgQuality: 0,
				totalActive: 0,
			};
		}

		const activeSuppliers = suppliers.filter((s) => s.status === "ACTIVE");
		const suppliersWithRating = suppliers.filter((s) => s.rating !== null);
		const suppliersWithOnTime = suppliers.filter((s) => s.onTimeDelivery !== null);
		const suppliersWithQuality = suppliers.filter((s) => s.qualityRating !== null);

		return {
			avgRating:
				suppliersWithRating.length > 0
					? suppliersWithRating.reduce((acc, s) => acc + (s.rating || 0), 0) /
						suppliersWithRating.length
					: 0,
			avgOnTime:
				suppliersWithOnTime.length > 0
					? suppliersWithOnTime.reduce((acc, s) => acc + (s.onTimeDelivery || 0), 0) /
						suppliersWithOnTime.length
					: 0,
			avgQuality:
				suppliersWithQuality.length > 0
					? suppliersWithQuality.reduce((acc, s) => acc + (s.qualityRating || 0), 0) /
						suppliersWithQuality.length
					: 0,
			totalActive: activeSuppliers.length,
		};
	};

	// Sort suppliers
	const getSortedSuppliers = () => {
		const sorted = [...suppliers].sort((a, b) => {
			let aVal: number | string = 0;
			let bVal: number | string = 0;

			switch (sortBy) {
				case "rating":
					aVal = a.rating || 0;
					bVal = b.rating || 0;
					break;
				case "onTimeDelivery":
					aVal = a.onTimeDelivery || 0;
					bVal = b.onTimeDelivery || 0;
					break;
				case "qualityRating":
					aVal = a.qualityRating || 0;
					bVal = b.qualityRating || 0;
					break;
				case "name":
					aVal = a.name;
					bVal = b.name;
					break;
				default:
					aVal = a.rating || 0;
					bVal = b.rating || 0;
			}

			if (typeof aVal === "string" && typeof bVal === "string") {
				return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
			}

			return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
		});

		return sorted;
	};

	const stats = calculateAggregateStats();
	const sortedSuppliers = getSortedSuppliers();

	// Helper function to render star ratings
	const renderStars = (rating: number | null) => {
		if (rating === null) return <span className="text-muted-foreground">N/A</span>;

		const fullStars = Math.floor(rating);
		const hasHalfStar = rating % 1 >= 0.5;
		const stars = [];

		for (let i = 0; i < fullStars; i++) {
			stars.push(<Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
		}

		if (hasHalfStar && fullStars < 5) {
			stars.push(<StarHalf key="half" className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
		}

		const emptyStars = 5 - stars.length;
		for (let i = 0; i < emptyStars; i++) {
			stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
		}

		return (
			<div className="flex items-center gap-1">
				{stars}
				<span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
			</div>
		);
	};

	// Get status badge color
	const getStatusBadge = (status: string) => {
		const statusMap: { [key: string]: "default" | "success" | "warning" | "destructive" } = {
			ACTIVE: "success",
			INACTIVE: "default",
			PENDING_APPROVAL: "warning",
			SUSPENDED: "destructive",
			BLACKLISTED: "destructive",
		};

		return (
			<Badge variant={statusMap[status] || "default"}>
				{status.replace(/_/g, " ")}
			</Badge>
		);
	};

	// Get performance trend icon
	const getTrendIcon = (value: number | null, threshold: number) => {
		if (value === null) return null;
		if (value >= threshold) {
			return <TrendingUp className="h-4 w-4 text-green-500" />;
		}
		return <TrendingDown className="h-4 w-4 text-red-500" />;
	};

	if (isLoading) {
		return (
			<div className="py-16 px-6 mx-4 md:mx-8 space-y-6">
				<div>
					<Skeleton className="h-8 w-64 mb-2" />
					<Skeleton className="h-4 w-96" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
				<Skeleton className="h-96" />
			</div>
		);
	}

	return (
		<div className="py-16 px-6 mx-4 md:mx-8 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold">Supplier Performance</h1>
				<p className="text-muted-foreground">
					Monitor and analyze supplier performance metrics and analytics
				</p>
			</div>

			{/* Aggregate Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Average Rating</CardTitle>
						<Star className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
						<p className="text-xs text-muted-foreground">Out of 5.0</p>
						<Progress value={(stats.avgRating / 5) * 100} className="mt-2" />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.avgOnTime.toFixed(1)}%</div>
						<p className="text-xs text-muted-foreground">Average delivery rate</p>
						<Progress value={stats.avgOnTime} className="mt-2" />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Quality Rating</CardTitle>
						<Award className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.avgQuality.toFixed(1)}</div>
						<p className="text-xs text-muted-foreground">Out of 5.0</p>
						<Progress value={(stats.avgQuality / 5) * 100} className="mt-2" />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalActive}</div>
						<p className="text-xs text-muted-foreground">
							Out of {suppliers.length} total
						</p>
						<Progress
							value={(stats.totalActive / suppliers.length) * 100}
							className="mt-2"
						/>
					</CardContent>
				</Card>
			</div>

			{/* Performance Table */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Supplier Performance Metrics</CardTitle>
							<CardDescription>
								Detailed performance data for all suppliers
							</CardDescription>
						</div>
						<div className="flex gap-2">
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="rating">Overall Rating</SelectItem>
									<SelectItem value="onTimeDelivery">On-Time Delivery</SelectItem>
									<SelectItem value="qualityRating">Quality Rating</SelectItem>
									<SelectItem value="name">Name</SelectItem>
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
							>
								{sortOrder === "asc" ? "↑" : "↓"}
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Supplier</TableHead>
									<TableHead>Code</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Overall Rating</TableHead>
									<TableHead>On-Time Delivery</TableHead>
									<TableHead>Quality</TableHead>
									<TableHead>Certifications</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedSuppliers.length === 0 ? (
									<TableRow>
										<TableCell colSpan={8} className="text-center py-8">
											<div className="text-muted-foreground">
												<Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
												<p>No suppliers found</p>
											</div>
										</TableCell>
									</TableRow>
								) : (
									sortedSuppliers.map((supplier) => (
										<TableRow key={supplier.id}>
											<TableCell className="font-medium">
												{supplier.name}
											</TableCell>
											<TableCell>
												<code className="text-xs bg-muted px-2 py-1 rounded">
													{supplier.code}
												</code>
											</TableCell>
											<TableCell>{getStatusBadge(supplier.status)}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													{renderStars(supplier.rating)}
													{getTrendIcon(supplier.rating, 4.0)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<span className="font-medium">
														{supplier.onTimeDelivery !== null
															? `${supplier.onTimeDelivery.toFixed(1)}%`
															: "N/A"}
													</span>
													{getTrendIcon(supplier.onTimeDelivery, 95)}
												</div>
												{supplier.onTimeDelivery !== null && (
													<Progress
														value={supplier.onTimeDelivery}
														className="mt-1 h-1"
													/>
												)}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													{renderStars(supplier.qualityRating)}
													{getTrendIcon(supplier.qualityRating, 4.0)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{supplier.certifications &&
													supplier.certifications.length > 0 ? (
														<>
															<Badge variant="outline" className="text-xs">
																{supplier.certifications[0]}
															</Badge>
															{supplier.certifications.length > 1 && (
																<Badge variant="outline" className="text-xs">
																	+{supplier.certifications.length - 1}
																</Badge>
															)}
														</>
													) : (
														<span className="text-xs text-muted-foreground">
															None
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right">
												<Link href={`/suppliers/${supplier.id}`}>
													<Button variant="ghost" size="sm">
														<Eye className="h-4 w-4 mr-1" />
														View
													</Button>
												</Link>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Performance Insights */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-green-500" />
							Top Performers
						</CardTitle>
						<CardDescription>Suppliers with highest ratings</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{sortedSuppliers
								.filter((s) => s.rating !== null && s.rating >= 4.0)
								.slice(0, 5)
								.map((supplier, index) => (
									<div
										key={supplier.id}
										className="flex items-center justify-between"
									>
										<div className="flex items-center gap-3">
											<div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
												{index + 1}
											</div>
											<div>
												<p className="font-medium">{supplier.name}</p>
												<p className="text-xs text-muted-foreground">
													{supplier.code}
												</p>
											</div>
										</div>
										{renderStars(supplier.rating)}
									</div>
								))}
							{sortedSuppliers.filter((s) => s.rating !== null && s.rating >= 4.0)
								.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									No high-rated suppliers yet
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingDown className="h-5 w-5 text-red-500" />
							Needs Improvement
						</CardTitle>
						<CardDescription>Suppliers requiring attention</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{sortedSuppliers
								.filter((s) => s.rating !== null && s.rating < 3.0)
								.slice(0, 5)
								.map((supplier) => (
									<div
										key={supplier.id}
										className="flex items-center justify-between"
									>
										<div>
											<p className="font-medium">{supplier.name}</p>
											<p className="text-xs text-muted-foreground">
												{supplier.code}
											</p>
										</div>
										<div className="text-right">
											{renderStars(supplier.rating)}
											<p className="text-xs text-red-500 mt-1">
												Below standard
											</p>
										</div>
									</div>
								))}
							{sortedSuppliers.filter((s) => s.rating !== null && s.rating < 3.0)
								.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									All suppliers meeting standards
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
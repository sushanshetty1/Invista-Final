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
		if (rating === null || rating === undefined) return <span className="text-muted-foreground">N/A</span>;

		const ratingNum = typeof rating === 'number' ? rating : parseFloat(rating);
		if (Number.isNaN(ratingNum)) return <span className="text-muted-foreground">N/A</span>;

		const fullStars = Math.floor(ratingNum);
		const hasHalfStar = ratingNum % 1 >= 0.5;
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
				<span className="ml-1 text-sm font-medium">{ratingNum.toFixed(1)}</span>
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
			<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
					<div className="animate-pulse space-y-8">
						<div className="space-y-2">
							<Skeleton className="h-10 w-1/3 rounded-lg" />
							<Skeleton className="h-4 w-1/2 rounded" />
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
							<Skeleton className="h-32 rounded-xl shadow-lg" />
							<Skeleton className="h-32 rounded-xl shadow-lg" />
							<Skeleton className="h-32 rounded-xl shadow-lg" />
							<Skeleton className="h-32 rounded-xl shadow-lg" />
						</div>
						<Skeleton className="h-96 rounded-xl shadow-lg" />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<Skeleton className="h-64 rounded-xl shadow-lg" />
							<Skeleton className="h-64 rounded-xl shadow-lg" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
				{/* Header */}
				<div className="space-y-1">
					<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
						Supplier Performance Analytics
					</h1>
					<p className="text-base text-muted-foreground max-w-2xl">
						Monitor and analyze supplier performance metrics, ratings, and delivery statistics
					</p>
				</div>

				{/* Aggregate Stats Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
					<Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">Average Rating</CardTitle>
							<div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
								<Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
							</div>
						</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{Number(stats.avgRating).toFixed(1)}</div>
								<p className="text-xs text-muted-foreground mt-1">Out of 5.0 stars</p>
								<Progress value={(Number(stats.avgRating) / 5) * 100} className="mt-3 h-2" />
							</CardContent>
					</Card>

					<Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-green-700 dark:text-green-400">On-Time Delivery</CardTitle>
							<div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
								<Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
							</div>
						</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold text-green-900 dark:text-green-100">{Number(stats.avgOnTime).toFixed(1)}%</div>
								<p className="text-xs text-muted-foreground mt-1">Average delivery rate</p>
								<Progress value={Number(stats.avgOnTime)} className="mt-3 h-2" />
							</CardContent>
					</Card>

					<Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-400">Quality Rating</CardTitle>
							<div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
								<Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
							</div>
						</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{Number(stats.avgQuality).toFixed(1)}</div>
								<p className="text-xs text-muted-foreground mt-1">Out of 5.0 stars</p>
								<Progress value={(Number(stats.avgQuality) / 5) * 100} className="mt-3 h-2" />
							</CardContent>
					</Card>

					<Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-400">Active Suppliers</CardTitle>
							<div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
								<Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalActive}</div>
							<p className="text-xs text-muted-foreground mt-1">
								Out of {suppliers.length} total suppliers
							</p>
							<Progress
								value={suppliers.length > 0 ? (stats.totalActive / suppliers.length) * 100 : 0}
								className="mt-3 h-2"
							/>
						</CardContent>
					</Card>
				</div>

				{/* Performance Table */}
				<Card className="border-none shadow-lg">
					<CardHeader className="border-b bg-muted/30">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
							<div>
								<CardTitle className="text-xl">Supplier Performance Metrics</CardTitle>
								<CardDescription className="mt-1">
									Detailed performance data and analytics for all suppliers
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
													{supplier.onTimeDelivery !== null && supplier.onTimeDelivery !== undefined
														? `${Number(supplier.onTimeDelivery).toFixed(1)}%`
														: "N/A"}
												</span>
												{getTrendIcon(supplier.onTimeDelivery, 95)}
											</div>
											{supplier.onTimeDelivery !== null && supplier.onTimeDelivery !== undefined && (
												<Progress
													value={Number(supplier.onTimeDelivery)}
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
					<Card className="border-none shadow-lg">
						<CardHeader className="border-b bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20">
							<CardTitle className="flex items-center gap-2 text-lg">
								<div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
									<TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
								</div>
								Top Performers
							</CardTitle>
							<CardDescription>Suppliers with highest ratings (≥4.0)</CardDescription>
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

					<Card className="border-none shadow-lg">
						<CardHeader className="border-b bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/20">
							<CardTitle className="flex items-center gap-2 text-lg">
								<div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
									<TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
								</div>
								Needs Improvement
							</CardTitle>
							<CardDescription>Suppliers requiring attention (below 3.0 rating)</CardDescription>
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
		</div>
	);
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	Search,
	Filter,
	Plus,
	Eye,
	Edit,
	Truck,
	Package,
	Clock,
	CheckCircle,
	XCircle,
	RefreshCw,
	DollarSign,
	BarChart3,
	FileText,
	AlertTriangle,
	ShoppingCart,
	Zap,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Types
interface PurchaseOrder {
	id: string;
	orderNumber: string;
	supplierId: string;
	supplier: {
		name: string;
		email?: string;
		phone?: string;
	};
	status:
		| "DRAFT"
		| "PENDING_APPROVAL"
		| "APPROVED"
		| "SENT"
		| "ACKNOWLEDGED"
		| "PARTIALLY_RECEIVED"
		| "RECEIVED"
		| "INVOICED"
		| "PAID"
		| "CANCELLED"
		| "CLOSED";
	totalAmount: number;
	currency: string;
	orderDate: string;
	expectedDate?: string;
	deliveryDate?: string;
	approvedBy?: string;
	approvedAt?: string;
	items: PurchaseOrderItem[];
	paymentTerms?: string;
	shippingTerms?: string;
	notes?: string;
}

interface PurchaseOrderItem {
	id: string;
	productName: string;
	productSku: string;
	supplierSku?: string;
	orderedQty: number;
	receivedQty: number;
	unitCost: number;
	totalCost: number;
	status: "PENDING" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
	expectedDate?: string;
}

interface PurchaseOrderStats {
	totalOrders: number;
	pendingApproval: number;
	awaitingDelivery: number;
	totalValue: number;
	avgOrderValue: number;
}

interface ReorderSuggestion {
	productId: string;
	productName: string;
	productSku: string;
	currentStock: number;
	reorderPoint: number;
	suggestedQty: number;
	preferredSupplier: string;
	estimatedCost: number;
}

export default function PurchaseOrdersPage() {
	const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
	const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
	const [stats, setStats] = useState<PurchaseOrderStats>({
		totalOrders: 0,
		pendingApproval: 0,
		awaitingDelivery: 0,
		totalValue: 0,
		avgOrderValue: 0,
	});
	const [reorderSuggestions, setReorderSuggestions] = useState<
		ReorderSuggestion[]
	>([]);
	const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
	const [isGoodsReceiptOpen, setIsGoodsReceiptOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("orders");
	// Load purchase orders and reorder suggestions
	useEffect(() => {
		loadPurchaseOrders();
		loadReorderSuggestions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const loadPurchaseOrders = async () => {
		setLoading(true);
		try {
			// Fetch purchase orders from API
			const ordersResponse = await fetch("/api/purchase-orders");
			const ordersData = await ordersResponse.json();

			if (!ordersResponse.ok) {
				throw new Error(ordersData.error || "Failed to fetch purchase orders");
			}

			// Fetch stats from API
			const statsResponse = await fetch("/api/purchase-orders/stats");
			const statsData = await statsResponse.json();

			if (!statsResponse.ok) {
				throw new Error(statsData.error || "Failed to fetch stats");
			}

			setPurchaseOrders(ordersData.purchaseOrders || []);
			setFilteredOrders(ordersData.purchaseOrders || []);
			setStats(
				statsData.stats || {
					totalOrders: 0,
					pendingApproval: 0,
					awaitingDelivery: 0,
					totalValue: 0,
					avgOrderValue: 0,
				},
			);
		} catch (error) {
			console.error("Error loading purchase orders:", error);
			toast.error("Failed to load purchase orders");
		} finally {
			setLoading(false);
		}
	};
	const loadReorderSuggestions = async () => {
		try {
			// Fetch reorder suggestions from API
			const response = await fetch("/api/purchase-orders/reorder-suggestions");
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch reorder suggestions");
			}

			setReorderSuggestions(data.suggestions || []);
		} catch (error) {
			console.error("Error loading reorder suggestions:", error);
			toast.error("Failed to load reorder suggestions");
		}
	};

	// Filter orders based on search and status
	useEffect(() => {
		let filtered = purchaseOrders;

		if (searchTerm) {
			filtered = filtered.filter(
				(order) =>
					order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
					order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		if (statusFilter !== "all") {
			filtered = filtered.filter((order) => order.status === statusFilter);
		}

		setFilteredOrders(filtered);
	}, [purchaseOrders, searchTerm, statusFilter]);
	const getStatusBadge = (status: string) => {
		type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
		const statusConfig: Record<
			string,
			{
				variant: BadgeVariant;
				icon: React.ComponentType<{ className?: string }>;
			}
		> = {
			DRAFT: { variant: "secondary", icon: FileText },
			PENDING_APPROVAL: { variant: "secondary", icon: Clock },
			APPROVED: { variant: "default", icon: CheckCircle },
			SENT: { variant: "default", icon: Truck },
			ACKNOWLEDGED: { variant: "default", icon: CheckCircle },
			PARTIALLY_RECEIVED: { variant: "default", icon: Package },
			RECEIVED: { variant: "default", icon: CheckCircle },
			INVOICED: { variant: "default", icon: FileText },
			PAID: { variant: "default", icon: DollarSign },
			CANCELLED: { variant: "destructive", icon: XCircle },
			CLOSED: { variant: "secondary", icon: CheckCircle },
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
		const Icon = config.icon;

		return (
			<Badge variant={config.variant} className="gap-1">
				<Icon className="h-3 w-3" />
				{status.replace("_", " ")}
			</Badge>
		);
	};

	const approveOrder = async (orderId: string) => {
		try {
			const response = await fetch(`/api/purchase-orders/${orderId}/approve`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					approvedBy: "Current User", // TODO: Get from auth context
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to approve purchase order");
			}

			// Update local state
			setPurchaseOrders((prev) =>
				prev.map((order) =>
					order.id === orderId
						? {
								...order,
								status: "APPROVED" as PurchaseOrder["status"],
								approvedBy: "Current User",
								approvedAt: new Date().toISOString(),
							}
						: order,
				),
			);

			toast.success("Purchase order approved successfully");
		} catch (error) {
			console.error("Error approving order:", error);
			toast.error("Failed to approve purchase order");
		}
	};
	const createReorderFromSuggestion = async (suggestion: ReorderSuggestion) => {
		try {
			const response = await fetch("/api/purchase-orders/reorder-suggestions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					productId: suggestion.productId,
					quantity: suggestion.suggestedQty,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.error || "Failed to create purchase order from suggestion",
				);
			}

			// Remove from suggestions after creating order
			setReorderSuggestions((prev) =>
				prev.filter((s) => s.productId !== suggestion.productId),
			);

			// Reload purchase orders to show the new one
			loadPurchaseOrders();

			toast.success(
				"Purchase order created successfully from reorder suggestion",
			);
		} catch (error) {
			console.error("Error creating reorder:", error);
			toast.error("Failed to create purchase order from suggestion");
		}
	};

	const viewOrderDetails = (order: PurchaseOrder) => {
		setSelectedOrder(order);
		setIsOrderDetailOpen(true);
	};

	const receiveGoods = (order: PurchaseOrder) => {
		setSelectedOrder(order);
		setIsGoodsReceiptOpen(true);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-96">
				<RefreshCw className="h-8 w-8 animate-spin" />
			</div>
		);
	}
	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
			<div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
				<div className="space-y-8">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold tracking-tight mb-2">
								Purchase Orders
							</h1>
							<p className="text-sm text-muted-foreground">
								Manage purchase orders, supplier relationships, and inventory
								procurement
							</p>
						</div>
						<Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
							<Link href="/purchase-orders/create">
								<Plus className="mr-2 h-4 w-4" />
								New Purchase Order
							</Link>
						</Button>
					</div>

					{/* Stats Cards */}
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
						<Card className="hover:shadow-lg transition-all duration-300 border-border/50">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Total Orders
								</CardTitle>
								<div className="p-2 bg-primary/10 rounded-lg">
									<ShoppingCart className="h-4 w-4 text-primary" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">{stats.totalOrders}</div>
								<p className="text-xs text-muted-foreground mt-1">All time orders</p>
							</CardContent>
						</Card>

						<Card className="hover:shadow-lg transition-all duration-300 border-border/50">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Pending Approval
								</CardTitle>
								<div className="p-2 bg-amber-500/10 rounded-lg">
									<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">
									{stats.pendingApproval}
								</div>
								<p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
							</CardContent>
						</Card>

						<Card className="hover:shadow-lg transition-all duration-300 border-border/50">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Awaiting Delivery
								</CardTitle>
								<div className="p-2 bg-blue-500/10 rounded-lg">
									<Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">
									{stats.awaitingDelivery}
								</div>
								<p className="text-xs text-muted-foreground mt-1">In transit</p>
							</CardContent>
						</Card>

						<Card className="hover:shadow-lg transition-all duration-300 border-border/50">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Total Value
								</CardTitle>
								<div className="p-2 bg-green-500/10 rounded-lg">
									<DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
								</div>
							</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold">
								${Number(stats.totalValue).toFixed(2)}
							</div>
							<p className="text-xs text-muted-foreground mt-1">Total spent</p>
						</CardContent>
						</Card>

						<Card className="hover:shadow-lg transition-all duration-300 border-border/50">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Average Order
								</CardTitle>
								<div className="p-2 bg-purple-500/10 rounded-lg">
									<BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
								</div>
							</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold">
								${Number(stats.avgOrderValue).toFixed(2)}
							</div>
							<p className="text-xs text-muted-foreground mt-1">Per order</p>
						</CardContent>
						</Card>
					</div>

					{/* Main Content Tabs */}
					<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
						<TabsList className="bg-muted/50 p-1">
							<TabsTrigger value="orders" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
								<FileText className="h-4 w-4 mr-2" />
								Purchase Orders
							</TabsTrigger>
							<TabsTrigger value="reorder" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
								<AlertTriangle className="h-4 w-4" />
								Reorder Suggestions
								{reorderSuggestions.length > 0 && (
									<span className="ml-1 px-2 py-0.5 bg-amber-500/20 text-amber-900 dark:text-amber-100 rounded-full text-xs font-medium">
										{reorderSuggestions.length}
									</span>
								)}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="orders" className="space-y-5 mt-0">
							<Card className="border-border/50 shadow-sm">
								<CardHeader className="pb-4">
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="text-xl">Purchase Orders</CardTitle>
											<CardDescription className="mt-1">
												View and manage all purchase orders
											</CardDescription>
										</div>
										<Badge variant="secondary" className="text-sm px-3 py-1">
											{filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="pt-0">
									<div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3 mb-6">
										<div className="flex-1">
											<div className="relative">
												<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												<Input
													placeholder="Search purchase orders..."
													value={searchTerm}
													onChange={(e) => setSearchTerm(e.target.value)}
													className="pl-9 h-10"
												/>
											</div>
										</div>
										<Select
											value={statusFilter}
											onValueChange={setStatusFilter}
										>
											<SelectTrigger className="w-[220px] h-10">
												<Filter className="mr-2 h-4 w-4" />
												<SelectValue placeholder="Filter by status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Statuses</SelectItem>
												<SelectItem value="DRAFT">Draft</SelectItem>
												<SelectItem value="PENDING_APPROVAL">
													Pending Approval
												</SelectItem>
												<SelectItem value="APPROVED">Approved</SelectItem>
												<SelectItem value="SENT">Sent</SelectItem>
												<SelectItem value="ACKNOWLEDGED">
													Acknowledged
												</SelectItem>
												<SelectItem value="PARTIALLY_RECEIVED">
													Partially Received
												</SelectItem>
												<SelectItem value="RECEIVED">Received</SelectItem>
												<SelectItem value="INVOICED">Invoiced</SelectItem>
												<SelectItem value="PAID">Paid</SelectItem>
												<SelectItem value="CANCELLED">Cancelled</SelectItem>
												<SelectItem value="CLOSED">Closed</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Purchase Orders Table */}
									<div className="rounded-lg border border-border/50 overflow-hidden bg-card/50">
										<Table>
											<TableHeader>
												<TableRow className="bg-muted/50 hover:bg-muted/50">
													<TableHead className="font-semibold">PO Number</TableHead>
													<TableHead className="font-semibold">Supplier</TableHead>
													<TableHead className="font-semibold">Status</TableHead>
													<TableHead className="font-semibold">Total</TableHead>
													<TableHead className="font-semibold">Order Date</TableHead>
													<TableHead className="font-semibold">Expected Date</TableHead>
													<TableHead className="font-semibold">Approved By</TableHead>
													<TableHead className="text-right font-semibold">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredOrders.length === 0 ? (
													<TableRow>
														<TableCell colSpan={8} className="h-32 text-center">
															<div className="flex flex-col items-center justify-center text-muted-foreground">
																<Package className="h-10 w-10 mb-3 opacity-50" />
																<p className="font-medium">No purchase orders found</p>
																<p className="text-sm">Try adjusting your search or filters</p>
															</div>
														</TableCell>
													</TableRow>
												) : (
													filteredOrders.map((order) => (
														<TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
															<TableCell className="font-mono text-sm font-medium">
																{order.orderNumber}
															</TableCell>
															<TableCell>
																<div>
																	<div className="font-medium">
																		{order.supplier.name}
																	</div>
																	<div className="text-xs text-muted-foreground">
																		{order.supplier.email}
																	</div>
																</div>
															</TableCell>
															<TableCell>
																{getStatusBadge(order.status)}
															</TableCell>
															<TableCell className="font-semibold">
																{order.currency} {Number(order.totalAmount).toFixed(2)}
															</TableCell>
															<TableCell className="text-sm">
																{format(
																	new Date(order.orderDate),
																	"MMM dd, yyyy",
																)}
															</TableCell>
															<TableCell className="text-sm">
																{order.expectedDate
																	? format(
																			new Date(order.expectedDate),
																			"MMM dd, yyyy",
																		)
																	: <span className="text-muted-foreground">-</span>}
															</TableCell>
															<TableCell className="text-sm">{order.approvedBy || <span className="text-muted-foreground">-</span>}</TableCell>
															<TableCell className="text-right">
																<div className="flex items-center justify-end gap-1">
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => viewOrderDetails(order)}
																		className="h-8 w-8 p-0"
																		title="View details"
																	>
																		<Eye className="h-4 w-4" />
																	</Button>
																	{order.status === "PENDING_APPROVAL" && (
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => approveOrder(order.id)}
																			className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
																			title="Approve order"
																		>
																			<CheckCircle className="h-4 w-4" />
																		</Button>
																	)}
																	{[
																		"APPROVED",
																		"SENT",
																		"ACKNOWLEDGED",
																		"PARTIALLY_RECEIVED",
																	].includes(order.status) && (
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => receiveGoods(order)}
																			className="h-8 w-8 p-0"
																			title="Receive goods"
																		>
																			<Package className="h-4 w-4" />
																		</Button>
																	)}
																</div>
															</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="reorder" className="space-y-5 mt-0">
							<Card className="border-border/50 shadow-sm">
								<CardHeader className="pb-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="p-2 bg-amber-500/10 rounded-lg">
												<Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
											</div>
											<div>
												<CardTitle className="text-xl">Automated Reorder Suggestions</CardTitle>
												<CardDescription className="mt-1">
													Products that are below reorder point and need restocking
												</CardDescription>
											</div>
										</div>
										{reorderSuggestions.length > 0 && (
											<Badge variant="secondary" className="bg-amber-500/20 text-amber-900 dark:text-amber-100 text-sm px-3 py-1">
												{reorderSuggestions.length} items
											</Badge>
										)}
									</div>
								</CardHeader>
								<CardContent className="pt-0">
									{reorderSuggestions.length === 0 ? (
										<div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-border">
											<div className="flex flex-col items-center">
												<div className="p-4 bg-green-500/10 rounded-full mb-4">
													<CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
												</div>
												<h3 className="text-lg font-semibold mb-2">
													All Stock Levels Good
												</h3>
												<p className="text-sm text-muted-foreground max-w-md">
													All products are adequately stocked. New suggestions will appear when items drop below their reorder point.
												</p>
											</div>
										</div>
									) : (
										<div className="rounded-lg border border-border/50 overflow-hidden bg-card/50">
											<Table>
												<TableHeader>
													<TableRow className="bg-muted/50 hover:bg-muted/50">
														<TableHead className="font-semibold">Product</TableHead>
														<TableHead className="font-semibold">SKU</TableHead>
														<TableHead className="font-semibold">Current Stock</TableHead>
														<TableHead className="font-semibold">Reorder Point</TableHead>
														<TableHead className="font-semibold">Suggested Qty</TableHead>
														<TableHead className="font-semibold">Preferred Supplier</TableHead>
														<TableHead className="font-semibold">Estimated Cost</TableHead>
														<TableHead className="text-right font-semibold">
															Actions
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{reorderSuggestions.map((suggestion) => (
														<TableRow key={suggestion.productId} className="hover:bg-muted/30 transition-colors">
															<TableCell className="font-medium">
																{suggestion.productName}
															</TableCell>
															<TableCell className="font-mono text-sm">{suggestion.productSku}</TableCell>
															<TableCell>
																<div className="flex items-center gap-2">
																	<AlertTriangle className="h-4 w-4 text-red-600" />
																	<span className="text-red-600 dark:text-red-400 font-semibold">
																		{suggestion.currentStock}
																	</span>
																</div>
															</TableCell>
															<TableCell className="font-medium">{suggestion.reorderPoint}</TableCell>
															<TableCell>
																<span className="font-semibold text-green-600 dark:text-green-400">
																	{suggestion.suggestedQty}
																</span>
															</TableCell>
															<TableCell className="text-sm">
																{suggestion.preferredSupplier}
															</TableCell>
															<TableCell className="font-semibold">
																USD {Number(suggestion.estimatedCost).toFixed(2)}
															</TableCell>
															<TableCell className="text-right">
																<Button
																	size="sm"
																	onClick={() =>
																		createReorderFromSuggestion(suggestion)
																	}
																	className="shadow-sm hover:shadow-md transition-shadow"
																>
																	<Plus className="h-4 w-4 mr-1.5" />
																	Create PO
																</Button>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>

					{/* Purchase Order Detail Dialog */}
					<Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
						<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle>
									Purchase Order Details - {selectedOrder?.orderNumber}
								</DialogTitle>
							</DialogHeader>

							{selectedOrder && (
								<div className="space-y-6">
									{/* Order Overview */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<Card>
											<CardHeader>
												<CardTitle className="text-lg">
													Order Information
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-2">
												<div className="flex justify-between">
													<span className="text-muted-foreground">Status:</span>
													{getStatusBadge(selectedOrder.status)}
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">Total:</span>
													<span className="font-medium">
														{selectedOrder.currency}{" "}
														{Number(selectedOrder.totalAmount).toFixed(2)}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">
														Payment Terms:
													</span>
													<span>{selectedOrder.paymentTerms || "-"}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">
														Shipping Terms:
													</span>
													<span>{selectedOrder.shippingTerms || "-"}</span>
												</div>
											</CardContent>
										</Card>

										<Card>
											<CardHeader>
												<CardTitle className="text-lg">
													Supplier Information
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-2">
												<div className="flex justify-between">
													<span className="text-muted-foreground">Name:</span>
													<span>{selectedOrder.supplier.name}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">Email:</span>
													<span>{selectedOrder.supplier.email || "-"}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">Phone:</span>
													<span>{selectedOrder.supplier.phone || "-"}</span>
												</div>
											</CardContent>
										</Card>
									</div>

								{/* Order Items */}
								<Card>
									<CardHeader>
										<CardTitle className="text-lg">Order Items</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Product</TableHead>
														<TableHead>SKU</TableHead>
														<TableHead>Supplier SKU</TableHead>
														<TableHead>Ordered</TableHead>
														<TableHead>Received</TableHead>
														<TableHead>Unit Cost</TableHead>
														<TableHead>Total</TableHead>
														<TableHead>Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{selectedOrder.items.map((item) => (
														<TableRow key={item.id}>
															<TableCell className="font-medium">
																{item.productName}
															</TableCell>
															<TableCell>{item.productSku}</TableCell>
															<TableCell>{item.supplierSku || "-"}</TableCell>
															<TableCell>{item.orderedQty}</TableCell>
															<TableCell>{item.receivedQty}</TableCell>
															<TableCell>
																{selectedOrder.currency}{" "}
																{Number(item.unitCost).toFixed(2)}
															</TableCell>
															<TableCell>
																{selectedOrder.currency}{" "}
																{Number(item.totalCost).toFixed(2)}
															</TableCell>
															<TableCell>
																{getStatusBadge(item.status)}
															</TableCell>
														</TableRow>
											))}
										</TableBody>
									</Table>
										</div>
								</CardContent>
							</Card>									{/* Action Buttons */}
									<div className="flex justify-end space-x-2">
										{selectedOrder.status === "PENDING_APPROVAL" && (
											<Button onClick={() => approveOrder(selectedOrder.id)}>
												<CheckCircle className="h-4 w-4 mr-2" />
												Approve Order
											</Button>
										)}
										{[
											"APPROVED",
											"SENT",
											"ACKNOWLEDGED",
											"PARTIALLY_RECEIVED",
										].includes(selectedOrder.status) && (
											<Button onClick={() => receiveGoods(selectedOrder)}>
												<Package className="h-4 w-4 mr-2" />
												Receive Goods
											</Button>
										)}
										<Button variant="outline">
											<Edit className="h-4 w-4 mr-2" />
											Edit Order
										</Button>
									</div>
								</div>
							)}
						</DialogContent>
					</Dialog>

					{/* Goods Receipt Dialog */}
					<Dialog
						open={isGoodsReceiptOpen}
						onOpenChange={setIsGoodsReceiptOpen}
					>
						<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle>
									Goods Receipt - {selectedOrder?.orderNumber}
								</DialogTitle>
							</DialogHeader>
							{selectedOrder && (
								<div className="space-y-4">
									<Card>
										<CardHeader>
											<CardTitle className="text-lg">Receive Goods</CardTitle>
											<CardDescription>
												Update received quantities and perform quality checks
											</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Product</TableHead>
														<TableHead>Ordered</TableHead>
														<TableHead>Previously Received</TableHead>
														<TableHead>Receiving Now</TableHead>
														<TableHead>Quality Check</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{selectedOrder.items.map((item) => (
														<TableRow key={item.id}>
															<TableCell>
																<div>
																	<div className="font-medium">
																		{item.productName}
																	</div>
																	<div className="text-sm text-muted-foreground">
																		{item.productSku}
																	</div>
																</div>
															</TableCell>
															<TableCell>{item.orderedQty}</TableCell>
															<TableCell>{item.receivedQty}</TableCell>
															<TableCell>
																<Input
																	type="number"
																	placeholder="0"
																	className="w-20"
																	max={item.orderedQty - item.receivedQty}
																/>
															</TableCell>
															<TableCell>
																<Select defaultValue="passed">
																	<SelectTrigger className="w-32">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="passed">
																			Passed
																		</SelectItem>
																		<SelectItem value="failed">
																			Failed
																		</SelectItem>
																		<SelectItem value="partial">
																			Partial
																		</SelectItem>
																	</SelectContent>
																</Select>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>

										<div className="mt-4">
											<span className="text-sm font-medium block mb-1">
												Receipt Notes
											</span>
											<Textarea
												placeholder="Add any notes about the receipt, quality issues, or discrepancies..."
												className="mt-1"
											/>
										</div>											<div className="flex justify-end space-x-2 mt-6">
												<Button
													variant="outline"
													onClick={() => setIsGoodsReceiptOpen(false)}
												>
													Cancel
												</Button>
												<Button>
													<Package className="h-4 w-4 mr-2" />
													Complete Receipt
												</Button>
											</div>
										</CardContent>
									</Card>
								</div>
							)}{" "}
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</div>
	);
}

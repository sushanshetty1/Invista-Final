"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Package,
	Search,
	Truck,
	XCircle,
} from "lucide-react";

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	fulfillmentStatus: string;
	priorityLevel: string;
	totalAmount: number;
	customer: {
		firstName: string;
		lastName: string;
		email: string;
		companyName?: string;
	};
	shippingAddress: {
		street: string;
		city: string;
		state: string;
		zipCode: string;
		country: string;
	};
	orderItems: Array<{
		id: string;
		productId: string;
		product: {
			name: string;
			sku: string;
		};
		quantity: number;
		unitPrice: number;
		allocatedQuantity: number;
		fulfilledQuantity: number;
		status: string;
	}>;
	createdAt: string;
	estimatedDelivery?: string;
}

interface ShipmentFormData {
	orderId: string;
	trackingNumber: string;
	carrier: string;
	shippingMethod: string;
	estimatedDelivery: string;
	notes?: string;
	items: Array<{
		orderItemId: string;
		quantity: number;
	}>;
}

export default function FulfillmentPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	
	// Shipment creation
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);
	const [shipmentForm, setShipmentForm] = useState<ShipmentFormData>({
		orderId: "",
		trackingNumber: "",
		carrier: "",
		shippingMethod: "",
		estimatedDelivery: "",
		notes: "",
		items: [],
	});

	// Load orders ready for fulfillment
	const loadOrders = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch("/api/orders?fulfillmentStatus=UNFULFILLED,PARTIAL&status=CONFIRMED,PROCESSING");
			if (!response.ok) throw new Error("Failed to fetch orders");
			
			const data = await response.json();
			setOrders(data.orders || []);
		} catch (error) {
			console.error("Error loading orders:", error);
			toast.error("Failed to load orders for fulfillment");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadOrders();
	}, [loadOrders]);

	// Filter orders
	useEffect(() => {
		let filtered = orders;

		if (searchTerm) {
			filtered = filtered.filter(
				(order) =>
					order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
					order.customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					order.customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					order.customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		if (statusFilter !== "all") {
			filtered = filtered.filter((order) => order.fulfillmentStatus === statusFilter);
		}

		if (priorityFilter !== "all") {
			filtered = filtered.filter((order) => order.priorityLevel === priorityFilter);
		}

		setFilteredOrders(filtered);
	}, [orders, searchTerm, statusFilter, priorityFilter]);

	const getStatusBadge = (status: string, type: 'fulfillment' | 'priority' = 'fulfillment') => {
		const fulfillmentConfigs = {
			UNFULFILLED: { variant: "secondary" as const, icon: Clock },
			PARTIAL: { variant: "outline" as const, icon: Package },
			FULFILLED: { variant: "default" as const, icon: CheckCircle },
		};
		
		const priorityConfigs = {
			LOW: { variant: "secondary" as const, icon: Clock },
			MEDIUM: { variant: "outline" as const, icon: AlertTriangle },
			HIGH: { variant: "destructive" as const, icon: AlertTriangle },
			URGENT: { variant: "destructive" as const, icon: XCircle },
		};

		const config = type === 'fulfillment' 
			? fulfillmentConfigs[status as keyof typeof fulfillmentConfigs] || fulfillmentConfigs.UNFULFILLED
			: priorityConfigs[status as keyof typeof priorityConfigs] || priorityConfigs.LOW;
		
		const Icon = config.icon;

		return (
			<Badge variant={config.variant} className="gap-1">
				<Icon className="h-3 w-3" />
				{status}
			</Badge>
		);
	};

	const openShipmentDialog = (order: Order) => {
		setSelectedOrder(order);
		setShipmentForm({
			orderId: order.id,
			trackingNumber: "",
			carrier: "",
			shippingMethod: "",
			estimatedDelivery: "",
			notes: "",
			items: order.orderItems.map(item => ({
				orderItemId: item.id,
				quantity: item.quantity - item.fulfilledQuantity,
			})).filter(item => item.quantity > 0),
		});
		setIsShipmentDialogOpen(true);
	};

	const createShipment = async () => {
		try {
			const response = await fetch("/api/orders/shipments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(shipmentForm),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to create shipment");
			}

			toast.success("Shipment created successfully");

			setIsShipmentDialogOpen(false);
			loadOrders(); // Refresh the list
		} catch (error) {
			console.error("Error creating shipment:", error);
			toast.error(error instanceof Error ? error.message : "Failed to create shipment");
		}
	};

	const fulfillOrder = async (orderId: string) => {
		try {
			const response = await fetch(`/api/orders/${orderId}/fulfill`, {
				method: "POST",
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to fulfill order");
			}

			toast.success("Order fulfilled successfully");

			loadOrders(); // Refresh the list
		} catch (error) {
			console.error("Error fulfilling order:", error);
			toast.error(error instanceof Error ? error.message : "Failed to fulfill order");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p>Loading orders for fulfillment...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Order Fulfillment</h1>
				<p className="text-muted-foreground">
					Manage order fulfillment and create shipments
				</p>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>Filter Orders</CardTitle>
					<CardDescription>
						Find orders that need fulfillment
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<div className="flex-1">
							<Label htmlFor="search">Search Orders</Label>
							<div className="relative">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="search"
									placeholder="Search by order number or customer..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-8"
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="status-filter">Fulfillment Status</Label>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger id="status-filter" className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="UNFULFILLED">Unfulfilled</SelectItem>
									<SelectItem value="PARTIAL">Partial</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="priority-filter">Priority</Label>
							<Select value={priorityFilter} onValueChange={setPriorityFilter}>
								<SelectTrigger id="priority-filter" className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Priority</SelectItem>
									<SelectItem value="LOW">Low</SelectItem>
									<SelectItem value="MEDIUM">Medium</SelectItem>
									<SelectItem value="HIGH">High</SelectItem>
									<SelectItem value="URGENT">Urgent</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Orders Table */}
			<Card>
				<CardHeader>
					<CardTitle>Orders Ready for Fulfillment</CardTitle>
					<CardDescription>
						{filteredOrders.length} order(s) pending fulfillment
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Order #</TableHead>
								<TableHead>Customer</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Priority</TableHead>
								<TableHead>Items</TableHead>
								<TableHead>Total</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredOrders.map((order) => (
								<TableRow key={order.id}>
									<TableCell className="font-medium">
										{order.orderNumber}
									</TableCell>
									<TableCell>
										<div>
											<div className="font-medium">
												{order.customer.firstName} {order.customer.lastName}
											</div>
											<div className="text-sm text-muted-foreground">
												{order.customer.email}
											</div>
										</div>
									</TableCell>
									<TableCell>
										{getStatusBadge(order.fulfillmentStatus, 'fulfillment')}
									</TableCell>
									<TableCell>
										{getStatusBadge(order.priorityLevel, 'priority')}
									</TableCell>
									<TableCell>
										{order.orderItems.length} item(s)
									</TableCell>
									<TableCell>
										${order.totalAmount.toFixed(2)}
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => openShipmentDialog(order)}
											>
												<Truck className="h-4 w-4 mr-1" />
												Ship
											</Button>
											<Button
												variant="default"
												size="sm"
												onClick={() => fulfillOrder(order.id)}
											>
												<CheckCircle className="h-4 w-4 mr-1" />
												Fulfill
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Shipment Creation Dialog */}
			<Dialog open={isShipmentDialogOpen} onOpenChange={setIsShipmentDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Create Shipment</DialogTitle>
						<DialogDescription>
							Create a shipment for order #{selectedOrder?.orderNumber}
						</DialogDescription>
					</DialogHeader>
					
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="tracking">Tracking Number</Label>
								<Input
									id="tracking"
									value={shipmentForm.trackingNumber}
									onChange={(e) => setShipmentForm(prev => ({
										...prev,
										trackingNumber: e.target.value
									}))}
									placeholder="Enter tracking number"
								/>
							</div>
							<div>
								<Label htmlFor="carrier">Carrier</Label>
								<Select 
									value={shipmentForm.carrier} 
									onValueChange={(value) => setShipmentForm(prev => ({
										...prev,
										carrier: value
									}))}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select carrier" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="UPS">UPS</SelectItem>
										<SelectItem value="FEDEX">FedEx</SelectItem>
										<SelectItem value="USPS">USPS</SelectItem>
										<SelectItem value="DHL">DHL</SelectItem>
										<SelectItem value="OTHER">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="shipping-method">Shipping Method</Label>
								<Select 
									value={shipmentForm.shippingMethod} 
									onValueChange={(value) => setShipmentForm(prev => ({
										...prev,
										shippingMethod: value
									}))}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select method" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="STANDARD">Standard</SelectItem>
										<SelectItem value="EXPRESS">Express</SelectItem>
										<SelectItem value="OVERNIGHT">Overnight</SelectItem>
										<SelectItem value="TWO_DAY">2-Day</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="estimated-delivery">Estimated Delivery</Label>
								<Input
									id="estimated-delivery"
									type="date"
									value={shipmentForm.estimatedDelivery}
									onChange={(e) => setShipmentForm(prev => ({
										...prev,
										estimatedDelivery: e.target.value
									}))}
								/>
							</div>
						</div>
						
						<div>
							<Label htmlFor="notes">Notes (Optional)</Label>
							<Textarea
								id="notes"
								value={shipmentForm.notes}
								onChange={(e) => setShipmentForm(prev => ({
									...prev,
									notes: e.target.value
								}))}
								placeholder="Add any shipping notes..."
							/>
						</div>
						
						{/* Items to ship */}
						{selectedOrder && (
							<div>
								<Label>Items to Ship</Label>
								<div className="border rounded-lg p-4 space-y-2">
									{selectedOrder.orderItems.map((item) => (
										<div key={item.id} className="flex items-center justify-between">
											<div>
												<span className="font-medium">{item.product.name}</span>
												<span className="text-sm text-muted-foreground ml-2">
													({item.product.sku})
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-sm">
													Qty: {item.quantity - item.fulfilledQuantity}
												</span>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
					
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsShipmentDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={createShipment}>
							<Package className="h-4 w-4 mr-2" />
							Create Shipment
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// Types
interface OrderItem {
	productId: string;
	productName: string;
	productSku: string;
	variantId?: string;
	quantity: number;
	unitPrice: number;
	discountAmount?: number;
	totalPrice: number;
}

interface Customer {
	id: string;
	firstName?: string;
	lastName?: string;
	companyName?: string;
	email: string;
}

interface Product {
	id: string;
	name: string;
	sku: string;
	sellingPrice: number | string | null | undefined;
	costPrice?: number | string | null;
	wholesalePrice?: number | string | null;
	inventoryItems?: Array<{
		availableQuantity: number;
		quantity?: number;
		reservedQuantity?: number;
		warehouse?: {
			id: string;
			name: string;
			code: string;
		};
	}>;
	// Legacy support for existing price field
	price?: number | string | null;
	inventory?: {
		availableQuantity: number;
	};
}

export default function CreateOrderPage() {
	const router = useRouter();
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [warehouses, setWarehouses] = useState<
		Array<{ id: string; name: string; code: string }>
	>([]);
	const [isLoadingProducts, setIsLoadingProducts] = useState(true);
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
	const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
	const [requiredDate, setRequiredDate] = useState("");
	const [promisedDate, setPromisedDate] = useState("");
	const [orderType, setOrderType] = useState<"SALES" | "RETURN" | "EXCHANGE" | "SAMPLE" | "REPLACEMENT">("SALES");
	const [orderChannel, setOrderChannel] = useState<"DIRECT" | "ONLINE" | "PHONE" | "EMAIL" | "RETAIL" | "WHOLESALE" | "B2B_PORTAL">("DIRECT");
	const [orderPriority, setOrderPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
	const [shippingMethod, setShippingMethod] = useState("");
	const [shippingAddress, setShippingAddress] = useState("");
	const [notes, setNotes] = useState("");
	const [internalNotes, setInternalNotes] = useState("");
	const [rushOrder, setRushOrder] = useState(false);
	const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		loadCustomers();
		loadProducts();
		loadWarehouses();
	}, []);

	const loadWarehouses = async () => {
		try {
			const response = await fetch("/api/warehouses");
			const data = await response.json();

			if (response.ok) {
				setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []);
				// Auto-select first warehouse if only one exists
				if (data.warehouses?.length === 1) {
					setSelectedWarehouseId(data.warehouses[0].id);
				}
			} else {
				console.error("Failed to load warehouses:", data.error);
				toast.error("Failed to load warehouses");
				setWarehouses([]);
			}
		} catch (error) {
			console.error("Error loading warehouses:", error);
			toast.error("Failed to load warehouses");
			setWarehouses([]);
		}
	};
	const loadCustomers = async () => {
		try {
			const response = await fetch("/api/customers");
			const data = await response.json();

			if (response.ok) {
				setCustomers(Array.isArray(data.customers) ? data.customers : []);
			} else {
				console.error("Failed to load customers:", data.error);
				toast.error("Failed to load customers");
				setCustomers([]);
			}
		} catch (error) {
			console.error("Error loading customers:", error);
			toast.error("Failed to load customers");
			setCustomers([]);
		}
	};
	const loadProducts = async () => {
		try {
			setIsLoadingProducts(true);
			const response = await fetch("/api/products");
			const data = await response.json();

			if (response.ok) {
				// data now contains { products: [...], pagination: {...} }
				setProducts(Array.isArray(data.products) ? data.products : []);
			} else {
				console.error("Failed to load products:", data.error);
				toast.error("Failed to load products");
				setProducts([]);
			}
		} catch (error) {
			console.error("Error loading products:", error);
			toast.error("Failed to load products");
			setProducts([]); // Ensure products is always an array
		} finally {
			setIsLoadingProducts(false);
		}
	};
	const addProduct = (product: Product) => {
		// Check if product has a valid price
		const price = getProductPrice(product);
		if (price <= 0) {
			toast.error("Cannot add product with invalid price");
			return;
		}

		const existingItem = orderItems.find(
			(item) => item.productId === product.id,
		);

		if (existingItem) {
			setOrderItems((prev) =>
				prev.map((item) =>
					item.productId === product.id
						? {
								...item,
								quantity: item.quantity + 1,
								totalPrice: (item.quantity + 1) * item.unitPrice,
							}
						: item,
				),
			);
		} else {
			const newItem: OrderItem = {
				productId: product.id,
				productName: product.name,
				productSku: product.sku,
				quantity: 1,
				unitPrice: price,
				totalPrice: price,
			};
			setOrderItems((prev) => [...prev, newItem]);
		}

		setIsProductSelectOpen(false);
	};

	const updateItemQuantity = (productId: string, quantity: number) => {
		if (quantity <= 0) {
			removeItem(productId);
			return;
		}

		setOrderItems((prev) =>
			prev.map((item) =>
				item.productId === productId
					? {
							...item,
							quantity,
							totalPrice:
								quantity * item.unitPrice - (item.discountAmount || 0),
						}
					: item,
			),
		);
	};

	const updateItemDiscount = (productId: string, discountAmount: number) => {
		setOrderItems((prev) =>
			prev.map((item) =>
				item.productId === productId
					? {
							...item,
							discountAmount: discountAmount >= 0 ? discountAmount : 0,
							totalPrice:
								item.quantity * item.unitPrice -
								(discountAmount >= 0 ? discountAmount : 0),
						}
					: item,
			),
		);
	};

	const removeItem = (productId: string) => {
		setOrderItems((prev) =>
			prev.filter((item) => item.productId !== productId),
		);
	};

	const calculateSubtotal = () => {
		return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
	};

	const handleSubmit = async () => {
		if (!selectedCustomerId) {
			toast.error("Please select a customer");
			return;
		}

		if (!selectedWarehouseId) {
			toast.error("Please select a warehouse");
			return;
		}

		if (orderItems.length === 0) {
			toast.error("Please add at least one item to the order");
			return;
		}

		setIsSubmitting(true);

		try {
			const orderData = {
				customerId: selectedCustomerId,
				warehouseId: selectedWarehouseId,
				type: orderType,
				channel: orderChannel,
				priority: orderPriority,
				requiredDate: requiredDate ? new Date(requiredDate).toISOString() : undefined,
				promisedDate: promisedDate ? new Date(promisedDate).toISOString() : undefined,
				shippingMethod,
				shippingAddress,
				notes,
				internalNotes,
				rushOrder,
				items: orderItems.map((item) => ({
					productId: item.productId,
					variantId: item.variantId,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					discountAmount: item.discountAmount || 0,
				})),
			};

			const response = await fetch("/api/orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(orderData),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to create order");
			}

			toast.success("Order created successfully!");
			router.push("/orders");
		} catch (error) {
			console.error("Error creating order:", error);
			toast.error("Failed to create order");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Helper function to safely convert price values to numbers
	const convertToNumber = (value: unknown): number => {
		if (value == null) return 0;
		if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
		if (typeof value === "string") {
			const parsed = parseFloat(value);
			return Number.isNaN(parsed) ? 0 : parsed;
		}
		return 0;
	};

	// Helper function to safely format currency
	const formatCurrency = (
		value: number | string | null | undefined,
	): string => {
		const numValue = convertToNumber(value);
		if (numValue <= 0) {
			return "$0.00";
		}
		return `$${numValue.toFixed(2)}`;
	};

	// Helper function to get the price for a product
	const getProductPrice = (product: Product): number => {
		// Try price first (for legacy support), then sellingPrice, then costPrice
		const priceValue =
			product.price || product.sellingPrice || product.costPrice;
		return convertToNumber(priceValue);
	};

	// Helper function to get total available quantity
	const getTotalAvailableQuantity = (product: Product): number => {
		// Support legacy inventory structure first
		if (product.inventory?.availableQuantity) {
			return product.inventory.availableQuantity;
		}

		// Then sum up all inventory items
		if (product.inventoryItems && Array.isArray(product.inventoryItems)) {
			return product.inventoryItems.reduce(
				(total, item) => total + (item.availableQuantity || 0),
				0,
			);
		}

		return 0;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back
				</Button>
				<div>
					<h1 className="text-3xl font-bold">Create New Order</h1>
					<p className="text-muted-foreground">
						Add a new customer order to the system
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Order Details */}
				<div className="lg:col-span-2 space-y-6">
					{/* Customer and Warehouse Selection */}
					<Card>
						<CardHeader>
							<CardTitle>Order Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="customer">Customer *</Label>
									<Select
										value={selectedCustomerId}
										onValueChange={setSelectedCustomerId}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a customer" />
										</SelectTrigger>
										<SelectContent>
											{customers.map((customer) => (
												<SelectItem key={customer.id} value={customer.id}>
													{customer.companyName ||
														`${customer.firstName} ${customer.lastName}`}{" "}
													- {customer.email}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="warehouse">Warehouse *</Label>
									<Select
										value={selectedWarehouseId}
										onValueChange={setSelectedWarehouseId}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a warehouse" />
										</SelectTrigger>
										<SelectContent>
											{warehouses.map((warehouse) => (
												<SelectItem key={warehouse.id} value={warehouse.id}>
													{warehouse.name} ({warehouse.code})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<Label htmlFor="orderType">Order Type</Label>
									<Select
										value={orderType}
										onValueChange={(value: typeof orderType) => setOrderType(value)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="SALES">Sales</SelectItem>
											<SelectItem value="RETURN">Return</SelectItem>
											<SelectItem value="EXCHANGE">Exchange</SelectItem>
											<SelectItem value="SAMPLE">Sample</SelectItem>
											<SelectItem value="REPLACEMENT">Replacement</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="orderChannel">Channel</Label>
									<Select
										value={orderChannel}
										onValueChange={(value: typeof orderChannel) => setOrderChannel(value)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="DIRECT">Direct</SelectItem>
											<SelectItem value="ONLINE">Online</SelectItem>
											<SelectItem value="PHONE">Phone</SelectItem>
											<SelectItem value="EMAIL">Email</SelectItem>
											<SelectItem value="RETAIL">Retail</SelectItem>
											<SelectItem value="WHOLESALE">Wholesale</SelectItem>
											<SelectItem value="B2B_PORTAL">B2B Portal</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="priority">Priority</Label>
									<Select
										value={orderPriority}
										onValueChange={(value: typeof orderPriority) => setOrderPriority(value)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="LOW">Low</SelectItem>
											<SelectItem value="NORMAL">Normal</SelectItem>
											<SelectItem value="HIGH">High</SelectItem>
											<SelectItem value="URGENT">Urgent</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Order Items */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Order Items</CardTitle>
								<Dialog
									open={isProductSelectOpen}
									onOpenChange={setIsProductSelectOpen}
								>
									<DialogTrigger asChild>
										<Button size="sm">
											<Plus className="h-4 w-4 mr-2" />
											Add Product
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-2xl">
										<DialogHeader>
											<DialogTitle>Select Product</DialogTitle>
										</DialogHeader>
										<div className="space-y-4">
											<Input placeholder="Search products..." />{" "}
											<div className="max-h-96 overflow-y-auto">
												{isLoadingProducts ? (
													<div className="text-center py-8 text-muted-foreground">
														Loading products...
													</div>
												) : products.length === 0 ? (
													<div className="text-center py-8 text-muted-foreground">
														No products available
													</div>
												) : (
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead>Product</TableHead>
																<TableHead>SKU</TableHead>
																<TableHead>Price</TableHead>
																<TableHead>Stock</TableHead>
																<TableHead></TableHead>
															</TableRow>
														</TableHeader>{" "}
														<TableBody>
															{" "}
															{Array.isArray(products) &&
																products.map((product) => {
																	const price = getProductPrice(product);
																	const availableQuantity =
																		getTotalAvailableQuantity(product);
																	return (
																		<TableRow key={product.id}>
																			<TableCell>{product.name}</TableCell>
																			<TableCell>{product.sku}</TableCell>{" "}
																			<TableCell>
																				{price > 0 ? (
																					formatCurrency(price)
																				) : (
																					<span className="text-muted-foreground">
																						No price set
																					</span>
																				)}
																			</TableCell>
																			<TableCell>{availableQuantity}</TableCell>
																			<TableCell>
																				<Button
																					size="sm"
																					onClick={() => addProduct(product)}
																					disabled={price <= 0}
																				>
																					Add
																				</Button>
																			</TableCell>
																		</TableRow>
																	);
																})}
														</TableBody>
													</Table>
												)}
											</div>
										</div>
									</DialogContent>
								</Dialog>
							</div>
						</CardHeader>
						<CardContent>
							{orderItems.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									No items added yet. Click &quot;Add Product&quot; to get
									started.
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Product</TableHead>
											<TableHead>Quantity</TableHead>
											<TableHead>Unit Price</TableHead>
											<TableHead>Discount</TableHead>
											<TableHead>Total</TableHead>
											<TableHead></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{orderItems.map((item) => (
											<TableRow key={item.productId}>
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
												<TableCell>
													<Input
														type="number"
														min="1"
														value={item.quantity}
														onChange={(e) =>
															updateItemQuantity(
																item.productId,
																parseInt(e.target.value) || 0,
															)
														}
														className="w-20"
													/>
												</TableCell>{" "}
												<TableCell>{formatCurrency(item.unitPrice)}</TableCell>
												<TableCell>
													<Input
														type="number"
														min="0"
														step="0.01"
														value={item.discountAmount || 0}
														onChange={(e) =>
															updateItemDiscount(
																item.productId,
																parseFloat(e.target.value) || 0,
															)
														}
														className="w-24"
														placeholder="0.00"
													/>
												</TableCell>
												<TableCell>{formatCurrency(item.totalPrice)}</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => removeItem(item.productId)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Order Summary & Details */}
				<div className="space-y-6">
					{/* Order Summary */}
					<Card>
						<CardHeader>
							<CardTitle>Order Summary</CardTitle>
						</CardHeader>{" "}
						<CardContent className="space-y-2">
							<div className="flex justify-between">
								<span>Subtotal:</span>
								<span>{formatCurrency(calculateSubtotal())}</span>
							</div>
							<Separator />
							<div className="flex justify-between font-medium">
								<span>Total:</span>
								<span>{formatCurrency(calculateSubtotal())}</span>
							</div>
						</CardContent>
					</Card>

					{/* Additional Details */}
					<Card>
						<CardHeader>
							<CardTitle>Order Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="requiredDate">Required Date</Label>
									<Input
										id="requiredDate"
										type="date"
										value={requiredDate}
										onChange={(e) => setRequiredDate(e.target.value)}
									/>
								</div>

								<div>
									<Label htmlFor="promisedDate">Promised Date</Label>
									<Input
										id="promisedDate"
										type="date"
										value={promisedDate}
										onChange={(e) => setPromisedDate(e.target.value)}
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="shippingMethod">Shipping Method</Label>
								<Select
									value={shippingMethod}
									onValueChange={setShippingMethod}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select shipping method" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="standard">Standard Shipping</SelectItem>
										<SelectItem value="express">Express Shipping</SelectItem>
										<SelectItem value="overnight">Overnight</SelectItem>
										<SelectItem value="pickup">Customer Pickup</SelectItem>
										<SelectItem value="same-day">Same Day</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="shippingAddress">Shipping Address</Label>
								<Textarea
									id="shippingAddress"
									value={shippingAddress}
									onChange={(e) => setShippingAddress(e.target.value)}
									placeholder="Enter shipping address..."
								/>
							</div>

							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="rushOrder"
									checked={rushOrder}
									onChange={(e) => setRushOrder(e.target.checked)}
									className="rounded"
								/>
								<Label htmlFor="rushOrder">Rush Order</Label>
							</div>

							<div>
								<Label htmlFor="notes">Customer Notes</Label>
								<Textarea
									id="notes"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Add any special instructions or notes..."
								/>
							</div>

							<div>
								<Label htmlFor="internalNotes">Internal Notes</Label>
								<Textarea
									id="internalNotes"
									value={internalNotes}
									onChange={(e) => setInternalNotes(e.target.value)}
									placeholder="Add internal notes (not visible to customer)..."
								/>
							</div>

							<Button
								className="w-full"
								onClick={handleSubmit}
								disabled={
									isSubmitting || 
									orderItems.length === 0 || 
									!selectedCustomerId || 
									!selectedWarehouseId
								}
							>
								{isSubmitting ? "Creating Order..." : "Create Order"}
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

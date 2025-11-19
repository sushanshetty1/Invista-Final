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
import { Plus, Trash2, ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
	const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
	const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

	// New customer form state
	const [newCustomer, setNewCustomer] = useState({
		type: "INDIVIDUAL" as "INDIVIDUAL" | "BUSINESS" | "RESELLER" | "DISTRIBUTOR",
		firstName: "",
		lastName: "",
		companyName: "",
		email: "",
		phone: "",
		mobile: "",
		taxId: "",
		billingAddress: {
			street: "",
			city: "",
			state: "",
			zipCode: "",
			country: "",
		},
		shippingAddress: {
			street: "",
			city: "",
			state: "",
			zipCode: "",
			country: "",
		},
		creditLimit: "",
		paymentTerms: "",
		currency: "USD",
		notes: "",
	});

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

	const createCustomer = async () => {
		// Validation
		if (newCustomer.type === "INDIVIDUAL") {
			if (!newCustomer.firstName.trim() || !newCustomer.lastName.trim()) {
				toast.error("First name and last name are required for individual customers");
				return;
			}
		} else if (!newCustomer.companyName.trim()) {
			toast.error("Company name is required for business customers");
			return;
		}

		if (newCustomer.email && !newCustomer.email.includes("@")) {
			toast.error("Please enter a valid email address");
			return;
		}

		setIsCreatingCustomer(true);

		try {
			const payload = {
				type: newCustomer.type,
				firstName: newCustomer.firstName || undefined,
				lastName: newCustomer.lastName || undefined,
				companyName: newCustomer.companyName || undefined,
				email: newCustomer.email || undefined,
				phone: newCustomer.phone || undefined,
				mobile: newCustomer.mobile || undefined,
				taxId: newCustomer.taxId || undefined,
				billingAddress: {
					street: newCustomer.billingAddress.street || undefined,
					city: newCustomer.billingAddress.city || undefined,
					state: newCustomer.billingAddress.state || undefined,
					zipCode: newCustomer.billingAddress.zipCode || undefined,
					country: newCustomer.billingAddress.country || undefined,
				},
				shippingAddress: {
					street: newCustomer.shippingAddress.street || undefined,
					city: newCustomer.shippingAddress.city || undefined,
					state: newCustomer.shippingAddress.state || undefined,
					zipCode: newCustomer.shippingAddress.zipCode || undefined,
					country: newCustomer.shippingAddress.country || undefined,
				},
				creditLimit: newCustomer.creditLimit
					? parseFloat(newCustomer.creditLimit)
					: undefined,
				paymentTerms: newCustomer.paymentTerms || undefined,
				currency: newCustomer.currency,
				notes: newCustomer.notes || undefined,
			};

			const response = await fetch("/api/customers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success("Customer created successfully");
				await loadCustomers();
				setSelectedCustomerId(data.customer.id);
				setIsCreateCustomerOpen(false);
				// Reset form
				setNewCustomer({
					type: "INDIVIDUAL",
					firstName: "",
					lastName: "",
					companyName: "",
					email: "",
					phone: "",
					mobile: "",
					taxId: "",
					billingAddress: { street: "", city: "", state: "", zipCode: "", country: "" },
					shippingAddress: { street: "", city: "", state: "", zipCode: "", country: "" },
					creditLimit: "",
					paymentTerms: "",
					currency: "USD",
					notes: "",
				});
			} else {
				toast.error(data.error || "Failed to create customer");
			}
		} catch (error) {
			console.error("Error creating customer:", error);
			toast.error("Failed to create customer");
		} finally {
			setIsCreatingCustomer(false);
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
				(total, item) => total + (item.availableQuantity || item.quantity || 0),
				0,
			);
		}

		return 0;
	};

	return (
		<div className="container mx-auto max-w-7xl py-6 px-4 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between border-b pb-4">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => router.back()}>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Create New Order</h1>
						<p className="text-sm text-muted-foreground mt-0.5">
							Fill in the order details and add products
						</p>
					</div>
				</div>
			</div>

			<form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
					{/* Main Content - Left Side */}
					<div className="xl:col-span-2 space-y-6">
						{/* Customer & Warehouse */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Customer & Warehouse</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Customer Selection Row */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<Label className="text-sm font-medium">Customer *</Label>
										<Dialog
											open={isCreateCustomerOpen}
											onOpenChange={setIsCreateCustomerOpen}
										>
											<DialogTrigger asChild>
												<Button variant="outline" size="sm" type="button" className="h-8 text-xs">
													<UserPlus className="h-3.5 w-3.5 mr-1.5" />
													Add New
												</Button>
											</DialogTrigger>
											<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
												<DialogHeader>
													<DialogTitle>Create New Customer</DialogTitle>
												</DialogHeader>
												<div className="space-y-6 py-4">
													{/* Customer Type */}
													<div className="space-y-3">
														<Label className="text-sm font-medium">Customer Type *</Label>
														<RadioGroup
															value={newCustomer.type}
															onValueChange={(value: typeof newCustomer.type) =>
																setNewCustomer({ ...newCustomer, type: value })
															}
															className="grid grid-cols-4 gap-3"
														>
															<div className="relative">
																<RadioGroupItem value="INDIVIDUAL" id="individual" className="peer sr-only" />
																<Label
																	htmlFor="individual"
																	className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
																>
																	<span className="text-sm font-medium">Individual</span>
																</Label>
															</div>
															<div className="relative">
																<RadioGroupItem value="BUSINESS" id="business" className="peer sr-only" />
																<Label
																	htmlFor="business"
																	className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
																>
																	<span className="text-sm font-medium">Business</span>
																</Label>
															</div>
															<div className="relative">
																<RadioGroupItem value="RESELLER" id="reseller" className="peer sr-only" />
																<Label
																	htmlFor="reseller"
																	className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
																>
																	<span className="text-sm font-medium">Reseller</span>
																</Label>
															</div>
															<div className="relative">
																<RadioGroupItem value="DISTRIBUTOR" id="distributor" className="peer sr-only" />
																<Label
																	htmlFor="distributor"
																	className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
																>
																	<span className="text-sm font-medium">Distributor</span>
																</Label>
															</div>
														</RadioGroup>
													</div>

													<Separator />

													{/* Basic Information */}
													<div className="space-y-4">
														<h3 className="text-sm font-semibold">Contact Details</h3>
														<div className="grid grid-cols-2 gap-4">
														{newCustomer.type === "INDIVIDUAL" ? (
															<>
																<div>
																	<Label>First Name *</Label>
																	<Input
																		value={newCustomer.firstName}
																		onChange={(e) =>
																			setNewCustomer({
																				...newCustomer,
																				firstName: e.target.value,
																			})
																		}
																		placeholder="John"
																	/>
																</div>
																<div>
																	<Label>Last Name *</Label>
																	<Input
																		value={newCustomer.lastName}
																		onChange={(e) =>
																			setNewCustomer({
																				...newCustomer,
																				lastName: e.target.value,
																			})
																		}
																		placeholder="Doe"
																	/>
																</div>
															</>
														) : (
															<div className="md:col-span-2">
																<Label>Company Name *</Label>
																<Input
																	value={newCustomer.companyName}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			companyName: e.target.value,
																		})
																	}
																	placeholder="Company Inc."
																/>
															</div>
														)}
													</div>

													{/* Contact Information */}
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
														<div>
															<Label>Email</Label>
															<Input
																type="email"
																value={newCustomer.email}
																onChange={(e) =>
																	setNewCustomer({
																		...newCustomer,
																		email: e.target.value,
																	})
																}
																placeholder="email@example.com"
															/>
														</div>
														<div>
															<Label>Phone</Label>
															<Input
																value={newCustomer.phone}
																onChange={(e) =>
																	setNewCustomer({
																		...newCustomer,
																		phone: e.target.value,
																	})
																}
																placeholder="+1 234 567 8900"
															/>
														</div>
														<div>
															<Label>Mobile</Label>
															<Input
																value={newCustomer.mobile}
																onChange={(e) =>
																	setNewCustomer({
																		...newCustomer,
																		mobile: e.target.value,
																	})
																}
																placeholder="+1 234 567 8900"
															/>
														</div>
													</div>

													{/* Business Details */}
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
														<div>
															<Label>Tax ID</Label>
															<Input
																value={newCustomer.taxId}
																onChange={(e) =>
																	setNewCustomer({
																		...newCustomer,
																		taxId: e.target.value,
																	})
																}
																placeholder="Tax ID"
															/>
														</div>
														<div>
															<Label>Credit Limit</Label>
															<Input
																type="number"
																value={newCustomer.creditLimit}
																onChange={(e) =>
																	setNewCustomer({
																		...newCustomer,
																		creditLimit: e.target.value,
																	})
																}
																placeholder="0.00"
															/>
														</div>
														<div>
															<Label>Payment Terms</Label>
															<Input
																value={newCustomer.paymentTerms}
																onChange={(e) =>
																	setNewCustomer({
																		...newCustomer,
																		paymentTerms: e.target.value,
																	})
																}
																placeholder="Net 30"
															/>
														</div>
													</div>

													{/* Billing Address */}
													<div>
														<Label className="text-base font-semibold">
															Billing Address
														</Label>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
															<div className="md:col-span-2">
																<Label>Street</Label>
																<Input
																	value={newCustomer.billingAddress.street}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			billingAddress: {
																				...newCustomer.billingAddress,
																				street: e.target.value,
																			},
																		})
																	}
																	placeholder="123 Main St"
																/>
															</div>
															<div>
																<Label>City</Label>
																<Input
																	value={newCustomer.billingAddress.city}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			billingAddress: {
																				...newCustomer.billingAddress,
																				city: e.target.value,
																			},
																		})
																	}
																	placeholder="New York"
																/>
															</div>
															<div>
																<Label>State</Label>
																<Input
																	value={newCustomer.billingAddress.state}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			billingAddress: {
																				...newCustomer.billingAddress,
																				state: e.target.value,
																			},
																		})
																	}
																	placeholder="NY"
																/>
															</div>
															<div>
																<Label>Zip Code</Label>
																<Input
																	value={newCustomer.billingAddress.zipCode}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			billingAddress: {
																				...newCustomer.billingAddress,
																				zipCode: e.target.value,
																			},
																		})
																	}
																	placeholder="10001"
																/>
															</div>
															<div>
																<Label>Country</Label>
																<Input
																	value={newCustomer.billingAddress.country}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			billingAddress: {
																				...newCustomer.billingAddress,
																				country: e.target.value,
																			},
																		})
																	}
																	placeholder="USA"
																/>
															</div>
														</div>
													</div>

													{/* Shipping Address */}
													<div>
														<Label className="text-base font-semibold">
															Shipping Address
														</Label>
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
															<div className="md:col-span-2">
																<Label>Street</Label>
																<Input
																	value={newCustomer.shippingAddress.street}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			shippingAddress: {
																				...newCustomer.shippingAddress,
																				street: e.target.value,
																			},
																		})
																	}
																	placeholder="123 Main St"
																/>
															</div>
															<div>
																<Label>City</Label>
																<Input
																	value={newCustomer.shippingAddress.city}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			shippingAddress: {
																				...newCustomer.shippingAddress,
																				city: e.target.value,
																			},
																		})
																	}
																	placeholder="New York"
																/>
															</div>
															<div>
																<Label>State</Label>
																<Input
																	value={newCustomer.shippingAddress.state}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			shippingAddress: {
																				...newCustomer.shippingAddress,
																				state: e.target.value,
																			},
																		})
																	}
																	placeholder="NY"
																/>
															</div>
															<div>
																<Label>Zip Code</Label>
																<Input
																	value={newCustomer.shippingAddress.zipCode}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			shippingAddress: {
																				...newCustomer.shippingAddress,
																				zipCode: e.target.value,
																			},
																		})
																	}
																	placeholder="10001"
																/>
															</div>
															<div>
																<Label>Country</Label>
																<Input
																	value={newCustomer.shippingAddress.country}
																	onChange={(e) =>
																		setNewCustomer({
																			...newCustomer,
																			shippingAddress: {
																				...newCustomer.shippingAddress,
																				country: e.target.value,
																			},
																		})
																	}
																	placeholder="USA"
																/>
															</div>
														</div>
													</div>

													{/* Notes */}
													<div>
														<Label>Notes</Label>
														<Textarea
															value={newCustomer.notes}
															onChange={(e) =>
																setNewCustomer({
																	...newCustomer,
																	notes: e.target.value,
																})
															}
															placeholder="Additional notes..."
															rows={3}
														/>
													</div>

													{/* Actions */}
													<div className="flex justify-end gap-2">
														<Button
															variant="outline"
															onClick={() => setIsCreateCustomerOpen(false)}
														>
															Cancel
														</Button>
														<Button
															onClick={createCustomer}
															disabled={isCreatingCustomer}
														>
															{isCreatingCustomer ? "Creating..." : "Create Customer"}
														</Button>
													</div>
												</div>
											</div>
										</DialogContent>
										</Dialog>
									</div>
									<Select
										value={selectedCustomerId}
										onValueChange={setSelectedCustomerId}
									>
										<SelectTrigger className="h-10">
											<SelectValue placeholder="Select customer..." />
										</SelectTrigger>
										<SelectContent>
											{customers.length === 0 ? (
												<div className="py-6 text-center text-sm text-muted-foreground">
													No customers found. Create one first.
												</div>
											) : (
												customers.map((customer) => (
													<SelectItem key={customer.id} value={customer.id}>
														<div className="flex flex-col">
															<span className="font-medium">
																{customer.companyName ||
																	`${customer.firstName} ${customer.lastName}`}
															</span>
															{customer.email && (
																<span className="text-xs text-muted-foreground">{customer.email}</span>
															)}
														</div>
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
								</div>

								{/* Warehouse Selection */}
								<div className="space-y-2">
									<Label className="text-sm font-medium">Warehouse *</Label>
									<Select
										value={selectedWarehouseId}
										onValueChange={setSelectedWarehouseId}
									>
										<SelectTrigger className="h-10">
											<SelectValue placeholder="Select warehouse..." />
										</SelectTrigger>
										<SelectContent>
											{warehouses.map((warehouse) => (
												<SelectItem key={warehouse.id} value={warehouse.id}>
													{warehouse.name} <span className="text-muted-foreground">({warehouse.code})</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</CardContent>
						</Card>

						{/* Order Configuration */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Order Configuration</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-3 gap-4">
									<div className="space-y-2">
										<Label className="text-sm font-medium">Order Type</Label>
										<Select
											value={orderType}
											onValueChange={(value: typeof orderType) => setOrderType(value)}
										>
											<SelectTrigger className="h-10">
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

									<div className="space-y-2">
										<Label className="text-sm font-medium">Channel</Label>
										<Select
											value={orderChannel}
											onValueChange={(value: typeof orderChannel) => setOrderChannel(value)}
										>
											<SelectTrigger className="h-10">
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

									<div className="space-y-2">
										<Label className="text-sm font-medium">Priority</Label>
										<Select
											value={orderPriority}
											onValueChange={(value: typeof orderPriority) => setOrderPriority(value)}
										>
											<SelectTrigger className="h-10">
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
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="text-lg">Order Items</CardTitle>
										<p className="text-sm text-muted-foreground mt-0.5">
											Add products to this order
										</p>
									</div>
									<Dialog
										open={isProductSelectOpen}
										onOpenChange={setIsProductSelectOpen}
									>
										<DialogTrigger asChild>
											<Button size="sm" type="button">
												<Plus className="h-4 w-4 mr-2" />
												Add Product
											</Button>
										</DialogTrigger>
										<DialogContent className="max-w-4xl max-h-[90vh]">
											<DialogHeader className="pb-4">
												<DialogTitle className="text-xl">Select Products</DialogTitle>
												<p className="text-sm text-muted-foreground mt-1">Choose products to add to your order</p>
											</DialogHeader>
											<div className="space-y-4">
												<Input placeholder="Search products by name or SKU..." className="h-10" />
												<div className="border rounded-lg overflow-hidden">
													{isLoadingProducts ? (
														<div className="flex items-center justify-center py-20 text-muted-foreground">
															<div className="text-center space-y-2">
																<div className="animate-pulse text-4xl">⏳</div>
																<div className="text-sm font-medium">Loading products...</div>
															</div>
														</div>
													) : products.length === 0 ? (
														<div className="flex items-center justify-center py-20 text-muted-foreground">
															<div className="text-center space-y-2">
																<div className="text-4xl">📦</div>
																<div className="text-sm font-medium">No products available</div>
																<div className="text-xs">Add products to your inventory first</div>
															</div>
														</div>
													) : (
														<div className="max-h-[500px] overflow-y-auto">
															<Table>
																<TableHeader className="sticky top-0 bg-background z-10 border-b">
																	<TableRow className="hover:bg-transparent">
																		<TableHead className="w-[35%] font-semibold">Product</TableHead>
																		<TableHead className="w-[20%] font-semibold">SKU</TableHead>
																		<TableHead className="text-right font-semibold">Price</TableHead>
																		<TableHead className="text-center font-semibold">Stock</TableHead>
																		<TableHead className="w-[120px]"></TableHead>
																	</TableRow>
																</TableHeader>
																<TableBody>
																	{Array.isArray(products) &&
																		products.map((product) => {
																			const price = getProductPrice(product);
																			const availableQuantity =
																				getTotalAvailableQuantity(product);
																			const isLowStock = availableQuantity > 0 && availableQuantity <= 10;
																			const isOutOfStock = availableQuantity === 0;
																			
																			return (
																				<TableRow key={product.id} className="group hover:bg-muted/50">
																					<TableCell>
																						<div>
																							<div className="font-medium text-sm">{product.name}</div>
																						</div>
																					</TableCell>
																					<TableCell>
																						<span className="text-sm text-muted-foreground font-mono">
																							{product.sku}
																						</span>
																					</TableCell>
																					<TableCell className="text-right">
																						{price > 0 ? (
																							<span className="font-semibold text-sm">{formatCurrency(price)}</span>
																						) : (
																							<span className="text-xs text-muted-foreground italic">
																								No price
																							</span>
																						)}
																					</TableCell>
																					<TableCell className="text-center">
																						<div className="flex items-center justify-center gap-1.5">
																							{isOutOfStock ? (
																								<>
																									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-medium">
																										<span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
																										Out of stock
																									</span>
																								</>
																							) : isLowStock ? (
																								<>
																									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
																										<span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400"></span>
																										{availableQuantity} left
																									</span>
																								</>
																							) : (
																								<>
																									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
																										<span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
																										{availableQuantity} available
																									</span>
																								</>
																							)}
																						</div>
																					</TableCell>
																					<TableCell>
																						<Button
																							size="sm"
																							onClick={() => addProduct(product)}
																							disabled={price <= 0}
																							className="w-full h-8 text-xs"
																							variant={isOutOfStock ? "outline" : "default"}
																						>
																							<Plus className="h-3 w-3 mr-1" />
																							Add
																						</Button>
																					</TableCell>
																				</TableRow>
																			);
																		})}
																</TableBody>
															</Table>
														</div>
													)}
												</div>
											</div>
										</DialogContent>
									</Dialog>
								</div>
							</CardHeader>
						<CardContent>
							{orderItems.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
									<div className="text-muted-foreground">
										<div className="text-sm font-medium">No items added yet</div>
										<div className="text-xs mt-1">Click &quot;Add Product&quot; to get started</div>
									</div>
								</div>
							) : (
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-[35%]">Product</TableHead>
												<TableHead className="w-[120px]">Quantity</TableHead>
												<TableHead className="text-right">Unit Price</TableHead>
												<TableHead className="w-[130px]">Discount</TableHead>
												<TableHead className="text-right">Total</TableHead>
												<TableHead className="w-[50px]"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{orderItems.map((item) => (
												<TableRow key={item.productId}>
													<TableCell>
														<div>
															<div className="font-medium text-sm">{item.productName}</div>
															<div className="text-xs text-muted-foreground">{item.productSku}</div>
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
															className="w-full h-9"
														/>
													</TableCell>
													<TableCell className="text-right font-medium text-sm">
														{formatCurrency(item.unitPrice)}
													</TableCell>
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
															className="w-full h-9"
															placeholder="0.00"
														/>
													</TableCell>
													<TableCell className="text-right font-semibold text-sm">
														{formatCurrency(item.totalPrice)}
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															onClick={() => removeItem(item.productId)}
															type="button"
														>
															<Trash2 className="h-4 w-4 text-destructive" />
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
				</div>

				{/* Sidebar - Order Summary & Actions */}
				<div className="xl:col-span-1 space-y-6">
					{/* Order Summary */}
					<Card className="sticky top-6">
						<CardHeader className="pb-3">
							<CardTitle className="text-lg">Order Summary</CardTitle>
						</CardHeader>{" "}
						<CardContent className="space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Items:</span>
								<span className="font-medium">{orderItems.length}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Subtotal:</span>
								<span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
							</div>
							<Separator />
							<div className="flex justify-between">
								<span className="font-semibold">Total:</span>
								<span className="font-bold text-lg">{formatCurrency(calculateSubtotal())}</span>
							</div>
						</CardContent>
					</Card>

					{/* Additional Order Details */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-lg">Additional Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium">Required Date</Label>
								<Input
									type="date"
									value={requiredDate}
									onChange={(e) => setRequiredDate(e.target.value)}
									className="h-9"
								/>
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium">Promised Date</Label>
								<Input
									type="date"
									value={promisedDate}
									onChange={(e) => setPromisedDate(e.target.value)}
									className="h-9"
								/>
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium">Shipping Method</Label>
								<Select
									value={shippingMethod}
									onValueChange={setShippingMethod}
								>
									<SelectTrigger className="h-9">
										<SelectValue placeholder="Select method..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="standard">Standard</SelectItem>
										<SelectItem value="express">Express</SelectItem>
										<SelectItem value="overnight">Overnight</SelectItem>
										<SelectItem value="pickup">Pickup</SelectItem>
										<SelectItem value="same-day">Same Day</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium">Shipping Address</Label>
								<Textarea
									value={shippingAddress}
									onChange={(e) => setShippingAddress(e.target.value)}
									placeholder="Enter shipping address..."
									rows={3}
									className="resize-none text-sm"
								/>
							</div>

							<div className="flex items-center space-x-2 pt-2">
								<input
									type="checkbox"
									id="rushOrder"
									checked={rushOrder}
									onChange={(e) => setRushOrder(e.target.checked)}
									className="rounded h-4 w-4"
								/>
								<Label htmlFor="rushOrder" className="text-sm font-medium cursor-pointer">
									Rush Order
								</Label>
							</div>

							<Separator />

							<div className="space-y-2">
								<Label className="text-sm font-medium">Customer Notes</Label>
								<Textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Special instructions..."
									rows={3}
									className="resize-none text-sm"
								/>
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium">Internal Notes</Label>
								<Textarea
									value={internalNotes}
									onChange={(e) => setInternalNotes(e.target.value)}
									placeholder="Internal notes (not visible to customer)..."
									rows={3}
									className="resize-none text-sm"
								/>
							</div>

							<Separator />

							<Button
								className="w-full h-11"
								type="submit"
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
			</form>
		</div>
	);
}

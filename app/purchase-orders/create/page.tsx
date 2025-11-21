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
interface PurchaseOrderItem {
	productId: string;
	productName: string;
	productSku: string;
	supplierSku?: string;
	quantity: number;
	unitCost: number;
	totalCost: number;
}

interface Supplier {
	id: string;
	name: string;
	email?: string;
	phone?: string;
}

interface Product {
	id: string;
	name: string;
	sku: string;
	costPrice?: number;
	inventory?: {
		availableQuantity: number;
		reorderPoint: number;
	};
	suppliers?: Array<{
		id: string;
		supplierId: string;
		supplierSku?: string;
		unitCost: number;
		currency: string;
		leadTimeDays?: number;
		isPreferred: boolean;
		supplier: {
			id: string;
			name: string;
			code: string;
		};
	}>;
}

export default function CreatePurchaseOrderPage() {
	const router = useRouter();
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [selectedSupplierId, setSelectedSupplierId] = useState("");
	const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
	const [expectedDate, setExpectedDate] = useState("");
	const [paymentTerms, setPaymentTerms] = useState("");
	const [shippingTerms, setShippingTerms] = useState("");
	const [notes, setNotes] = useState("");
	const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [productSuppliers, setProductSuppliers] = useState<Record<string, Product["suppliers"]>>({});

	useEffect(() => {
		loadSuppliers();
		loadProducts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (selectedSupplierId) {
			loadSupplierProducts();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSupplierId]);

	const loadSuppliers = async () => {
		try {
			const response = await fetch("/api/suppliers");
			const data = await response.json();

			if (response.ok) {
				setSuppliers(data.suppliers || []);
			}
		} catch (error) {
			console.error("Error loading suppliers:", error);
		}
	};

	const loadProducts = async () => {
		try {
			const response = await fetch("/api/products");
			const data = await response.json();

			if (response.ok) {
				setProducts(data.products || []);
			}
		} catch (error) {
			console.error("Error loading products:", error);
		}
	};

	const loadSupplierProducts = async () => {
		if (!selectedSupplierId) return;

		try {
			const response = await fetch(`/api/product-suppliers?supplierId=${selectedSupplierId}`);
			const data = await response.json();

			if (response.ok) {
				const suppliersMap: Record<string, Product["suppliers"]> = {};
				data.productSuppliers?.forEach((ps: {
					productId: string;
					id: string;
					supplierId: string;
					supplierSku?: string;
					unitCost: number;
					currency: string;
					leadTimeDays?: number;
					isPreferred: boolean;
					supplier: { id: string; name: string; code: string };
				}) => {
					if (!suppliersMap[ps.productId]) {
						suppliersMap[ps.productId] = [];
					}
					const productSuppliers = suppliersMap[ps.productId];
					if (productSuppliers) {
						productSuppliers.push({
							id: ps.id,
							supplierId: ps.supplierId,
							supplierSku: ps.supplierSku,
							unitCost: ps.unitCost,
							currency: ps.currency,
							leadTimeDays: ps.leadTimeDays,
							isPreferred: ps.isPreferred,
							supplier: ps.supplier,
						});
					}
				});

				// Update products with supplier info
				setProducts((prevProducts) =>
					prevProducts.map((product) => ({
						...product,
						suppliers: suppliersMap[product.id] || [],
					}))
				);
				setProductSuppliers(suppliersMap);
			}
		} catch (error) {
			console.error("Error loading supplier products:", error);
		}
	};

	const addProduct = (product: Product) => {
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
								totalCost: (item.quantity + 1) * item.unitCost,
							}
						: item,
				),
			);
		} else {
			// Find supplier info for selected supplier
			const supplierInfo = product.suppliers?.find(
				(s) => s.supplierId === selectedSupplierId
			);

			const newItem: PurchaseOrderItem = {
				productId: product.id,
				productName: product.name,
				productSku: product.sku,
				supplierSku: supplierInfo?.supplierSku,
				quantity: product.inventory?.reorderPoint || 10,
				unitCost: supplierInfo?.unitCost || product.costPrice || 0,
				totalCost:
					(product.inventory?.reorderPoint || 10) * (supplierInfo?.unitCost || product.costPrice || 0),
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
					? { ...item, quantity, totalCost: quantity * item.unitCost }
					: item,
			),
		);
	};

	const updateItemCost = (productId: string, unitCost: number) => {
		setOrderItems((prev) =>
			prev.map((item) =>
				item.productId === productId
					? {
							...item,
							unitCost: unitCost >= 0 ? unitCost : 0,
							totalCost: item.quantity * (unitCost >= 0 ? unitCost : 0),
						}
					: item,
			),
		);
	};

	const updateSupplierSku = (productId: string, supplierSku: string) => {
		setOrderItems((prev) =>
			prev.map((item) =>
				item.productId === productId ? { ...item, supplierSku } : item,
			),
		);
	};

	const removeItem = (productId: string) => {
		setOrderItems((prev) =>
			prev.filter((item) => item.productId !== productId),
		);
	};

	const calculateSubtotal = () => {
		return orderItems.reduce((sum, item) => sum + item.totalCost, 0);
	};

	const handleSubmit = async () => {
		if (!selectedSupplierId) {
			toast.error("Please select a supplier");
			return;
		}

		if (orderItems.length === 0) {
			toast.error("Please add at least one item to the purchase order");
			return;
		}

		setIsSubmitting(true);

		try {
			const purchaseOrderData = {
				supplierId: selectedSupplierId,
				// warehouseId is optional - can be specified later
				expectedDate: expectedDate ? new Date(expectedDate) : undefined,
				paymentTerms,
				shippingTerms,
				notes,
				items: orderItems.map((item) => ({
					productId: item.productId,
					quantity: item.quantity,
					unitCost: item.unitCost,
					supplierSku: item.supplierSku,
				})),
			};

			const response = await fetch("/api/purchase-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(purchaseOrderData),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to create purchase order");
			}

			toast.success("Purchase order created successfully!");
			router.push("/purchase-orders");
		} catch (error) {
			console.error("Error creating purchase order:", error);
			toast.error("Failed to create purchase order");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
			<div className="container mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10 py-8 space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button 
						variant="outline" 
						size="sm" 
						onClick={() => router.back()}
						className="shadow-sm hover:shadow-md transition-all"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
					<div>
						<h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
							Create Purchase Order
						</h1>
						<p className="text-muted-foreground mt-1">
							Create a new purchase order for inventory restocking
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Purchase Order Details */}
					<div className="lg:col-span-2 space-y-6">
						{/* Supplier Selection */}
						<Card className="shadow-md hover:shadow-lg transition-shadow">
							<CardHeader className="border-b bg-muted/30">
								<CardTitle className="text-xl">Supplier Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 pt-6">
							<div>
								<Label htmlFor="supplier">Supplier</Label>
								<Select
									value={selectedSupplierId}
									onValueChange={setSelectedSupplierId}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select a supplier" />
									</SelectTrigger>
									<SelectContent>
										{suppliers.map((supplier) => (
											<SelectItem key={supplier.id} value={supplier.id}>
												{supplier.name}{" "}
												{supplier.email && `- ${supplier.email}`}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

						{/* Purchase Order Items */}
						<Card className="shadow-md hover:shadow-lg transition-shadow">
							<CardHeader className="border-b bg-muted/30">
								<div className="flex items-center justify-between">
									<CardTitle className="text-xl">Purchase Order Items</CardTitle>
									<Dialog
										open={isProductSelectOpen}
										onOpenChange={setIsProductSelectOpen}
									>
										<DialogTrigger asChild>
											<Button size="sm" className="shadow-sm hover:shadow-md transition-all">
												<Plus className="h-4 w-4 mr-2" />
												Add Product
											</Button>
								</DialogTrigger>
								<DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
									<DialogHeader className="border-b pb-4">
										<DialogTitle className="text-xl">Select Product</DialogTitle>
									</DialogHeader>
									<div className="space-y-4 flex-1 overflow-hidden flex flex-col pt-4">
										<Input placeholder="Search products..." className="flex-shrink-0 h-10" />
										<div className="flex-1 overflow-y-auto border rounded-lg">
											<Table>
												<TableHeader className="sticky top-0 bg-background z-10">
													<TableRow className="bg-muted/50">
														<TableHead className="font-semibold">Product</TableHead>
														<TableHead className="font-semibold">SKU</TableHead>
														<TableHead className="font-semibold">Current Stock</TableHead>
														<TableHead className="font-semibold">Reorder Point</TableHead>
														<TableHead className="font-semibold">Cost Price</TableHead>
														<TableHead className="w-[80px]"></TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
														{products.map((product) => (
															<TableRow key={product.id}>
																<TableCell>{product.name}</TableCell>
																<TableCell>{product.sku}</TableCell>
																<TableCell>
																	{product.inventory?.availableQuantity || 0}
																</TableCell>
																<TableCell>
																	{product.inventory?.reorderPoint || "-"}
																</TableCell>
																<TableCell>
																	${(product.costPrice || 0).toFixed(2)}
																</TableCell>
																<TableCell>
																	<Button
																		size="sm"
																		onClick={() => addProduct(product)}
																	>
																		Add
																	</Button>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										</div>
									</DialogContent>
								</Dialog>
							</div>
							</CardHeader>
							<CardContent className="pt-6">
								{orderItems.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-12 text-center">
										<div className="rounded-full bg-muted p-3 mb-4">
											<Plus className="h-8 w-8 text-muted-foreground" />
										</div>
										<p className="text-muted-foreground font-medium">
											No items added yet
										</p>
										<p className="text-sm text-muted-foreground/70 mt-1">
											Click &quot;Add Product&quot; to get started
										</p>
									</div>
								) : (
									<div className="border rounded-lg overflow-hidden">
										<Table>
											<TableHeader>
												<TableRow className="bg-muted/50">
													<TableHead className="font-semibold">Product</TableHead>
													<TableHead className="font-semibold">Supplier SKU</TableHead>
													<TableHead className="font-semibold">Quantity</TableHead>
													<TableHead className="font-semibold">Unit Cost</TableHead>
													<TableHead className="font-semibold">Total</TableHead>
													<TableHead className="w-[50px]"></TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{orderItems.map((item) => (
													<TableRow key={item.productId} className="hover:bg-muted/30 transition-colors">
														<TableCell>
															<div>
																<div className="font-medium text-sm">
																	{item.productName}
																</div>
																<div className="text-xs text-muted-foreground mt-0.5">
																	{item.productSku}
																</div>
															</div>
														</TableCell>
													<TableCell>
														<Input
															value={item.supplierSku || ""}
															onChange={(e) =>
																updateSupplierSku(item.productId, e.target.value)
															}
															placeholder="Supplier SKU"
															className="w-32 h-9"
														/>
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
															className="w-20 h-9"
														/>
													</TableCell>
													<TableCell>
														<Input
															type="number"
															min="0"
															step="0.01"
															value={item.unitCost}
															onChange={(e) =>
																updateItemCost(
																	item.productId,
																	parseFloat(e.target.value) || 0,
																)
															}
															className="w-24 h-9"
														/>
													</TableCell>
													<TableCell className="font-medium">${item.totalCost.toFixed(2)}</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => removeItem(item.productId)}
															className="hover:bg-destructive/10 hover:text-destructive"
														>
															<Trash2 className="h-4 w-4" />
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

					{/* Purchase Order Summary & Details */}
					<div className="space-y-6">
						{/* Purchase Order Summary */}
						<Card className="shadow-md hover:shadow-lg transition-shadow">
							<CardHeader className="border-b bg-muted/30">
								<CardTitle className="text-xl">Purchase Order Summary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 pt-6">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Subtotal:</span>
									<span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
								</div>
								<Separator />
								<div className="flex justify-between text-lg font-semibold">
									<span>Total:</span>
									<span className="text-primary">${calculateSubtotal().toFixed(2)}</span>
								</div>
							</CardContent>
					</Card>

						{/* Additional Details */}
						<Card className="shadow-md hover:shadow-lg transition-shadow">
							<CardHeader className="border-b bg-muted/30">
								<CardTitle className="text-xl">Purchase Order Details</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 pt-6">
							<div>
								<Label htmlFor="expectedDate">Expected Delivery Date</Label>
								<Input
									id="expectedDate"
									type="date"
									value={expectedDate}
									onChange={(e) => setExpectedDate(e.target.value)}
								/>
							</div>

							<div>
								<Label htmlFor="paymentTerms">Payment Terms</Label>
								<Select value={paymentTerms} onValueChange={setPaymentTerms}>
									<SelectTrigger>
										<SelectValue placeholder="Select payment terms" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="NET_30">Net 30</SelectItem>
										<SelectItem value="NET_60">Net 60</SelectItem>
										<SelectItem value="NET_90">Net 90</SelectItem>
										<SelectItem value="COD">Cash on Delivery</SelectItem>
										<SelectItem value="PREPAID">Prepaid</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="shippingTerms">Shipping Terms</Label>
								<Select value={shippingTerms} onValueChange={setShippingTerms}>
									<SelectTrigger>
										<SelectValue placeholder="Select shipping terms" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="FOB_ORIGIN">FOB Origin</SelectItem>
										<SelectItem value="FOB_DESTINATION">
											FOB Destination
										</SelectItem>
										<SelectItem value="CIF">
											CIF (Cost, Insurance, Freight)
										</SelectItem>
										<SelectItem value="DDP">
											DDP (Delivered Duty Paid)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="notes">Notes</Label>
								<Textarea
									id="notes"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Add any special instructions or notes..."
								/>
							</div>

								<Button
									className="w-full shadow-md hover:shadow-lg transition-all"
									onClick={handleSubmit}
									disabled={
										isSubmitting || orderItems.length === 0 || !selectedSupplierId
									}
								>
									{isSubmitting
										? "Creating Purchase Order..."
										: "Create Purchase Order"}
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}

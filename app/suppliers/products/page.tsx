"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Star, Package, DollarSign, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProductSupplier {
	id: string;
	productId: string;
	supplierId: string;
	supplierSku?: string;
	supplierName?: string;
	unitCost: number | string;
	currency: string;
	minOrderQty?: number | string;
	maxOrderQty?: number | string;
	leadTimeDays?: number | string;
	isPreferred: boolean;
	isActive: boolean;
	product: {
		id: string;
		name: string;
		sku: string;
		costPrice?: number;
		sellingPrice?: number;
		status: string;
	};
	supplier: {
		id: string;
		name: string;
		code: string;
	};
}

interface Supplier {
	id: string;
	name: string;
	code: string;
	status: string;
}

interface Product {
	id: string;
	name: string;
	sku: string;
	costPrice?: number;
	status: string;
}

export default function SupplierProductsPage() {
	const router = useRouter();
	const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [selectedSupplier, setSelectedSupplier] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState("");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ProductSupplier | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Form state
	const [formData, setFormData] = useState({
		productId: "",
		supplierId: "",
		supplierSku: "",
		unitCost: "",
		currency: "USD",
		minOrderQty: "",
		maxOrderQty: "",
		leadTimeDays: "",
		isPreferred: false,
		isActive: true,
	});

	useEffect(() => {
		loadSuppliers();
		loadProducts();
	}, []);

	useEffect(() => {
		if (selectedSupplier) {
			loadProductSuppliers(selectedSupplier);
		} else {
			setProductSuppliers([]);
		}
	}, [selectedSupplier]);

	const loadSuppliers = async () => {
		try {
			const response = await fetch("/api/suppliers");
			const data = await response.json();
			if (response.ok) {
				setSuppliers(data.suppliers || []);
			}
		} catch (error) {
			console.error("Error loading suppliers:", error);
			toast.error("Failed to load suppliers");
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
			toast.error("Failed to load products");
		}
	};

	const loadProductSuppliers = async (supplierId: string) => {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/product-suppliers?supplierId=${supplierId}`);
			const data = await response.json();
			if (response.ok) {
				setProductSuppliers(data.productSuppliers || []);
			}
		} catch (error) {
			console.error("Error loading product-supplier relationships:", error);
			toast.error("Failed to load product assignments");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAdd = async () => {
		if (!formData.productId || !formData.supplierId || !formData.unitCost) {
			toast.error("Please fill in all required fields");
			return;
		}

		try {
			const response = await fetch("/api/product-suppliers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...formData,
					unitCost: parseFloat(formData.unitCost),
					minOrderQty: formData.minOrderQty ? parseInt(formData.minOrderQty) : undefined,
					maxOrderQty: formData.maxOrderQty ? parseInt(formData.maxOrderQty) : undefined,
					leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to assign product to supplier");
			}

			toast.success("Product assigned to supplier successfully");
			setIsAddDialogOpen(false);
			resetForm();
			if (selectedSupplier) {
				loadProductSuppliers(selectedSupplier);
			}
		} catch (error) {
			console.error("Error assigning product:", error);
			toast.error(error instanceof Error ? error.message : "Failed to assign product");
		}
	};

	const handleEdit = async () => {
		if (!editingItem || !formData.unitCost) {
			toast.error("Please fill in all required fields");
			return;
		}

		try {
			const response = await fetch("/api/product-suppliers", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: editingItem.id,
					...formData,
					unitCost: parseFloat(formData.unitCost),
					minOrderQty: formData.minOrderQty ? parseInt(formData.minOrderQty) : undefined,
					maxOrderQty: formData.maxOrderQty ? parseInt(formData.maxOrderQty) : undefined,
					leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to update product-supplier relationship");
			}

			toast.success("Product-supplier relationship updated successfully");
			setIsEditDialogOpen(false);
			setEditingItem(null);
			resetForm();
			if (selectedSupplier) {
				loadProductSuppliers(selectedSupplier);
			}
		} catch (error) {
			console.error("Error updating relationship:", error);
			toast.error("Failed to update product-supplier relationship");
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to remove this product from the supplier?")) {
			return;
		}

		try {
			const response = await fetch(`/api/product-suppliers?id=${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete product-supplier relationship");
			}

			toast.success("Product removed from supplier successfully");
			if (selectedSupplier) {
				loadProductSuppliers(selectedSupplier);
			}
		} catch (error) {
			console.error("Error deleting relationship:", error);
			toast.error("Failed to remove product from supplier");
		}
	};

	const openEditDialog = (item: ProductSupplier) => {
		setEditingItem(item);
		setFormData({
			productId: item.productId,
			supplierId: item.supplierId,
			supplierSku: item.supplierSku || "",
			unitCost: String(item.unitCost),
			currency: item.currency,
			minOrderQty: item.minOrderQty ? String(item.minOrderQty) : "",
			maxOrderQty: item.maxOrderQty ? String(item.maxOrderQty) : "",
			leadTimeDays: item.leadTimeDays ? String(item.leadTimeDays) : "",
			isPreferred: item.isPreferred,
			isActive: item.isActive,
		});
		setIsEditDialogOpen(true);
	};

	const resetForm = () => {
		setFormData({
			productId: "",
			supplierId: selectedSupplier,
			supplierSku: "",
			unitCost: "",
			currency: "USD",
			minOrderQty: "",
			maxOrderQty: "",
			leadTimeDays: "",
			isPreferred: false,
			isActive: true,
		});
	};

	const openAddDialog = () => {
		resetForm();
		setIsAddDialogOpen(true);
	};

	const filteredProductSuppliers = productSuppliers.filter((ps) =>
		ps.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		ps.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
		ps.supplierSku?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
			<div className="container mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10 py-8 space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/suppliers")}
						className="shadow-sm hover:shadow-md transition-all"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
					<div>
						<h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
							Supplier-Product Management
						</h1>
						<p className="text-muted-foreground mt-1">
							Assign products to suppliers and manage pricing & lead times
						</p>
					</div>
				</div>

				{/* Supplier Selection */}
				<Card className="shadow-md hover:shadow-lg transition-shadow">
					<CardHeader className="border-b bg-muted/30">
						<CardTitle className="text-xl">Select Supplier</CardTitle>
						<CardDescription>
							Choose a supplier to view and manage their product assignments
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="supplier">Supplier</Label>
								<Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
									<SelectTrigger className="h-10">
										<SelectValue placeholder="Select a supplier" />
									</SelectTrigger>
									<SelectContent>
										{suppliers.map((supplier) => (
											<SelectItem key={supplier.id} value={supplier.id}>
												{supplier.name} ({supplier.code})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{selectedSupplier && (
								<div className="flex items-end">
									<Button
										onClick={openAddDialog}
										className="w-full shadow-sm hover:shadow-md transition-all"
									>
										<Plus className="h-4 w-4 mr-2" />
										Assign Product
									</Button>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Products Table */}
				{selectedSupplier && (
					<Card className="shadow-md hover:shadow-lg transition-shadow">
						<CardHeader className="border-b bg-muted/30">
							<div className="flex items-center justify-between">
								<CardTitle className="text-xl">Assigned Products</CardTitle>
								<div className="flex items-center gap-2">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Search products..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-9 h-10 w-[300px]"
										/>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-6">
							{isLoading ? (
								<div className="text-center py-12">
									<p className="text-muted-foreground">Loading...</p>
								</div>
							) : filteredProductSuppliers.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<div className="rounded-full bg-muted p-3 mb-4">
										<Package className="h-8 w-8 text-muted-foreground" />
									</div>
									<p className="text-muted-foreground font-medium">
										No products assigned yet
									</p>
									<p className="text-sm text-muted-foreground/70 mt-1">
										Click &quot;Assign Product&quot; to get started
									</p>
								</div>
							) : (
								<div className="border rounded-lg overflow-hidden">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/50">
												<TableHead className="font-semibold">Product</TableHead>
												<TableHead className="font-semibold">Supplier SKU</TableHead>
												<TableHead className="font-semibold">Unit Cost</TableHead>
												<TableHead className="font-semibold">Order Qty</TableHead>
												<TableHead className="font-semibold">Lead Time</TableHead>
												<TableHead className="font-semibold">Status</TableHead>
												<TableHead className="w-[100px]">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredProductSuppliers.map((ps) => (
												<TableRow key={ps.id} className="hover:bg-muted/30 transition-colors">
													<TableCell>
														<div className="flex items-center gap-2">
															{ps.isPreferred && (
																<Star className="h-4 w-4 text-amber-500 fill-amber-500" />
															)}
															<div>
																<div className="font-medium text-sm">{ps.product.name}</div>
																<div className="text-xs text-muted-foreground">
																	SKU: {ps.product.sku}
																</div>
															</div>
														</div>
													</TableCell>
													<TableCell className="text-sm">
														{ps.supplierSku || "-"}
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-1">
															<DollarSign className="h-3 w-3 text-muted-foreground" />
															<span className="font-medium">
																{Number(ps.unitCost).toFixed(2)}
															</span>
															<span className="text-xs text-muted-foreground">
																{ps.currency}
															</span>
														</div>
													</TableCell>
													<TableCell className="text-sm">
														{ps.minOrderQty && ps.maxOrderQty
															? `${ps.minOrderQty} - ${ps.maxOrderQty}`
															: ps.minOrderQty
																? `Min: ${ps.minOrderQty}`
																: ps.maxOrderQty
																	? `Max: ${ps.maxOrderQty}`
																	: "-"}
													</TableCell>
													<TableCell>
														{ps.leadTimeDays ? (
															<div className="flex items-center gap-1 text-sm">
																<Clock className="h-3 w-3 text-muted-foreground" />
																{ps.leadTimeDays} days
															</div>
														) : (
															<span className="text-sm text-muted-foreground">-</span>
														)}
													</TableCell>
													<TableCell>
														<Badge variant={ps.isActive ? "default" : "secondary"}>
															{ps.isActive ? "Active" : "Inactive"}
														</Badge>
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-1">
															<Button
																variant="ghost"
																size="sm"
																onClick={() => openEditDialog(ps)}
															>
																<Edit className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleDelete(ps.id)}
																className="hover:bg-destructive/10 hover:text-destructive"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* Add Product Dialog */}
				<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
					<DialogContent className="max-w-2xl">
						<DialogHeader className="border-b pb-4">
							<DialogTitle className="text-xl">Assign Product to Supplier</DialogTitle>
							<DialogDescription>
								Add a product to this supplier&apos;s catalog with pricing and lead time information
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 pt-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2">
									<Label htmlFor="product">Product *</Label>
									<Select
										value={formData.productId}
										onValueChange={(value) =>
											setFormData({ ...formData, productId: value })
										}
									>
										<SelectTrigger className="h-10">
											<SelectValue placeholder="Select a product" />
										</SelectTrigger>
										<SelectContent>
											{products.map((product) => (
												<SelectItem key={product.id} value={product.id}>
													{product.name} ({product.sku})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="supplierSku">Supplier SKU</Label>
									<Input
										id="supplierSku"
										value={formData.supplierSku}
										onChange={(e) =>
											setFormData({ ...formData, supplierSku: e.target.value })
										}
										placeholder="Supplier's SKU"
										className="h-10"
									/>
								</div>

								<div>
									<Label htmlFor="unitCost">Unit Cost * ({formData.currency})</Label>
									<Input
										id="unitCost"
										type="number"
										step="0.01"
										min="0"
										value={formData.unitCost}
										onChange={(e) =>
											setFormData({ ...formData, unitCost: e.target.value })
										}
										placeholder="0.00"
										className="h-10"
									/>
								</div>

								<div>
									<Label htmlFor="minOrderQty">Min Order Quantity</Label>
									<Input
										id="minOrderQty"
										type="number"
										min="0"
										value={formData.minOrderQty}
										onChange={(e) =>
											setFormData({ ...formData, minOrderQty: e.target.value })
										}
										placeholder="Minimum order"
										className="h-10"
									/>
								</div>

								<div>
									<Label htmlFor="maxOrderQty">Max Order Quantity</Label>
									<Input
										id="maxOrderQty"
										type="number"
										min="0"
										value={formData.maxOrderQty}
										onChange={(e) =>
											setFormData({ ...formData, maxOrderQty: e.target.value })
										}
										placeholder="Maximum order"
										className="h-10"
									/>
								</div>

								<div className="col-span-2">
									<Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
									<Input
										id="leadTimeDays"
										type="number"
										min="0"
										value={formData.leadTimeDays}
										onChange={(e) =>
											setFormData({ ...formData, leadTimeDays: e.target.value })
										}
										placeholder="Delivery lead time"
										className="h-10"
									/>
								</div>

								<div className="col-span-2 flex items-center gap-4">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="isPreferred"
											checked={formData.isPreferred}
											onCheckedChange={(checked) =>
												setFormData({ ...formData, isPreferred: checked as boolean })
											}
										/>
										<label
											htmlFor="isPreferred"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Preferred Supplier
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="isActive"
											checked={formData.isActive}
											onCheckedChange={(checked) =>
												setFormData({ ...formData, isActive: checked as boolean })
											}
										/>
										<label
											htmlFor="isActive"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Active
										</label>
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-2 pt-4 border-t">
								<Button
									variant="outline"
									onClick={() => {
										setIsAddDialogOpen(false);
										resetForm();
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleAdd}>Assign Product</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				{/* Edit Product Dialog */}
				<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
					<DialogContent className="max-w-2xl">
						<DialogHeader className="border-b pb-4">
							<DialogTitle className="text-xl">Edit Product-Supplier Relationship</DialogTitle>
							<DialogDescription>
								Update pricing and lead time information for this product
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 pt-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="edit-supplierSku">Supplier SKU</Label>
									<Input
										id="edit-supplierSku"
										value={formData.supplierSku}
										onChange={(e) =>
											setFormData({ ...formData, supplierSku: e.target.value })
										}
										placeholder="Supplier's SKU"
										className="h-10"
									/>
								</div>

								<div>
									<Label htmlFor="edit-unitCost">Unit Cost * ({formData.currency})</Label>
									<Input
										id="edit-unitCost"
										type="number"
										step="0.01"
										min="0"
										value={formData.unitCost}
										onChange={(e) =>
											setFormData({ ...formData, unitCost: e.target.value })
										}
										placeholder="0.00"
										className="h-10"
									/>
								</div>

								<div>
									<Label htmlFor="edit-minOrderQty">Min Order Quantity</Label>
									<Input
										id="edit-minOrderQty"
										type="number"
										min="0"
										value={formData.minOrderQty}
										onChange={(e) =>
											setFormData({ ...formData, minOrderQty: e.target.value })
										}
										placeholder="Minimum order"
										className="h-10"
									/>
								</div>

								<div>
									<Label htmlFor="edit-maxOrderQty">Max Order Quantity</Label>
									<Input
										id="edit-maxOrderQty"
										type="number"
										min="0"
										value={formData.maxOrderQty}
										onChange={(e) =>
											setFormData({ ...formData, maxOrderQty: e.target.value })
										}
										placeholder="Maximum order"
										className="h-10"
									/>
								</div>

								<div className="col-span-2">
									<Label htmlFor="edit-leadTimeDays">Lead Time (Days)</Label>
									<Input
										id="edit-leadTimeDays"
										type="number"
										min="0"
										value={formData.leadTimeDays}
										onChange={(e) =>
											setFormData({ ...formData, leadTimeDays: e.target.value })
										}
										placeholder="Delivery lead time"
										className="h-10"
									/>
								</div>

								<div className="col-span-2 flex items-center gap-4">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="edit-isPreferred"
											checked={formData.isPreferred}
											onCheckedChange={(checked) =>
												setFormData({ ...formData, isPreferred: checked as boolean })
											}
										/>
										<label
											htmlFor="edit-isPreferred"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Preferred Supplier
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="edit-isActive"
											checked={formData.isActive}
											onCheckedChange={(checked) =>
												setFormData({ ...formData, isActive: checked as boolean })
											}
										/>
										<label
											htmlFor="edit-isActive"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Active
										</label>
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-2 pt-4 border-t">
								<Button
									variant="outline"
									onClick={() => {
										setIsEditDialogOpen(false);
										setEditingItem(null);
										resetForm();
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleEdit}>Update</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}

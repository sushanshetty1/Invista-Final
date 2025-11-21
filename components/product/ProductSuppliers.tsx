"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Star, DollarSign, Clock, Package } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface ProductSupplier {
	id: string;
	supplierId: string;
	supplierSku?: string;
	unitCost: number;
	currency: string;
	minOrderQty?: number;
	maxOrderQty?: number;
	leadTimeDays?: number;
	isPreferred: boolean;
	isActive: boolean;
	supplier: {
		id: string;
		name: string;
		code: string;
		email?: string;
		phone?: string;
		status: string;
	};
}

interface Supplier {
	id: string;
	name: string;
	code: string;
	status: string;
}

interface ProductSuppliersProps {
	productId: string;
	productName: string;
}

export default function ProductSuppliers({ productId, productName }: ProductSuppliersProps) {
	const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ProductSupplier | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [formData, setFormData] = useState({
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
		loadProductSuppliers();
	}, [productId]);

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

	const loadProductSuppliers = async () => {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/product-suppliers?productId=${productId}`);
			const data = await response.json();
			if (response.ok) {
				setProductSuppliers(data.productSuppliers || []);
			}
		} catch (error) {
			console.error("Error loading product suppliers:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAdd = async () => {
		if (!formData.supplierId || !formData.unitCost) {
			toast.error("Supplier and Unit Cost are required");
			return;
		}

		try {
			const response = await fetch("/api/product-suppliers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					productId,
					...formData,
					unitCost: parseFloat(formData.unitCost),
					minOrderQty: formData.minOrderQty ? parseInt(formData.minOrderQty) : undefined,
					maxOrderQty: formData.maxOrderQty ? parseInt(formData.maxOrderQty) : undefined,
					leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to add supplier");
			}

			toast.success("Supplier added successfully");
			setIsAddDialogOpen(false);
			resetForm();
			loadProductSuppliers();
		} catch (error) {
			console.error("Error adding supplier:", error);
			toast.error(error instanceof Error ? error.message : "Failed to add supplier");
		}
	};

	const handleEdit = async () => {
		if (!editingItem || !formData.unitCost) {
			toast.error("Unit Cost is required");
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
				throw new Error("Failed to update supplier");
			}

			toast.success("Supplier updated successfully");
			setIsEditDialogOpen(false);
			setEditingItem(null);
			resetForm();
			loadProductSuppliers();
		} catch (error) {
			console.error("Error updating supplier:", error);
			toast.error("Failed to update supplier");
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to remove this supplier?")) {
			return;
		}

		try {
			const response = await fetch(`/api/product-suppliers?id=${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete supplier");
			}

			toast.success("Supplier removed successfully");
			loadProductSuppliers();
		} catch (error) {
			console.error("Error deleting supplier:", error);
			toast.error("Failed to remove supplier");
		}
	};

	const openEditDialog = (item: ProductSupplier) => {
		setEditingItem(item);
		setFormData({
			supplierId: item.supplierId,
			supplierSku: item.supplierSku || "",
			unitCost: item.unitCost.toString(),
			currency: item.currency,
			minOrderQty: item.minOrderQty?.toString() || "",
			maxOrderQty: item.maxOrderQty?.toString() || "",
			leadTimeDays: item.leadTimeDays?.toString() || "",
			isPreferred: item.isPreferred,
			isActive: item.isActive,
		});
		setIsEditDialogOpen(true);
	};

	const resetForm = () => {
		setFormData({
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
	};

	const openAddDialog = () => {
		resetForm();
		setIsAddDialogOpen(true);
	};

	return (
		<Card className="shadow-md hover:shadow-lg transition-shadow">
			<CardHeader className="border-b bg-muted/30">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-xl">Suppliers</CardTitle>
						<CardDescription>
							Manage suppliers and pricing for {productName}
						</CardDescription>
					</div>
					<Button onClick={openAddDialog} size="sm" className="shadow-sm hover:shadow-md transition-all">
						<Plus className="h-4 w-4 mr-2" />
						Add Supplier
					</Button>
				</div>
			</CardHeader>
			<CardContent className="pt-6">
				{isLoading ? (
					<div className="text-center py-8 text-muted-foreground">Loading...</div>
				) : productSuppliers.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="rounded-full bg-muted p-3 mb-4">
							<Package className="h-8 w-8 text-muted-foreground" />
						</div>
						<p className="text-muted-foreground font-medium">No suppliers assigned</p>
						<p className="text-sm text-muted-foreground/70 mt-1">
							Click &quot;Add Supplier&quot; to get started
						</p>
					</div>
				) : (
					<div className="border rounded-lg overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="font-semibold">Supplier</TableHead>
									<TableHead className="font-semibold">Supplier SKU</TableHead>
									<TableHead className="font-semibold">Unit Cost</TableHead>
									<TableHead className="font-semibold">Order Qty</TableHead>
									<TableHead className="font-semibold">Lead Time</TableHead>
									<TableHead className="font-semibold">Status</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{productSuppliers.map((ps) => (
									<TableRow key={ps.id} className="hover:bg-muted/30 transition-colors">
										<TableCell>
											<div className="flex items-center gap-2">
												{ps.isPreferred && (
													<Star className="h-4 w-4 text-amber-500 fill-amber-500" />
												)}
												<div>
													<div className="font-medium text-sm">{ps.supplier.name}</div>
													<div className="text-xs text-muted-foreground">
														Code: {ps.supplier.code}
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell className="text-sm">{ps.supplierSku || "-"}</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<DollarSign className="h-3 w-3 text-muted-foreground" />
												<span className="font-medium">{ps.unitCost.toFixed(2)}</span>
												<span className="text-xs text-muted-foreground">{ps.currency}</span>
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

			{/* Add Supplier Dialog */}
			<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader className="border-b pb-4">
						<DialogTitle className="text-xl">Add Supplier to Product</DialogTitle>
						<DialogDescription>
							Assign a supplier to this product with pricing and lead time information
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="col-span-2">
								<Label htmlFor="supplier">Supplier *</Label>
								<Select
									value={formData.supplierId}
									onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
								>
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

							<div>
								<Label htmlFor="supplierSku">Supplier SKU</Label>
								<Input
									id="supplierSku"
									value={formData.supplierSku}
									onChange={(e) => setFormData({ ...formData, supplierSku: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, maxOrderQty: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
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
							<Button onClick={handleAdd}>Add Supplier</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Supplier Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader className="border-b pb-4">
						<DialogTitle className="text-xl">Edit Supplier Information</DialogTitle>
						<DialogDescription>
							Update pricing and lead time information for this supplier
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="edit-supplierSku">Supplier SKU</Label>
								<Input
									id="edit-supplierSku"
									value={formData.supplierSku}
									onChange={(e) => setFormData({ ...formData, supplierSku: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, maxOrderQty: e.target.value })}
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
									onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
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
		</Card>
	);
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductFormData {
	name: string;
	description?: string;
	sku: string;
	barcode?: string;
	categoryId?: string;
	brandId?: string;
	weight?: number;
	dimensions?: {
		length?: number;
		width?: number;
		height?: number;
		unit?: string;
	};
	color?: string;
	size?: string;
	material?: string;
	costPrice?: number;
	sellingPrice?: number;
	wholesalePrice?: number;
	minStockLevel: number;
	maxStockLevel?: number;
	reorderPoint?: number;
	reorderQuantity?: number;
	status: "ACTIVE" | "INACTIVE" | "DISCONTINUED" | "DRAFT";
	isTrackable: boolean;
	isSerialized: boolean;
	primaryImage?: string;
	images?: string[];
	metaTitle?: string;
	metaDescription?: string;
	tags?: string[];
	leadTimeSupply?: number;
	shelfLife?: number;
}

interface Product {
	id: string;
	name: string;
	sku: string;
	barcode?: string;
	description?: string;
	categoryId?: string;
	brandId?: string;
	costPrice?: number;
	sellingPrice?: number;
	wholesalePrice?: number;
	minStockLevel: number;
	maxStockLevel?: number;
	reorderPoint?: number;
	status: "ACTIVE" | "INACTIVE" | "DISCONTINUED" | "DRAFT";
	primaryImage?: string;
	isTrackable: boolean;
	isSerialized: boolean;
	weight?: number;
	dimensions?: {
		length?: number;
		width?: number;
		height?: number;
		unit?: string;
	};
	color?: string;
	size?: string;
	material?: string;
	images?: string[];
	metaTitle?: string;
	metaDescription?: string;
	tags?: string[];
	leadTimeSupply?: number;
	shelfLife?: number;
	category?: {
		id: string;
		name: string;
	};
	brand?: {
		id: string;
		name: string;
	};
}

interface Category {
	id: string;
	name: string;
}

interface Brand {
	id: string;
	name: string;
}

interface ProductFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product?: Product;
	onSave: (data: ProductFormData) => Promise<void>;
	categories: Category[];
	brands: Brand[];
}

export default function ProductFormDialog({
	open,
	onOpenChange,
	product,
	onSave,
	categories: _categories,
	brands,
}: ProductFormDialogProps) {
	// Ensure props are always arrays (unused but kept for future reference)
	// const safeCategories = Array.isArray(categories) ? categories : [];
	const _safeBrands = Array.isArray(brands) ? brands : [];

	const [loading, setLoading] = useState(false);
	const [selectedImages, setSelectedImages] = useState<string[]>([]);
	const [currentTags, setCurrentTags] = useState<string[]>([]);
	const [newTag, setNewTag] = useState("");
	const [currentTab, setCurrentTab] = useState("basic");
	const [formErrors, setFormErrors] = useState<string[]>([]);

	// Generate random SKU
	const generateSKU = () => {
		const prefix = "SKU";
		const timestamp = Date.now().toString().slice(-6);
		const random = Math.random().toString(36).substring(2, 6).toUpperCase();
		return `${prefix}-${timestamp}-${random}`;
	};

	const form = useForm<ProductFormData>({
		defaultValues: {
			name: "",
			description: "",
			sku: generateSKU(),
			barcode: "",
			categoryId: undefined,
			brandId: undefined,
			weight: 0,
			dimensions: {
				length: 0,
				width: 0,
				height: 0,
				unit: "cm",
			},
			color: "",
			size: "",
			material: "",
			costPrice: 0,
			sellingPrice: 0,
			wholesalePrice: 0,
			minStockLevel: 1,
			maxStockLevel: 0,
			reorderPoint: 0,
			reorderQuantity: 0,
			status: "ACTIVE",
			isTrackable: true,
			isSerialized: false,
			primaryImage: "",
			images: [],
			metaTitle: "",
			metaDescription: "",
			tags: [],
			leadTimeSupply: 0,
			shelfLife: 0,
		},
	});

	useEffect(() => {
		if (product) {
			form.reset({
				name: product.name,
				description: product.description || "",
				sku: product.sku,
				barcode: product.barcode || "",
				categoryId: product.categoryId || undefined,
				brandId: product.brandId || undefined,
				weight: product.weight || 0,
				dimensions: product.dimensions || {
					length: 0,
					width: 0,
					height: 0,
					unit: "cm",
				},
				color: product.color || "",
				size: product.size || "",
				material: product.material || "",
				costPrice: product.costPrice || 0,
				sellingPrice: product.sellingPrice || 0,
				wholesalePrice: product.wholesalePrice || 0,
				minStockLevel: product.minStockLevel,
				maxStockLevel: product.maxStockLevel || 0,
				reorderPoint: product.reorderPoint || 0,
				status: product.status,
				isTrackable: product.isTrackable,
				isSerialized: product.isSerialized,
				primaryImage: product.primaryImage || "",
				images: product.images || [],
				metaTitle: product.metaTitle || "",
				metaDescription: product.metaDescription || "",
				tags: product.tags || [],
				leadTimeSupply: product.leadTimeSupply || 0,
				shelfLife: product.shelfLife || 0,
			});
			setSelectedImages(product.images || []);
			setCurrentTags(product.tags || []);
		} else {
			form.reset();
			setSelectedImages([]);
			setCurrentTags([]);
		}
	}, [product, form]);

	const onSubmit = async (data: ProductFormData) => {
		setLoading(true);
		try {
			await onSave({
				...data,
				images: selectedImages,
				tags: currentTags,
			});
			onOpenChange(false);
			form.reset();
			setSelectedImages([]);
			setCurrentTags([]);
		} catch (error) {
			console.error("Error saving product:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files) {
			const newImages = Array.from(files).map((file) =>
				URL.createObjectURL(file),
			);
			setSelectedImages((prev) => [...prev, ...newImages]);
		}
	};

	const removeImage = (index: number) => {
		setSelectedImages((prev) => prev.filter((_, i) => i !== index));
	};

	const addTag = () => {
		if (newTag.trim() && !currentTags.includes(newTag.trim())) {
			setCurrentTags((prev) => [...prev, newTag.trim()]);
			setNewTag("");
		}
	};

	const removeTag = (tag: string) => {
		setCurrentTags((prev) => prev.filter((t) => t !== tag));
	};

	// Validation functions
	const validatePricing = () => {
		const errors: string[] = [];
		const values = form.getValues();

		if (values.costPrice !== undefined && values.costPrice <= 0) {
			errors.push("Cost Price must be greater than 0");
		}
		if (values.sellingPrice !== undefined && values.sellingPrice <= 0) {
			errors.push("Selling Price must be greater than 0");
		}
		if (values.wholesalePrice !== undefined && values.wholesalePrice <= 0) {
			errors.push("Wholesale Price must be greater than 0");
		}

		return errors;
	};

	const validateInventory = () => {
		const errors: string[] = [];
		const values = form.getValues();

		if (values.minStockLevel <= 0) {
			errors.push("Minimum Stock Level must be greater than 0");
		}
		if (values.maxStockLevel !== undefined && values.maxStockLevel <= 0) {
			errors.push("Maximum Stock Level must be greater than 0");
		}
		if (values.reorderPoint !== undefined && values.reorderPoint <= 0) {
			errors.push("Reorder Point must be greater than 0");
		}
		if (values.leadTimeSupply !== undefined && values.leadTimeSupply <= 0) {
			errors.push("Lead Time must be greater than 0");
		}

		return errors;
	};

	const validateAllTabs = () => {
		const pricingErrors = validatePricing();
		const inventoryErrors = validateInventory();
		const allErrors = [...pricingErrors, ...inventoryErrors];
		setFormErrors(allErrors);
		return allErrors.length === 0;
	};

	// Tab navigation
	const tabs = ["basic", "pricing", "inventory", "media"];

	const goToNextTab = () => {
		const currentIndex = tabs.indexOf(currentTab);
		if (currentIndex < tabs.length - 1) {
			setCurrentTab(tabs[currentIndex + 1]);
		}
	};

	const goToPreviousTab = () => {
		const currentIndex = tabs.indexOf(currentTab);
		if (currentIndex > 0) {
			setCurrentTab(tabs[currentIndex - 1]);
		}
	};

	const canCreateProduct = () => {
		const values = form.getValues();
		return values.name.trim() !== "" && validateAllTabs();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{product ? "Edit Product" : "Add New Product"}
					</DialogTitle>
					<DialogDescription>
						{product
							? "Update product information"
							: "Add a new product to your inventory"}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<Tabs
							value={currentTab}
							onValueChange={setCurrentTab}
							className="w-full"
						>
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="basic">Basic Info</TabsTrigger>
								<TabsTrigger value="pricing">Pricing</TabsTrigger>
								<TabsTrigger value="inventory">Inventory</TabsTrigger>
								<TabsTrigger value="media">Media & SEO</TabsTrigger>
							</TabsList>

							{/* Display form errors */}
							{formErrors.length > 0 && (
								<div className="bg-red-50 border border-red-200 rounded-md p-3">
									<h4 className="text-red-800 font-medium">
										Please fix the following errors:
									</h4>
									<ul className="mt-1 text-red-700 text-sm list-disc list-inside">
										{formErrors.map((error, index) => (
											<li key={index}>{error}</li>
										))}
									</ul>
								</div>
							)}

							<TabsContent value="basic" className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Product Name *</FormLabel>
												<FormControl>
													<Input placeholder="Enter product name" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="sku"
										render={({ field }) => (
											<FormItem>
												<FormLabel>SKU *</FormLabel>
												<FormControl>
													<div className="flex gap-2">
														<Input
															placeholder="Auto-generated SKU"
															{...field}
															readOnly
														/>
														<Button
															type="button"
															variant="outline"
															onClick={() => field.onChange(generateSKU())}
															className="whitespace-nowrap"
														>
															Generate New
														</Button>
													</div>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Enter product description"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-3 gap-4">
									<FormField
										control={form.control}
										name="categoryId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Category</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select category" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{(_categories || []).map((category: { id: string; name: string }) => (
															<SelectItem key={category.id} value={category.id}>
																{category.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="brandId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Brand</FormLabel>
												<FormControl>
													<Input placeholder="Enter brand name" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="status"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Status</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select status" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="ACTIVE">Active</SelectItem>
														<SelectItem value="INACTIVE">Inactive</SelectItem>
														<SelectItem value="DISCONTINUED">
															Discontinued
														</SelectItem>
														<SelectItem value="DRAFT">Draft</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="grid grid-cols-3 gap-4">
									<FormField
										control={form.control}
										name="color"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Color</FormLabel>
												<FormControl>
													<Input placeholder="e.g., Red, Blue" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="size"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Size</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select size" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="S">S</SelectItem>
														<SelectItem value="M">M</SelectItem>
														<SelectItem value="L">L</SelectItem>
														<SelectItem value="XL">XL</SelectItem>
														<SelectItem value="XXL">XXL</SelectItem>
														<SelectItem value="XXXL">XXXL</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="material"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Material</FormLabel>
												<FormControl>
													<Input
														placeholder="e.g., Cotton, Plastic"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							<TabsContent value="pricing" className="space-y-4">
								<div className="grid grid-cols-3 gap-4">
									<FormField
										control={form.control}
										name="costPrice"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Cost Price</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														min="0.01"
														placeholder="0.00"
														{...field}
														className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
														onChange={(e) => {
															const value = parseFloat(e.target.value) || 0;
															field.onChange(value);
															validatePricing();
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="sellingPrice"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Selling Price</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														min="0.01"
														placeholder="0.00"
														{...field}
														className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
														onChange={(e) => {
															const value = parseFloat(e.target.value) || 0;
															field.onChange(value);
															validatePricing();
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="wholesalePrice"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Wholesale Price</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														min="0.01"
														placeholder="0.00"
														{...field}
														className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
														onChange={(e) => {
															const value = parseFloat(e.target.value) || 0;
															field.onChange(value);
															validatePricing();
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							<TabsContent value="inventory" className="space-y-4">
								<div className="grid grid-cols-2 gap-6">
									<Card>
										<CardHeader>
											<CardTitle>Stock Levels</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<FormField
												control={form.control}
												name="minStockLevel"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Minimum Stock Level *</FormLabel>
														<FormControl>
															<Input
																type="number"
																min="1"
																placeholder="1"
																{...field}
																className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
																onChange={(e) => {
																	const value = parseInt(e.target.value) || 1;
																	field.onChange(value);
																	validateInventory();
																}}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="maxStockLevel"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Maximum Stock Level</FormLabel>
														<FormControl>
															<Input
																type="number"
																min="1"
																placeholder="0"
																{...field}
																className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
																onChange={(e) => {
																	const value = parseInt(e.target.value) || 0;
																	field.onChange(value);
																	validateInventory();
																}}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="reorderPoint"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Reorder Point</FormLabel>
														<FormControl>
															<Input
																type="number"
																min="1"
																placeholder="0"
																{...field}
																className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
																onChange={(e) => {
																	const value = parseInt(e.target.value) || 0;
																	field.onChange(value);
																	validateInventory();
																}}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle>Tracking Settings</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<FormField
												control={form.control}
												name="leadTimeSupply"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Lead Time (Days)</FormLabel>
														<FormControl>
															<Input
																type="number"
																min="1"
																placeholder="0"
																{...field}
																className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
																onChange={(e) => {
																	const value = parseInt(e.target.value) || 0;
																	field.onChange(value);
																	validateInventory();
																}}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="isTrackable"
												render={({ field }) => (
													<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
														<div className="space-y-0.5">
															<FormLabel>Track Inventory</FormLabel>
															<div className="text-sm text-muted-foreground">
																Track stock levels for this product
															</div>
														</div>
														<FormControl>
															<Switch
																checked={field.value}
																onCheckedChange={field.onChange}
															/>
														</FormControl>
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="isSerialized"
												render={({ field }) => (
													<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
														<div className="space-y-0.5">
															<FormLabel>Serial Numbers</FormLabel>
															<div className="text-sm text-muted-foreground">
																Track individual serial numbers
															</div>
														</div>
														<FormControl>
															<Switch
																checked={field.value}
																onCheckedChange={field.onChange}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
										</CardContent>
									</Card>
								</div>
							</TabsContent>

							<TabsContent value="media" className="space-y-4">
								<div className="grid grid-cols-2 gap-6">
									<Card>
										<CardHeader>
											<CardTitle>Product Images</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
												<Upload className="mx-auto h-12 w-12 text-gray-400" />
												<div className="mt-4">
													<label
														htmlFor="image-upload"
														className="cursor-pointer"
													>
														<span className="mt-2 block text-sm font-medium text-gray-900">
															Upload product images
														</span>
														<input
															id="image-upload"
															type="file"
															multiple
															accept="image/*"
															className="hidden"
															onChange={handleImageUpload}
														/>
													</label>
												</div>
											</div>

											{selectedImages.length > 0 && (
												<div className="grid grid-cols-3 gap-2">
													{selectedImages.map((image, index) => (
														<div key={index} className="relative">
															<Image
																src={image}
																alt={`Product ${index + 1}`}
																width={100}
																height={100}
																className="rounded-lg object-cover"
															/>
															<Button
																type="button"
																variant="destructive"
																size="sm"
																className="absolute top-1 right-1 h-6 w-6 p-0"
																onClick={() => removeImage(index)}
															>
																<X className="h-3 w-3" />
															</Button>
														</div>
													))}
												</div>
											)}
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle>SEO & Tags</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<FormField
												control={form.control}
												name="metaTitle"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Meta Title</FormLabel>
														<FormControl>
															<Input placeholder="SEO title" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="metaDescription"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Meta Description</FormLabel>
														<FormControl>
															<Textarea
																placeholder="SEO description"
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<div>
												<FormLabel>Tags</FormLabel>
												<div className="flex gap-2 mt-2">
													<Input
														value={newTag}
														onChange={(e) => setNewTag(e.target.value)}
														placeholder="Add tag"
														onKeyPress={(e) =>
															e.key === "Enter" &&
															(e.preventDefault(), addTag())
														}
													/>
													<Button
														type="button"
														onClick={addTag}
														variant="outline"
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
												<div className="flex flex-wrap gap-2 mt-2">
													{currentTags.map((tag, index) => (
														<Badge
															key={index}
															variant="secondary"
															className="gap-1"
														>
															{tag}
															<X
																className="h-3 w-3 cursor-pointer"
																onClick={() => removeTag(tag)}
															/>
														</Badge>
													))}
												</div>
											</div>
										</CardContent>
									</Card>
								</div>
							</TabsContent>
						</Tabs>

						<DialogFooter className="gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>

							{currentTab !== "basic" && (
								<Button
									type="button"
									variant="outline"
									onClick={goToPreviousTab}
								>
									<ChevronLeft className="h-4 w-4 mr-1" />
									Previous
								</Button>
							)}

							{currentTab !== "media" && (
								<Button type="button" onClick={goToNextTab}>
									Next
									<ChevronRight className="h-4 w-4 ml-1" />
								</Button>
							)}

							{currentTab === "media" && (
								<Button
									type="submit"
									disabled={loading || !canCreateProduct()}
									className="min-w-[120px]"
								>
									{loading ? "Creating..." : "Create Product"}
								</Button>
							)}
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

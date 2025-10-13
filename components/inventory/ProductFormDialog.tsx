"use client";

import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
import { useForm } from "react-hook-form";
import Barcode from "react-barcode";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Upload, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CategoryCombobox } from "./CategoryCombobox";
import { useIndustryCategories } from "@/hooks/use-industry-categories";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

// Constants outside component to prevent recreation
const TABS = ["basic", "pricing", "inventory", "media"] as const;

const generateSKU = () => {
	const prefix = "SKU";
	const timestamp = Date.now().toString().slice(-6);
	const random = Math.random().toString(36).substring(2, 6).toUpperCase();
	return `${prefix}-${timestamp}-${random}`;
};

const generateBarcode = () => {
	return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

const generateUniqueId = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

// Function to generate unique slug by checking existing ones in database
const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
	let attempts = 0;
	const maxAttempts = 10;
	let slug = baseSlug;

	while (attempts < maxAttempts) {
		try {
			// Get the current session token using Supabase
			const { data: { session } } = await supabase.auth.getSession();

			if (!session?.access_token) {
				console.warn("No session token available, using generated slug");
				return slug;
			}

			// Check if this slug already exists in the Product table
			const response = await fetch(`/api/inventory/products?slug=${encodeURIComponent(slug)}&limit=1`, {
				headers: {
					Authorization: `Bearer ${session.access_token}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				// If no products found with this slug, it's unique
				if (!data.products || data.products.length === 0) {
					return slug;
				}
			}
		} catch (error) {
			console.error("Error checking slug uniqueness:", error);
			return slug; // Fallback to generated slug
		}

		// If slug exists, append a number
		attempts++;
		slug = `${baseSlug}-${attempts}`;
	}

	// Fallback: add timestamp if we can't verify uniqueness
	return `${baseSlug}-${Date.now()}`;
};

// Function to generate unique categoryId by checking existing ones in database
const generateUniqueCategoryId = async (): Promise<string> => {
	let attempts = 0;
	const maxAttempts = 10;

	while (attempts < maxAttempts) {
		const newId = generateUniqueId();

		try {
			// Get the current session token using Supabase
			const { data: { session } } = await supabase.auth.getSession();

			if (!session?.access_token) {
				console.warn("No session token available, using generated ID");
				return newId;
			}

			// Check if this categoryId already exists in the Product table
			const response = await fetch(`/api/inventory/products?categoryId=${newId}&limit=1`, {
				headers: {
					Authorization: `Bearer ${session.access_token}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				// If no products found with this categoryId, it's unique
				if (!data.products || data.products.length === 0) {
					return newId;
				}
			}
		} catch (error) {
			console.error("Error checking categoryId uniqueness:", error);
			return newId; // Fallback to generated ID
		}

		attempts++;
	}

	// Fallback: return a timestamp-based ID if we can't verify uniqueness
	return `cat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

interface ProductFormData {
	name: string;
	description?: string;
	sku: string;
	slug?: string;
	barcode?: string;
	categoryId?: string;
	brandId?: string;
	categoryName?: string;
	brandName?: string;
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
	minStockLevel?: number;
	maxStockLevel?: number;
	reorderPoint?: number;
	reorderQuantity?: number;
	status?: "ACTIVE" | "INACTIVE" | "DISCONTINUED" | "DRAFT";
	isTrackable?: boolean;
	isSerialized?: boolean;
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
	description?: string;
	sku: string;
	slug?: string;
	barcode?: string;
	categoryId?: string;
	brandId?: string;
	categoryName?: string;
	brandName?: string;
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
	minStockLevel?: number;
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
	product?: Product | null;
	categories: Category[];
	brands: Brand[];
	onSave: () => Promise<void>;
}

// Main component with React.memo for optimization
const ProductFormDialog = React.memo(function ProductFormDialog({
	open,
	onOpenChange,
	product = null,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	categories: _categories = [],
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	brands: _brands = [],
	onSave,
}: ProductFormDialogProps) {
	// Get authentication context
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { user: _user } = useAuth();

	// Get industry-based categories
	const {
		categories: industryCategories,
		loading: categoriesLoading,
		industry,
	} = useIndustryCategories();

	// Ensure arrays are always stable arrays (unused but kept for future reference)
	// const safeCategories = useMemo(
	//	() => (Array.isArray(categories) ? categories : []),
	//	[categories],
	// );
	// const safeBrands = useMemo(
	//	() => (Array.isArray(brands) ? brands : []),
	//	[brands],
	// );
	// State
	const [loading, setLoading] = useState(false);
	const [currentTab, setCurrentTab] = useState("basic");
	const [imageUploading, setImageUploading] = useState(false);
	const [tagInput, setTagInput] = useState("");
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const uploadAbortControllerRef = useRef<AbortController | null>(null);
	// Stable default values - never changes
	const defaultValues = useMemo(
		() => ({
			name: "",
			description: "",
			sku: generateSKU(),
			slug: "",
			barcode: generateBarcode(),
			categoryId: "",
			brandId: "",
			categoryName: "",
			brandName: "",
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
			status: "ACTIVE" as const,
			isTrackable: true,
			isSerialized: false,
			primaryImage: "",
			images: [] as string[],
			metaTitle: "",
			metaDescription: "",
			tags: [] as string[],
			leadTimeSupply: 0,
			shelfLife: 0,
		}),
		[],
	);
	const form = useForm<ProductFormData>({
		defaultValues,
	});
	// Image upload to API endpoint
	const uploadImage = useCallback(
		async (file: File): Promise<string | null> => {
			// Cancel any existing upload
			if (uploadAbortControllerRef.current) {
				uploadAbortControllerRef.current.abort();
			}

			// Create new abort controller for this upload
			uploadAbortControllerRef.current = new AbortController();
			const signal = uploadAbortControllerRef.current.signal;

			let timeoutId: NodeJS.Timeout | null = null;

			try {
				setImageUploading(true);
				setError(null); // Clear any previous errors
				console.log("Starting image upload:", file.name, file.size);

				// Safety timeout to reset loading state after 30 seconds
				timeoutId = setTimeout(() => {
					if (!signal.aborted) {
						console.error("Image upload timeout");
						setImageUploading(false);
						setError("Image upload timed out. Please try again.");
					}
				}, 30000);

				// Validate file size (10MB limit)
				const maxSize = 10 * 1024 * 1024; // 10MB
				if (file.size > maxSize) {
					setError("File too large. Please choose a file smaller than 10MB.");
					return null;
				}

				// Validate file type
				const allowedTypes = [
					"image/jpeg",
					"image/jpg",
					"image/png",
					"image/gif",
				];
				if (!allowedTypes.includes(file.type)) {
					setError(
						"Invalid file type. Please choose a JPG, PNG, or GIF image.",
					);
					return null;
				}

				// Create form data
				const formData = new FormData();
				formData.append("file", file);

				// Get the current session token using Supabase
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session?.access_token) {
					setError("Authentication required. Please log in again.");
					return null;
				}

				console.log("Uploading to API endpoint");
				const response = await fetch("/api/inventory/images/upload", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
					body: formData,
					signal, // Add abort signal
				});

				if (!response.ok) {
					const errorData = await response.json();
					setError(`Failed to upload image: ${errorData.error}`);
					return null;
				}

				const data = await response.json();
				console.log("Upload successful:", data.url);
				return data.url;
			} catch (error) {
				if (signal.aborted) {
					console.log("Upload was cancelled");
					return null;
				}
				console.error("Error uploading image:", error);
				setError("Network error during image upload. Please try again.");
				return null;
			} finally {
				if (timeoutId) clearTimeout(timeoutId);
				if (!signal.aborted) {
					setImageUploading(false);
				}
				// Clear the abort controller if this upload completed
				if (uploadAbortControllerRef.current?.signal === signal) {
					uploadAbortControllerRef.current = null;
				}
			}
		},
		[],
	); // Handle image upload
	const handleImageUpload = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files;
			if (!files || files.length === 0) return;

			const file = files[0];

			console.log("Starting image upload for file:", file.name);
			const url = await uploadImage(file);

			if (url) {
				console.log("Image uploaded successfully, adding to form");
				const currentImages = form.getValues("images") || [];
				const newImages = [...currentImages, url];

				form.setValue("images", newImages);

				// Set as primary image if none exists
				if (!form.getValues("primaryImage")) {
					form.setValue("primaryImage", url);
				}

				// Clear any previous errors
				setError(null);
			} else {
				console.error("Image upload failed");
			}

			// Reset the file input
			event.target.value = "";
		},
		[form, uploadImage],
	);

	// Remove image
	const removeImage = useCallback(
		(index: number) => {
			const currentImages = form.getValues("images") || [];
			const imageToRemove = currentImages[index];
			const newImages = currentImages.filter((_, i) => i !== index);

			form.setValue("images", newImages);

			// Update primary image if it was removed
			if (form.getValues("primaryImage") === imageToRemove) {
				form.setValue("primaryImage", newImages[0] || "");
			}
		},
		[form],
	);

	// Set primary image
	const setPrimaryImage = useCallback(
		(url: string) => {
			form.setValue("primaryImage", url);
		},
		[form],
	);

	// Tag management
	const addTag = useCallback(() => {
		if (!tagInput.trim()) return;

		const currentTags = form.getValues("tags") || [];
		if (!currentTags.includes(tagInput.trim())) {
			form.setValue("tags", [...currentTags, tagInput.trim()]);
		}
		setTagInput("");
	}, [tagInput, form]);

	const removeTag = useCallback(
		(tagToRemove: string) => {
			const currentTags = form.getValues("tags") || [];
			form.setValue(
				"tags",
				currentTags.filter((tag) => tag !== tagToRemove),
			);
		},
		[form],
	);

	const handleTagInputKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				addTag();
			}
		},
		[addTag],
	);
	// Reset form when product changes or dialog opens
	useEffect(() => {
		if (open) {
			// Cancel any ongoing uploads when opening dialog
			if (uploadAbortControllerRef.current) {
				uploadAbortControllerRef.current.abort();
				uploadAbortControllerRef.current = null;
			}

			// Reset all states
			setImageUploading(false);
			setError(null);
			setTagInput("");

			if (product) {
				// Editing existing product
				form.reset({
					name: product.name || "",
					description: product.description || "",
					sku: product.sku || "",
					slug: product.slug || "",
					barcode: product.barcode || "",
					categoryId: product.categoryId || "",
					brandId: product.brandId || "",
					categoryName: product.categoryName || "",
					brandName: product.brandName || "",
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
					minStockLevel: product.minStockLevel || 1,
					maxStockLevel: product.maxStockLevel || 0,
					reorderPoint: product.reorderPoint || 0,
					reorderQuantity: product.reorderQuantity || 0,
					status: product.status || "ACTIVE",
					isTrackable: product.isTrackable ?? true,
					isSerialized: product.isSerialized ?? false,
					primaryImage: product.primaryImage || "",
					images: product.images || [],
					metaTitle: product.metaTitle || "",
					metaDescription: product.metaDescription || "",
					tags: product.tags || [],
					leadTimeSupply: product.leadTimeSupply || 0,
					shelfLife: product.shelfLife || 0,
				});
			} else {
				// Creating new product
				form.reset(defaultValues);
			}
			setCurrentTab("basic");
		} else {
			// Dialog is closing - cancel any ongoing uploads
			if (uploadAbortControllerRef.current) {
				uploadAbortControllerRef.current.abort();
				uploadAbortControllerRef.current = null;
			}
			setImageUploading(false);
		}
	}, [product, open, form, defaultValues]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// Cancel any ongoing uploads when component unmounts
			if (uploadAbortControllerRef.current) {
				uploadAbortControllerRef.current.abort();
			}
		};
	}, []);
	// Stable submit handler
	const handleSubmit = useCallback(
		async (data: ProductFormData) => {
			setLoading(true);
			setError(null);

			try {
				const url = product
					? `/api/inventory/products/${product.id}`
					: "/api/inventory/products";
				const method = product ? "PUT" : "POST"; // Clean up the data before sending - remove fields that are empty/invalid
				const cleanedData: Record<string, unknown> = {
					name: data.name,
					sku: data.sku,
					status: data.status || "ACTIVE",
					isTrackable: data.isTrackable,
					isSerialized: data.isSerialized,
					minStockLevel: data.minStockLevel || 0,
				};

				// Only include optional fields if they have valid values
				if (data.description && data.description.trim() !== "") {
					cleanedData.description = data.description.trim();
				}
				if (data.barcode && data.barcode.trim() !== "") {
					cleanedData.barcode = data.barcode.trim();
				}
				if (data.slug && data.slug.trim() !== "") {
					cleanedData.slug = data.slug.trim();
				} else if (data.name && data.name.trim() !== "") {
					// Generate unique slug from product name if no slug provided
					const baseSlug = data.name
						.toLowerCase()
						.trim()
						.replace(/[^a-z0-9\s-]/g, '') // Remove special characters
						.replace(/\s+/g, '-') // Replace spaces with hyphens
						.replace(/-+/g, '-') // Replace multiple hyphens with single
						.replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

					if (baseSlug) {
						cleanedData.slug = await generateUniqueSlug(baseSlug);
					}
				}				// Handle category - include categoryName and auto-generate categoryId if needed
				if (data.categoryName && data.categoryName.trim() !== "") {
					cleanedData.categoryName = data.categoryName.trim();
					// Auto-generate categoryId if not provided or empty
					if (!data.categoryId || data.categoryId.trim() === "") {
						cleanedData.categoryId = await generateUniqueCategoryId();
					} else {
						cleanedData.categoryId = data.categoryId.trim();
					}
				}

				// Handle brand - include brandName and auto-generate brandId if needed
				if (data.brandName && data.brandName.trim() !== "") {
					cleanedData.brandName = data.brandName.trim();
					// Auto-generate brandId if not provided or empty
					if (!data.brandId || data.brandId.trim() === "") {
						cleanedData.brandId = generateUniqueId();
					} else {
						cleanedData.brandId = data.brandId.trim();
					}
				}
				if (data.weight && data.weight > 0) {
					cleanedData.weight = data.weight;
				}
				if (
					data.dimensions &&
					((data.dimensions.length || 0) > 0 ||
						(data.dimensions.width || 0) > 0 ||
						(data.dimensions.height || 0) > 0)
				) {
					cleanedData.dimensions = data.dimensions;
				}
				if (data.color && data.color.trim() !== "") {
					cleanedData.color = data.color.trim();
				}
				if (data.size && data.size.trim() !== "") {
					cleanedData.size = data.size.trim();
				}
				if (data.material && data.material.trim() !== "") {
					cleanedData.material = data.material.trim();
				}
				if (data.costPrice && data.costPrice > 0) {
					cleanedData.costPrice = data.costPrice;
				}
				if (data.sellingPrice && data.sellingPrice > 0) {
					cleanedData.sellingPrice = data.sellingPrice;
				}
				if (data.wholesalePrice && data.wholesalePrice > 0) {
					cleanedData.wholesalePrice = data.wholesalePrice;
				}
				if (data.maxStockLevel && data.maxStockLevel > 0) {
					cleanedData.maxStockLevel = data.maxStockLevel;
				}
				if (data.reorderPoint && data.reorderPoint > 0) {
					cleanedData.reorderPoint = data.reorderPoint;
				}
				if (data.reorderQuantity && data.reorderQuantity > 0) {
					cleanedData.reorderQuantity = data.reorderQuantity;
				}
				if (data.leadTimeSupply && data.leadTimeSupply > 0) {
					cleanedData.leadTimeSupply = data.leadTimeSupply;
				}
				if (data.shelfLife && data.shelfLife > 0) {
					cleanedData.shelfLife = data.shelfLife;
				}
				if (data.primaryImage && data.primaryImage.trim() !== "") {
					cleanedData.primaryImage = data.primaryImage.trim();
				}
				if (
					data.images &&
					Array.isArray(data.images) &&
					data.images.length > 0
				) {
					cleanedData.images = data.images;
				}
				if (data.metaTitle && data.metaTitle.trim() !== "") {
					cleanedData.metaTitle = data.metaTitle.trim();
				}
				if (data.metaDescription && data.metaDescription.trim() !== "") {
					cleanedData.metaDescription = data.metaDescription.trim();
				}
				if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
					cleanedData.tags = data.tags;
				}

				console.log("Form data before cleaning:", {
					categoryName: data.categoryName,
					brandName: data.brandName,
					categoryId: data.categoryId,
					brandId: data.brandId,
				});
				console.log("Saving product with cleaned data:", cleanedData);

				// Get the current session token using Supabase
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session?.access_token) {
					setError("Authentication required. Please log in again.");
					return;
				}

				const response = await fetch(url, {
					method,
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify(cleanedData),
				});

				if (response.ok) {
					console.log("Product saved successfully");
					await onSave();
					onOpenChange(false);
				} else {
					const errorText = await response.text();
					console.error("Failed to save product. Status:", response.status);
					console.error("Error response:", errorText);

					let errorMessage = "Failed to save product";
					try {
						const errorJson = JSON.parse(errorText);
						console.error("Error details:", errorJson);
						errorMessage = errorJson.error || errorMessage;
					} catch {
						console.error("Raw error text:", errorText);
					}

					setError(errorMessage);
				}
			} catch (error) {
				console.error("Network or other error saving product:", error);
				setError("Network error. Please check your connection and try again.");
			} finally {
				setLoading(false);
			}
		},
		[product, onSave, onOpenChange],
	);

	// Stable tab navigation
	const handleTabChange = useCallback((value: string) => {
		setCurrentTab(value);
	}, []);

	const goToNextTab = useCallback(() => {
		const currentIndex = TABS.indexOf(currentTab as typeof TABS[number]);
		if (currentIndex < TABS.length - 1) {
			setCurrentTab(TABS[currentIndex + 1]);
		}
	}, [currentTab]);

	const goToPreviousTab = useCallback(() => {
		const currentIndex = TABS.indexOf(currentTab as typeof TABS[number]);
		if (currentIndex > 0) {
			setCurrentTab(TABS[currentIndex - 1]);
		}
	}, [currentTab]);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				{" "}
				<DialogHeader>
					<DialogTitle>
						{product ? "Edit Product" : "Add New Product"}
					</DialogTitle>
					<DialogDescription>
						{product
							? "Update the product information"
							: "Add a new product to your inventory"}
					</DialogDescription>
				</DialogHeader>
				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
						<p className="text-sm">{error}</p>
					</div>
				)}
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						<Tabs
							value={currentTab}
							onValueChange={handleTabChange}
							className="w-full"
						>
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="basic">Basic Info</TabsTrigger>
								<TabsTrigger value="pricing">Pricing</TabsTrigger>
								<TabsTrigger value="inventory">Inventory</TabsTrigger>
								<TabsTrigger value="media">Media & SEO</TabsTrigger>
							</TabsList>
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
									/>{" "}
									<FormField
										control={form.control}
										name="sku"
										render={({ field }) => (
											<FormItem>
												<FormLabel>SKU *</FormLabel>
												<FormControl>
													<Input placeholder="Product SKU" {...field} />
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
													placeholder="Product description"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>{" "}
								<div className="grid grid-cols-2 gap-4">
									{" "}
									<FormField
										control={form.control}
										name="categoryName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Category</FormLabel>
												<CategoryCombobox
													categories={industryCategories}
													value={field.value}
													onValueChange={async (categoryName) => {
														console.log("Category selected:", categoryName);
														field.onChange(categoryName); // Set categoryName
														// Auto-generate categoryId when category is selected
														if (categoryName && categoryName.trim() !== "") {
															try {
																const newCategoryId = await generateUniqueCategoryId();
																console.log(
																	"Generated categoryId:",
																	newCategoryId,
																);
																form.setValue("categoryId", newCategoryId);
															} catch (error) {
																console.error("Error generating categoryId:", error);
																// Fallback to simple UUID if async fails
																const fallbackId = generateUniqueId();
																form.setValue("categoryId", fallbackId);
															}
														} else {
															form.setValue("categoryId", "");
														}
													}}
													placeholder={
														categoriesLoading
															? "Loading categories..."
															: "Select category..."
													}
													emptyMessage={
														industry
															? `No categories found for ${industry} industry.`
															: "No categories available. Please set your company industry first."
													}
													disabled={categoriesLoading}
												/>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="categoryId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Category ID</FormLabel>
												<FormControl>
													<Input
														placeholder="Auto-generated category ID"
														{...field}
														className="bg-gray-50 font-mono"
														readOnly
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="brandName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Brand</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter brand name"
														{...field}
														onChange={(e) => {
															console.log(
																"Brand name entered:",
																e.target.value,
															);
															field.onChange(e); // Set brandName
															// Auto-generate brandId when brand name is entered
															if (
																e.target.value &&
																e.target.value.trim() !== ""
															) {
																const newBrandId = generateUniqueId();
																console.log("Generated brandId:", newBrandId);
																form.setValue("brandId", newBrandId);
															} else {
																form.setValue("brandId", "");
															}
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="brandId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Brand ID</FormLabel>
												<FormControl>
													<Input
														placeholder="Auto-generated brand ID"
														{...field}
														className="bg-gray-50 font-mono"
														readOnly
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="grid grid-cols-3 gap-4">
									{" "}
									<FormField
										control={form.control}
										name="barcode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Barcode</FormLabel>
												<FormControl>
													<Input
														placeholder="Product barcode"
														{...field}
														readOnly
														className="bg-gray-50 font-mono text-lg"
													/>
												</FormControl>
												{field.value && field.value.trim() !== "" && (
													<div className="mt-2 p-3 bg-white border rounded">
														<Barcode
															value={field.value}
															format="CODE128"
															width={1}
															height={50}
															displayValue={true}
															fontSize={12}
														/>
													</div>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="slug"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Slug</FormLabel>
												<FormControl>
													<Input placeholder="Product URL slug" {...field} />
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
												<FormLabel>Product Status</FormLabel>
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
														<SelectItem value="DRAFT">Draft</SelectItem>
														<SelectItem value="DISCONTINUED">
															Discontinued
														</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="grid grid-cols-3 gap-4">
									{" "}
									<FormField
										control={form.control}
										name="color"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Color</FormLabel>
												<FormControl>
													<Input
														placeholder="Product color"
														{...field}
														onKeyPress={(e) => {
															if (/[0-9]/.test(e.key)) {
																e.preventDefault();
															}
														}}
													/>
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
									/>{" "}
									<FormField
										control={form.control}
										name="material"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Material</FormLabel>
												<FormControl>
													<Input
														placeholder="Product material"
														{...field}
														onKeyPress={(e) => {
															if (/[0-9]/.test(e.key)) {
																e.preventDefault();
															}
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									{" "}
									<FormField
										control={form.control}
										name="weight"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Weight (kg)</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														placeholder="Product weight"
														{...field}
														onChange={(e) =>
															field.onChange(parseFloat(e.target.value) || 0)
														}
														style={{
															WebkitAppearance: "none",
															MozAppearance: "textfield",
														}}
														className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<div className="space-y-2">
										<label className="text-sm font-medium">Dimensions</label>
										<div className="grid grid-cols-4 gap-2">
											{" "}
											<FormField
												control={form.control}
												name="dimensions.length"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input
																type="number"
																step="0.01"
																placeholder="Length"
																{...field}
																onChange={(e) =>
																	field.onChange(
																		parseFloat(e.target.value) || 0,
																	)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
															/>
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="dimensions.width"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input
																type="number"
																step="0.01"
																placeholder="Width"
																{...field}
																onChange={(e) =>
																	field.onChange(
																		parseFloat(e.target.value) || 0,
																	)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
															/>
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="dimensions.height"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input
																type="number"
																step="0.01"
																placeholder="Height"
																{...field}
																onChange={(e) =>
																	field.onChange(
																		parseFloat(e.target.value) || 0,
																	)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
															/>
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="dimensions.unit"
												render={({ field }) => (
													<FormItem>
														<Select
															onValueChange={field.onChange}
															value={field.value}
														>
															<FormControl>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="cm">cm</SelectItem>
																<SelectItem value="in">in</SelectItem>
																<SelectItem value="m">m</SelectItem>
															</SelectContent>
														</Select>
													</FormItem>
												)}
											/>
										</div>
									</div>
								</div>
							</TabsContent>
							<TabsContent value="pricing" className="space-y-4">
								<div className="grid grid-cols-3 gap-4">
									{" "}
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
														placeholder="0.00"
														{...field}
														onChange={(e) =>
															field.onChange(parseFloat(e.target.value) || 0)
														}
														style={{
															WebkitAppearance: "none",
															MozAppearance: "textfield",
														}}
														className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
														placeholder="0.00"
														{...field}
														onChange={(e) =>
															field.onChange(parseFloat(e.target.value) || 0)
														}
														style={{
															WebkitAppearance: "none",
															MozAppearance: "textfield",
														}}
														className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
														placeholder="0.00"
														{...field}
														onChange={(e) =>
															field.onChange(parseFloat(e.target.value) || 0)
														}
														style={{
															WebkitAppearance: "none",
															MozAppearance: "textfield",
														}}
														className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>{" "}
							<TabsContent value="inventory" className="space-y-4">
								<div className="grid grid-cols-2 gap-6">
									<Card>
										<CardHeader>
											<CardTitle>Stock Levels</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											{" "}
											<FormField
												control={form.control}
												name="minStockLevel"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Minimum Stock Level *</FormLabel>
														<FormControl>
															<Input
																type="number"
																{...field}
																onChange={(e) =>
																	field.onChange(parseInt(e.target.value) || 0)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
																{...field}
																onChange={(e) =>
																	field.onChange(parseInt(e.target.value) || 0)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
																{...field}
																onChange={(e) =>
																	field.onChange(parseInt(e.target.value) || 0)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="reorderQuantity"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Reorder Quantity</FormLabel>
														<FormControl>
															<Input
																type="number"
																{...field}
																onChange={(e) =>
																	field.onChange(parseInt(e.target.value) || 0)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
											<CardTitle>Supply Chain & Tracking</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											{" "}
											<FormField
												control={form.control}
												name="leadTimeSupply"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Lead Time (Days)</FormLabel>
														<FormControl>
															<Input
																type="number"
																placeholder="Days to restock"
																{...field}
																onChange={(e) =>
																	field.onChange(parseInt(e.target.value) || 0)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="shelfLife"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Shelf Life (Days)</FormLabel>
														<FormControl>
															<Input
																type="number"
																placeholder="Days before expiry"
																{...field}
																onChange={(e) =>
																	field.onChange(parseInt(e.target.value) || 0)
																}
																style={{
																	WebkitAppearance: "none",
																	MozAppearance: "textfield",
																}}
																className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
													<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
														<div className="space-y-0.5">
															<FormLabel className="text-base">
																Track Inventory
															</FormLabel>
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
													<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
														<div className="space-y-0.5">
															<FormLabel className="text-base">
																Serial Numbers
															</FormLabel>
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
								<Card>
									<CardHeader>
										<CardTitle>Product Images</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{" "}
										<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
											<Upload className="mx-auto h-12 w-12 text-gray-400" />
											<div className="mt-4">
												<Button
													type="button"
													variant="outline"
													onClick={() => {
														console.log("Upload button clicked");
														console.log(
															"Current imageUploading state:",
															imageUploading,
														);
														fileInputRef.current?.click();
													}}
													disabled={imageUploading}
												>
													{imageUploading ? "Uploading..." : "Upload Images"}
												</Button>
												{imageUploading && (
													<div className="mt-2">
														<div className="w-full bg-gray-200 rounded-full h-2">
															<div
																className="bg-blue-600 h-2 rounded-full animate-pulse"
																style={{ width: "50%" }}
															></div>
														</div>
													</div>
												)}
											</div>
											<p className="text-sm text-gray-500 mt-2">
												JPG, PNG, GIF up to 10MB
											</p>
											<input
												ref={fileInputRef}
												type="file"
												accept="image/*"
												onChange={handleImageUpload}
												className="hidden"
											/>
										</div>
										{/* Display uploaded images */}
										{form.watch("images") &&
											(form.watch("images") || []).length > 0 && (
												<div className="grid grid-cols-4 gap-4">
													{(form.watch("images") || []).map((url, index) => (
														<div key={url} className="relative group">
															{/* eslint-disable-next-line @next/next/no-img-element */}
															<img
																src={url}
																alt={`Product ${index + 1}`}
																className="w-full h-24 object-cover rounded-lg border"
															/>
															<div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
																<Button
																	type="button"
																	variant="destructive"
																	size="sm"
																	onClick={() => removeImage(index)}
																>
																	<X className="h-3 w-3" />
																</Button>
															</div>
															{form.watch("primaryImage") !== url && (
																<div className="absolute bottom-1 left-1">
																	<Button
																		type="button"
																		variant="secondary"
																		size="sm"
																		onClick={() => setPrimaryImage(url)}
																	>
																		Set Primary
																	</Button>
																</div>
															)}
															{form.watch("primaryImage") === url && (
																<div className="absolute bottom-1 left-1">
																	<Badge variant="default">Primary</Badge>
																</div>
															)}
														</div>
													))}
												</div>
											)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Product Tags</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex gap-2">
											<Input
												placeholder="Add a tag"
												value={tagInput}
												onChange={(e) => setTagInput(e.target.value)}
												onKeyPress={handleTagInputKeyPress}
											/>
											<Button type="button" onClick={addTag}>
												<Plus className="h-4 w-4" />
											</Button>
										</div>
										{form.watch("tags") &&
											(form.watch("tags") || []).length > 0 && (
												<div className="flex flex-wrap gap-2">
													{(form.watch("tags") || []).map((tag, index) => (
														<Badge
															key={index}
															variant="secondary"
															className="flex items-center gap-1"
														>
															<span>{tag}</span>
															<button
																type="button"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	removeTag(tag);
																}}
																className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
															>
																<X className="h-3 w-3" />
															</button>
														</Badge>
													))}
												</div>
											)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>SEO & Meta</CardTitle>
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
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>

						<DialogFooter className="flex justify-between">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<div className="flex gap-2">
								{currentTab !== "basic" && (
									<Button
										type="button"
										variant="outline"
										onClick={goToPreviousTab}
									>
										<ChevronLeft className="w-4 h-4 mr-2" />
										Previous
									</Button>
								)}
								{currentTab !== "media" ? (
									<Button type="button" onClick={goToNextTab}>
										Next
										<ChevronRight className="w-4 h-4 ml-2" />
									</Button>
								) : (
									<Button type="button" onClick={() => form.handleSubmit(handleSubmit)()}>
										{loading
											? "Creating..."
											: product
												? "Update Product"
												: "Create Product"}
									</Button>
								)}
							</div>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
});

// Set display name for React DevTools
ProductFormDialog.displayName = "ProductFormDialog";

export default ProductFormDialog;

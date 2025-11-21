import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { neonClient } from "@/lib/db";
import { createClient } from "@/lib/supabaseServer";

// GET /api/product-suppliers - Get product-supplier relationships
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const productId = searchParams.get("productId");
		const supplierId = searchParams.get("supplierId");

		let productSuppliers: unknown;

		if (productId) {
			// Get all suppliers for a specific product
			productSuppliers = await neonClient.productSupplier.findMany({
				where: { productId },
				include: {
					supplier: {
						select: {
							id: true,
							name: true,
							code: true,
							email: true,
							phone: true,
							status: true,
						},
					},
					product: {
						select: {
							id: true,
							name: true,
							sku: true,
						},
					},
				},
				orderBy: [{ isPreferred: "desc" }, { unitCost: "asc" }],
			});
		} else if (supplierId) {
			// Get all products for a specific supplier
			productSuppliers = await neonClient.productSupplier.findMany({
				where: { supplierId },
				include: {
					product: {
						select: {
							id: true,
							name: true,
							sku: true,
							costPrice: true,
							sellingPrice: true,
							status: true,
						},
					},
					supplier: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
		} else {
			// Get all product-supplier relationships
			productSuppliers = await neonClient.productSupplier.findMany({
				include: {
					product: {
						select: {
							id: true,
							name: true,
							sku: true,
						},
					},
					supplier: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: 100,
			});
		}

		return NextResponse.json({ productSuppliers });
	} catch (error) {
		console.error("Error fetching product-supplier relationships:", error);
		return NextResponse.json(
			{ error: "Failed to fetch product-supplier relationships" },
			{ status: 500 }
		);
	}
}

// POST /api/product-suppliers - Create product-supplier relationship
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const {
			productId,
			supplierId,
			supplierSku,
			supplierName,
			unitCost,
			currency = "USD",
			minOrderQty,
			maxOrderQty,
			leadTimeDays,
			isPreferred = false,
			isActive = true,
		} = body;

		// Validate required fields
		if (!productId || !supplierId || !unitCost) {
			return NextResponse.json(
				{ error: "Product ID, Supplier ID, and Unit Cost are required" },
				{ status: 400 }
			);
		}

		// Check if relationship already exists
		const existing = await neonClient.productSupplier.findUnique({
			where: {
				productId_supplierId: {
					productId,
					supplierId,
				},
			},
		});

		if (existing) {
			return NextResponse.json(
				{ error: "This product-supplier relationship already exists" },
				{ status: 409 }
			);
		}

		// If this is marked as preferred, unmark other preferred suppliers for this product
		if (isPreferred) {
			await neonClient.productSupplier.updateMany({
				where: { productId },
				data: { isPreferred: false },
			});
		}

		// Create product-supplier relationship
		const productSupplier = await neonClient.productSupplier.create({
			data: {
				productId,
				supplierId,
				supplierSku,
				supplierName,
				unitCost,
				currency,
				minOrderQty,
				maxOrderQty,
				leadTimeDays,
				isPreferred,
				isActive,
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						sku: true,
					},
				},
				supplier: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		return NextResponse.json({ productSupplier }, { status: 201 });
	} catch (error) {
		console.error("Error creating product-supplier relationship:", error);
		return NextResponse.json(
			{ error: "Failed to create product-supplier relationship" },
			{ status: 500 }
		);
	}
}

// PUT /api/product-suppliers - Update product-supplier relationship
export async function PUT(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const {
			id,
			supplierSku,
			supplierName,
			unitCost,
			currency,
			minOrderQty,
			maxOrderQty,
			leadTimeDays,
			isPreferred,
			isActive,
		} = body;

		if (!id) {
			return NextResponse.json(
				{ error: "Product-Supplier ID is required" },
				{ status: 400 }
			);
		}

		// If marking as preferred, unmark others for this product
		if (isPreferred) {
			const relationship = await neonClient.productSupplier.findUnique({
				where: { id },
			});

			if (relationship) {
				await neonClient.productSupplier.updateMany({
					where: {
						productId: relationship.productId,
						id: { not: id },
					},
					data: { isPreferred: false },
				});
			}
		}

		// Update the relationship
		const productSupplier = await neonClient.productSupplier.update({
			where: { id },
			data: {
				supplierSku,
				supplierName,
				unitCost,
				currency,
				minOrderQty,
				maxOrderQty,
				leadTimeDays,
				isPreferred,
				isActive,
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						sku: true,
					},
				},
				supplier: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		return NextResponse.json({ productSupplier });
	} catch (error) {
		console.error("Error updating product-supplier relationship:", error);
		return NextResponse.json(
			{ error: "Failed to update product-supplier relationship" },
			{ status: 500 }
		);
	}
}

// DELETE /api/product-suppliers - Delete product-supplier relationship
export async function DELETE(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Product-Supplier ID is required" },
				{ status: 400 }
			);
		}

		await neonClient.productSupplier.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting product-supplier relationship:", error);
		return NextResponse.json(
			{ error: "Failed to delete product-supplier relationship" },
			{ status: 500 }
		);
	}
}

import { NextRequest, NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/actions/products";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const search = searchParams.get("search") || undefined;
		const page = searchParams.get("page")
			? parseInt(searchParams.get("page")!)
			: 1;
		const limit = searchParams.get("limit")
			? parseInt(searchParams.get("limit")!)
			: 50;

		const result = await getProducts({
			page,
			limit,
			search,
			sortBy: "name",
			sortOrder: "asc",
		});
		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		// result.data contains { products, pagination }
		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Error fetching products:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Get current user session from Supabase
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();
		if (sessionError || !session?.user?.id) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get user's company ID
		const { data: userData } = await supabase
			.from("users")
			.select("companyId")
			.eq("id", session.user.id)
			.single();

		if (!userData?.companyId) {
			return NextResponse.json(
				{ error: "User not associated with a company" },
				{ status: 400 },
			);
		}

		const body = await request.json();
		// Map the form data to the expected format for createProduct
		const productData = {
			companyId: userData.companyId,
			name: body.name,
			description: body.description || undefined,
			sku: body.sku,
			barcode: body.barcode || undefined,
			slug: body.slug || undefined,
			categoryId: body.categoryId || undefined,
			brandId: body.brandId || undefined,
			weight: body.weight ? parseFloat(body.weight.toString()) : undefined,
			dimensions: body.dimensions || undefined,
			color: body.color || undefined,
			size: body.size || undefined,
			material: body.material || undefined,
			costPrice: body.costPrice
				? parseFloat(body.costPrice.toString())
				: undefined,
			sellingPrice: body.sellingPrice
				? parseFloat(body.sellingPrice.toString())
				: undefined,
			wholesalePrice: body.wholesalePrice
				? parseFloat(body.wholesalePrice.toString())
				: undefined,
			minStockLevel: body.minStockLevel || 0,
			maxStockLevel: body.maxStockLevel || undefined,
			reorderPoint: body.reorderPoint || undefined,
			reorderQuantity: body.reorderQuantity || undefined,
			status: body.status || "ACTIVE",
			isTrackable: body.isTrackable !== undefined ? body.isTrackable : true,
			isSerialized: body.isSerialized !== undefined ? body.isSerialized : false,
			images: body.images || undefined,
			primaryImage: body.primaryImage || undefined,
			metaTitle: body.metaTitle || undefined,
			metaDescription: body.metaDescription || undefined,
			tags: body.tags || undefined,
			leadTimeSupply: body.leadTimeSupply || undefined,
			shelfLife: body.shelfLife || undefined,
			createdBy: session.user.id,
		};

		const result = await createProduct(productData);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data, { status: 201 });
	} catch (error) {
		console.error("Error creating product:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

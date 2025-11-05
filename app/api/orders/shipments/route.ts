import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateShipmentSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
	trackingNumber: z.string().min(1, "Tracking number is required"),
	carrier: z.enum(["UPS", "FEDEX", "USPS", "DHL", "OTHER"]),
	shippingMethod: z.enum(["STANDARD", "EXPRESS", "OVERNIGHT", "TWO_DAY"]),
	estimatedDelivery: z.string().min(1, "Estimated delivery date is required"),
	notes: z.string().optional(),
	items: z.array(z.object({
		orderItemId: z.string().min(1, "Order item ID is required"),
		quantity: z.number().min(1, "Quantity must be at least 1"),
	})).min(1, "At least one item is required"),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = CreateShipmentSchema.parse(body);

		// For now, simulate shipment creation
		// In a real implementation, this would integrate with shipping providers
		const shipment = {
			id: `shipment_${Date.now()}`,
			...validatedData,
			status: "PENDING",
			createdAt: new Date().toISOString(),
		};

		return NextResponse.json({
			message: "Shipment created successfully",
			shipment,
		});

	} catch (error) {
		console.error("Error creating shipment:", error);
		
		if (error instanceof z.ZodError) {
			return NextResponse.json({
				error: "Validation failed",
				details: error.errors,
			}, { status: 400 });
		}

		if (error instanceof Error) {
			return NextResponse.json({
				error: error.message,
			}, { status: 400 });
		}

		return NextResponse.json({
			error: "Internal server error",
		}, { status: 500 });
	}
}

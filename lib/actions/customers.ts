import { neonClient } from "@/lib/prisma";

export interface CustomerFilters {
	companyId: string;
	searchTerm?: string;
	limit?: number;
	offset?: number;
}

// Get all customers with filters
export async function getCustomers(filters: CustomerFilters) {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {
			companyId: filters.companyId,
		};

		if (filters.searchTerm) {
			where.OR = [
				{ firstName: { contains: filters.searchTerm, mode: "insensitive" } },
				{ lastName: { contains: filters.searchTerm, mode: "insensitive" } },
				{ businessName: { contains: filters.searchTerm, mode: "insensitive" } },
				{ email: { contains: filters.searchTerm, mode: "insensitive" } },
			];
		}

		const customers = await neonClient.customer.findMany({
			where,
			orderBy: [
				{ businessName: "asc" },
				{ firstName: "asc" },
				{ lastName: "asc" },
			],
			take: filters.limit,
			skip: filters.offset,
		});

		return { success: true, data: customers };
	} catch {
		// Error handled silently in production
		return { success: false, error: "Failed to fetch customers" };
	}
}

// Get customer by ID
export async function getCustomerById(customerId: string) {
	try {
		const customer = await neonClient.customer.findUnique({
			where: { id: customerId },
		});

		if (!customer) {
			return { success: false, error: "Customer not found" };
		}

		return { success: true, data: customer };
	} catch {
		// Error handled silently in production
		return { success: false, error: "Failed to fetch customer" };
	}
}

export interface CreateCustomerInput {
	companyId: string;
	type?: "INDIVIDUAL" | "BUSINESS";
	firstName?: string;
	lastName?: string;
	businessName?: string;
	email?: string;
	phone?: string;
	billingAddress1?: string;
	billingAddress2?: string;
	billingCity?: string;
	billingState?: string;
	billingPostalCode?: string;
	billingCountry?: string;
	createdById: string;
}

// Create a new customer
export async function createCustomer(input: CreateCustomerInput) {
	try {
		// Generate customer number
		const lastCustomer = await neonClient.customer.findFirst({
			where: { companyId: input.companyId },
			orderBy: { customerNumber: "desc" },
		});

		let customerNumber = "CUST-0001";
		if (lastCustomer?.customerNumber) {
			const lastNumber = parseInt(
				lastCustomer.customerNumber.replace("CUST-", ""),
			);
			customerNumber = `CUST-${String(lastNumber + 1).padStart(4, "0")}`;
		}

		// Validate required fields based on type
		if (
			input.type === "INDIVIDUAL" &&
			(!input.firstName || !input.lastName)
		) {
			return {
				success: false,
				error: "First name and last name are required for individual customers",
			};
		}

		if (input.type === "BUSINESS" && !input.businessName) {
			return {
				success: false,
				error: "Business name is required for business customers",
			};
		}

		// Note: Customer does NOT have mobile, taxId, companyName (use businessName),
		// shippingAddress, creditLimit, paymentTerms, currency, notes, createdBy (use createdById)
		const customer = await neonClient.customer.create({
			data: {
				companyId: input.companyId,
				customerNumber,
				type: input.type || "INDIVIDUAL",
				firstName: input.firstName,
				lastName: input.lastName,
				businessName: input.businessName,
				email: input.email,
				phone: input.phone,
				billingAddress1: input.billingAddress1,
				billingAddress2: input.billingAddress2,
				billingCity: input.billingCity,
				billingState: input.billingState,
				billingPostalCode: input.billingPostalCode,
				billingCountry: input.billingCountry,
				status: "ACTIVE",
				createdById: input.createdById,
			},
		});

		return { success: true, data: customer };
	} catch (error) {
		console.error("Error creating customer:", error);
		return { success: false, error: "Failed to create customer" };
	}
}

import { neonClient } from "@/lib/db";

export interface CustomerFilters {
	searchTerm?: string;
	limit?: number;
	offset?: number;
}

// Get all customers with filters
export async function getCustomers(filters: CustomerFilters = {}) {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {};

		if (filters.searchTerm) {
			where.OR = [
				{ firstName: { contains: filters.searchTerm, mode: "insensitive" } },
				{ lastName: { contains: filters.searchTerm, mode: "insensitive" } },
				{ companyName: { contains: filters.searchTerm, mode: "insensitive" } },
				{ email: { contains: filters.searchTerm, mode: "insensitive" } },
			];
		}

		const customers = await neonClient.customer.findMany({
			where,
			orderBy: [
				{ companyName: "asc" },
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
	type?: "INDIVIDUAL" | "BUSINESS" | "RESELLER" | "DISTRIBUTOR";
	firstName?: string;
	lastName?: string;
	companyName?: string;
	taxId?: string;
	email?: string;
	phone?: string;
	mobile?: string;
	billingAddress?: {
		street?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		country?: string;
	};
	shippingAddress?: {
		street?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		country?: string;
	};
	creditLimit?: number;
	paymentTerms?: string;
	currency?: string;
	notes?: string;
	createdBy: string;
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

		if (input.type === "BUSINESS" && !input.companyName) {
			return {
				success: false,
				error: "Company name is required for business customers",
			};
		}

		const customer = await neonClient.customer.create({
			data: {
				companyId: input.companyId,
				customerNumber,
				type: input.type || "INDIVIDUAL",
				firstName: input.firstName,
				lastName: input.lastName,
				companyName: input.companyName,
				taxId: input.taxId,
				email: input.email,
				phone: input.phone,
				mobile: input.mobile,
				billingAddress: input.billingAddress || {},
				shippingAddress: input.shippingAddress || {},
				creditLimit: input.creditLimit,
				paymentTerms: input.paymentTerms,
				currency: input.currency || "USD",
				notes: input.notes,
				status: "ACTIVE",
				createdBy: input.createdBy,
			},
		});

		return { success: true, data: customer };
	} catch (error) {
		console.error("Error creating customer:", error);
		return { success: false, error: "Failed to create customer" };
	}
}

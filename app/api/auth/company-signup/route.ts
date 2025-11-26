import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/prisma/generated/supabase";

const prisma = new PrismaClient();

// Helper function to generate URL-friendly slug
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '') // Remove special characters
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/-+/g, '-') // Replace multiple hyphens with single
		.substring(0, 50); // Limit length
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const {
			// User data
			userId,
			firstName,
			lastName,
			email,
			phone,
			jobTitle,
			timezone,
			language,

			// Company data
			companyName,
			companyDisplayName,
			companyDescription,
			companyWebsite,
			industry,
			businessType,
			companyEmail,
			companyPhone,
			address,
			registrationNumber,
			taxId,
		} = body;

		// Generate a unique slug for the company
		let slug = generateSlug(companyName);
		let slugExists = await prisma.company.findUnique({ where: { slug } });
		let counter = 1;
		while (slugExists) {
			slug = `${generateSlug(companyName)}-${counter}`;
			slugExists = await prisma.company.findUnique({ where: { slug } });
			counter++;
		}

		// Start a transaction to ensure data consistency
		const result = await prisma.$transaction(async (tx) => {
			// 1. Create or update user record
			// Note: User does NOT have timezone, language, theme, isVerified fields
			// Preferences are stored in separate UserPreference model
			const user = await tx.user.upsert({
				where: { id: userId },
				update: {
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					displayName: `${firstName.trim()} ${lastName.trim()}`,
					phone: phone?.trim() || null,
					isActive: true,
					updatedAt: new Date(),
				},
				create: {
					id: userId,
					email: email,
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					displayName: `${firstName.trim()} ${lastName.trim()}`,
					phone: phone?.trim() || null,
					isActive: true,
					emailVerified: false,
				},
			});

			// Create user preferences with timezone and language
			await tx.userPreference.upsert({
				where: { userId: user.id },
				update: {
					timezone: timezone || "UTC",
					language: language || "en",
				},
				create: {
					userId: user.id,
					timezone: timezone || "UTC",
					language: language || "en",
					theme: "light",
				},
			});

			// 2. Create company record
			// Note: Company does NOT have size, vatNumber, subscriptionPlan, subscriptionStatus, 
			// setupComplete, onboardingStep - it uses plan, planStatus, and slug
			const company = await tx.company.create({
				data: {
					name: companyName.trim(),
					slug: slug,
					displayName: companyDisplayName?.trim() || companyName.trim(),
					description: companyDescription?.trim() || null,
					website: companyWebsite?.trim() || null,
					industry: industry || null,
					email: companyEmail.trim(),
					phone: companyPhone?.trim() || null,
					// Address is now structured fields, not JSON
					address1: address?.line1 || address?.address1 || null,
					address2: address?.line2 || address?.address2 || null,
					city: address?.city || null,
					state: address?.state || null,
					postalCode: address?.postalCode || address?.zipCode || null,
					country: address?.country || "US",
					registrationNumber: registrationNumber?.trim() || null,
					taxId: taxId?.trim() || null,
					businessType: businessType || null,
					plan: "FREE",
					planStatus: "TRIAL",
					isActive: true,
					createdById: userId,
				},
			});

			// 3. Create company-user relationship (owner role)
			// Note: Model is CompanyMember, not CompanyUser
			const companyMember = await tx.companyMember.create({
				data: {
					companyId: company.id,
					userId: userId,
					role: "OWNER",
					title: jobTitle?.trim() || null,
					isActive: true,
					isOwner: true,
					canInvite: true,
				},
			});

			return { user, company, companyMember };
		});

		return NextResponse.json({
			success: true,
			data: result,
			message: "Company registration successful!",
		});
	} catch (error) {
		console.error("Company signup error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to create company",
			},
			{ status: 500 },
		);
	} finally {
		await prisma.$disconnect();
	}
}

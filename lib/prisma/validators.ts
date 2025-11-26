// ============================================================================
// CROSS-DATABASE VALIDATORS
// ============================================================================
// Purpose: Validate references between Supabase and Neon databases
// Layer 1: Real-time prevention - check before creating records
// ============================================================================

import { supabaseClient } from "./supabase";

/**
 * Custom error for cross-database validation failures
 */
export class CrossDatabaseError extends Error {
    constructor(
        public readonly type: "COMPANY_NOT_FOUND" | "USER_NOT_FOUND" | "VALIDATION_FAILED",
        public readonly entityId: string,
        message: string
    ) {
        super(message);
        this.name = "CrossDatabaseError";
    }
}

/**
 * Validate that a company exists in Supabase before creating Neon records
 * @param companyId - The company ID to validate
 * @throws CrossDatabaseError if company doesn't exist
 * @returns The company record if found
 */
export async function validateCompanyExists(companyId: string) {
    const company = await supabaseClient.company.findUnique({
        where: { id: companyId },
        select: {
            id: true,
            name: true,
            isActive: true,
            isSuspended: true,
        },
    });

    if (!company) {
        throw new CrossDatabaseError(
            "COMPANY_NOT_FOUND",
            companyId,
            `Company with ID "${companyId}" does not exist in Supabase database. ` +
            `Please ensure the company is created before adding business data.`
        );
    }

    if (!company.isActive) {
        throw new CrossDatabaseError(
            "VALIDATION_FAILED",
            companyId,
            `Company "${company.name}" is not active. Cannot create records for inactive companies.`
        );
    }

    if (company.isSuspended) {
        throw new CrossDatabaseError(
            "VALIDATION_FAILED",
            companyId,
            `Company "${company.name}" is suspended. Cannot create records for suspended companies.`
        );
    }

    return company;
}

/**
 * Validate that a user exists in Supabase before using as createdById
 * @param userId - The user ID to validate
 * @throws CrossDatabaseError if user doesn't exist
 * @returns The user record if found
 */
export async function validateUserExists(userId: string) {
    const user = await supabaseClient.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            isActive: true,
            isSuspended: true,
        },
    });

    if (!user) {
        throw new CrossDatabaseError(
            "USER_NOT_FOUND",
            userId,
            `User with ID "${userId}" does not exist in Supabase database. ` +
            `Please ensure the user is authenticated before creating records.`
        );
    }

    if (!user.isActive) {
        throw new CrossDatabaseError(
            "VALIDATION_FAILED",
            userId,
            `User "${user.email}" is not active. Cannot create records for inactive users.`
        );
    }

    if (user.isSuspended) {
        throw new CrossDatabaseError(
            "VALIDATION_FAILED",
            userId,
            `User "${user.email}" is suspended. Cannot create records for suspended users.`
        );
    }

    return user;
}

/**
 * Validate both company and user exist before creating Neon records
 * This is the most common validation pattern for business data
 * @param companyId - The company ID to validate
 * @param userId - The user ID to validate (createdById)
 * @throws CrossDatabaseError if either doesn't exist
 * @returns Object with both company and user records
 */
export async function validateCompanyAndUser(
    companyId: string,
    userId: string
) {
    // Run validations in parallel for performance
    const [company, user] = await Promise.all([
        validateCompanyExists(companyId),
        validateUserExists(userId),
    ]);

    // Optionally: verify user belongs to company
    const membership = await supabaseClient.companyMember.findUnique({
        where: {
            companyId_userId: {
                companyId,
                userId,
            },
        },
        select: {
            isActive: true,
            role: true,
        },
    });

    if (!membership) {
        throw new CrossDatabaseError(
            "VALIDATION_FAILED",
            userId,
            `User "${user.email}" is not a member of company "${company.name}". ` +
            `Users can only create records for companies they belong to.`
        );
    }

    if (!membership.isActive) {
        throw new CrossDatabaseError(
            "VALIDATION_FAILED",
            userId,
            `User "${user.email}" membership in company "${company.name}" is not active.`
        );
    }

    return { company, user, membership };
}

/**
 * Helper to check if a validation error is a CrossDatabaseError
 */
export function isCrossDatabaseError(error: unknown): error is CrossDatabaseError {
    return error instanceof CrossDatabaseError;
}

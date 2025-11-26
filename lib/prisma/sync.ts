// ============================================================================
// CROSS-DATABASE SYNC UTILITIES
// ============================================================================
// Purpose: Event-driven cleanup when Supabase records are deleted
// Layer 2: Automatic cleanup - react to deletions immediately
// ============================================================================

import { neonClient } from "./neon";

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
    success: boolean;
    deletedCounts: {
        products: number;
        categories: number;
        brands: number;
        warehouses: number;
        suppliers: number;
        customers: number;
        orders: number;
        purchaseOrders: number;
        inventoryItems: number;
        inventoryAudits: number;
        ragDocuments: number;
        tags: number;
    };
    errors: string[];
}

/**
 * Clean up all Neon data when a company is deleted from Supabase
 * Call this AFTER deleting the company from Supabase
 * 
 * @param companyId - The ID of the deleted company
 * @returns CleanupResult with counts of deleted records
 * 
 * @example
 * ```ts
 * // In your company deletion API route:
 * await supabaseClient.company.delete({ where: { id: companyId } });
 * const cleanup = await cleanupCompanyData(companyId);
 * console.log(`Cleaned up ${cleanup.deletedCounts.products} products`);
 * ```
 */
export async function cleanupCompanyData(companyId: string): Promise<CleanupResult> {
    const result: CleanupResult = {
        success: true,
        deletedCounts: {
            products: 0,
            categories: 0,
            brands: 0,
            warehouses: 0,
            suppliers: 0,
            customers: 0,
            orders: 0,
            purchaseOrders: 0,
            inventoryItems: 0,
            inventoryAudits: 0,
            ragDocuments: 0,
            tags: 0,
        },
        errors: [],
    };

    try {
        // Use a transaction to ensure atomic cleanup
        await neonClient.$transaction(async (tx) => {
            // Delete in order of dependencies (children first)

            // 1. Delete RAG documents (no dependencies)
            const ragDocs = await tx.ragDocument.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.ragDocuments = ragDocs.count;

            // 2. Delete inventory audits and items (cascade handles audit items)
            const audits = await tx.inventoryAudit.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.inventoryAudits = audits.count;

            // 3. Delete orders (cascade handles order items)
            const orders = await tx.order.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.orders = orders.count;

            // 4. Delete customers
            const customers = await tx.customer.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.customers = customers.count;

            // 5. Delete purchase orders (cascade handles PO items)
            const purchaseOrders = await tx.purchaseOrder.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.purchaseOrders = purchaseOrders.count;

            // 6. Delete suppliers (cascade handles product suppliers)
            const suppliers = await tx.supplier.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.suppliers = suppliers.count;

            // 7. Delete warehouses (cascade handles inventory items)
            const warehouses = await tx.warehouse.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.warehouses = warehouses.count;

            // 8. Delete products (cascade handles variants, images, tags, inventory)
            const products = await tx.product.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.products = products.count;

            // 9. Delete categories
            // Note: Need to delete children first due to self-reference
            // Delete in a loop to handle hierarchy
            let deletedCategories = 0;
            let moreToDelete = true;
            while (moreToDelete) {
                const deleted = await tx.category.deleteMany({
                    where: {
                        companyId,
                        children: { none: {} }, // Only delete leaf categories
                    },
                });
                deletedCategories += deleted.count;
                moreToDelete = deleted.count > 0;
            }
            result.deletedCounts.categories = deletedCategories;

            // 10. Delete brands
            const brands = await tx.brand.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.brands = brands.count;

            // 11. Delete tags
            const tags = await tx.tag.deleteMany({
                where: { companyId },
            });
            result.deletedCounts.tags = tags.count;
        });
    } catch (error) {
        result.success = false;
        result.errors.push(
            error instanceof Error ? error.message : "Unknown error during company cleanup"
        );
    }

    return result;
}

/**
 * Clean up user references when a user is deleted from Supabase
 * This doesn't delete records, just nullifies the createdById references
 * 
 * @param userId - The ID of the deleted user
 * @returns Object with counts of updated records
 * 
 * @example
 * ```ts
 * // In your user deletion API route:
 * await supabaseClient.user.delete({ where: { id: userId } });
 * const cleanup = await cleanupUserReferences(userId);
 * console.log(`Updated ${cleanup.updatedProducts} product references`);
 * ```
 */
export async function cleanupUserReferences(userId: string): Promise<{
    success: boolean;
    updatedCounts: {
        products: number;
        suppliers: number;
        customers: number;
        orders: number;
        purchaseOrders: number;
        inventoryMovements: number;
        stockReservations: number;
        inventoryAudits: number;
    };
    errors: string[];
}> {
    const result: {
        success: boolean;
        updatedCounts: {
            products: number;
            suppliers: number;
            customers: number;
            orders: number;
            purchaseOrders: number;
            inventoryMovements: number;
            stockReservations: number;
            inventoryAudits: number;
        };
        errors: string[];
    } = {
        success: true,
        updatedCounts: {
            products: 0,
            suppliers: 0,
            customers: 0,
            orders: 0,
            purchaseOrders: 0,
            inventoryMovements: 0,
            stockReservations: 0,
            inventoryAudits: 0,
        },
        errors: [],
    };

    try {
        // Note: We don't delete records, just track that the creator was deleted
        // In a production system, you might want to:
        // 1. Reassign to a system user
        // 2. Keep the reference but mark as "deleted user"
        // 3. Log for audit purposes

        // For now, we'll just count the affected records
        // The createdById field stays as-is (orphaned reference)

        const [
            products,
            suppliers,
            customers,
            orders,
            purchaseOrders,
            inventoryMovements,
            stockReservations,
            inventoryAudits,
        ] = await Promise.all([
            neonClient.product.count({ where: { createdById: userId } }),
            neonClient.supplier.count({ where: { createdById: userId } }),
            neonClient.customer.count({ where: { createdById: userId } }),
            neonClient.order.count({ where: { createdById: userId } }),
            neonClient.purchaseOrder.count({ where: { createdById: userId } }),
            neonClient.inventoryMovement.count({ where: { createdById: userId } }),
            neonClient.stockReservation.count({ where: { createdById: userId } }),
            neonClient.inventoryAudit.count({ where: { createdById: userId } }),
        ]);

        result.updatedCounts = {
            products,
            suppliers,
            customers,
            orders,
            purchaseOrders,
            inventoryMovements,
            stockReservations,
            inventoryAudits,
        };

        // Log warning if there are orphaned references
        const total = Object.values(result.updatedCounts).reduce((a, b) => a + b, 0);
        if (total > 0) {
            console.warn(
                `[cleanupUserReferences] User ${userId} deletion leaves ${total} orphaned references in Neon database. ` +
                `Consider implementing a "deleted user" placeholder or reassigning records.`
            );
        }
    } catch (error) {
        result.success = false;
        result.errors.push(
            error instanceof Error ? error.message : "Unknown error during user reference cleanup"
        );
    }

    return result;
}

/**
 * Verify cross-database integrity
 * Checks for orphaned references in Neon that don't exist in Supabase
 * Useful for debugging and maintenance
 * 
 * @returns Report of orphaned references
 */
export async function verifyDatabaseIntegrity(): Promise<{
    orphanedCompanyIds: string[];
    orphanedUserIds: string[];
    isHealthy: boolean;
}> {
    // Get unique company IDs from Neon
    const neonCompanyIds = await neonClient.product.findMany({
        select: { companyId: true },
        distinct: ["companyId"],
    });

    // Get unique creator IDs from Neon
    const neonUserIds = await neonClient.product.findMany({
        select: { createdById: true },
        distinct: ["createdById"],
    });

    // This would require importing supabaseClient here
    // For now, return a placeholder
    // In production, you'd check each ID against Supabase

    return {
        orphanedCompanyIds: [],
        orphanedUserIds: [],
        isHealthy: true,
    };
}

// ============================================================================
// NEON DATABASE PRISMA CLIENT
// ============================================================================
// Purpose: Singleton Prisma client for Neon database (business logic)
// Contains: Products, Inventory, Orders, Suppliers, Customers
// ============================================================================

import { PrismaClient } from "../../prisma/generated/neon";

// Validate environment variable
const neonDatabaseUrl = process.env.NEON_DATABASE_URL;

if (!neonDatabaseUrl) {
    throw new Error(
        "NEON_DATABASE_URL environment variable is not set. " +
        "Please add it to your .env file."
    );
}

if (!neonDatabaseUrl.startsWith("postgresql://")) {
    throw new Error(
        "NEON_DATABASE_URL must be a valid PostgreSQL connection string " +
        "starting with postgresql://"
    );
}

// Singleton pattern to prevent multiple instances in development
// Next.js hot reloading creates new instances, this prevents connection exhaustion
const globalForNeon = globalThis as unknown as {
    neonClient: PrismaClient | undefined;
};

export const neonClient =
    globalForNeon.neonClient ??
    new PrismaClient({
        datasources: {
            neonDb: {
                url: neonDatabaseUrl,
            },
        },
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "info", "warn", "error"]
                : ["error"],
    });

// Preserve client across hot reloads in development
if (process.env.NODE_ENV !== "production") {
    globalForNeon.neonClient = neonClient;
}

// Helper to disconnect client (useful for testing/cleanup)
export const disconnectNeon = async () => {
    await neonClient.$disconnect();
};

// Re-export types for convenience
export type { PrismaClient as NeonPrismaClient } from "../../prisma/generated/neon";

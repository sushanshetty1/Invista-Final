// ============================================================================
// SUPABASE DATABASE PRISMA CLIENT
// ============================================================================
// Purpose: Singleton Prisma client for Supabase database (auth/company)
// Contains: Users, Companies, Sessions, Invitations, Preferences
// ============================================================================

import { PrismaClient } from "../../prisma/generated/supabase";

// Validate environment variable
const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!supabaseDatabaseUrl) {
    throw new Error(
        "SUPABASE_DATABASE_URL environment variable is not set. " +
        "Please add it to your .env file."
    );
}

if (!supabaseDatabaseUrl.startsWith("postgresql://")) {
    throw new Error(
        "SUPABASE_DATABASE_URL must be a valid PostgreSQL connection string " +
        "starting with postgresql://"
    );
}

// Singleton pattern to prevent multiple instances in development
// Next.js hot reloading creates new instances, this prevents connection exhaustion
const globalForSupabase = globalThis as unknown as {
    supabaseClient: PrismaClient | undefined;
};

export const supabaseClient =
    globalForSupabase.supabaseClient ??
    new PrismaClient({
        datasources: {
            supabaseDb: {
                url: supabaseDatabaseUrl,
            },
        },
        // Suppress warnings, only log errors for auth database
        log: ["error"],
    });

// Preserve client across hot reloads in development
if (process.env.NODE_ENV !== "production") {
    globalForSupabase.supabaseClient = supabaseClient;
}

// Helper to disconnect client (useful for testing/cleanup)
export const disconnectSupabase = async () => {
    await supabaseClient.$disconnect();
};

// Re-export types for convenience
export type { PrismaClient as SupabasePrismaClient } from "../../prisma/generated/supabase";

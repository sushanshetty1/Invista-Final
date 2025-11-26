// ============================================================================
// PRISMA CLIENTS - COMBINED EXPORT
// ============================================================================
// Purpose: Re-export both database clients for easy imports
// Usage: import { neonClient, supabaseClient } from '@/lib/prisma'
// ============================================================================

// Export Neon client (business logic database)
export { neonClient, disconnectNeon } from "./neon";
export type { NeonPrismaClient } from "./neon";

// Export Supabase client (auth database)
export { supabaseClient, disconnectSupabase } from "./supabase";
export type { SupabasePrismaClient } from "./supabase";

// Export validators for cross-database operations
export {
    validateCompanyExists,
    validateUserExists,
    validateCompanyAndUser,
    CrossDatabaseError,
} from "./validators";

// Export sync utilities for cross-database cleanup
export {
    cleanupCompanyData,
    cleanupUserReferences,
    type CleanupResult,
} from "./sync";

// Helper to disconnect all clients
export const disconnectAll = async () => {
    const { disconnectNeon } = await import("./neon");
    const { disconnectSupabase } = await import("./supabase");
    await Promise.all([disconnectNeon(), disconnectSupabase()]);
};

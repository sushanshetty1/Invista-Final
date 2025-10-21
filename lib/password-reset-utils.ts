/**
 * Password Reset Utility Functions
 * Handles logging and tracking of password reset operations
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Log a password reset request to the database
 */
export async function logPasswordResetRequest(params: {
    userId: string;
    token: string;
    ipAddress?: string;
    userAgent?: string;
}) {
    try {
        const { data, error } = await supabase.from("password_resets").insert({
            userId: params.userId,
            token: params.token,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
            isUsed: false,
            ipAddress: params.ipAddress || null,
            userAgent: params.userAgent || null,
        });

        if (error) {
            console.error("❌ Error logging password reset:", error);
            return { success: false, error };
        }

        console.log("✅ Password reset request logged successfully");
        return { success: true, data };
    } catch (error) {
        console.error("❌ Exception logging password reset:", error);
        return { success: false, error };
    }
}

/**
 * Mark a password reset as used
 */
export async function markPasswordResetAsUsed(params: {
    userId: string;
    token?: string;
}) {
    try {
        const updateQuery = supabase
            .from("password_resets")
            .update({
                isUsed: true,
                usedAt: new Date().toISOString(),
            })
            .eq("userId", params.userId)
            .eq("isUsed", false)
            .order("createdAt", { ascending: false })
            .limit(1);

        // If token provided, also match on token
        if (params.token) {
            updateQuery.eq("token", params.token);
        }

        const { data, error } = await updateQuery;

        if (error) {
            console.error("❌ Error marking password reset as used:", error);
            return { success: false, error };
        }

        console.log("✅ Password reset marked as used successfully");
        return { success: true, data };
    } catch (error) {
        console.error("❌ Exception marking password reset as used:", error);
        return { success: false, error };
    }
}

/**
 * Get user's password reset history
 */
export async function getPasswordResetHistory(userId: string) {
    try {
        const { data, error } = await supabase
            .from("password_resets")
            .select("*")
            .eq("userId", userId)
            .order("createdAt", { ascending: false });

        if (error) {
            console.error("❌ Error fetching password reset history:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("❌ Exception fetching password reset history:", error);
        return { success: false, error };
    }
}

/**
 * Clean up expired password reset tokens
 */
export async function cleanupExpiredPasswordResets() {
    try {
        const { data, error } = await supabase
            .from("password_resets")
            .delete()
            .lt("expiresAt", new Date().toISOString())
            .eq("isUsed", false);

        if (error) {
            console.error("❌ Error cleaning up expired resets:", error);
            return { success: false, error };
        }

        console.log("✅ Expired password resets cleaned up successfully");
        return { success: true, data };
    } catch (error) {
        console.error("❌ Exception cleaning up expired resets:", error);
        return { success: false, error };
    }
}

/**
 * Check if user has recent password reset attempts (rate limiting)
 */
export async function checkRecentPasswordResets(
    userId: string,
    timeWindowMinutes = 5,
): Promise<{ hasRecent: boolean; count: number }> {
    try {
        const cutoffTime = new Date(
            Date.now() - timeWindowMinutes * 60 * 1000,
        ).toISOString();

        const { data, error } = await supabase
            .from("password_resets")
            .select("id")
            .eq("userId", userId)
            .gte("createdAt", cutoffTime);

        if (error) {
            console.error("❌ Error checking recent resets:", error);
            return { hasRecent: false, count: 0 };
        }

        return {
            hasRecent: (data?.length || 0) > 0,
            count: data?.length || 0,
        };
    } catch (error) {
        console.error("❌ Exception checking recent resets:", error);
        return { hasRecent: false, count: 0 };
    }
}

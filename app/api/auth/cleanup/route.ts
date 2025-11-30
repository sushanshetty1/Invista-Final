/**
 * Auth Cleanup API Route
 * ============================================================================
 * Manual cleanup endpoint for:
 * - Login history (older than 5 days)
 * - Expired/revoked sessions
 * 
 * Can be called manually or by external cron job
 * Protected by secret key to prevent abuse
 * ============================================================================
 */

import { type NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/prisma";
import { getRetentionCutoff, getClientIP, isRateLimited } from "@/lib/session-utils";
import { cleanupExpiredSessions } from "@/lib/session-manager";

// ============================================================================
// POST: RUN CLEANUP
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        // Optional: Verify cleanup secret (for cron jobs)
        const authHeader = request.headers.get("authorization");
        const cleanupSecret = process.env.CLEANUP_SECRET;

        // If CLEANUP_SECRET is set, require it
        if (cleanupSecret && authHeader !== `Bearer ${cleanupSecret}`) {
            // Fall back to rate limiting for manual calls without secret
            const ipAddress = getClientIP(request.headers);
            if (isRateLimited(`cleanup_${ipAddress}`, 5, 60 * 60 * 1000)) {
                // 5 per hour per IP
                return NextResponse.json(
                    { success: false, error: "Rate limited - max 5 cleanup calls per hour" },
                    { status: 429 }
                );
            }
        }

        const results = {
            loginHistory: { deleted: 0, error: null as string | null },
            sessions: { deleted: 0, error: null as string | null },
        };

        // 1. Clean up old login history (5 days)
        try {
            const cutoffDate = getRetentionCutoff(5);
            const loginHistoryResult = await supabaseClient.loginHistory.deleteMany({
                where: {
                    attemptedAt: { lt: cutoffDate },
                },
            });
            results.loginHistory.deleted = loginHistoryResult.count;
        } catch (error) {
            results.loginHistory.error =
                error instanceof Error ? error.message : "Unknown error";
        }

        // 2. Clean up expired sessions
        try {
            const sessionResult = await cleanupExpiredSessions();
            results.sessions.deleted = sessionResult.deletedCount;
            if (sessionResult.error) {
                results.sessions.error = sessionResult.error;
            }
        } catch (error) {
            results.sessions.error =
                error instanceof Error ? error.message : "Unknown error";
        }

        const totalDeleted = results.loginHistory.deleted + results.sessions.deleted;

        console.log(
            `🧹 Cleanup completed: ${results.loginHistory.deleted} login history + ${results.sessions.deleted} sessions deleted`
        );

        return NextResponse.json({
            success: true,
            message: `Cleaned up ${totalDeleted} records`,
            details: results,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("❌ Error during cleanup:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// GET: CHECK CLEANUP STATUS
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const ipAddress = getClientIP(request.headers);
        if (isRateLimited(`cleanup_status_${ipAddress}`, 30, 60 * 1000)) {
            return NextResponse.json(
                { success: false, error: "Rate limited" },
                { status: 429 }
            );
        }

        const cutoffDate = getRetentionCutoff(5);

        // Count records that would be deleted
        const [loginHistoryCount, expiredSessionsCount] = await Promise.all([
            supabaseClient.loginHistory.count({
                where: { attemptedAt: { lt: cutoffDate } },
            }),
            supabaseClient.userSession.count({
                where: {
                    OR: [
                        { expiresAt: { lt: new Date() } },
                        { isRevoked: true, revokedAt: { lt: cutoffDate } },
                        { isActive: false, createdAt: { lt: cutoffDate } },
                    ],
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            pendingCleanup: {
                loginHistory: loginHistoryCount,
                sessions: expiredSessionsCount,
                total: loginHistoryCount + expiredSessionsCount,
            },
            retentionDays: 5,
            cutoffDate: cutoffDate.toISOString(),
        });
    } catch (error) {
        console.error("❌ Error checking cleanup status:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

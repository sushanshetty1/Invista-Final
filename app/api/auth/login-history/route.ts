/**
 * Login History API Route
 * ============================================================================
 * POST: Log a login attempt
 * - Rate limited by IP (10 requests per minute)
 * - Triggers cleanup every 100 logins OR every 24 hours
 * - 5-day retention policy
 * ============================================================================
 */

import { type NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/prisma";
import {
    getClientIP,
    parseUserAgent,
    isRateLimited,
    shouldRunCleanup,
    getRetentionCutoff,
} from "@/lib/session-utils";

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================

/**
 * Delete login history records older than 5 days
 * Runs in background (fire-and-forget)
 */
async function cleanupOldLoginHistory(): Promise<void> {
    try {
        const cutoffDate = getRetentionCutoff(5); // 5 days ago

        const result = await supabaseClient.loginHistory.deleteMany({
            where: {
                attemptedAt: { lt: cutoffDate },
            },
        });

        if (result.count > 0) {
            console.log(`🧹 Cleaned up ${result.count} old login history records`);
        }
    } catch (error) {
        // Log but don't throw - cleanup is non-critical
        console.error("❌ Error cleaning up login history:", error);
    }
}

// ============================================================================
// POST: LOG LOGIN ATTEMPT
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        // Extract request metadata
        const headers = request.headers;
        const ipAddress = getClientIP(headers);
        const userAgent = headers.get("user-agent") || null;

        // Rate limiting by IP (10 requests per minute)
        if (isRateLimited(`login_history_ip_${ipAddress}`, 10, 60 * 1000)) {
            return NextResponse.json(
                { success: false, error: "Rate limited" },
                { status: 429 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { userId, successful, failReason, email } = body;

        // Determine userId - if not provided but email is, try to find user
        let resolvedUserId = userId;
        if (!resolvedUserId && email) {
            try {
                const user = await supabaseClient.user.findUnique({
                    where: { email },
                    select: { id: true },
                });
                if (user) {
                    resolvedUserId = user.id;
                }
            } catch {
                // Ignore - user lookup failed, continue without userId
            }
        }

        // Must have a userId to log
        if (!resolvedUserId) {
            // For failed logins without user, still return success
            // We just don't log them to avoid orphan records
            return NextResponse.json({
                success: true,
                message: "No user found, login attempt not logged",
            });
        }

        // Parse user agent for device info
        const { browser, deviceType } = parseUserAgent(userAgent);

        // Create login history record
        const loginHistory = await supabaseClient.loginHistory.create({
            data: {
                userId: resolvedUserId,
                successful,
                failReason: failReason || null,
                ipAddress,
                userAgent,
                location: null, // Skip geolocation for now
            },
        });

        console.log(`✅ Login logged: ${successful ? "SUCCESS" : "FAILED"} for user ${resolvedUserId} from ${ipAddress} (${browser}/${deviceType})`);

        // Update user's lastLoginAt on successful login
        if (successful) {
            try {
                await supabaseClient.user.update({
                    where: { id: resolvedUserId },
                    data: { lastLoginAt: new Date() },
                });
            } catch (error) {
                // Non-critical - log but don't fail
                console.error("Failed to update lastLoginAt:", error);
            }
        }

        // Check if we should run cleanup (Option C - hybrid)
        if (shouldRunCleanup()) {
            // Fire-and-forget cleanup
            cleanupOldLoginHistory().catch(console.error);
        }

        return NextResponse.json({
            success: true,
            loginHistoryId: loginHistory.id,
        });
    } catch (error) {
        console.error("❌ Error logging login history:", error);
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
// GET: FETCH LOGIN HISTORY FOR USER
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const limit = parseInt(searchParams.get("limit") || "20", 10);

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "userId is required" },
                { status: 400 }
            );
        }

        // Rate limiting by IP
        const ipAddress = getClientIP(request.headers);
        if (isRateLimited(`login_history_get_${ipAddress}`, 30, 60 * 1000)) {
            return NextResponse.json(
                { success: false, error: "Rate limited" },
                { status: 429 }
            );
        }

        const history = await supabaseClient.loginHistory.findMany({
            where: { userId },
            orderBy: { attemptedAt: "desc" },
            take: Math.min(limit, 100), // Max 100 records
            select: {
                id: true,
                successful: true,
                failReason: true,
                ipAddress: true,
                userAgent: true,
                location: true,
                attemptedAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            history,
            count: history.length,
        });
    } catch (error) {
        console.error("❌ Error fetching login history:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

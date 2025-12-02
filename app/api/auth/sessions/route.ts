/**
 * Sessions API Route
 * ============================================================================
 * Manage UserSession records
 * GET:    Fetch user's active sessions
 * POST:   Create new session (on login)
 * DELETE: Revoke session (logout) or all sessions
 * ============================================================================
 */

import { type NextRequest, NextResponse } from "next/server";
import {
    createSession,
    getUserSessions,
    revokeSession,
    revokeAllSessions,
    cleanupExpiredSessions,
} from "@/lib/session-manager";
import {
    getClientIP,
    isRateLimited,
    shouldRunCleanup,
} from "@/lib/session-utils";

// ============================================================================
// GET: FETCH USER'S ACTIVE SESSIONS
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "userId is required" },
                { status: 400 }
            );
        }

        // Rate limiting
        const ipAddress = getClientIP(request.headers);
        if (isRateLimited(`sessions_get_${ipAddress}`, 30, 60 * 1000)) {
            return NextResponse.json(
                { success: false, error: "Rate limited" },
                { status: 429 }
            );
        }

        const result = await getUserSessions(userId);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        // Don't expose full tokens - mask them
        const maskedSessions = result.sessions.map((session) => ({
            ...session,
            token: `${session.token.substring(0, 8)}...`, // Only show first 8 chars
        }));

        return NextResponse.json({
            success: true,
            sessions: maskedSessions,
            count: maskedSessions.length,
        });
    } catch (error) {
        console.error("❌ Error fetching sessions:", error);
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
// POST: CREATE NEW SESSION
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const headers = request.headers;
        const ipAddress = getClientIP(headers);
        const userAgent = headers.get("user-agent");

        // Rate limiting (10 sessions per minute per IP)
        if (isRateLimited(`sessions_create_${ipAddress}`, 10, 60 * 1000)) {
            return NextResponse.json(
                { success: false, error: "Rate limited" },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { userId, supabaseToken } = body;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "userId is required" },
                { status: 400 }
            );
        }

        const result = await createSession({
            userId,
            ipAddress,
            userAgent,
            supabaseToken,
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        // Trigger cleanup check (Option C - hybrid)
        if (shouldRunCleanup()) {
            cleanupExpiredSessions().catch(console.error);
        }

        return NextResponse.json({
            success: true,
            sessionId: result.sessionId,
        });
    } catch (error) {
        console.error("❌ Error creating session:", error);
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
// DELETE: REVOKE SESSION(S)
// ============================================================================

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId");
        const userId = searchParams.get("userId");
        const revokeAll = searchParams.get("revokeAll") === "true";
        const exceptSessionId = searchParams.get("exceptSessionId");

        // Rate limiting
        const ipAddress = getClientIP(request.headers);
        if (isRateLimited(`sessions_delete_${ipAddress}`, 20, 60 * 1000)) {
            return NextResponse.json(
                { success: false, error: "Rate limited" },
                { status: 429 }
            );
        }

        // Revoke all sessions for a user
        if (revokeAll && userId) {
            const result = await revokeAllSessions(userId, exceptSessionId || undefined);
            return NextResponse.json({
                success: result.success,
                revokedCount: result.revokedCount,
                error: result.error,
            });
        }

        // Revoke single session
        if (sessionId) {
            const result = await revokeSession(sessionId);
            return NextResponse.json({
                success: result.success,
                error: result.error,
            });
        }

        return NextResponse.json(
            { success: false, error: "sessionId or (userId + revokeAll) required" },
            { status: 400 }
        );
    } catch (error) {
        console.error("❌ Error revoking session:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

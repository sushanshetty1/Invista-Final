/**
 * Session Manager
 * ============================================================================
 * Manages UserSession records in Supabase database
 * - Create session on login
 * - Update activity (debounced)
 * - Revoke session on logout
 * - Revoke all sessions ("log out all devices")
 * - Cleanup expired sessions
 * ============================================================================
 */

import { supabaseClient } from "@/lib/prisma";
import {
    generateSessionToken,
    parseUserAgent,
    calculateSessionExpiry,
    getRetentionCutoff,
} from "@/lib/session-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateSessionInput {
    userId: string;
    ipAddress: string;
    userAgent: string | null;
    supabaseToken?: string; // Optional: Supabase access token for tracking
}

export interface SessionInfo {
    id: string;
    userId: string;
    token: string;
    deviceType: string | null;
    browser: string | null;
    ipAddress: string | null;
    lastActivity: Date;
    createdAt: Date;
    isActive: boolean;
}

// ============================================================================
// DEBOUNCING FOR ACTIVITY UPDATES
// ============================================================================

// Track last activity update per session to avoid excessive writes
const lastActivityUpdateMap = new Map<string, number>();
const ACTIVITY_UPDATE_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

function shouldUpdateActivity(sessionId: string): boolean {
    const now = Date.now();
    const lastUpdate = lastActivityUpdateMap.get(sessionId);

    if (!lastUpdate || now - lastUpdate > ACTIVITY_UPDATE_DEBOUNCE_MS) {
        lastActivityUpdateMap.set(sessionId, now);
        return true;
    }

    return false;
}

// ============================================================================
// CREATE SESSION
// ============================================================================

/**
 * Create a new UserSession record
 * Called on successful login
 */
export async function createSession(
    input: CreateSessionInput
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
        const { userId, ipAddress, userAgent, supabaseToken } = input;

        // Parse user agent
        const { browser, deviceType } = parseUserAgent(userAgent);

        // Generate session token (use Supabase token if provided, else generate)
        const token = supabaseToken || generateSessionToken();

        // Calculate expiry (6 hours)
        const expiresAt = calculateSessionExpiry(6);

        // Create session record
        const session = await supabaseClient.userSession.create({
            data: {
                userId,
                token,
                ipAddress,
                userAgent: userAgent || null,
                deviceType,
                browser,
                expiresAt,
                isActive: true,
                isRevoked: false,
                lastActivity: new Date(),
            },
        });

        console.log(`✅ Session created: ${session.id} for user ${userId}`);

        return { success: true, sessionId: session.id };
    } catch (error) {
        console.error("❌ Error creating session:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create session",
        };
    }
}

// ============================================================================
// UPDATE SESSION ACTIVITY
// ============================================================================

/**
 * Update session's lastActivity timestamp
 * Debounced to prevent excessive writes (max once per 5 minutes per session)
 */
export async function updateSessionActivity(
    sessionId: string
): Promise<{ success: boolean }> {
    try {
        // Check debounce
        if (!shouldUpdateActivity(sessionId)) {
            return { success: true }; // Skip update, still "successful"
        }

        await supabaseClient.userSession.update({
            where: { id: sessionId },
            data: { lastActivity: new Date() },
        });

        return { success: true };
    } catch (error) {
        console.error("❌ Error updating session activity:", error);
        return { success: false };
    }
}

/**
 * Update session activity by token (when sessionId not available)
 */
export async function updateSessionActivityByToken(
    token: string
): Promise<{ success: boolean }> {
    try {
        // Find session by token first
        const session = await supabaseClient.userSession.findUnique({
            where: { token },
            select: { id: true },
        });

        if (!session) {
            return { success: false };
        }

        return updateSessionActivity(session.id);
    } catch (error) {
        console.error("❌ Error updating session activity by token:", error);
        return { success: false };
    }
}

// ============================================================================
// REVOKE SESSION (LOGOUT)
// ============================================================================

/**
 * Revoke a single session (logout from one device)
 */
export async function revokeSession(
    sessionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await supabaseClient.userSession.update({
            where: { id: sessionId },
            data: {
                isActive: false,
                isRevoked: true,
                revokedAt: new Date(),
            },
        });

        // Clear from debounce map
        lastActivityUpdateMap.delete(sessionId);

        console.log(`✅ Session revoked: ${sessionId}`);

        return { success: true };
    } catch (error) {
        console.error("❌ Error revoking session:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to revoke session",
        };
    }
}

/**
 * Revoke session by token
 */
export async function revokeSessionByToken(
    token: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await supabaseClient.userSession.findUnique({
            where: { token },
            select: { id: true },
        });

        if (!session) {
            return { success: false, error: "Session not found" };
        }

        return revokeSession(session.id);
    } catch (error) {
        console.error("❌ Error revoking session by token:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to revoke session",
        };
    }
}

// ============================================================================
// REVOKE ALL SESSIONS (LOG OUT ALL DEVICES)
// ============================================================================

/**
 * Revoke all sessions for a user (log out from all devices)
 * @param userId - User ID
 * @param exceptSessionId - Optional: Keep this session active (current device)
 */
export async function revokeAllSessions(
    userId: string,
    exceptSessionId?: string
): Promise<{ success: boolean; revokedCount: number; error?: string }> {
    try {
        const whereClause: any = {
            userId,
            isActive: true,
        };

        // Optionally exclude current session
        if (exceptSessionId) {
            whereClause.id = { not: exceptSessionId };
        }

        const result = await supabaseClient.userSession.updateMany({
            where: whereClause,
            data: {
                isActive: false,
                isRevoked: true,
                revokedAt: new Date(),
            },
        });

        console.log(`✅ Revoked ${result.count} sessions for user ${userId}`);

        return { success: true, revokedCount: result.count };
    } catch (error) {
        console.error("❌ Error revoking all sessions:", error);
        return {
            success: false,
            revokedCount: 0,
            error: error instanceof Error ? error.message : "Failed to revoke sessions",
        };
    }
}

// ============================================================================
// GET USER SESSIONS
// ============================================================================

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(
    userId: string
): Promise<{ success: boolean; sessions: SessionInfo[]; error?: string }> {
    try {
        const sessions = await supabaseClient.userSession.findMany({
            where: {
                userId,
                isActive: true,
                isRevoked: false,
                expiresAt: { gt: new Date() }, // Not expired
            },
            select: {
                id: true,
                userId: true,
                token: true,
                deviceType: true,
                browser: true,
                ipAddress: true,
                lastActivity: true,
                createdAt: true,
                isActive: true,
            },
            orderBy: { lastActivity: "desc" },
        });

        return { success: true, sessions };
    } catch (error) {
        console.error("❌ Error getting user sessions:", error);
        return {
            success: false,
            sessions: [],
            error: error instanceof Error ? error.message : "Failed to get sessions",
        };
    }
}

// ============================================================================
// CLEANUP EXPIRED SESSIONS
// ============================================================================

/**
 * Delete expired and old revoked sessions
 * Called periodically (piggyback on login traffic)
 */
export async function cleanupExpiredSessions(): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
}> {
    try {
        const cutoffDate = getRetentionCutoff(5); // 5 days

        // Delete sessions that are:
        // 1. Expired (expiresAt < now) OR
        // 2. Revoked and older than 5 days OR
        // 3. Created more than 5 days ago and inactive
        const result = await supabaseClient.userSession.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } }, // Expired
                    {
                        isRevoked: true,
                        revokedAt: { lt: cutoffDate },
                    }, // Old revoked
                    {
                        isActive: false,
                        createdAt: { lt: cutoffDate },
                    }, // Old inactive
                ],
            },
        });

        if (result.count > 0) {
            console.log(`🧹 Cleaned up ${result.count} expired/old sessions`);
        }

        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error("❌ Error cleaning up sessions:", error);
        return {
            success: false,
            deletedCount: 0,
            error: error instanceof Error ? error.message : "Cleanup failed",
        };
    }
}

// ============================================================================
// FIND SESSION BY TOKEN
// ============================================================================

/**
 * Find an active session by token
 */
export async function findSessionByToken(
    token: string
): Promise<SessionInfo | null> {
    try {
        const session = await supabaseClient.userSession.findUnique({
            where: { token },
            select: {
                id: true,
                userId: true,
                token: true,
                deviceType: true,
                browser: true,
                ipAddress: true,
                lastActivity: true,
                createdAt: true,
                isActive: true,
            },
        });

        if (!session || !session.isActive) {
            return null;
        }

        return session;
    } catch (error) {
        console.error("❌ Error finding session by token:", error);
        return null;
    }
}

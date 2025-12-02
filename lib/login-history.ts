/**
 * Login History Utilities
 * ============================================================================
 * Client-side helper to log login attempts
 * - Rate limited (1 per user per 60 seconds)
 * - Fire-and-forget (non-blocking)
 * - 5-day retention with automatic cleanup
 * ============================================================================
 */

// In-memory rate limiter for client-side
const lastLoginLogTime = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 1000; // 60 seconds per user

/**
 * Check if we should log this login (rate limiting)
 */
function shouldLogLogin(identifier: string): boolean {
    const now = Date.now();
    const lastLog = lastLoginLogTime.get(identifier);

    if (!lastLog || now - lastLog > RATE_LIMIT_MS) {
        lastLoginLogTime.set(identifier, now);
        return true;
    }

    return false;
}

/**
 * Log a login attempt to the login_history table
 * - Rate limited: Max 1 log per user per 60 seconds
 * - Fire-and-forget: Does not block login flow
 * - Safe: Errors are caught and logged, never thrown
 */
export async function logLoginAttempt({
    userId,
    email,
    successful,
    failReason,
}: {
    userId?: string;
    email?: string;
    successful: boolean;
    failReason?: string;
}): Promise<{ success: boolean; disabled?: boolean; rateLimited?: boolean }> {
    try {
        // Rate limiting - use userId or email as identifier
        const identifier = userId || email || "anonymous";
        if (!shouldLogLogin(identifier)) {
            console.log(`Login log rate limited for: ${identifier}`);
            return { success: true, rateLimited: true };
        }

        // Fire-and-forget: Don't await, let it run in background
        fetch("/api/auth/login-history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId,
                email,
                successful,
                failReason,
            }),
        }).catch((error) => {
            // Silently log errors - don't disrupt user experience
            console.error("Login history log failed (non-blocking):", error);
        });

        return { success: true };
    } catch (error) {
        // Never throw - just log and return
        console.error("Error in logLoginAttempt:", error);
        return { success: false };
    }
}

/**
 * Log login attempt and wait for response (use sparingly)
 * Only use when you need to confirm the log was recorded
 */
export async function logLoginAttemptSync({
    userId,
    email,
    successful,
    failReason,
}: {
    userId?: string;
    email?: string;
    successful: boolean;
    failReason?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const identifier = userId || email || "anonymous";
        if (!shouldLogLogin(identifier)) {
            return { success: true };
        }

        const response = await fetch("/api/auth/login-history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId,
                email,
                successful,
                failReason,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Failed to log login history:", data.error);
            return { success: false, error: data.error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Error logging login attempt:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}


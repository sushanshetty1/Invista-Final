/**
 * Session & Auth Utilities
 * ============================================================================
 * Shared utilities for session management and login history
 * - IP extraction from headers
 * - User agent parsing (browser, device type)
 * - Session token generation
 * ============================================================================
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// IP ADDRESS EXTRACTION
// ============================================================================

/**
 * Extract client IP address from request headers
 * Handles proxies (Vercel, Cloudflare, nginx)
 */
export function getClientIP(headers: Headers): string {
    // Try various headers in order of reliability
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, first is the client
        return forwardedFor.split(",")[0].trim();
    }

    const realIP = headers.get("x-real-ip");
    if (realIP) {
        return realIP.trim();
    }

    // Cloudflare
    const cfConnectingIP = headers.get("cf-connecting-ip");
    if (cfConnectingIP) {
        return cfConnectingIP.trim();
    }

    // Vercel
    const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
    if (vercelForwardedFor) {
        return vercelForwardedFor.split(",")[0].trim();
    }

    return "unknown";
}

// ============================================================================
// USER AGENT PARSING
// ============================================================================

export interface ParsedUserAgent {
    browser: string;
    deviceType: "desktop" | "mobile" | "tablet" | "unknown";
    os: string;
}

/**
 * Parse user agent string to extract browser and device info
 */
export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
    if (!userAgent) {
        return { browser: "unknown", deviceType: "unknown", os: "unknown" };
    }

    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType: ParsedUserAgent["deviceType"] = "desktop";
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
        deviceType = "tablet";
    } else if (
        /mobile|iphone|ipod|android.*mobile|windows.*phone|blackberry/i.test(ua)
    ) {
        deviceType = "mobile";
    }

    // Detect browser
    let browser = "unknown";
    if (ua.includes("edg/")) {
        browser = "Edge";
    } else if (ua.includes("chrome") && !ua.includes("edg")) {
        browser = "Chrome";
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
        browser = "Safari";
    } else if (ua.includes("firefox")) {
        browser = "Firefox";
    } else if (ua.includes("opera") || ua.includes("opr")) {
        browser = "Opera";
    } else if (ua.includes("trident") || ua.includes("msie")) {
        browser = "IE";
    }

    // Detect OS
    let os = "unknown";
    if (ua.includes("windows")) {
        os = "Windows";
    } else if (ua.includes("mac os") || ua.includes("macos")) {
        os = "macOS";
    } else if (ua.includes("linux") && !ua.includes("android")) {
        os = "Linux";
    } else if (ua.includes("android")) {
        os = "Android";
    } else if (ua.includes("iphone") || ua.includes("ipad")) {
        os = "iOS";
    }

    return { browser, deviceType, os };
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a unique session token
 * Uses UUID v4 for uniqueness
 */
export function generateSessionToken(): string {
    return uuidv4();
}

/**
 * Generate a shorter, more readable token for display purposes
 * NOT for security - use generateSessionToken() for actual tokens
 */
export function generateShortToken(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

// ============================================================================
// SESSION EXPIRY CALCULATION
// ============================================================================

const SESSION_DURATION_HOURS = 6; // Match existing 6-hour timeout

/**
 * Calculate session expiry timestamp
 * @param hours - Session duration in hours (default: 6)
 */
export function calculateSessionExpiry(hours: number = SESSION_DURATION_HOURS): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
}

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

// In-memory rate limit tracking
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 60 seconds
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of rateLimitMap.entries()) {
            if (value.resetTime < now) {
                rateLimitMap.delete(key);
            }
        }
    }, 60000);
}

/**
 * Check if an identifier has exceeded rate limit
 * @param identifier - Unique key (e.g., `login_${userId}` or `ip_${ip}`)
 * @param limit - Max requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited (blocked), false if allowed
 */
export function isRateLimited(
    identifier: string,
    limit: number,
    windowMs: number
): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    if (!entry || entry.resetTime < now) {
        // New window - start fresh
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
        return false;
    }

    if (entry.count >= limit) {
        // Rate limited
        return true;
    }

    // Increment count
    entry.count++;
    return false;
}

// ============================================================================
// CLEANUP TRIGGER LOGIC (Option C - Hybrid)
// ============================================================================

let loginCounter = 0;
let lastCleanupTime = Date.now();

const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 100; // Every 100 logins

/**
 * Determine if cleanup should run (hybrid approach)
 * - Runs every 100 logins OR
 * - Runs if 24 hours since last cleanup
 */
export function shouldRunCleanup(): boolean {
    loginCounter++;
    const now = Date.now();

    // Run if counter hits 100 OR 24 hours since last cleanup
    if (loginCounter % CLEANUP_INTERVAL === 0 || now - lastCleanupTime > ONE_DAY_MS) {
        lastCleanupTime = now;
        return true;
    }

    return false;
}

/**
 * Get retention cutoff date (5 days ago)
 */
export function getRetentionCutoff(days: number = 5): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

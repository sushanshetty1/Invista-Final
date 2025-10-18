import { type NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, successful, failReason, email } = body;

        // Extract request metadata
        const ipAddress =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            request.headers.get("x-real-ip") ||
            "unknown";

        const userAgent = request.headers.get("user-agent") || "unknown";

        // Parse device type from user agent
        const deviceType = getDeviceType(userAgent);

        // Get approximate location (you can integrate with IP geolocation service later)
        const location = await getLocationFromIP(ipAddress);

        // Create login history record
        const loginHistoryData: any = {
            userId: userId || null,
            successful,
            failReason: failReason || null,
            ipAddress,
            userAgent,
            location,
            deviceType,
            attemptedAt: new Date().toISOString(),
        };

        // If login failed and no userId, we might need to look it up by email
        if (!userId && email && !successful) {
            const userData = await supabaseClient.user.findUnique({
                where: { email },
                select: { id: true },
            });
            if (userData) {
                loginHistoryData.userId = userData.id;
            }
        }

        // Only log if we have a userId
        if (loginHistoryData.userId) {
            const loginHistory = await supabaseClient.loginHistory.create({
                data: loginHistoryData,
            });

            console.log("✅ Login history logged:", {
                userId: loginHistory.userId,
                successful: loginHistory.successful,
                ipAddress: loginHistory.ipAddress,
                deviceType: loginHistory.deviceType,
            });

            // Update user's last login info on successful login
            if (successful) {
                await supabaseClient.user.update({
                    where: { id: loginHistoryData.userId },
                    data: {
                        lastLoginAt: new Date(),
                        lastLoginIp: ipAddress,
                        failedLoginCount: 0, // Reset failed login count on success
                    },
                });
            } else {
                // Increment failed login count
                await supabaseClient.user.update({
                    where: { id: loginHistoryData.userId },
                    data: {
                        failedLoginCount: { increment: 1 },
                    },
                });
            }

            return NextResponse.json({
                success: true,
                loginHistoryId: loginHistory.id,
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: "No userId available for logging",
            },
            { status: 400 },
        );
    } catch (error) {
        console.error("❌ Error logging login history:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

// Helper function to determine device type from user agent
function getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
        return "Mobile";
    }
    if (ua.includes("tablet") || ua.includes("ipad")) {
        return "Tablet";
    }
    if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) {
        return "Desktop";
    }
    return "Unknown";
}

// Helper function to get location from IP
// For now returns basic info, you can integrate with IP geolocation API later
async function getLocationFromIP(ipAddress: string): Promise<string | null> {
    // Skip for local/unknown IPs
    if (
        ipAddress === "unknown" ||
        ipAddress === "127.0.0.1" ||
        ipAddress.startsWith("192.168.") ||
        ipAddress.startsWith("10.") ||
        ipAddress === "::1"
    ) {
        return "Local";
    }

    try {
        // You can integrate with services like:
        // - ipapi.co
        // - ip-api.com
        // - ipgeolocation.io
        // For now, we'll just return null and you can add this later

        // Example integration (uncomment when you have API key):
        /*
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        if (response.ok) {
            const data = await response.json();
            return `${data.city}, ${data.country_name}`;
        }
        */

        return null;
    } catch (error) {
        console.error("Error getting location from IP:", error);
        return null;
    }
}

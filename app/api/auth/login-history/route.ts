import { type NextRequest, NextResponse } from "next/server";
// import { supabaseClient } from "@/lib/db"; // DISABLED

export async function POST(_request: NextRequest) {
    // DISABLED: This endpoint is temporarily disabled to prevent system overload
    return NextResponse.json(
        {
            success: true,
            message: "Login history logging is temporarily disabled",
        },
        { status: 200 },
    );

    /* DISABLED CODE - Uncomment to re-enable
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
        const loginHistoryData: {
            userId: string | null;
            successful: boolean;
            failReason: string | null;
            ipAddress: string;
            userAgent: string;
            location: string | null;
            deviceType: string;
            attemptedAt: string;
        } = {
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
                data: {
                    userId: loginHistoryData.userId,
                    successful: loginHistoryData.successful,
                    failReason: loginHistoryData.failReason,
                    ipAddress: loginHistoryData.ipAddress,
                    userAgent: loginHistoryData.userAgent,
                    location: loginHistoryData.location,
                    deviceType: loginHistoryData.deviceType,
                    attemptedAt: loginHistoryData.attemptedAt,
                },
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
    */
}

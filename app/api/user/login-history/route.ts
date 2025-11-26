import { type NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { supabaseClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        // Authenticate the user
        const authResult = await authenticate(request);

        if (!authResult.success || !authResult.user?.id) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 },
            );
        }

        const userId = authResult.user.id;

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const limit = Number.parseInt(searchParams.get("limit") || "50");
        const offset = Number.parseInt(searchParams.get("offset") || "0");

        // Fetch login history for the user
        const loginHistory = await supabaseClient.loginHistory.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                attemptedAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        // Get total count
        const totalCount = await supabaseClient.loginHistory.count({
            where: {
                userId: userId,
            },
        });

        // Get stats
        const successfulLogins = await supabaseClient.loginHistory.count({
            where: {
                userId: userId,
                successful: true,
            },
        });

        const failedLogins = await supabaseClient.loginHistory.count({
            where: {
                userId: userId,
                successful: false,
            },
        });

        return NextResponse.json({
            loginHistory,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
            stats: {
                total: totalCount,
                successful: successfulLogins,
                failed: failedLogins,
            },
        });
    } catch (error) {
        console.error("Error fetching login history:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

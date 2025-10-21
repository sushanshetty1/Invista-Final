import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/auth/password-reset-history
 * Get password reset history for the authenticated user
 */
export async function GET(request: Request) {
    try {
        // Get authenticated user from Authorization header
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing or invalid authorization header" },
                { status: 401 },
            );
        }

        const token = authHeader.substring(7);
        const { data: userData, error: userError } = await supabase.auth.getUser(
            token,
        );

        if (userError || !userData.user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 },
            );
        }

        // Fetch password reset history for this user
        const { data, error } = await supabase
            .from("password_resets")
            .select("id, token, expiresAt, isUsed, usedAt, ipAddress, userAgent, createdAt")
            .eq("userId", userData.user.id)
            .order("createdAt", { ascending: false })
            .limit(20);

        if (error) {
            console.error("Error fetching password reset history:", error);
            return NextResponse.json(
                { error: "Failed to fetch password reset history" },
                { status: 500 },
            );
        }

        // Mask sensitive token data (show only first 8 chars)
        const maskedData = data?.map((reset) => ({
            ...reset,
            token: reset.token ? `${reset.token.substring(0, 8)}...` : null,
        }));

        return NextResponse.json({
            success: true,
            data: maskedData,
            total: data?.length || 0,
        });
    } catch (error) {
        console.error("Password reset history API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

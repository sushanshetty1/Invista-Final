/**
 * Utility function to log login attempts to login_history table
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
}) {
    try {
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

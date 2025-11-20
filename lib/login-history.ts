/**
 * Utility function to log login attempts to login_history table
 * DISABLED: Temporarily disabled to prevent system overload
 */
export async function logLoginAttempt({
    userId: _userId,
    email: _email,
    successful: _successful,
    failReason: _failReason,
}: {
    userId?: string;
    email?: string;
    successful: boolean;
    failReason?: string;
}) {
    // DISABLED: Function temporarily disabled to prevent system overload
    // Just return success without making the API call
    return { success: true, disabled: true };

    /* DISABLED CODE - Uncomment to re-enable
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
    */
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
	console.warn(
		"Missing Supabase environment variables for admin client. Using placeholders for build.",
	);
}

const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseServiceRoleKey || "placeholder-key";

export const supabaseAdmin = createClient(url, key, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
	},
});

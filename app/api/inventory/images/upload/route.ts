import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
	try {
		// Check authentication header
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const token = authHeader.split(" ")[1];

		// Verify the token with Supabase
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser(token);
		if (authError || !user) {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		// Parse the form data
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Validate file size (10MB limit)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: "File too large. Maximum size is 10MB." },
				{ status: 400 },
			);
		}

		// Validate file type
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ error: "Invalid file type. Only JPG, PNG, and GIF are allowed." },
				{ status: 400 },
			);
		}

		// Generate unique filename
		const fileExt = file.name.split(".").pop();
		const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
		const filePath = `products/${fileName}`;

		// Upload to Supabase storage
		const { data, error } = await supabase.storage
			.from("prodctimg")
			.upload(filePath, file, {
				cacheControl: "3600",
				upsert: false,
			});

		if (error) {
			console.error("Upload error:", error);
			return NextResponse.json(
				{ error: `Failed to upload image: ${error.message}` },
				{ status: 500 },
			);
		}

		// Get public URL
		const {
			data: { publicUrl },
		} = supabase.storage.from("prodctimg").getPublicUrl(filePath);

		return NextResponse.json({ url: publicUrl });
	} catch (error) {
		console.error("Error uploading image:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

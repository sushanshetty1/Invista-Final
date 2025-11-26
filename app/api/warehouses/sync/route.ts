import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { neonClient } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { warehouseId } = await req.json();
    console.log("[Warehouse Sync] Starting sync for:", warehouseId);

    // Get user and company
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[Warehouse Sync] Auth error:", userError);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: companyUser } = await supabase
      .from("company_users")
      .select("companyId")
      .eq("userId", user.id)
      .eq("isActive", true)
      .single();

    if (!companyUser) {
      console.error("[Warehouse Sync] No company user found");
      return NextResponse.json({ error: "User not associated with company" }, { status: 400 });
    }

    console.log("[Warehouse Sync] Company ID:", companyUser.companyId);

    // Get the location from Supabase
    const { data: location, error: locationError } = await supabase
      .from("company_locations")
      .select("*")
      .eq("id", warehouseId)
      .eq("companyId", companyUser.companyId)
      .single();

    if (locationError || !location) {
      console.error("[Warehouse Sync] Location error:", locationError);
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    console.log("[Warehouse Sync] Location found:", location.name);

    // Check if warehouse already exists in Neon
    const existingWarehouse = await neonClient.warehouse.findUnique({
      where: { id: warehouseId },
    });

    console.log("[Warehouse Sync] Existing warehouse:", existingWarehouse?.id || "none");

    if (existingWarehouse) {
      // Update existing warehouse
      await neonClient.warehouse.update({
        where: { id: warehouseId },
        data: {
          name: location.name,
          isActive: location.isActive,
        },
      });
      console.log("[Warehouse Sync] Updated warehouse");
    } else {
      // Create new warehouse in Neon with all required fields
      const warehouseData = {
        id: warehouseId,
        companyId: companyUser.companyId,
        name: location.name,
        code: location.code || `WH-${warehouseId.substring(0, 8)}`,
        type: "STANDARD" as const,
        isActive: location.isActive ?? true,
      };
      
      await neonClient.warehouse.create({
        data: warehouseData,
      });
      console.log("[Warehouse Sync] Created warehouse");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Warehouse Sync] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync warehouse", details: (error as Error).message },
      { status: 500 }
    );
  }
}

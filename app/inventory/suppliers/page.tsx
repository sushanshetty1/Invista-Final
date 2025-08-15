"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InventorySuppliersRedirect() {
	const router = useRouter();

	useEffect(() => {
		// Redirect to the main suppliers page
		router.replace("/suppliers");
	}, [router]);

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<h1 className="text-2xl font-semibold mb-2">Redirecting...</h1>
				<p className="text-muted-foreground">
					Supplier management has been moved to the main Suppliers section.
				</p>
			</div>
		</div>
	);
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface ExportRequest {
	data: Record<string, unknown>[];
	filename?: string;
	format?: "csv" | "xlsx";
	includeHeaders?: boolean;
}

export async function POST(request: NextRequest) {
	try {
		const body: ExportRequest = await request.json();
		const { data, filename, format = "csv", includeHeaders = true } = body;

		if (!data || !Array.isArray(data)) {
			return NextResponse.json(
				{ error: "Data must be an array" },
				{ status: 400 }
			);
		}

		if (format === "csv") {
			const csvContent = generateCSV(data, includeHeaders);
			const exportFilename = filename || `export_${new Date().toISOString().split('T')[0]}.csv`;

			return new NextResponse(csvContent, {
				status: 200,
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="${exportFilename}"`,
				},
			});
		}

		return NextResponse.json(
			{ error: "Unsupported format" },
			{ status: 400 }
		);
	} catch (error) {
		console.error("Export error:", error);
		return NextResponse.json(
			{ error: "Failed to export data" },
			{ status: 500 }
		);
	}
}

function generateCSV(data: Record<string, unknown>[], includeHeaders: boolean): string {
	if (data.length === 0) {
		return "";
	}

	const headers = Object.keys(data[0]);
	const csvLines: string[] = [];

	// Add headers if required
	if (includeHeaders) {
		csvLines.push(headers.join(","));
	}

	// Add data rows
	data.forEach(row => {
		const values = headers.map(header => {
			let value = row[header];
			
			// Handle different data types
			if (value === null || value === undefined) {
				return '';
			}
			
			if (typeof value === 'object') {
				value = JSON.stringify(value);
			}
			
			// Convert to string and escape quotes
			const stringValue = String(value).replace(/"/g, '""');
			
			// Wrap in quotes if contains comma, quotes, or newlines
			if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
				return `"${stringValue}"`;
			}
			
			return stringValue;
		});
		
		csvLines.push(values.join(','));
	});

	return csvLines.join('\n');
}

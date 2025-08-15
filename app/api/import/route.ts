import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const entity = formData.get("entity") as string; // suppliers, products, etc.

		if (!file) {
			return NextResponse.json(
				{ error: "No file uploaded" },
				{ status: 400 }
			);
		}

		if (!file.name.toLowerCase().endsWith('.csv')) {
			return NextResponse.json(
				{ error: "Only CSV files are supported" },
				{ status: 400 }
			);
		}

		// Check file size (10MB limit)
		if (file.size > 10 * 1024 * 1024) {
			return NextResponse.json(
				{ error: "File size exceeds 10MB limit" },
				{ status: 400 }
			);
		}

		// Parse CSV content
		const csvContent = await file.text();
		const parsedData = parseCSV(csvContent);

		if (parsedData.length === 0) {
			return NextResponse.json(
				{ error: "No data found in CSV file" },
				{ status: 400 }
			);
		}

		// Validate data based on entity type
		const validationResult = validateImportData(parsedData, entity);
		if (!validationResult.valid) {
			return NextResponse.json(
				{ 
					error: "Validation failed", 
					details: validationResult.errors 
				},
				{ status: 400 }
			);
		}

		// Process the import based on entity type
		const result = await processImport(parsedData, entity);

		return NextResponse.json({
			success: true,
			imported: result.imported,
			skipped: result.skipped,
			errors: result.errors,
		});

	} catch (error) {
		console.error("Import error:", error);
		return NextResponse.json(
			{ error: "Failed to process import" },
			{ status: 500 }
		);
	}
}

function parseCSV(csvContent: string): Record<string, string>[] {
	const lines = csvContent.split('\n').filter(line => line.trim());
	if (lines.length < 2) return [];

	const headers = parseLine(lines[0]);
	const data: Record<string, string>[] = [];

	for (let i = 1; i < lines.length; i++) {
		const values = parseLine(lines[i]);
		const row: Record<string, string> = {};
		
		headers.forEach((header, index) => {
			row[header] = values[index] || '';
		});
		
		data.push(row);
	}

	return data;
}

function parseLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (char === '"') {
			if (inQuotes && nextChar === '"') {
				current += '"';
				i += 2;
			} else {
				inQuotes = !inQuotes;
				i++;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(current);
			current = '';
			i++;
		} else {
			current += char;
			i++;
		}
	}

	result.push(current);
	return result;
}

function validateImportData(data: Record<string, string>[], entity: string) {
	const errors: string[] = [];

	switch (entity) {
		case 'suppliers':
			data.forEach((row, index) => {
				if (!row['Supplier Name']?.trim()) {
					errors.push(`Row ${index + 2}: Supplier Name is required`);
				}
				if (!row['Supplier Code']?.trim()) {
					errors.push(`Row ${index + 2}: Supplier Code is required`);
				}
				if (row['Email Address'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Email Address'])) {
					errors.push(`Row ${index + 2}: Invalid email format`);
				}
			});
			break;

		case 'products':
			data.forEach((row, index) => {
				if (!row['Product Name']?.trim()) {
					errors.push(`Row ${index + 2}: Product Name is required`);
				}
				if (!row['SKU']?.trim()) {
					errors.push(`Row ${index + 2}: SKU is required`);
				}
				if (row['Unit Price'] && Number.isNaN(Number(row['Unit Price']))) {
					errors.push(`Row ${index + 2}: Unit Price must be a number`);
				}
			});
			break;

		default:
			errors.push(`Unsupported entity type: ${entity}`);
	}

	return {
		valid: errors.length === 0,
		errors: errors.slice(0, 10) // Limit to first 10 errors
	};
}

async function processImport(data: Record<string, string>[], entity: string) {
	// This is where you would integrate with your database
	// For now, we'll just simulate the process
	
	const imported: number[] = [];
	const skipped: number[] = [];
	const errors: string[] = [];

	data.forEach((row, index) => {
		try {
			// Simulate processing each row
			// In a real implementation, you would save to database here
			console.log(`Processing ${entity} row:`, row);
			imported.push(index + 2); // +2 because of 1-based indexing and header row
		} catch (error) {
			errors.push(`Row ${index + 2}: ${error}`);
			skipped.push(index + 2);
		}
	});

	return {
		imported: imported.length,
		skipped: skipped.length,
		errors
	};
}

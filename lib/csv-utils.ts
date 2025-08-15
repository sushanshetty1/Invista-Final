// CSV Import/Export utilities
export interface CSVExportOptions {
	filename?: string;
	includeHeaders?: boolean;
	dateFormat?: string;
	delimiter?: string;
}

export interface CSVImportOptions {
	hasHeaders?: boolean;
	delimiter?: string;
	skipEmptyLines?: boolean;
	maxFileSize?: number; // in bytes
}

// Export data to CSV
export function exportToCSV<T extends Record<string, unknown>>(
	data: T[],
	options: CSVExportOptions = {}
): void {
	const {
		filename = `export_${new Date().toISOString().split('T')[0]}.csv`,
		includeHeaders = true,
		delimiter = ','
	} = options;

	if (!data.length) {
		throw new Error('No data to export');
	}

	const headers = Object.keys(data[0]);
	const csvContent: string[] = [];

	// Add headers if required
	if (includeHeaders) {
		csvContent.push(headers.join(delimiter));
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
			
			// Wrap in quotes if contains delimiter, quotes, or newlines
			if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
				return `"${stringValue}"`;
			}
			
			return stringValue;
		});
		
		csvContent.push(values.join(delimiter));
	});

	// Create blob and download
	const csvString = csvContent.join('\n');
	const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	
	if (link.download !== undefined) {
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
}

// Parse CSV string to array of objects
export function parseCSV(
	csvString: string,
	options: CSVImportOptions = {}
): Record<string, string>[] {
	const {
		hasHeaders = true,
		delimiter = ',',
		skipEmptyLines = true
	} = options;

	const lines = csvString.split('\n');
	const result: Record<string, string>[] = [];
	
	if (lines.length === 0) {
		return result;
	}

	let headers: string[] = [];
	let startIndex = 0;

	// Extract headers if present
	if (hasHeaders && lines.length > 0) {
		headers = parseLine(lines[0], delimiter);
		startIndex = 1;
	} else {
		// Generate generic headers
		const firstLineData = parseLine(lines[0], delimiter);
		headers = firstLineData.map((_, index) => `Column${index + 1}`);
	}

	// Parse data lines
	for (let i = startIndex; i < lines.length; i++) {
		const line = lines[i].trim();
		
		if (skipEmptyLines && !line) {
			continue;
		}

		const values = parseLine(line, delimiter);
		const row: Record<string, string> = {};
		
		headers.forEach((header, index) => {
			row[header] = values[index] || '';
		});
		
		result.push(row);
	}

	return result;
}

// Parse a single CSV line
function parseLine(line: string, delimiter: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (char === '"') {
			if (inQuotes && nextChar === '"') {
				// Escaped quote
				current += '"';
				i += 2;
			} else {
				// Toggle quote state
				inQuotes = !inQuotes;
				i++;
			}
		} else if (char === delimiter && !inQuotes) {
			// End of field
			result.push(current);
			current = '';
			i++;
		} else {
			current += char;
			i++;
		}
	}

	// Add the last field
	result.push(current);
	return result;
}

// Import CSV from file
export function importCSVFromFile(
	file: File,
	options: CSVImportOptions = {}
): Promise<Record<string, string>[]> {
	return new Promise((resolve, reject) => {
		const {
			maxFileSize = 10 * 1024 * 1024 // 10MB default
		} = options;

		// Validate file
		if (!file) {
			reject(new Error('No file provided'));
			return;
		}

		if (file.size > maxFileSize) {
			reject(new Error(`File size exceeds limit of ${maxFileSize} bytes`));
			return;
		}

		if (!file.name.toLowerCase().endsWith('.csv')) {
			reject(new Error('File must be a CSV file'));
			return;
		}

		const reader = new FileReader();
		
		reader.onload = (e) => {
			try {
				const csvString = e.target?.result as string;
				const data = parseCSV(csvString, options);
				resolve(data);
			} catch (error) {
				reject(new Error(`Failed to parse CSV: ${error}`));
			}
		};

		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};

		reader.readAsText(file);
	});
}

// Export multiple data sets to different sheets in a CSV
export function exportMultipleToCSV(
	datasets: Array<{
		name: string;
		data: Record<string, unknown>[];
		headers?: string[];
	}>,
	filename?: string
): void {
	const exportFilename = filename || `multi_export_${new Date().toISOString().split('T')[0]}.csv`;
	
	const allContent: string[] = [];
	
	datasets.forEach((dataset, index) => {
		if (index > 0) {
			allContent.push(''); // Empty line between datasets
		}
		
		allContent.push(`# ${dataset.name}`);
		allContent.push(''); // Empty line
		
		if (dataset.data.length > 0) {
			const headers = dataset.headers || Object.keys(dataset.data[0]);
			allContent.push(headers.join(','));
			
			dataset.data.forEach(row => {
				const values = headers.map(header => {
					let value = row[header];
					if (value === null || value === undefined) return '';
					if (typeof value === 'object') value = JSON.stringify(value);
					const stringValue = String(value).replace(/"/g, '""');
					if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
						return `"${stringValue}"`;
					}
					return stringValue;
				});
				allContent.push(values.join(','));
			});
		}
	});

	const csvString = allContent.join('\n');
	const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	
	if (link.download !== undefined) {
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', exportFilename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
}

// Validate CSV data against a schema
export function validateCSVData(
	data: Record<string, string>[],
	validator: (row: Record<string, string>, index: number) => { valid: boolean; errors: string[] }
): { valid: boolean; errors: { row: number; errors: string[] }[] } {
	const validationErrors: { row: number; errors: string[] }[] = [];
	
	data.forEach((row, index) => {
		const validation = validator(row, index);
		if (!validation.valid) {
			validationErrors.push({
				row: index + 1,
				errors: validation.errors
			});
		}
	});

	return {
		valid: validationErrors.length === 0,
		errors: validationErrors
	};
}

// Helper function to format data for export
export function formatDataForExport<T extends Record<string, unknown>>(
	data: T[],
	fieldMapping?: Record<string, string>
): Record<string, unknown>[] {
	if (!fieldMapping) {
		return data;
	}

	return data.map(item => {
		const formattedItem: Record<string, unknown> = {};
		
		Object.entries(fieldMapping).forEach(([originalField, displayName]) => {
			formattedItem[displayName] = item[originalField];
		});
		
		return formattedItem;
	});
}

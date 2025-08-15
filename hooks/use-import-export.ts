"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
	exportToCSV,
	importCSVFromFile,
	formatDataForExport,
	validateCSVData,
	type CSVImportOptions,
	type CSVExportOptions,
} from "@/lib/csv-utils";

export interface ImportExportHookOptions<T> {
	exportFilename?: string;
	fieldMapping?: Record<string, string>;
	validator?: (row: Record<string, string>, index: number) => { valid: boolean; errors: string[] };
	onImportSuccess?: (data: T[]) => Promise<void> | void;
	onImportError?: (error: string) => void;
	transformImportData?: (data: Record<string, string>[]) => T[];
	transformExportData?: (data: T[]) => Record<string, unknown>[];
}

export function useImportExport<T extends Record<string, unknown>>(
	options: ImportExportHookOptions<T> = {}
) {
	const [isImporting, setIsImporting] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [importProgress, setImportProgress] = useState(0);

	const exportData = useCallback(
		async (data: T[], customOptions?: CSVExportOptions) => {
			try {
				setIsExporting(true);
				
				if (!data || data.length === 0) {
					toast.error("No data available to export");
					return;
				}

				// Transform data if transformer provided
				const exportData = options.transformExportData 
					? options.transformExportData(data)
					: data;

				// Format data with field mapping if provided
				const formattedData = options.fieldMapping
					? formatDataForExport(exportData, options.fieldMapping)
					: exportData;

				const exportOptions: CSVExportOptions = {
					filename: options.exportFilename || `export_${new Date().toISOString().split('T')[0]}.csv`,
					...customOptions,
				};

				exportToCSV(formattedData, exportOptions);
				toast.success(`Exported ${formattedData.length} records successfully`);
			} catch (error) {
				console.error("Export error:", error);
				toast.error(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
			} finally {
				setIsExporting(false);
			}
		},
		[options]
	);

	const importData = useCallback(
		async (file: File, importOptions?: CSVImportOptions) => {
			try {
				setIsImporting(true);
				setImportProgress(0);

				// Parse CSV file
				setImportProgress(25);
				const rawData = await importCSVFromFile(file, {
					hasHeaders: true,
					maxFileSize: 50 * 1024 * 1024, // 50MB
					...importOptions,
				});

				setImportProgress(50);

				if (!rawData || rawData.length === 0) {
					throw new Error("No data found in the file");
				}

				// Validate data if validator provided
				if (options.validator) {
					setImportProgress(65);
					const validation = validateCSVData(rawData, options.validator);
					
					if (!validation.valid) {
						const errorMessage = validation.errors
							.slice(0, 5) // Show first 5 errors
							.map(err => `Row ${err.row}: ${err.errors.join(", ")}`)
							.join("\n");
						
						throw new Error(`Validation failed:\n${errorMessage}${validation.errors.length > 5 ? "\n...and more" : ""}`);
					}
				}

				// Transform data if transformer provided
				setImportProgress(80);
				const transformedData = options.transformImportData 
					? options.transformImportData(rawData)
					: rawData as T[];

				setImportProgress(90);

				// Call success handler if provided
				if (options.onImportSuccess) {
					await options.onImportSuccess(transformedData);
				}

				setImportProgress(100);
				toast.success(`Successfully imported ${transformedData.length} records`);
				
				return transformedData;
			} catch (error) {
				console.error("Import error:", error);
				const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
				
				if (options.onImportError) {
					options.onImportError(errorMessage);
				}
				
				toast.error(`Import failed: ${errorMessage}`);
				throw error;
			} finally {
				setIsImporting(false);
				setImportProgress(0);
			}
		},
		[options]
	);

	const handleFileUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (file) {
				importData(file);
			}
			// Reset the input value so the same file can be selected again
			event.target.value = '';
		},
		[importData]
	);

	const downloadTemplate = useCallback(
		(templateData: Partial<T>[] = [], templateFilename?: string) => {
			try {
				const filename = templateFilename || `template_${new Date().toISOString().split('T')[0]}.csv`;
				
				// If no template data provided, create a sample row with empty values
				const sampleData = templateData.length > 0 
					? templateData 
					: [{}] as T[];

				// Format template data with field mapping if provided
				const formattedData = options.fieldMapping
					? formatDataForExport(sampleData, options.fieldMapping)
					: sampleData;

				exportToCSV(formattedData, { filename });
				toast.success("Template downloaded successfully");
			} catch (error) {
				console.error("Template download error:", error);
				toast.error("Failed to download template");
			}
		},
		[options.fieldMapping]
	);

	return {
		exportData,
		importData,
		handleFileUpload,
		downloadTemplate,
		isImporting,
		isExporting,
		importProgress,
	};
}

// Predefined field mappings for common entities
export const FIELD_MAPPINGS = {
	suppliers: {
		name: "Supplier Name",
		code: "Supplier Code",
		email: "Email Address",
		phone: "Phone Number",
		website: "Website",
		companyType: "Company Type",
		contactName: "Contact Name",
		contactEmail: "Contact Email",
		contactPhone: "Contact Phone",
		"billingAddress.street": "Billing Street",
		"billingAddress.city": "Billing City",
		"billingAddress.state": "Billing State",
		"billingAddress.country": "Billing Country",
		"billingAddress.zipCode": "Billing Zip Code",
		paymentTerms: "Payment Terms",
		creditLimit: "Credit Limit",
		currency: "Currency",
		status: "Status",
		notes: "Notes",
	},
	products: {
		name: "Product Name",
		sku: "SKU",
		description: "Description",
		category: "Category",
		brand: "Brand",
		unitPrice: "Unit Price",
		costPrice: "Cost Price",
		weight: "Weight",
		dimensions: "Dimensions",
		barcode: "Barcode",
		status: "Status",
		minStockLevel: "Minimum Stock Level",
		maxStockLevel: "Maximum Stock Level",
	},
	inventory: {
		productName: "Product Name",
		sku: "SKU",
		currentStock: "Current Stock",
		reservedStock: "Reserved Stock",
		availableStock: "Available Stock",
		location: "Location",
		warehouseName: "Warehouse",
		lastUpdated: "Last Updated",
		stockValue: "Stock Value",
	},
	orders: {
		orderNumber: "Order Number",
		customerName: "Customer Name",
		orderDate: "Order Date",
		status: "Status",
		totalAmount: "Total Amount",
		shippingAddress: "Shipping Address",
		notes: "Notes",
	},
} as const;

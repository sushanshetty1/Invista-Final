"use client";

import { useRef } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface ImportExportButtonsProps {
	onExport: () => void;
	onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onDownloadTemplate?: () => void;
	isExporting?: boolean;
	isImporting?: boolean;
	disabled?: boolean;
	variant?: "default" | "outline" | "dropdown";
	size?: "sm" | "default" | "lg";
	className?: string;
}

export function ImportExportButtons({
	onExport,
	onImport,
	onDownloadTemplate,
	isExporting = false,
	isImporting = false,
	disabled = false,
	variant = "default",
	size = "default",
	className = "",
}: ImportExportButtonsProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleImportClick = () => {
		if (!disabled && !isImporting) {
			fileInputRef.current?.click();
		}
	};

	if (variant === "dropdown") {
		return (
			<div className={className}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size={size}
							disabled={disabled || isExporting || isImporting}
						>
							<FileSpreadsheet className="h-4 w-4 mr-2" />
							Import/Export
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onExport} disabled={isExporting}>
							<Download className="h-4 w-4 mr-2" />
							{isExporting ? "Exporting..." : "Export Data"}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleImportClick} disabled={isImporting}>
							<Upload className="h-4 w-4 mr-2" />
							{isImporting ? "Importing..." : "Import Data"}
						</DropdownMenuItem>
						{onDownloadTemplate && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={onDownloadTemplate}>
									<FileSpreadsheet className="h-4 w-4 mr-2" />
									Download Template
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
				<input
					ref={fileInputRef}
					type="file"
					accept=".csv"
					onChange={onImport}
					className="hidden"
					aria-label="Import CSV file"
				/>
			</div>
		);
	}

	return (
		<div className={`flex gap-2 ${className}`}>
			<Button
				variant={variant === "outline" ? "outline" : "default"}
				size={size}
				onClick={handleImportClick}
				disabled={disabled || isImporting || isExporting}
			>
				<Upload className="h-4 w-4 mr-2" />
				{isImporting ? "Importing..." : "Import"}
			</Button>
			<Button
				variant={variant === "outline" ? "outline" : "default"}
				size={size}
				onClick={onExport}
				disabled={disabled || isExporting || isImporting}
			>
				<Download className="h-4 w-4 mr-2" />
				{isExporting ? "Exporting..." : "Export"}
			</Button>
			{onDownloadTemplate && (
				<Button
					variant="outline"
					size={size}
					onClick={onDownloadTemplate}
					disabled={disabled}
				>
					<FileSpreadsheet className="h-4 w-4 mr-2" />
					Template
				</Button>
			)}
			<input
				ref={fileInputRef}
				type="file"
				accept=".csv"
				onChange={onImport}
				className="hidden"
				aria-label="Import CSV file"
			/>
		</div>
	);
}

interface ImportProgressCardProps {
	show: boolean;
	progress: number;
	onCancel?: () => void;
}

export function ImportProgressCard({ show, progress, onCancel }: ImportProgressCardProps) {
	if (!show) return null;

	return (
		<Card className="mb-4">
			<CardContent className="pt-6">
				<div className="flex items-center justify-between mb-2">
					<span className="text-sm font-medium">Importing data...</span>
					<span className="text-sm text-muted-foreground">{progress}%</span>
				</div>
				<Progress value={progress} className="mb-2" />
				<div className="flex justify-end">
					{onCancel && (
						<Button variant="outline" size="sm" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

interface ExportOptionsProps {
	onExport: (options: { format: string; includeHeaders: boolean }) => void;
	isExporting: boolean;
}

export function ExportOptionsDropdown({ onExport, isExporting }: ExportOptionsProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" disabled={isExporting}>
					<Download className="h-4 w-4 mr-2" />
					{isExporting ? "Exporting..." : "Export"}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => onExport({ format: "csv", includeHeaders: true })}
				>
					<FileSpreadsheet className="h-4 w-4 mr-2" />
					CSV with Headers
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => onExport({ format: "csv", includeHeaders: false })}
				>
					<FileSpreadsheet className="h-4 w-4 mr-2" />
					CSV without Headers
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

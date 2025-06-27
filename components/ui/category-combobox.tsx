"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { FormControl } from "@/components/ui/form";

interface CategoryComboboxProps {
	categories: string[];
	value?: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	emptyMessage?: string;
	disabled?: boolean;
}

export function CategoryCombobox({
	categories,
	value,
	onValueChange,
	placeholder = "Select category...",
	emptyMessage = "No categories found.",
	disabled = false,
}: CategoryComboboxProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<FormControl>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							"w-full justify-between",
							!value && "text-muted-foreground",
						)}
						disabled={disabled}
					>
						{value || placeholder}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</FormControl>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search categories..." className="h-9" />
					<CommandList>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{categories.map((category) => (
								<CommandItem
									key={category}
									value={category}
									onSelect={(currentValue) => {
										onValueChange(currentValue === value ? "" : currentValue);
										setOpen(false);
									}}
								>
									{category}
									<Check
										className={cn(
											"ml-auto h-4 w-4",
											value === category ? "opacity-100" : "opacity-0",
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Building2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { createSupplierSchema } from "@/lib/validations/supplier";

const companyTypes = [
	{ value: "CORPORATION", label: "Corporation" },
	{ value: "LLC", label: "LLC" },
	{ value: "PARTNERSHIP", label: "Partnership" },
	{ value: "SOLE_PROPRIETORSHIP", label: "Sole Proprietorship" },
	{ value: "NON_PROFIT", label: "Non-Profit" },
	{ value: "GOVERNMENT", label: "Government" },
	{ value: "OTHER", label: "Other" },
];

const supplierStatuses = [
	{ value: "ACTIVE", label: "Active" },
	{ value: "INACTIVE", label: "Inactive" },
	{ value: "PENDING_APPROVAL", label: "Pending Approval" },
];

const currencies = [
	{ value: "USD", label: "USD - US Dollar" },
	{ value: "EUR", label: "EUR - Euro" },
	{ value: "GBP", label: "GBP - British Pound" },
	{ value: "CAD", label: "CAD - Canadian Dollar" },
	{ value: "AUD", label: "AUD - Australian Dollar" },
	{ value: "JPY", label: "JPY - Japanese Yen" },
];

export default function AddSupplierPage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [certifications, setCertifications] = useState<string[]>([]);
	const [newCertification, setNewCertification] = useState("");

	const form = useForm({
		resolver: zodResolver(createSupplierSchema),
		defaultValues: {
			name: "",
			code: "",
			email: "",
			phone: "",
			website: "",
			companyType: undefined,
			taxId: "",
			vatNumber: "",
			registrationNumber: "",
			billingAddress: {
				street: "",
				city: "",
				state: "",
				country: "",
				zipCode: "",
			},
			shippingAddress: {
				street: "",
				city: "",
				state: "",
				country: "",
				zipCode: "",
			},
			contactName: "",
			contactEmail: "",
			contactPhone: "",
			contactTitle: "",
			paymentTerms: "",
			creditLimit: undefined,
			currency: "USD",
			rating: undefined,
			onTimeDelivery: undefined,
			qualityRating: undefined,
			status: "ACTIVE",
			certifications: [],
			notes: "",
			createdBy: "", // This will be filled from the auth context
		},
	});

	const watchBillingAddress = form.watch("billingAddress");
	const [copyBilling, setCopyBilling] = useState(false);

	const handleCopyBillingAddress = (checked: boolean) => {
		setCopyBilling(checked);
		if (checked) {
			form.setValue("shippingAddress", watchBillingAddress);
		} else {
			form.setValue("shippingAddress", {
				street: "",
				city: "",
				state: "",
				country: "",
				zipCode: "",
			});
		}
	};

	const addCertification = () => {
		if (newCertification.trim() && !certifications.includes(newCertification.trim())) {
			const updated = [...certifications, newCertification.trim()];
			setCertifications(updated);
			form.setValue("certifications", updated);
			setNewCertification("");
		}
	};

	const removeCertification = (certification: string) => {
		const updated = certifications.filter((c) => c !== certification);
		setCertifications(updated);
		form.setValue("certifications", updated);
	};

	const onSubmit = async (data: z.infer<typeof createSupplierSchema>) => {
		try {
			setIsSubmitting(true);
			
			// Get user ID from auth context (you'll need to implement this)
			const userId = "current-user-id"; // Replace with actual user ID from auth
			
			const response = await fetch("/api/suppliers", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...data,
					createdBy: userId,
					certifications,
				}),
			});

			if (response.ok) {
				toast.success("Supplier created successfully");
				router.push("/suppliers");
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to create supplier");
			}
		} catch (error) {
			console.error("Error creating supplier:", error);
			toast.error("Error creating supplier");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="py-16 px-6 mx-4 md:mx-8 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link href="/suppliers">
					<Button variant="outline" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-3xl font-bold">Add New Supplier</h1>
					<p className="text-muted-foreground">
						Create a new supplier profile with contact and business information
					</p>
				</div>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								Basic Information
							</CardTitle>
							<CardDescription>
								Enter the supplier&apos;s basic business information
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Supplier Name *</FormLabel>
											<FormControl>
												<Input placeholder="Enter supplier name" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="code"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Supplier Code *</FormLabel>
											<FormControl>
												<Input placeholder="SUP-001" {...field} />
											</FormControl>
											<FormDescription>
												Unique identifier for this supplier
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input
													type="email"
													placeholder="supplier@company.com"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="phone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Phone</FormLabel>
											<FormControl>
												<Input placeholder="+1 (555) 123-4567" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="website"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Website</FormLabel>
											<FormControl>
												<Input
													placeholder="https://company.com"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="companyType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Company Type</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select company type" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{companyTypes.map((type) => (
														<SelectItem key={type.value} value={type.value}>
															{type.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="status"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Status</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select status" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{supplierStatuses.map((status) => (
														<SelectItem key={status.value} value={status.value}>
															{status.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<FormField
									control={form.control}
									name="taxId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tax ID</FormLabel>
											<FormControl>
												<Input placeholder="123-45-6789" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="vatNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>VAT Number</FormLabel>
											<FormControl>
												<Input placeholder="GB123456789" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="registrationNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Registration Number</FormLabel>
											<FormControl>
												<Input placeholder="REG123456" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Contact Information */}
					<Card>
						<CardHeader>
							<CardTitle>Primary Contact</CardTitle>
							<CardDescription>
								Main contact person for this supplier
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="contactName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Contact Name</FormLabel>
											<FormControl>
												<Input placeholder="John Doe" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="contactTitle"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Contact Title</FormLabel>
											<FormControl>
												<Input placeholder="Sales Manager" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="contactEmail"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Contact Email</FormLabel>
											<FormControl>
												<Input
													type="email"
													placeholder="john@company.com"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="contactPhone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Contact Phone</FormLabel>
											<FormControl>
												<Input placeholder="+1 (555) 123-4567" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Address Information */}
					<Card>
						<CardHeader>
							<CardTitle>Address Information</CardTitle>
							<CardDescription>
								Billing and shipping addresses for this supplier
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Billing Address */}
							<div>
								<h4 className="text-lg font-medium mb-4">Billing Address</h4>
								<div className="space-y-4">
									<FormField
										control={form.control}
										name="billingAddress.street"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Street Address *</FormLabel>
												<FormControl>
													<Input placeholder="123 Main St" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
										<FormField
											control={form.control}
											name="billingAddress.city"
											render={({ field }) => (
												<FormItem>
													<FormLabel>City *</FormLabel>
													<FormControl>
														<Input placeholder="New York" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="billingAddress.state"
											render={({ field }) => (
												<FormItem>
													<FormLabel>State *</FormLabel>
													<FormControl>
														<Input placeholder="NY" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="billingAddress.country"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Country *</FormLabel>
													<FormControl>
														<Input placeholder="USA" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="billingAddress.zipCode"
											render={({ field }) => (
												<FormItem>
													<FormLabel>ZIP Code *</FormLabel>
													<FormControl>
														<Input placeholder="10001" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</div>
							</div>

							{/* Shipping Address */}
							<div>
								<div className="flex items-center justify-between mb-4">
									<h4 className="text-lg font-medium">Shipping Address</h4>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="copy-billing"
											checked={copyBilling}
											onCheckedChange={handleCopyBillingAddress}
										/>
										<label
											htmlFor="copy-billing"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Same as billing address
										</label>
									</div>
								</div>

								{!copyBilling && (
									<div className="space-y-4">
										<FormField
											control={form.control}
											name="shippingAddress.street"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Street Address</FormLabel>
													<FormControl>
														<Input placeholder="123 Main St" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
											<FormField
												control={form.control}
												name="shippingAddress.city"
												render={({ field }) => (
													<FormItem>
														<FormLabel>City</FormLabel>
														<FormControl>
															<Input placeholder="New York" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="shippingAddress.state"
												render={({ field }) => (
													<FormItem>
														<FormLabel>State</FormLabel>
														<FormControl>
															<Input placeholder="NY" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="shippingAddress.country"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Country</FormLabel>
														<FormControl>
															<Input placeholder="USA" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="shippingAddress.zipCode"
												render={({ field }) => (
													<FormItem>
														<FormLabel>ZIP Code</FormLabel>
														<FormControl>
															<Input placeholder="10001" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Financial Information */}
					<Card>
						<CardHeader>
							<CardTitle>Financial Information</CardTitle>
							<CardDescription>
								Payment terms and financial details
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<FormField
									control={form.control}
									name="paymentTerms"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Payment Terms</FormLabel>
											<FormControl>
												<Input placeholder="Net 30" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="creditLimit"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Credit Limit</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="10000"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value ? Number(e.target.value) : undefined
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="currency"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Currency</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select currency" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{currencies.map((currency) => (
														<SelectItem key={currency.value} value={currency.value}>
															{currency.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Performance & Certifications */}
					<Card>
						<CardHeader>
							<CardTitle>Performance & Certifications</CardTitle>
							<CardDescription>
								Supplier performance metrics and certifications
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<FormField
									control={form.control}
									name="rating"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Overall Rating (1-5)</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="1"
													max="5"
													placeholder="4"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value ? Number(e.target.value) : undefined
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="onTimeDelivery"
									render={({ field }) => (
										<FormItem>
											<FormLabel>On-Time Delivery (%)</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="0"
													max="100"
													placeholder="95"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value ? Number(e.target.value) : undefined
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="qualityRating"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Quality Rating (1-5)</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="1"
													max="5"
													placeholder="4"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value ? Number(e.target.value) : undefined
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Certifications */}
							<div>
								<label htmlFor="certifications-input" className="text-sm font-medium">Certifications</label>
								<div className="mt-2 space-y-2">
									<div className="flex gap-2">
										<Input
											id="certifications-input"
											placeholder="Enter certification (e.g., ISO 9001)"
											value={newCertification}
											onChange={(e) => setNewCertification(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													addCertification();
												}
											}}
										/>
										<Button
											type="button"
											variant="outline"
											onClick={addCertification}
										>
											Add
										</Button>
									</div>
									<div className="flex flex-wrap gap-2">
										{certifications.map((cert) => (
											<Badge key={cert} variant="secondary" className="pr-1">
												{cert}
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-4 w-4 p-0 ml-1"
													onClick={() => removeCertification(cert)}
												>
													<X className="h-3 w-3" />
												</Button>
											</Badge>
										))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Notes */}
					<Card>
						<CardHeader>
							<CardTitle>Additional Notes</CardTitle>
							<CardDescription>
								Any additional information about this supplier
							</CardDescription>
						</CardHeader>
						<CardContent>
							<FormField
								control={form.control}
								name="notes"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Notes</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Enter any additional notes or comments..."
												className="min-h-[100px]"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					{/* Form Actions */}
					<div className="flex gap-4 justify-end">
						<Link href="/suppliers">
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</Link>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
									Creating...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Create Supplier
								</>
							)}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}

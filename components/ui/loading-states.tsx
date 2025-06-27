import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const CompanyProfileSkeleton = React.memo(
	function CompanyProfileSkeleton() {
		return (
			<div className="container mx-auto py-6 space-y-6">
				{/* Header Skeleton */}
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-96" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>

				{/* Tabs Skeleton */}
				<div className="space-y-4">
					<div className="flex space-x-4">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-20" />
						<Skeleton className="h-10 w-28" />
					</div>
					{/* Profile Tab Content Skeleton */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Company Info Card */}
						<Card className="lg:col-span-2">
							<CardHeader>
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-64" />
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="space-y-2">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-10 w-full" />
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Company Logo Card */}
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-32 w-32 mx-auto" />
								<Skeleton className="h-10 w-full" />
							</CardContent>
						</Card>
					</div>
					{/* Additional Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-40" />
								<Skeleton className="h-4 w-56" />
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									{Array.from({ length: 4 }).map((_, i) => (
										<div key={i} className="space-y-2">
											<Skeleton className="h-4 w-16" />
											<Skeleton className="h-10 w-full" />
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-60" />
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3">
									{Array.from({ length: 3 }).map((_, i) => (
										<div key={i} className="space-y-2">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-10 w-full" />
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>{" "}
				</div>
			</div>
		);
	},
);

export const TeamMembersSkeleton = React.memo(function TeamMembersSkeleton() {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-10 w-28" />
			</div>

			{/* Team Members List */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="space-y-2">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-56" />
						</div>
						<Skeleton className="h-10 w-32" />
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between p-4 border rounded-lg"
							>
								<div className="flex items-center space-x-4">
									<Skeleton className="h-10 w-10 rounded-full" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-48" />
									</div>
								</div>
								<div className="flex items-center space-x-2">
									<Skeleton className="h-6 w-20" />
									<Skeleton className="h-8 w-8" />
								</div>
							</div>
						))}
					</div>{" "}
				</CardContent>
			</Card>
		</div>
	);
});

interface LoadingStateProps {
	message?: string;
	description?: string;
}

export const LoadingState = React.memo(function LoadingState({
	message = "Loading...",
	description = "Please wait while we fetch your data",
}: LoadingStateProps) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
			<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			<div className="text-center space-y-2">
				<h3 className="text-lg font-medium">{message}</h3>
				<p className="text-muted-foreground text-sm">{description}</p>{" "}
			</div>
		</div>
	);
});

export const ErrorState = React.memo(function ErrorState({
	message = "Something went wrong",
	description = "We encountered an error while loading your data",
	onRetry,
}: {
	message?: string;
	description?: string;
	onRetry?: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
			<div className="text-destructive">
				<svg
					className="h-12 w-12"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<div className="text-center space-y-2">
				<h3 className="text-lg font-medium">{message}</h3>
				<p className="text-muted-foreground text-sm">{description}</p>
				{onRetry && (
					<button
						onClick={onRetry}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
					>
						Try Again
					</button>
				)}
			</div>
		</div>
	);
});

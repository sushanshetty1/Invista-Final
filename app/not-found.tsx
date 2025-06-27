import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background">
			<div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
				<h1 className="text-4xl font-bold tracking-tight text-foreground">
					404 - Page Not Found
				</h1>
				<p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
					The page you are looking for could not be found. It might have been
					moved, deleted, or you entered the wrong URL.
				</p>
				<div className="flex gap-2">
					<Link
						href="/"
						className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
					>
						Go Home
					</Link>
					<Link
						href="/dashboard"
						className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
					>
						Dashboard
					</Link>
				</div>
			</div>
		</div>
	);
}

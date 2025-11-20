// ^ Multi-database Prisma client setup
// * This file provides easy access to both Neon and Supabase databases

import { PrismaClient as NeonPrismaClient } from "../prisma/generated/neon";
import { PrismaClient as SupabasePrismaClient } from "../prisma/generated/supabase";

// * Neon database client
const neonDatabaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!neonDatabaseUrl) {
	console.error("Environment variables available:", Object.keys(process.env).filter(k => k.includes("DATABASE")));
	throw new Error("NEON_DATABASE_URL or DATABASE_URL environment variable is not set");
}

// Validate URL format
if (!neonDatabaseUrl.startsWith("postgresql://")) {
	throw new Error("NEON_DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql://");
}

// Singleton pattern to prevent multiple instances in development
const globalForNeon = globalThis as unknown as {
	neonClient: NeonPrismaClient | undefined;
};

export const neonClient = globalForNeon.neonClient ?? new NeonPrismaClient({
	datasources: {
		neonDb: {
			url: neonDatabaseUrl,
		},
	},
	log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
	globalForNeon.neonClient = neonClient;
}

// * Supabase database client
const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!supabaseDatabaseUrl) {
	console.error("Environment variables available:", Object.keys(process.env).filter(k => k.includes("DATABASE")));
	throw new Error("SUPABASE_DATABASE_URL environment variable is not set");
}

// Validate URL format
if (!supabaseDatabaseUrl.startsWith("postgresql://")) {
	throw new Error("SUPABASE_DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql://");
}

// Singleton pattern to prevent multiple instances in development
const globalForSupabase = globalThis as unknown as {
	supabaseClient: SupabasePrismaClient | undefined;
};

export const supabaseClient = globalForSupabase.supabaseClient ?? new SupabasePrismaClient({
	datasources: {
		supabaseDb: {
			url: supabaseDatabaseUrl,
		},
	},
	log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
	globalForSupabase.supabaseClient = supabaseClient;
}

// ^ Helper function to disconnect all clients
export const disconnectAll = async () => {
	await neonClient.$disconnect();
	await supabaseClient.$disconnect();
};

// * Example usage in your application:
//
// import { neonClient, supabaseClient } from '@/lib/db'
//
// & Use Neon database
// const users = await neonClient.user.findMany()
//
// & Use Supabase database
// const profiles = await supabaseClient.profile.findMany()

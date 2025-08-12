"use client";
import Link from "next/link";
import { Package2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  showText?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  statusDot?: boolean;
  textClassName?: string;
}

const sizeMap = {
  sm: { box: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-base" },
  md: { box: "h-9 w-9", icon: "h-4.5 w-4.5", text: "text-lg" },
  lg: { box: "h-11 w-11", icon: "h-5 w-5", text: "text-xl" }
};

export function Logo({ showText = true, href = "/dashboard", size = "md", className, statusDot = true, textClassName }: LogoProps) {
  const sizes = sizeMap[size];
  const content = (
    <span className={cn("group inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className={cn("relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 shadow-sm ring-1 ring-indigo-500/30 dark:ring-indigo-400/30", sizes.box)}>
        <Package2 className={cn("text-white", sizes.icon)} />
        {statusDot && (
          <span className="absolute -top-0.5 -left-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
        )}
      </span>
      {showText && <span className={cn("bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent", sizes.text, textClassName)}>Invista</span>}
    </span>
  );
  return (
    <Link href={href} aria-label="Invista Home" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
      {content}
    </Link>
  );
}

export default Logo;

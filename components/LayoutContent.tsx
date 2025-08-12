"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollDetector } from "@/components/scroll-detector";
import { Analytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

const Sidebar = dynamic(() => import("@/components/Sidebar"), {
  ssr: false
});

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const pathname = usePathname();
  const isDashboardSection = /^\/(dashboard|inventory|orders|purchase-orders|audits|reports)(\/|$)/.test(pathname);
  const isProtectedProfile = /^\/(user-profile|company-profile)(\/|$)/.test(pathname);
  const useShell = isDashboardSection || isProtectedProfile;

  // Manage body padding classes (shell layout should have no top padding)
  useEffect(() => {
    if (useShell) {
      document.body.classList.add("shell-layout");
      document.body.classList.remove("single-deck-layout", "dashboard-layout");
    } else {
      document.body.classList.remove("shell-layout");
    }
    return () => {
      document.body.classList.remove("shell-layout");
    };
  }, [useShell]);

  // Close mobile drawer on route change (listen via hashchange/popstate minimal) - simple heuristic
  useEffect(() => {
    const handler = () => setMobileOpen(false);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (!useShell) {
    return (
      <>
        <Navbar />
        {children}
      </>
    ); // render plain for marketing, auth, landing, waiting pages
  }

  return (
    <>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div
        className="flex min-h-screen flex-col transition-[margin-left] duration-300"
        style={{ marginLeft: collapsed ? 60 : 240 }}
      >
        <Header
          onMenuClick={() => setMobileOpen(true)}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 container mx-auto w-full px-4 py-4 md:px-6 lg:px-8">
          {children}
        </main>
        <Footer />
      </div>
      <ScrollDetector />
      <Analytics />
    </>
  );
}

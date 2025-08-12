"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardGuard from "@/components/DashboardGuard";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { User as UserIcon, LogOut } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: { title: string; href: string }[];
}

interface InternalNavItem extends NavItem { id: string; }

interface SidebarProps {
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function SidebarInner({
  className,
  mobileOpen = false,
  onMobileClose,
  collapsed: collapsedProp,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(collapsedProp ?? false);

  // keep internal + external state in sync
  useEffect(() => {
    if (collapsedProp !== undefined && collapsedProp !== collapsed) {
      setCollapsed(collapsedProp);
    }
  }, [collapsedProp, collapsed]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      onCollapsedChange?.(next);
      return next;
    });
  }, [onCollapsedChange]);

  // Set a CSS variable on body for layout shift (used by layout container for margin-left)
  useEffect(() => {
    const width = collapsed ? 60 : 240; // match class widths
    document.documentElement.style.setProperty("--sidebar-width", width + "px");
  }, [collapsed]);

  const navItems: InternalNavItem[] = [
    { id: "dashboard", title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, items: [{ title: "Overview", href: "/dashboard" }] },
    { id: "inventory", title: "Inventory", href: "/inventory", icon: Package, items: [ { title: "Overview", href: "/inventory" }, { title: "Products", href: "/inventory/products" }, { title: "Stock", href: "/inventory/stock" }, { title: "Categories", href: "/inventory/categories" }, { title: "Suppliers", href: "/inventory/suppliers" } ] },
    { id: "orders", title: "Orders", href: "/orders", icon: ShoppingCart, items: [ { title: "All Orders", href: "/orders" }, { title: "Create Order", href: "/orders/create" } ] },
    { id: "purchase-orders", title: "Purchase Orders", href: "/purchase-orders", icon: Truck, items: [ { title: "All POs", href: "/purchase-orders" }, { title: "Create PO", href: "/purchase-orders/create" } ] },
    { id: "audits", title: "Audits", href: "/audits", icon: FileText, items: [ { title: "Overview", href: "/audits" } ] },
    { id: "reports", title: "Reports", href: "/reports", icon: BarChart3, items: [ { title: "Overview", href: "/reports" }, { title: "Financial", href: "/reports/financial" }, { title: "Inventory", href: "/reports/inventory" } ] },
  ];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // auto-open active group
    navItems.forEach(item => {
      const active = pathname === item.href || pathname.startsWith(item.href + "/");
      if (active) {
        setOpenGroups(prev => ({ ...prev, [item.id]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      <div
        role="presentation"
        aria-hidden={!mobileOpen}
        onClick={onMobileClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        aria-label="Primary"
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-[width,transform] duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        <div className="flex h-[60px] items-center border-b px-3">
          <Button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={toggleCollapse}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 pt-3">
          <nav className="space-y-1 px-2" aria-label="Main navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const groupOpen = openGroups[item.id];
              return (
                <div key={item.id} className="group/navigation">
                  <button
                    type="button"
                    onClick={() => (collapsed ? (window.location.href = item.href) : toggleGroup(item.id))}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-accent/20 text-foreground"
                        : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      collapsed && "justify-center"
                    )}
                    aria-expanded={!collapsed && !!groupOpen}
                    aria-controls={`group-${item.id}`}
                    aria-label={collapsed ? item.title : undefined}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="flex-1 text-left">{item.title}</span>}
                    {!collapsed && item.items && item.items.length > 0 && (
                      <span className={cn("transition-transform text-sm", groupOpen ? "rotate-90" : "")}>›</span>
                    )}
                  </button>
                  {!collapsed && item.items && item.items.length > 0 && groupOpen && (
                    <ul id={`group-${item.id}`} className="ml-4 mt-1 space-y-1" role="list">
                      {item.items.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              className={cn(
                                "block rounded-md px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                                subActive ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                              )}
                              aria-label={collapsed ? sub.title : undefined}
                              title={collapsed ? sub.title : undefined}
                            >
                              {sub.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>
        {/* User Profile / Account Section */}
        <div className="border-t p-2">
          <div className={cn("flex items-center gap-3 rounded-md px-2 py-2 transition-colors", collapsed ? "justify-center" : "")}> 
            <Link
              href={user ? "/user-profile" : "/auth/login"}
              className={cn(
                "group flex flex-1 items-center gap-3 rounded-md px-2 py-2 text-sm font-medium outline-none transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring",
                collapsed && "justify-center px-0"
              )}
              aria-label={collapsed ? (user?.user_metadata?.full_name || user?.email || "Account") : "User profile"}
              title={collapsed ? (user?.user_metadata?.full_name || user?.email || "Account") : undefined}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold">
                {user?.email?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
              </div>
              {!collapsed && (
                <div className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-sm font-medium">{user?.user_metadata?.full_name || user?.email || "Guest"}</span>
                  <span className="truncate text-xs text-muted-foreground">{user ? "View profile" : "Sign in"}</span>
                </div>
              )}
            </Link>
            {!collapsed && user && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Log out"
                className="h-8 w-8 shrink-0"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <DashboardGuard>
      <SidebarInner {...props} />
    </DashboardGuard>
  );
}

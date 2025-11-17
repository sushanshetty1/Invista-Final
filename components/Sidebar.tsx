"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  ShoppingCart,
  Truck,
  User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardGuard from "@/components/DashboardGuard";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: { title: string; href: string }[];
}

interface InternalNavItem extends NavItem {
  id: string;
}

interface SidebarProps {
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const navItems: InternalNavItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Overview", href: "/dashboard" },
      { title: "Analytics", href: "/dashboard/analytics" },
      { title: "Notifications", href: "/dashboard/notifications" },
      { title: "Settings", href: "/dashboard/settings" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    items: [
      { title: "Overview", href: "/inventory" },
      { title: "Products", href: "/inventory/products" },
      { title: "Stock Management", href: "/inventory/stock" },
      { title: "Categories", href: "/inventory/categories" },
      { title: "Low Stock Alerts", href: "/inventory/alerts" },
      { title: "Stock Adjustments", href: "/inventory/adjustments" },
      { title: "Reports", href: "/inventory/reports" },
    ],
  },
  {
    id: "orders",
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    items: [
      { title: "Customer Orders", href: "/orders" },
      { title: "Create Order", href: "/orders/create" },
      { title: "Pending Orders", href: "/orders?status=PENDING" },
      { title: "Processing", href: "/orders?status=PROCESSING" },
      { title: "Shipped Orders", href: "/orders?status=SHIPPED" },
      { title: "Order Analytics", href: "/orders/analytics" },
    ],
  },
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    href: "/purchase-orders",
    icon: Truck,
    items: [
      { title: "All Purchase Orders", href: "/purchase-orders" },
      { title: "Create PO", href: "/purchase-orders/create" },
      { title: "Pending Approval", href: "/purchase-orders?status=PENDING_APPROVAL" },
      { title: "Awaiting Delivery", href: "/purchase-orders?status=APPROVED" },
      { title: "Reorder Suggestions", href: "/purchase-orders?tab=reorder" },
      { title: "Goods Receipt", href: "/purchase-orders/goods-receipt" },
    ],
  },
  {
    id: "audits",
    title: "Audits",
    href: "/audits",
    icon: FileText,
    items: [
      { title: "Overview", href: "/audits" },
      { title: "Cycle Counting", href: "/audits/cycle-counting" },
      { title: "Compliance Reports", href: "/audits/compliance" },
      { title: "Audit History", href: "/audits/history" },
    ],
  },
  {
    id: "suppliers",
    title: "Suppliers",
    href: "/suppliers",
    icon: Building2,
    items: [
      { title: "All Suppliers", href: "/suppliers" },
      { title: "Add Supplier", href: "/suppliers/add" },
      { title: "Performance", href: "/suppliers/performance" },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    items: [
      { title: "Overview", href: "/reports" },
      { title: "Inventory Reports", href: "/reports/inventory" },
      { title: "Sales Reports", href: "/reports/sales" },
      { title: "Financial Reports", href: "/reports/financial" },
      { title: "Custom Reports", href: "/reports/custom" },
    ],
  },
  {
    id: "rag",
    title: "AI Assistant",
    href: "/rag",
    icon: MessageSquare,
  },
];

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
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  }, [collapsed, onCollapsedChange]);

  // Set a CSS variable on body for layout shift (used by layout container for margin-left)
  useEffect(() => {
    const width = collapsed ? 60 : 240; // Back to original width
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
  }, [collapsed]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // auto-open active group, but close all others
    const activeItem = navItems.find((item) => {
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
    
    if (activeItem) {
      setOpenGroups({ [activeItem.id]: true });
    } else {
      // If no active item found, close all groups
      setOpenGroups({});
    }
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      // Close all groups and only open the clicked one if it wasn't already open
      const isCurrentlyOpen = prev[id];
      const newState: Record<string, boolean> = {};
      
      // Only open the clicked group if it wasn't already open
      if (!isCurrentlyOpen) {
        newState[id] = true;
      }
      
      return newState;
    });
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
        {/* Header with logo and collapse button */}
        <div className="flex h-[60px] items-center justify-between border-b px-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center space-x-3 group flex-shrink-0 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              >
                <div className="relative">
                  <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg blur-md opacity-50 group-hover:opacity-80 transition-all duration-300 group-hover:scale-125" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-all duration-300 border border-white/20 dark:border-white/10">
                    <Package className="h-6 w-6 text-white drop-shadow-sm" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-background shadow-lg">
                    <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75" />
                  </div>
                </div>
                <div className="relative">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent truncate group-hover:from-blue-500 group-hover:via-indigo-500 group-hover:to-purple-500 transition-all duration-300">
                    Invista
                  </span>
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300" />
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <button
                type="button"
                onClick={toggleCollapse}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse();
                  }
                }}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md group"
              >
                <div className="relative">
                  <div className="absolute inset-0 w-9 h-9 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg blur-md opacity-50 group-hover:opacity-80 transition-all duration-300 group-hover:scale-125" />
                  <div className="relative w-9 h-9 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-all duration-300 border border-white/20 dark:border-white/10">
                    <Package className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                </div>
              </button>
            </div>
          )}

          {!collapsed && (
            <Button
              aria-label="Collapse sidebar"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={toggleCollapse}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 pt-3">
          <nav className="space-y-1 px-2" aria-label="Main navigation">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const groupOpen = openGroups[item.id];
              const hasSubItems = item.items && item.items.length > 0;

              return (
                <div key={item.id} className="group/navigation">
                  {collapsed ? (
                    <Link
                      href={item.href}
                      className={cn(
                        "w-full flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                      aria-label={item.title}
                      title={item.title}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                    </Link>
                  ) : hasSubItems ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                      aria-expanded={!!groupOpen}
                      aria-controls={`group-${item.id}`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{item.title}</span>
                      {hasSubItems && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            groupOpen ? "rotate-180" : ""
                          )}
                        />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                      aria-label={item.title}
                      title={item.title}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{item.title}</span>
                    </Link>
                  )}

                  {!collapsed && hasSubItems && groupOpen && (
                    <div id={`group-${item.id}`} className="mt-1 space-y-1">
                      {item.items?.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "block rounded-md px-3 py-1.5 ml-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                              subActive
                                ? "bg-accent/70 text-accent-foreground font-medium"
                                : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                            )}
                          >
                            {sub.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Profile / Account Section */}
        <div className="border-t p-3">
          {collapsed ? (
            <div className="flex justify-center">
              <Link
                href={user ? "/user-profile" : "/auth/login"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                aria-label={
                  user?.user_metadata?.full_name || user?.email || "Account"
                }
                title={
                  user?.user_metadata?.full_name || user?.email || "Account"
                }
              >
                {user?.email?.[0]?.toUpperCase() || (
                  <UserIcon className="h-4 w-4" />
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/30 transition-colors">
              <Link
                href={user ? "/user-profile" : "/auth/login"}
                className="flex flex-1 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {user?.email?.[0]?.toUpperCase() || (
                    <UserIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-sm font-medium text-foreground">
                    {user?.user_metadata?.full_name || user?.email || "Guest"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user ? "View profile" : "Sign in"}
                  </span>
                </div>
              </Link>
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Log out"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
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

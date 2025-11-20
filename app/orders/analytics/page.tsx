"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardGuard from "@/components/DashboardGuard";
import { CreditCard, DollarSign, Package, RefreshCw, TrendingUp, Truck } from "lucide-react";
import { Line as ChartLine, LineChart as RechartsLineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AnalyticsResponse {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    pendingPayments: number;
    fulfillmentEfficiency: number;
  };
  revenueTrend: Array<{ date: string; revenue: number; orders: number }>;
  topCustomers: Array<{
    customerId: string;
    name: string;
    orders: number;
    spend: number;
    lastOrder: string | null;
    status: string | null;
  }>;
  upcomingFulfillment: Array<{
    orderId: string;
    orderNumber: string;
    customer: string;
    eta: string | null;
    items: number;
    remainingItems: number;
    priority: string;
    status: string;
  }>;
  operations: {
    backorderRate: number;
    onTimeDeliveryRate: number;
    pendingPaymentCount: number;
    awaitingShipmentCount: number;
    shippedItemsRatio: number;
    totalOrderedQty: number;
    totalRemainingQty: number;
  };
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return currencyFormatter.format(value);
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return percentFormatter.format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case "URGENT":
    case "HIGH":
      return "destructive";
    case "LOW":
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "Unknown";
  }
  return status.replace(/_/g, " ");
}

export default function OrderAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || authLoading) {
      return;
    }

    let isMounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/orders/analytics", {
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load analytics");
        }

        const payload: AnalyticsResponse = await response.json();
        if (isMounted) {
          setData(payload);
        }
      } catch (err) {
        console.error("Failed to fetch order analytics:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const chartData = useMemo(() => {
    if (!data?.revenueTrend) {
      return [];
    }

    return data.revenueTrend.map((point) => {
      const date = new Date(point.date);
      const label = Number.isNaN(date.getTime())
        ? point.date
        : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(date);

      return {
        label,
        revenue: point.revenue,
        orders: point.orders,
      };
    });
  }, [data?.revenueTrend]);

  const metricCards = useMemo(() => {
    if (!data) {
      return [
        {
          title: "Total Orders",
          value: "—",
          subtitle: "Loading...",
          icon: Package,
        },
        {
          title: "Total Revenue",
          value: "—",
          subtitle: "Loading...",
          icon: DollarSign,
        },
        {
          title: "Fulfillment Efficiency",
          value: "—",
          subtitle: "Loading...",
          icon: Truck,
        },
        {
          title: "Pending Payments",
          value: "—",
          subtitle: "Loading...",
          icon: CreditCard,
        },
      ];
    }

    const { stats } = data;

    return [
      {
        title: "Total Orders",
        value: formatNumber(stats.totalOrders),
        subtitle: `${formatNumber(stats.deliveredOrders)} delivered`,
        icon: Package,
      },
      {
        title: "Total Revenue",
        value: formatCurrency(stats.totalRevenue),
        subtitle: `Avg order ${formatCurrency(stats.averageOrderValue)}`,
        icon: DollarSign,
      },
      {
        title: "Fulfillment Efficiency",
        value: formatPercent(stats.fulfillmentEfficiency),
        subtitle: `${formatNumber(stats.shippedOrders)} shipped / ${formatNumber(stats.pendingOrders)} pending`,
        icon: Truck,
      },
      {
        title: "Pending Payments",
        value: formatNumber(stats.pendingPayments),
        subtitle: "Orders awaiting capture",
        icon: CreditCard,
      },
    ];
  }, [data]);

  const operations = data?.operations;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardGuard>
    <div className="flex min-h-screen w-full flex-col bg-muted/10">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">Order Analytics</h1>
            <p className="text-muted-foreground">
              Monitor performance, revenue, and fulfillment momentum at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={loading}>
              Export report
            </Button>
            <Button disabled={loading}>Schedule digest</Button>
          </div>
        </header>

        {error ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6 text-destructive">
              <RefreshCw className="h-4 w-4" />
              <span>{error}</span>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title} className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.subtitle}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Revenue &amp; order trends</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Daily revenue against order volume over the past 30 days.
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Compare periods
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-72 items-center justify-center text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
              ) : chartData.length > 0 ? (
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                    orders: {
                      label: "Orders",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="w-full"
                >
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                      className="text-xs text-muted-foreground"
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(value) => formatCurrency(value).replace("$", "")}
                      allowDecimals={false}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                      className="text-xs text-muted-foreground"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      allowDecimals={false}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                      className="text-xs text-muted-foreground"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <ChartLine
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue, hsl(var(--chart-1)))"
                      strokeWidth={2}
                      dot={false}
                      name="Revenue"
                    />
                    <ChartLine
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="var(--color-orders, hsl(var(--chart-2)))"
                      strokeWidth={2}
                      dot={false}
                      name="Orders"
                    />
                  </RechartsLineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-72 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-5 w-5" />
                  <span>No orders recorded in the last 30 days.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fulfillment pipeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Orders approaching shipment across all warehouses.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
              ) : data?.upcomingFulfillment?.length ? (
                data.upcomingFulfillment.map((order) => (
                  <div key={order.orderId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customer}</p>
                      </div>
                      <Badge variant={getPriorityVariant(order.priority)}>
                        {order.priority}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ETA</span>
                      <span>{formatDate(order.eta)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Items</span>
                      <span>
                        {formatNumber(order.items)}
                        {order.remainingItems > 0
                          ? ` (${formatNumber(order.remainingItems)} remaining)`
                          : ""}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No active fulfillment tasks.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top customers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Highest order value contributors this period.
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                View all
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
              ) : data?.topCustomers?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Last order</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topCustomers.map((customer) => (
                      <TableRow key={customer.customerId}>
                        <TableCell>
                          <div className="font-medium">{customer.name}</div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(customer.orders)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customer.spend)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(customer.lastOrder)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {getStatusLabel(customer.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-sm text-muted-foreground">
                  No customer data available.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Operations summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Live health indicators from order fulfillment.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Backorder rate</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">
                    {formatPercent(operations?.backorderRate)}
                  </span>
                  <Badge
                    variant={
                      operations && operations.backorderRate > 0.1
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {formatNumber(operations?.totalRemainingQty)} units pending
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Calculated from remaining line item quantities across all open orders.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">On-time delivery</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">
                    {formatPercent(operations?.onTimeDeliveryRate)}
                  </span>
                  <Badge variant="outline">
                    {formatPercent(operations?.shippedItemsRatio)} items shipped
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Based on delivered orders compared to promised or required dates.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Awaiting shipment</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">
                    {formatNumber(operations?.awaitingShipmentCount)}
                  </span>
                  <Badge variant="secondary">
                    {formatNumber(data?.stats.pendingOrders)} orders in queue
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Orders confirmed or processing but not yet shipped.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
    </DashboardGuard>
  );
}

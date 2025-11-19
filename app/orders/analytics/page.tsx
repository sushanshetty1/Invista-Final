import { ArrowUpRight, LineChart, TrendingDown, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const metricCards = [
  {
    title: "Total Orders",
    value: "1,582",
    change: "+12.4% vs last month",
    icon: LineChart,
  },
  {
    title: "Revenue",
    value: "$248,920",
    change: "+9.8% vs last month",
    icon: ArrowUpRight,
  },
  {
    title: "Avg. Order Value",
    value: "$157.50",
    change: "+3.2% vs last month",
    icon: TrendingDown,
  },
  {
    title: "Returning Customers",
    value: "62%",
    change: "+5.1% vs last month",
    icon: Users,
  },
];

const topCustomers = [
  {
    company: "Northwind Traders",
    orders: 142,
    spend: "$28,450",
    lastOrder: "Nov 18, 2025",
    status: "Active",
  },
  {
    company: "Contoso Retail",
    orders: 118,
    spend: "$23,780",
    lastOrder: "Nov 17, 2025",
    status: "Active",
  },
  {
    company: "Adventure Works",
    orders: 97,
    spend: "$19,640",
    lastOrder: "Nov 16, 2025",
    status: "At Risk",
  },
  {
    company: "Fabrikam Foods",
    orders: 88,
    spend: "$17,220",
    lastOrder: "Nov 15, 2025",
    status: "Prospect",
  },
];

const upcomingFulfillment = [
  {
    reference: "PO-85421",
    customer: "Northwind Traders",
    eta: "Nov 20, 2025",
    items: 24,
    priority: "High",
  },
  {
    reference: "PO-85422",
    customer: "Contoso Retail",
    eta: "Nov 21, 2025",
    items: 36,
    priority: "Medium",
  },
  {
    reference: "PO-85425",
    customer: "Adventure Works",
    eta: "Nov 22, 2025",
    items: 18,
    priority: "Low",
  },
];

export default function OrderAnalyticsPage() {
  return (
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
            <Button variant="outline">Export report</Button>
            <Button>Schedule digest</Button>
          </div>
        </header>

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
                  <p className="text-sm text-emerald-500">{metric.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Revenue & order trends</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Daily revenue against order volume for the current quarter.
                </p>
              </div>
              <Button variant="outline" size="sm">
                View details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-background/30">
                <div className="text-center text-sm text-muted-foreground">
                  <p className="font-medium">Interactive charts coming soon</p>
                  <p className="text-xs">
                    Plug your BI provider or bring your own visualization component here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fulfillment pipeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Top orders approaching shipment across all warehouses.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingFulfillment.map((fulfillment) => (
                <div key={fulfillment.reference} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{fulfillment.reference}</p>
                    <Badge variant={fulfillment.priority === "High" ? "destructive" : "secondary"}>
                      {fulfillment.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{fulfillment.customer}</p>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ETA</span>
                    <span>{fulfillment.eta}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{fulfillment.items}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top customers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Those contributing the highest order volume this month.
                </p>
              </div>
              <Button variant="outline" size="sm">
                View all
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Last order</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((customer) => (
                    <TableRow key={customer.company}>
                      <TableCell>
                        <div className="font-medium">{customer.company}</div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {customer.orders}
                      </TableCell>
                      <TableCell className="text-right font-medium">{customer.spend}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {customer.lastOrder}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{customer.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Operations summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Health indicators that highlight where to focus next.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Backorder rate</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">3.2%</span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                    -0.8% vs last month
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Expedited fulfillment and improved forecasting continue to reduce delays.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">On-time delivery</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">94.6%</span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                    +2.3% vs last month
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Warehouse process improvements have increased punctual deliveries.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Open support tickets</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold">18</span>
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    Monitor closely
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Most tickets relate to billing clarifications and shipment tracking.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

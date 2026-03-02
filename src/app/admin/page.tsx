
"use client";

import { Card } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AdminDashboard() {
  const db = useFirestore();

  // Fetch recent orders
  const ordersQuery = useMemoFirebase(() => query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5)), [db]);
  const { data: recentOrders, isLoading: ordersLoading } = useCollection(ordersQuery);

  // Fetch all orders for aggregate stats
  const allOrdersQuery = useMemoFirebase(() => collection(db, 'orders'), [db]);
  const { data: allOrders } = useCollection(allOrdersQuery);

  // Fetch affiliates
  const affiliatesQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: allUsers } = useCollection(affiliatesQuery);

  const stats = [
    { 
      label: "Total Revenue", 
      value: `₹${allOrders?.reduce((acc, o) => acc + (o.totalAmount || 0), 0).toLocaleString() || 0}`, 
      icon: DollarSign, 
      color: "bg-emerald-50 text-emerald-600" 
    },
    { 
      label: "New Orders", 
      value: allOrders?.length || 0, 
      icon: ShoppingBag, 
      color: "bg-blue-50 text-blue-600" 
    },
    { 
      label: "Active Affiliates", 
      value: allUsers?.filter(u => u.role === 'affiliate').length || 0, 
      icon: Award, 
      color: "bg-purple-50 text-purple-600" 
    },
    { 
      label: "Total Customers", 
      value: allUsers?.length || 0, 
      icon: Users, 
      color: "bg-orange-50 text-orange-600" 
    },
  ];

  if (ordersLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Overview</h1>
        <p className="text-muted-foreground">Real-time health check of GreenScape Nursery.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white overflow-hidden relative">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <h3 className="text-3xl font-extrabold text-primary mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
          <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Sales Trend
          </h3>
          <div className="h-[300px] w-full bg-muted/20 rounded-2xl flex items-center justify-center text-muted-foreground italic">
            Chart data updates daily at midnight.
          </div>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8 overflow-hidden">
          <h3 className="text-xl font-headline font-extrabold text-primary mb-6">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-muted">
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">ID</th>
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Customer</th>
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {recentOrders?.map((order) => (
                  <tr key={order.id} className="group hover:bg-accent/30 transition-all">
                    <td className="py-4 font-mono text-xs font-bold text-primary">#{order.id.substring(3, 10)}</td>
                    <td className="py-4 text-sm font-medium">{order.customerName}</td>
                    <td className="py-4 font-bold text-sm">₹{order.totalAmount}</td>
                    <td className="py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        order.status === "Delivered" ? "bg-emerald-100 text-emerald-800" :
                        order.status === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

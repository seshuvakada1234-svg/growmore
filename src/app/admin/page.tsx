"use client";

import { Card } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Loader2,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#1B5E20', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  // Fetch role to gate queries
  const userProfileRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin = profile?.role === 'admin';

  // Fetch recent orders - gated
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
  }, [db, isAdmin]);
  const { data: recentOrders, isLoading: ordersLoading } = useCollection(ordersQuery);

  // Fetch all orders for aggregate stats - gated
  const allOrdersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, 'orders');
  }, [db, isAdmin]);
  const { data: allOrders } = useCollection(allOrdersQuery);

  // Fetch affiliates - gated
  const usersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, 'users');
  }, [db, isAdmin]);
  const { data: allUsers } = useCollection(usersQuery);

  // --- ANALYTICS LOGIC ---
  const cancelledOrders = allOrders?.filter(o => o.status === 'Cancelled') || [];
  const totalCancelled = cancelledOrders.length;
  
  const reasonsMap = cancelledOrders.reduce((acc: any, o) => {
    const reason = o.cancelReason || 'Not specified';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const cancellationInsights = Object.entries(reasonsMap).map(([name, value]) => ({
    name,
    value,
    percentage: totalCancelled > 0 ? Math.round(((value as number) / totalCancelled) * 100) : 0
  })).sort((a, b) => b.value - a.value);

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

  if (!isAdmin && profile) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground italic">Restricted access...</div>;
  }

  if (ordersLoading || !profile) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Overview</h1>
        <p className="text-muted-foreground">Real-time health check of Monterra.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cancellation Insights Widget */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Cancellation Insights
            </h3>
            <Badge variant="outline" className="rounded-full text-[10px] font-black">{totalCancelled} Total</Badge>
          </div>
          
          <div className="h-[200px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cancellationInsights}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {cancellationInsights.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {cancellationInsights.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 truncate pr-4">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
                <span className="font-bold text-primary">{item.percentage}%</span>
              </div>
            ))}
            {cancellationInsights.length === 0 && (
              <p className="text-center text-sm text-muted-foreground italic py-10">No cancellations recorded yet.</p>
            )}
          </div>
        </Card>

        {/* Recent Orders Widget */}
        <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-sm bg-white p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-headline font-extrabold text-primary">Recent Activity</h3>
            <button className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
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
                        order.status === "Cancelled" ? "bg-red-100 text-red-800" :
                        order.status === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground italic">No recent orders.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

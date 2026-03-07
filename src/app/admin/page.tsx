
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Loader2,
  AlertTriangle,
  ChevronRight,
  PackageCheck,
  XCircle,
  Wallet,
  Clock,
  ArrowUpRight,
  CheckCircle2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, collectionGroup } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfDay, isSameDay, isAfter } from "date-fns";

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  /* ---------------- ROLE SECURITY ---------------- */
  const userProfileRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin = profile?.role === 'admin' || user?.email === 'seshuvakada1234@gmail.com';

  /* ---------------- REAL-TIME DATA FETCHING ---------------- */
  
  // 1. All Orders for metrics & trend
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  }, [db, isAdmin]);
  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  // 2. All Users for customer & affiliate counts
  const usersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, 'users');
  }, [db, isAdmin]);
  const { data: usersData, isLoading: usersLoading } = useCollection(usersQuery);

  // 3. Collection Group for Payouts
  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collectionGroup(db, 'payouts');
  }, [db, isAdmin]);
  const { data: payouts, isLoading: payoutsLoading } = useCollection(payoutsQuery);

  /* ---------------- ANALYTICS CALCULATIONS ---------------- */

  const metrics = useMemo(() => {
    if (!orders || !usersData) return { revenue: 0, orders: 0, cancelled: 0, delivered: 0, affiliates: 0, customers: 0 };
    
    const validOrders = orders.filter(o => o.status !== 'Cancelled');
    
    return {
      revenue: validOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0),
      orders: orders.length,
      cancelled: orders.filter(o => o.status === 'Cancelled').length,
      delivered: orders.filter(o => o.status === 'Delivered').length,
      affiliates: usersData.filter(u => u.role === 'affiliate').length,
      customers: usersData.length
    };
  }, [orders, usersData]);

  const chartData = useMemo(() => {
    if (!orders) return [];
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(startOfDay(new Date()), i);
      const dayOrders = orders.filter(o => {
        const orderDate = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null;
        return orderDate && isSameDay(orderDate, d) && o.status !== 'Cancelled';
      });

      return {
        date: format(d, 'EEE'),
        revenue: dayOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0)
      };
    }).reverse();
  }, [orders]);

  const affiliateInsights = useMemo(() => {
    if (!payouts) return { pending: 0, paid: 0 };
    return {
      pending: payouts.filter(p => p.status === 'pending').length,
      paid: payouts.filter(p => p.status === 'approved').reduce((acc, p) => acc + (p.amount || 0), 0)
    };
  }, [payouts]);

  const recentActivity = useMemo(() => {
    if (!orders || !usersData || !payouts) return [];

    const activities: any[] = [];

    // Map Orders
    orders.slice(0, 5).forEach(o => {
      const time = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
      if (o.status === 'Cancelled') {
        activities.push({
          id: `act-can-${o.id}`,
          type: 'cancellation',
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          description: `Order #${o.id.substring(0, 8)} was cancelled`,
          time
        });
      } else {
        activities.push({
          id: `act-ord-${o.id}`,
          type: 'order',
          icon: <ShoppingBag className="h-4 w-4 text-emerald-500" />,
          description: `${o.customerName || 'Guest'} placed an order — ₹${o.totalAmount}`,
          time
        });
      }
    });

    // Map New Affiliates
    usersData.filter(u => u.role === 'affiliate' && u.createdAt).slice(0, 3).forEach(u => {
      const time = u.createdAt?.seconds ? u.createdAt.seconds * 1000 : 0;
      activities.push({
        id: `act-aff-${u.id}`,
        type: 'affiliate',
        icon: <Award className="h-4 w-4 text-purple-500" />,
        description: `New affiliate joined — ${u.firstName} ${u.lastName || ''}`,
        time
      });
    });

    // Map Payouts
    payouts.filter(p => p.status === 'pending').slice(0, 3).forEach(p => {
      const time = p.createdAt?.seconds ? p.createdAt.seconds * 1000 : 0;
      activities.push({
        id: `act-pay-${p.id}`,
        type: 'payout',
        icon: <Wallet className="h-4 w-4 text-orange-500" />,
        description: `Affiliate payout requested — ₹${p.amount}`,
        time
      });
    });

    return activities.sort((a, b) => b.time - a.time).slice(0, 8);
  }, [orders, usersData, payouts]);

  /* ---------------- UI GATING ---------------- */

  if (ordersLoading || usersLoading || payoutsLoading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Syncing store data...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20 font-bold text-destructive flex flex-col items-center gap-4">
        <AlertTriangle className="h-12 w-12" />
        Access Denied: Restricted to Administrative Personnel.
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-headline font-extrabold text-primary">Sales Analytics</h1>
        <p className="text-muted-foreground font-medium">Platform-wide overview of growth and performance.</p>
      </div>

      {/* 1. PRIMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Total Revenue", value: `₹${metrics.revenue.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
          { label: "New Orders", value: metrics.orders, icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
          { label: "Cancelled", value: metrics.cancelled, icon: XCircle, color: "bg-red-50 text-red-600" },
          { label: "Delivered", value: metrics.delivered, icon: CheckCircle2, color: "bg-teal-50 text-teal-600" },
          { label: "New Affiliates", value: metrics.affiliates, icon: Award, color: "bg-purple-50 text-purple-600" },
          { label: "Total Customers", value: metrics.customers, icon: Users, color: "bg-orange-50 text-orange-600" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border-none shadow-sm p-5 bg-white transition-all hover:shadow-md group">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", stat.color)}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
            <h3 className="text-xl font-extrabold text-primary">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. SALES TREND CHART */}
        <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Sales Trend
                </CardTitle>
                <CardDescription className="text-sm font-medium mt-1">
                  Daily revenue for the last 7 days.
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
                Live Sync
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#7A9B77' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#7A9B77' }} 
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [`₹${val}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. AFFILIATE INSIGHTS */}
        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-primary text-white p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-3 rounded-2xl">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-headline font-extrabold text-xl">Affiliate Program</h3>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Growth Insights</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-black opacity-60 mb-1">Partners</p>
                  <p className="text-2xl font-extrabold">{metrics.affiliates}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-black opacity-60 mb-1">Pending Payouts</p>
                  <p className="text-2xl font-extrabold">{affiliateInsights.pending}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] uppercase font-black opacity-60 mb-1">Total Commission Paid</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-extrabold">₹{affiliateInsights.paid.toLocaleString()}</p>
                  <button className="h-10 w-10 bg-white text-primary rounded-full flex items-center justify-center transition-transform hover:translate-x-1">
                    <ArrowUpRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <Award className="absolute -bottom-10 -right-10 h-48 w-48 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
          </Card>

          {/* 4. RECENT ACTIVITY */}
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Recent Activity
            </h3>
            <div className="space-y-5">
              {recentActivity.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground italic text-sm">No recent events recorded.</div>
              ) : (
                recentActivity.map((act) => (
                  <div key={act.id} className="flex gap-4 group cursor-default">
                    <div className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-muted transition-colors">
                      {act.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary truncate">{act.description}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase mt-0.5">
                        {format(new Date(act.time), "h:mm a • MMM d")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

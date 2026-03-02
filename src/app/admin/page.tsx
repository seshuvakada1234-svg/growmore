"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight 
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
import { cn } from "@/lib/utils";

const data = [
  { name: "Mon", sales: 4000, referrals: 2400 },
  { name: "Tue", sales: 3000, referrals: 1398 },
  { name: "Wed", sales: 2000, referrals: 9800 },
  { name: "Thu", sales: 2780, referrals: 3908 },
  { name: "Fri", sales: 1890, referrals: 4800 },
  { name: "Sat", sales: 2390, referrals: 3800 },
  { name: "Sun", sales: 3490, referrals: 4300 },
];

export default function AdminDashboard() {
  const stats = [
    { label: "Total Revenue", value: "₹45,290", change: "+12.5%", trend: "up", icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
    { label: "New Orders", value: "234", change: "+18.2%", trend: "up", icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
    { label: "Active Affiliates", value: "1,203", change: "-2.4%", trend: "down", icon: Award, color: "bg-purple-50 text-purple-600" },
    { label: "Total Users", value: "4,502", change: "+4.1%", trend: "up", icon: Users, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Overview</h1>
        <p className="text-muted-foreground">Welcome back to the GreenScape command center.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-bold",
                stat.trend === "up" ? "text-emerald-600" : "text-destructive"
              )}>
                {stat.trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {stat.change}
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <h3 className="text-3xl font-extrabold text-primary mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
          <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Sales Performance
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ fill: '#F1F8E9' }}
                />
                <Bar dataKey="sales" fill="#1B5E20" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Affiliate Referrals */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
          <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
              <Users className="h-5 w-5" /> Affiliate Activity
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Line type="monotone" dataKey="referrals" stroke="#2E7D32" strokeWidth={3} dot={{ r: 6, fill: '#2E7D32' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-xl font-headline font-extrabold text-primary">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-muted">
                  <th className="pb-4 font-bold text-sm text-muted-foreground uppercase tracking-wider">Order ID</th>
                  <th className="pb-4 font-bold text-sm text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="pb-4 font-bold text-sm text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="pb-4 font-bold text-sm text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="pb-4 font-bold text-sm text-muted-foreground uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {[
                  { id: "#GS-921", customer: "John Smith", status: "Delivered", amount: "₹1,299", date: "2 mins ago" },
                  { id: "#GS-920", customer: "Sarah Wilson", status: "Pending", amount: "₹450", date: "15 mins ago" },
                  { id: "#GS-919", customer: "Mike Ross", status: "Approved", amount: "₹3,200", date: "1 hour ago" },
                  { id: "#GS-918", customer: "Elena Gilbert", status: "Cancelled", amount: "₹899", date: "3 hours ago" },
                ].map((order, i) => (
                  <tr key={i} className="group hover:bg-accent/30 transition-all">
                    <td className="py-4 font-bold text-primary">{order.id}</td>
                    <td className="py-4">{order.customer}</td>
                    <td className="py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        order.status === "Delivered" ? "bg-emerald-100 text-emerald-800" :
                        order.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                        order.status === "Approved" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 font-bold">{order.amount}</td>
                    <td className="py-4 text-sm text-muted-foreground">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

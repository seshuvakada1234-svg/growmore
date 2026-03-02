
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Award, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Calendar,
  Filter as FilterIcon,
  Search
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, where, orderBy } from "firebase/firestore";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#1B5E20', '#66BB6A', '#A5D6A7', '#8BC34A', '#C8E6C9'];

export default function AdminEarnings() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("30");

  // Fetch all orders
  const ordersQuery = useMemoFirebase(() => collection(db, 'orders'), [db]);
  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  // Fetch all affiliates (users with status or role)
  const affiliatesQuery = useMemoFirebase(() => 
    query(collection(db, 'users'), where('affiliateStatus', '==', 'approved')), 
    [db]
  );
  const { data: affiliates, isLoading: affiliatesLoading } = useCollection(affiliatesQuery);

  // Fetch all payouts
  const payoutsQuery = useMemoFirebase(() => collectionGroup(db, 'payouts'), [db]);
  const { data: payouts, isLoading: payoutsLoading } = useCollection(payoutsQuery);

  if (ordersLoading || affiliatesLoading || payoutsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- DATA AGGREGATION ---

  const totalRevenue = orders?.reduce((acc, o) => acc + (o.totalAmount || 0), 0) || 0;
  const totalCommissionPaid = affiliates?.reduce((acc, a) => acc + (a.paidEarnings || 0), 0) || 0;
  const pendingPayoutsTotal = payouts?.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.payoutAmount || 0), 0) || 0;
  const totalOrdersCount = orders?.length || 0;
  const netProfit = totalRevenue - totalCommissionPaid;

  // Revenue Chart Data (Last 30 Days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(startOfDay(new Date()), i);
    return {
      date: format(d, 'MMM dd'),
      revenue: orders?.filter(o => {
        const orderDate = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null;
        return orderDate && isSameDay(orderDate, d);
      }).reduce((acc, o) => acc + (o.totalAmount || 0), 0) || 0,
      fullDate: d
    };
  }).reverse();

  // Affiliate vs Direct Sales
  const affiliateOrders = orders?.filter(o => !!o.referrerUserId) || [];
  const directOrders = orders?.filter(o => !o.referrerUserId) || [];
  const salesDistribution = [
    { name: 'Affiliate Sales', value: affiliateOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0) },
    { name: 'Direct Sales', value: directOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0) }
  ];

  // Top Affiliates
  const topAffiliates = affiliates?.sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0)).slice(0, 5).map(a => ({
    name: `${a.firstName} ${a.lastName?.[0]}.`,
    earnings: a.totalEarnings || 0
  })) || [];

  const filteredAffiliates = affiliates?.filter(a => 
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Orders", value: totalOrdersCount, icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
    { label: "Commission Paid", value: `₹${totalCommissionPaid.toLocaleString()}`, icon: Award, color: "bg-purple-50 text-purple-600" },
    { label: "Pending Payouts", value: `₹${pendingPayoutsTotal.toLocaleString()}`, icon: Wallet, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Earnings & Analytics</h1>
          <p className="text-muted-foreground text-sm">Monitor revenue, profit margins, and partner performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter affiliates..." 
              className="pl-10 rounded-xl h-10 border-none bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select defaultValue="30">
            <SelectTrigger className="w-36 rounded-xl border-none bg-white shadow-sm h-10">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white flex flex-col justify-between">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-extrabold text-primary mt-1">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Revenue Chart */}
        <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-sm bg-white p-8">
          <h3 className="text-lg font-headline font-extrabold text-primary mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Revenue Trend (Last 30 Days)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last30Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F8E9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#7A9B77' }}
                  minTickGap={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#7A9B77' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(val) => [`₹${val}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#1B5E20" 
                  strokeWidth={4} 
                  dot={false} 
                  activeDot={{ r: 6, fill: '#1B5E20', strokeWidth: 0 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales Mix Pie Chart */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
          <h3 className="text-lg font-headline font-extrabold text-primary mb-6">Sales Distribution</h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Affiliate</p>
                <p className="text-lg font-extrabold text-primary">
                  {((salesDistribution[0].value / (totalRevenue || 1)) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {salesDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  {item.name}
                </div>
                <span className="font-bold">₹{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Affiliate Table */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <div className="p-8 pb-4">
          <h3 className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
            <Award className="h-5 w-5" /> Partner Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Affiliate</TableHead>
                <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Engagement</TableHead>
                <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Conversion</TableHead>
                <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Commission Earned</TableHead>
                <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAffiliates?.map((aff) => {
                const affOrders = orders?.filter(o => o.referrerUserId === aff.id).length || 0;
                const convRate = aff.totalClicks ? ((affOrders / aff.totalClicks) * 100).toFixed(1) : "0.0";
                
                return (
                  <TableRow key={aff.id} className="group hover:bg-accent/30 transition-all border-b border-muted">
                    <TableCell className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold">
                          {aff.firstName?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-none">{aff.firstName} {aff.lastName}</p>
                          <p className="text-xs text-muted-foreground mt-1">{aff.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-primary">{aff.totalClicks || 0} Clicks</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{affOrders} Orders</p>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-primary">{convRate}%</span>
                        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${Math.min(parseFloat(convRate) * 5, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <p className="font-bold text-sm">₹{(aff.totalEarnings || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">₹{(aff.paidEarnings || 0).toLocaleString()} Paid</p>
                    </TableCell>
                    <TableCell className="p-6 text-right">
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                        ₹{((aff.totalEarnings || 0) - (aff.paidEarnings || 0)).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAffiliates?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-20 text-center text-muted-foreground">
                    No partner data available for the current selection.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

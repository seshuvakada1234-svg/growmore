
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
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Award, 
  Wallet, 
  Loader2,
  Search
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, collectionGroup, query, where, doc } from "firebase/firestore";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import { Input } from "@/components/ui/input";

const COLORS = ['#1B5E20', '#66BB6A', '#A5D6A7', '#8BC34A', '#C8E6C9'];

export default function AdminEarnings() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch role to gate queries
  const userProfileRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin = profile?.role === 'admin';

  // Fetch all orders - gated
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, 'orders');
  }, [db, isAdmin]);
  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  // Fetch all affiliates - gated
  const affiliatesQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, 'users'), where('role', '==', 'affiliate'));
  }, [db, isAdmin]);
  const { data: affiliates, isLoading: affiliatesLoading } = useCollection(affiliatesQuery);

  // Fetch all payouts - gated
  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collectionGroup(db, 'payouts');
  }, [db, isAdmin]);
  const { data: payouts, isLoading: payoutsLoading } = useCollection(payoutsQuery);

  if (!isAdmin && profile) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground italic">Restricted access...</div>;
  }

  if (ordersLoading || affiliatesLoading || payoutsLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- DATA AGGREGATION ---
  const totalRevenue = orders?.reduce((acc, o) => acc + (o.totalAmount || 0), 0) || 0;
  const totalCommissionEarned = orders?.filter(o => !!o.affiliateId).reduce((acc, o) => acc + (o.commissionAmount || 0), 0) || 0;
  const pendingPayoutsTotal = payouts?.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

  // Revenue Chart Data (Last 30 Days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(startOfDay(new Date()), i);
    return {
      date: format(d, 'MMM dd'),
      revenue: orders?.filter(o => {
        const orderDate = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null;
        return orderDate && isSameDay(orderDate, d);
      }).reduce((acc, o) => acc + (o.totalAmount || 0), 0) || 0,
    };
  }).reverse();

  // Sales Distribution
  const affiliateSales = orders?.filter(o => !!o.affiliateId).reduce((acc, o) => acc + (o.totalAmount || 0), 0) || 0;
  const directSales = totalRevenue - affiliateSales;
  const salesDistribution = [
    { name: 'Affiliate Sales', value: affiliateSales },
    { name: 'Direct Sales', value: directSales }
  ];

  const filteredAffiliates = affiliates?.filter(a => 
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Orders", value: orders?.length || 0, icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
    { label: "Commission Earned", value: `₹${totalCommissionEarned.toLocaleString()}`, icon: Award, color: "bg-purple-50 text-purple-600" },
    { label: "Pending Payouts", value: `₹${pendingPayoutsTotal.toLocaleString()}`, icon: Wallet, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Earnings & Analytics</h1>
          <p className="text-muted-foreground text-sm">Monitor revenue and partner performance.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search affiliates..." 
            className="pl-10 rounded-xl bg-white border-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-sm bg-white p-8">
          <h3 className="text-lg font-headline font-extrabold text-primary mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Revenue Trend (Last 30 Days)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last30Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F8E9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7A9B77' }} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7A9B77' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#1B5E20" strokeWidth={4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
          <h3 className="text-lg font-headline font-extrabold text-primary mb-6">Sales Mix</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {salesDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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

      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <div className="p-8 pb-4">
          <h3 className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
            <Award className="h-5 w-5" /> Partner List
          </h3>
        </div>
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="p-6">Affiliate</TableHead>
              <TableHead className="p-6">Email</TableHead>
              <TableHead className="p-6">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAffiliates?.map((aff) => (
              <TableRow key={aff.id} className="hover:bg-accent/30 transition-all border-b border-muted">
                <TableCell className="p-6">
                  <p className="font-bold text-sm">{aff.firstName} {aff.lastName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{aff.id}</p>
                </TableCell>
                <TableCell className="p-6 text-sm">{aff.email}</TableCell>
                <TableCell className="p-6 text-sm text-muted-foreground">
                  {aff.createdAt?.seconds ? format(new Date(aff.createdAt.seconds * 1000), "MMM d, yyyy") : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
            {filteredAffiliates?.length === 0 && (
              <TableRow><TableCell colSpan={3} className="p-20 text-center text-muted-foreground italic">No partner data available.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

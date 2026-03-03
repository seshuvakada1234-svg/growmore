
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Banknote, Loader2, Clock, Wallet, CheckCircle2, XCircle, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp, increment, collectionGroup, query, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type PayoutStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminAffiliatePayouts() {
  const db = useFirestore();
  const { user: adminUser } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("all");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Confirm admin status
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !adminUser?.uid) return null;
    return doc(db, 'users', adminUser.uid);
  }, [db, adminUser?.uid]);
  
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin = profile?.role === 'admin';

  // Fetch all payout requests across all users using collectionGroup
  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collectionGroup(db, 'payouts'), orderBy('createdAt', 'desc'));
  }, [db, isAdmin]);
  
  const { data: payouts, isLoading } = useCollection(payoutsQuery);

  const handleAction = async (payout: any, action: 'approved' | 'rejected') => {
    if (payout.status !== 'pending') return;
    
    setIsProcessing(payout.id);
    
    // Correct path: affiliateProfiles/{userId}/payouts/{id}
    const payoutRef = doc(db, 'affiliateProfiles', payout.userId, 'payouts', payout.id);
    const profileRef = doc(db, 'affiliateProfiles', payout.userId);

    try {
      await updateDoc(payoutRef, {
        status: action,
        processedAt: serverTimestamp(),
        processedBy: adminUser?.uid || 'system',
        updatedAt: serverTimestamp()
      });

      if (action === 'approved') {
        await updateDoc(profileRef, {
          paidEarnings: increment(payout.amount),
          updatedAt: serverTimestamp()
        });
      }

      toast({ 
        title: action === 'approved' ? "Payout Approved" : "Payout Rejected", 
        description: `Successfully processed request for ₹${payout.amount}.` 
      });
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Error", 
        description: "Failed to process payout. Check security rules.", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredPayouts = payouts?.filter(p => {
    const matchesSearch = p.userId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payouts?.length || 0,
    pending: payouts?.filter(p => p.status === 'pending').length || 0,
    totalPaid: payouts?.filter(p => p.status === 'approved').reduce((acc, p) => acc + (p.amount || 0), 0) || 0,
    pendingAmount: payouts?.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || 0), 0) || 0
  };

  if (!isAdmin && profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Verifying administrative access...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-primary">Payout Management</h1>
          <p className="text-muted-foreground text-sm">Review and process affiliate withdrawal requests.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID..." 
              className="pl-10 rounded-xl bg-white border-none shadow-sm" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-[140px] rounded-xl bg-white border-none shadow-sm font-bold">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Requests", value: stats.total, icon: Banknote, color: "bg-blue-50 text-blue-600" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
          { label: "Total Paid", value: `₹${stats.totalPaid.toLocaleString()}`, icon: Wallet, color: "bg-emerald-50 text-emerald-600" },
          { label: "Awaiting", value: `₹${stats.pendingAmount.toLocaleString()}`, icon: CheckCircle2, color: "bg-purple-50 text-purple-600" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}><stat.icon className="h-6 w-6" /></div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-extrabold text-primary mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="p-6">Affiliate ID</TableHead>
                <TableHead className="p-6 text-center">Amount</TableHead>
                <TableHead className="p-6 text-center">Requested Date</TableHead>
                <TableHead className="p-6 text-center">Status</TableHead>
                <TableHead className="p-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts?.map((p) => (
                <TableRow key={p.id} className="group hover:bg-accent/30 border-b border-muted">
                  <TableCell className="p-6">
                    <p className="font-mono text-xs font-bold text-primary">{p.userId}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">ID: {p.id.substring(0, 12)}</p>
                  </TableCell>
                  <TableCell className="p-6 text-center font-extrabold text-lg text-primary">₹{p.amount}</TableCell>
                  <TableCell className="p-6 text-center text-xs text-muted-foreground">
                    {p.createdAt?.seconds ? format(new Date(p.createdAt.seconds * 1000), "MMM d, yyyy") : 'Recent'}
                  </TableCell>
                  <TableCell className="p-6 text-center">
                    <Badge className={`rounded-full px-3 py-1 font-bold uppercase text-[10px] ${
                      p.status === 'approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 
                      p.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' : 
                      'bg-red-100 text-red-700 hover:bg-red-100'
                    }`}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-6 text-right">
                    {p.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 h-9 rounded-xl font-bold" 
                          onClick={() => handleAction(p, 'approved')}
                          disabled={isProcessing === p.id}
                        >
                          {isProcessing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:bg-red-50 h-9 rounded-xl font-bold" 
                          onClick={() => handleAction(p, 'rejected')}
                          disabled={isProcessing === p.id}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic text-xs">
                        Processed on {p.processedAt?.seconds ? format(new Date(p.processedAt.seconds * 1000), "MMM d, yyyy") : 'N/A'}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredPayouts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle className="h-8 w-8 opacity-20" />
                      <p>No payout requests found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

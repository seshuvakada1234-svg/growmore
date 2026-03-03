
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Banknote, Loader2, Clock, Wallet, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp, increment, collectionGroup, query, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AdminAffiliatePayouts() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Fetch the role to ensure only admins can run the collectionGroup query
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin = profile?.role === 'admin';

  // Fetch all payout requests across all users using collectionGroup
  // Only execute if the user is confirmed as an admin to prevent rule-denied errors
  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collectionGroup(db, 'payouts'), orderBy('requestedAt', 'desc'));
  }, [db, isAdmin]);
  
  const { data: payouts, isLoading } = useCollection(payoutsQuery);

  const handleAction = async (payout: any, status: 'approved' | 'rejected') => {
    setIsProcessing(payout.id);
    
    // In siloed structure, we need the parent path
    // We assume payout doc contains affiliateId to rebuild path
    const payoutRef = doc(db, 'users', payout.affiliateId, 'affiliate', 'profile', 'payouts', payout.id);
    const profileRef = doc(db, 'users', payout.affiliateId, 'affiliate', 'profile');

    try {
      await updateDoc(payoutRef, {
        status,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (status === 'approved') {
        await updateDoc(profileRef, {
          paidEarnings: increment(payout.amount),
          updatedAt: serverTimestamp()
        });
      }

      toast({ title: `Request ${status}`, description: `Successfully processed payout of ₹${payout.amount}.` });
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: payoutRef.path, operation: 'update', requestResourceData: { status } }));
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredPayouts = payouts?.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.affiliateId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: payouts?.length || 0,
    pending: payouts?.filter(p => p.status === 'pending').length || 0,
    totalPaid: payouts?.filter(p => p.status === 'approved').reduce((acc, p) => acc + (p.amount || 0), 0) || 0,
    pendingAmount: payouts?.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || 0), 0) || 0
  };

  if (!isAdmin && profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Checking administrative privileges...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Payout Approvals</h1>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Requests", value: stats.total, icon: Banknote, color: "bg-blue-50 text-blue-600" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
          { label: "Total Paid", value: `₹${stats.totalPaid}`, icon: Wallet, color: "bg-emerald-50 text-emerald-600" },
          { label: "Awaiting", value: `₹${stats.pendingAmount}`, icon: AlertCircle, color: "bg-purple-50 text-purple-600" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}><stat.icon className="h-6 w-6" /></div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
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
                <TableHead className="p-6">Amount</TableHead>
                <TableHead className="p-6">Date</TableHead>
                <TableHead className="p-6">Status</TableHead>
                <TableHead className="p-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts?.map((p) => (
                <TableRow key={p.id} className="group hover:bg-accent/30 border-b border-muted">
                  <TableCell className="p-6 font-mono text-xs">{p.affiliateId?.substring(0, 12)}...</TableCell>
                  <TableCell className="p-6 font-extrabold text-primary">₹{p.amount}</TableCell>
                  <TableCell className="p-6 text-xs text-muted-foreground">{p.requestedAt?.seconds ? format(new Date(p.requestedAt.seconds * 1000), "MMM d, yyyy") : 'Recent'}</TableCell>
                  <TableCell className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                  </TableCell>
                  <TableCell className="p-6 text-right">
                    {p.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleAction(p, 'approved')}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleAction(p, 'rejected')}>Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredPayouts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic">
                    No payout requests found.
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

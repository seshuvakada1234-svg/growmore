"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Landmark, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminPayouts() {
  const db = useFirestore();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const payoutsQuery = useMemoFirebase(() => query(collection(db, 'affiliateWithdrawRequests'), orderBy('requestedAt', 'desc')), [db]);
  const { data: payouts, isLoading } = useCollection(payoutsQuery);

  const processPayout = async (payout: any, status: 'paid' | 'rejected') => {
    setIsProcessing(payout.id);
    const batch = writeBatch(db);

    const payoutRef = doc(db, 'affiliateWithdrawRequests', payout.id);
    const profileRef = doc(db, 'affiliateProfiles', payout.affiliateId);

    // 1. Update payout status
    batch.update(payoutRef, { status, processedAt: serverTimestamp() });

    // 2. If approved/paid, decrement withdrawable amount and increment paid earnings
    if (status === 'paid') {
      batch.update(profileRef, {
        withdrawableAmount: increment(-payout.amount),
        paidEarnings: increment(payout.amount),
        updatedAt: serverTimestamp()
      });
    }

    try {
      await batch.commit();
      toast({ title: `Payout ${status === 'paid' ? 'Completed' : 'Rejected'}` });
    } catch (err) {
      toast({ title: "Processing Failed", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Withdraw Requests</h1>
        <p className="text-sm text-muted-foreground">Manage partner fund requests.</p>
      </div>

      <Card className="overflow-hidden border-none shadow-sm rounded-[2rem] bg-white">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="p-6">Affiliate ID</TableHead>
              <TableHead className="p-6">Amount</TableHead>
              <TableHead className="p-6">Bank / UPI</TableHead>
              <TableHead className="p-6">Status</TableHead>
              <TableHead className="p-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts?.map((p) => (
              <TableRow key={p.id} className="hover:bg-accent/20 transition-colors">
                <TableCell className="p-6 font-mono text-xs text-muted-foreground">{p.affiliateId.substring(0, 12)}...</TableCell>
                <TableCell className="p-6 font-bold text-primary">₹{p.amount.toLocaleString()}</TableCell>
                <TableCell className="p-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold flex items-center gap-1"><Landmark className="h-3 w-3" /> {p.bankAccountNumber}</p>
                    <p className="text-[10px] text-muted-foreground">UPI: {p.upiId || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell className="p-6">
                  <Badge className={`uppercase text-[10px] font-bold ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="p-6 text-right">
                  {p.status === 'pending' && (
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => processPayout(p, 'paid')} disabled={!!isProcessing} className="bg-emerald-600 rounded-full h-8"><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Paid</Button>
                      <Button size="sm" variant="ghost" onClick={() => processPayout(p, 'rejected')} disabled={!!isProcessing} className="text-destructive rounded-full h-8"><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!payouts || payouts.length === 0) && (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No payout requests found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

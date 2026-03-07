"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Filter, Search, Landmark, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
} from "@/firebase";
import {
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  collectionGroup,
  query,
  orderBy,
  writeBatch,
  collection
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type PayoutStatus = "all" | "pending" | "paid" | "rejected";

export default function AdminPayouts() {
  const db = useFirestore();
  const { user } = useUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("all");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  /* ---------------- ADMIN CHECK ---------------- */

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: profileLoading } = useDoc(profileRef);

  // Determine admin status.
  const isAdmin = profile?.role === "admin" || user?.email === 'seshuvakada1234@gmail.com';

  /* ---------------- SAFE QUERY ---------------- */

  const payoutsQuery = useMemoFirebase(() => {
    // Only trigger query if explicitly authenticated as admin to avoid permission race conditions
    if (!db || !isAdmin) return null;

    // We query the root collection for simplicity in this view
    return query(
      collection(db, "affiliateWithdrawRequests"),
      orderBy("requestedAt", "desc")
    );
  }, [db, isAdmin]);

  const { data, isLoading: queryLoading } = useCollection(payoutsQuery);
  const payouts = Array.isArray(data) ? data : [];

  /* ---------------- ACTION ---------------- */

  const processPayout = async (payout: any, action: 'paid' | 'rejected') => {
    if (!db || payout.status !== "pending") return;

    setIsProcessing(payout.id);
    const batch = writeBatch(db);

    try {
      const payoutRef = doc(db, 'affiliateWithdrawRequests', payout.id);
      const profileRef = doc(db, 'affiliateProfiles', payout.affiliateId);

      // 1. Update payout status
      batch.update(payoutRef, { 
        status: action, 
        processedAt: serverTimestamp(),
        processedBy: user?.uid || 'system'
      });

      // 2. If approved/paid, update profile totals
      if (action === 'paid') {
        batch.update(profileRef, {
          withdrawableAmount: increment(-payout.amount),
          paidEarnings: increment(payout.amount),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      toast({ title: `Payout ${action === 'paid' ? 'Completed' : 'Rejected'}` });
    } catch (err) {
      console.error("Payout action failed:", err);
      toast({
        title: "Error",
        description: "Action failed. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  /* ---------------- FILTER ---------------- */

  const filteredPayouts = payouts.filter((p: any) => {
    const matchesSearch =
      p.affiliateId?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      p.id?.toLowerCase()?.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /* ---------------- UI ---------------- */

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin && !profileLoading) {
    return (
      <div className="text-center py-20 font-bold text-destructive">
        Access Denied: Administrative privileges required.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Withdraw Requests</h1>
        <p className="text-sm text-muted-foreground">Manage partner fund requests.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Affiliate ID or Request ID..."
            className="pl-10 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
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
            {queryLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredPayouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                  No payout requests found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayouts.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-accent/20 transition-colors">
                  <TableCell className="p-6 font-mono text-xs text-muted-foreground">
                    {p.affiliateId.substring(0, 12)}...
                  </TableCell>
                  <TableCell className="p-6 font-bold text-primary">
                    ₹{p.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="p-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold flex items-center gap-1"><Landmark className="h-3 w-3" /> {p.bankAccountNumber}</p>
                      <p className="text-[10px] text-muted-foreground">UPI: {p.upiId || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="p-6">
                    <Badge className={`uppercase text-[10px] font-bold ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-6 text-right">
                    {p.status === "pending" ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 rounded-full h-8"
                          onClick={() => processPayout(p, "paid")}
                          disabled={!!isProcessing}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Paid
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 rounded-full h-8"
                          onClick={() => processPayout(p, "rejected")}
                          disabled={!!isProcessing}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium italic">Processed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

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
  Search, 
  Banknote, 
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User as UserIcon,
  Wallet,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collectionGroup, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  increment,
  getDoc
} from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminAffiliatePayouts() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Fetch all payouts across all users using Collection Group
  const payoutsQuery = useMemoFirebase(() => 
    query(collectionGroup(db, 'payouts'), orderBy('payoutDate', 'desc')), 
    [db]
  );
  
  const { data: payouts, isLoading } = useCollection(payoutsQuery);

  const handleAction = async (payout: any, status: 'approved' | 'rejected') => {
    setIsProcessing(payout.id);
    
    // The payout path is users/{userId}/affiliateProfile/payouts/{payoutId}
    // We can derive it if needed, but collectionGroup provides the ref
    const userId = payout.affiliateId;
    const payoutRef = doc(db, 'users', userId, 'affiliateProfile', 'payouts', payout.id);
    const userRef = doc(db, 'users', userId);

    try {
      // 1. Update payout status
      await updateDoc(payoutRef, {
        status,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. If approved, update paidEarnings on user profile
      if (status === 'approved') {
        await updateDoc(userRef, {
          paidEarnings: increment(payout.payoutAmount),
          updatedAt: serverTimestamp()
        });
      }

      toast({
        title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        description: `Successfully ${status} the payout of ₹${payout.payoutAmount}.`,
      });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: payoutRef.path,
        operation: 'update',
        requestResourceData: { status }
      });
      errorEmitter.emit('permission-error', permissionError);
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
    totalPaid: payouts?.filter(p => p.status === 'approved').reduce((acc, p) => acc + (p.payoutAmount || 0), 0) || 0,
    pendingAmount: payouts?.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.payoutAmount || 0), 0) || 0
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Payout Approvals</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Banknote className="h-4 w-4" />
            <span>Pending Requests: <span className="font-bold text-primary">{stats.pending}</span></span>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID..." 
            className="pl-10 rounded-xl h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Requests", value: stats.total, icon: Banknote, color: "bg-blue-50 text-blue-600" },
          { label: "Pending Approval", value: stats.pending, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
          { label: "Total Paid Out", value: `₹${stats.totalPaid}`, icon: Wallet, color: "bg-emerald-50 text-emerald-600" },
          { label: "Awaiting Funds", value: `₹${stats.pendingAmount}`, icon: AlertCircle, color: "bg-purple-50 text-purple-600" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white overflow-hidden">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <h3 className="text-3xl font-extrabold text-primary mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Request ID</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Affiliate UID</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts?.map((p) => (
                  <TableRow key={p.id} className="group hover:bg-accent/30 transition-all border-b border-muted">
                    <TableCell className="p-6">
                      <p className="font-mono text-xs font-bold text-primary">#{p.id.substring(0, 8).toUpperCase()}</p>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium truncate max-w-[120px]">{p.affiliateId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <span className="font-extrabold text-primary text-lg">₹{p.payoutAmount}</span>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {p.payoutDate?.seconds 
                          ? format(new Date(p.payoutDate.seconds * 1000), "MMM d, yyyy")
                          : 'Recent'}
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : p.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="p-6 text-right">
                      {p.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="rounded-lg h-9 font-bold text-xs gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve Payout?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will mark the request as paid and update the affiliate's account balance. Ensure you have transferred ₹{p.payoutAmount} to their registered account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleAction(p, 'approved')}
                                  className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                                >
                                  Confirm Approval
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="rounded-lg h-9 font-bold text-xs gap-2 text-destructive hover:bg-red-50">
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Payout?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reject this request? The affiliate will be notified and can request again if they resolve any issues.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleAction(p, 'rejected')}
                                  className="rounded-full bg-destructive"
                                >
                                  Reject Request
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          Processed {p.processedAt?.seconds ? format(new Date(p.processedAt.seconds * 1000), "MMM d") : ''}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPayouts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-20 text-center text-muted-foreground">
                      No payout requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

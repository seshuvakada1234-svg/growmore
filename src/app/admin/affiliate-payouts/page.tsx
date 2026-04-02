"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Filter, Search, Landmark, CheckCircle2, XCircle, User, CreditCard, History } from "lucide-react";
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
  serverTimestamp,
  increment,
  collection,
  query,
  orderBy,
  writeBatch,
  getDoc,
  getDocs,
  where,
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
import { AffiliateProfile, AffiliateCommissionRecord } from "@/types/affiliate.types";

type PayoutStatus = "all" | "pending" | "paid" | "rejected";

export default function AdminPayouts() {
  const db = useFirestore();
  const { user } = useUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>("all");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Map of affiliateId -> AffiliateProfile (null = fetched but not found)
  // undefined = not yet fetched
  const [affiliateProfiles, setAffiliateProfiles] = useState<Record<string, AffiliateProfile | null>>({});

  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    affiliateId: string;
    name: string;
    commissions: AffiliateCommissionRecord[];
    loading: boolean;
  }>({ open: false, affiliateId: "", name: "", commissions: [], loading: false });

  /* ---------------- ADMIN CHECK ---------------- */

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: profileLoading } = useDoc(profileRef);
  const isAdmin = profile?.role === "admin" || user?.email === "seshuvakada1234@gmail.com";

  /* ---------------- QUERY ---------------- */

  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(
      collection(db, "affiliateWithdrawRequests"),
      orderBy("requestedAt", "desc")
    );
  }, [db, isAdmin]);

  const { data, isLoading: queryLoading } = useCollection(payoutsQuery);
  const payouts = Array.isArray(data) ? data : [];

  /* ---------------- FETCH AFFILIATE PROFILES ---------------- */
  // FIX: depend on the actual payout IDs (joined string), not just .length,
  // so new payouts with a different set of affiliateIds always trigger a fetch.
  // FIX: copy cached entries into state immediately so the spinner disappears.

  useEffect(() => {
    if (!db || payouts.length === 0) return;

    const uniqueIds = [...new Set(payouts.map((p: any) => p.affiliateId as string))];

    // Separate IDs: already in state vs in module cache vs truly missing
    const fromCache: Record<string, AffiliateProfile | null> = {};
    const toFetch: string[] = [];

    for (const id of uniqueIds) {
      if (id in affiliateProfiles) {
        // Already in React state — nothing to do
        continue;
      }
      // Not in state yet — fetch from Firestore directly (no module-level cache needed)
      toFetch.push(id);
    }

    if (toFetch.length === 0) return;

    const fetchProfiles = async () => {
      const results: Record<string, AffiliateProfile | null> = {};

      await Promise.all(
        toFetch.map(async (affiliateId) => {
          try {
            const snap = await getDoc(doc(db, "affiliateProfiles", affiliateId));
            results[affiliateId] = snap.exists() ? (snap.data() as AffiliateProfile) : null;
          } catch {
            results[affiliateId] = null;
          }
        })
      );

      setAffiliateProfiles(prev => ({ ...prev, ...results }));
    };

    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, payouts.map((p: any) => p.affiliateId).join(",")]);

  /* ---------------- FETCH HISTORY ---------------- */

  const openHistory = async (affiliateId: string, name: string) => {
    setHistoryModal({ open: true, affiliateId, name, commissions: [], loading: true });
    try {
      const snap = await getDocs(
        query(
          collection(db!, "affiliate_commissions"),
          where("affiliateId", "==", affiliateId),
          orderBy("createdAt", "desc")
        )
      );
      const commissions = snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateCommissionRecord));
      setHistoryModal(prev => ({ ...prev, commissions, loading: false }));
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  /* ---------------- ACTION ---------------- */

  const processPayout = async (payout: any, action: "paid" | "rejected") => {
    if (!db || payout.status !== "pending") return;
    setIsProcessing(payout.id);
    const batch = writeBatch(db);
    try {
      const payoutRef = doc(db, "affiliateWithdrawRequests", payout.id);
      const affiliateProfileRef = doc(db, "affiliateProfiles", payout.affiliateId);
      batch.update(payoutRef, {
        status: action,
        processedAt: serverTimestamp(),
        processedBy: user?.uid || "system",
      });
      if (action === "paid") {
        batch.update(affiliateProfileRef, {
          paidEarnings: increment(payout.amount),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      toast({ title: `Payout ${action === "paid" ? "Completed" : "Rejected"}` });
    } catch (err) {
      console.error("Payout action failed:", err);
      toast({ title: "Error", description: "Action failed. Check console.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  /* ---------------- FILTER ---------------- */

  const filteredPayouts = payouts.filter((p: any) => {
    const afProfile = affiliateProfiles[p.affiliateId];
    const matchesSearch =
      p.affiliateId?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      p.id?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      afProfile?.accountHolderName?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      afProfile?.bankAccountNumber?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /* ---------------- HISTORY SUMMARY ---------------- */

  const totalOrders = historyModal.commissions.length;
  const approvedEarnings = historyModal.commissions
    .filter(c => c.status === "approved" || c.status === "paid")
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const pendingEarnings = historyModal.commissions
    .filter(c => c.status === "pending")
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  /* ---------------- UI ---------------- */

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
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
            placeholder="Search by Affiliate ID, Name or Account..."
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
              <TableHead className="p-6">Affiliate</TableHead>
              <TableHead className="p-6">Amount</TableHead>
              <TableHead className="p-6">Bank Details</TableHead>
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
              filteredPayouts.map((p: any) => {
                const afProfile = affiliateProfiles[p.affiliateId];
                // undefined = still fetching; null = fetched, not found
                const isLoadingProfile = !(p.affiliateId in affiliateProfiles);

                return (
                  <TableRow key={p.id} className="hover:bg-accent/20 transition-colors">

                    {/* Affiliate */}
                    <TableCell className="p-6">
                      <div className="space-y-1">
                        {isLoadingProfile ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : (
                          <p className="text-sm font-semibold flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {afProfile?.accountHolderName || "—"}
                          </p>
                        )}
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {p.affiliateId.substring(0, 12)}...
                        </p>
                        <button
                          onClick={() => openHistory(p.affiliateId, afProfile?.accountHolderName || p.affiliateId)}
                          className="text-[10px] text-primary flex items-center gap-1 hover:underline mt-1"
                        >
                          <History className="h-3 w-3" /> View History
                        </button>
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="p-6 font-bold text-primary">
                      ₹{p.amount.toLocaleString()}
                    </TableCell>

                    {/* Bank Details */}
                    <TableCell className="p-6">
                      {isLoadingProfile ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="space-y-1 text-xs">
                          <p className="font-bold flex items-center gap-1">
                            <Landmark className="h-3 w-3 text-muted-foreground" />
                            {afProfile?.bankAccountNumber || p.bankAccountNumber || "—"}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            IFSC: {afProfile?.ifscCode || p.ifscCode || "N/A"}
                          </p>
                          <p className="text-muted-foreground">
                            UPI: {afProfile?.upiId || p.upiId || "N/A"}
                          </p>
                          {afProfile?.address && (
                            <p className="text-[10px] text-muted-foreground/70">
                              {afProfile.address}, {afProfile.city} - {afProfile.pincode}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-6">
                      <Badge className={`uppercase text-[10px] font-bold ${
                        p.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                        p.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {p.status}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ---------------- HISTORY MODAL ---------------- */}
      <Dialog open={historyModal.open} onOpenChange={(open) => setHistoryModal(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <History className="h-5 w-5" />
              Commission History — {historyModal.name}
            </DialogTitle>
          </DialogHeader>

          {historyModal.loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : historyModal.commissions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground italic">No commission records found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-2xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
                  <p className="text-2xl font-extrabold text-primary">{totalOrders}</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Approved Earnings</p>
                  <p className="text-2xl font-extrabold text-emerald-600">₹{approvedEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Pending Earnings</p>
                  <p className="text-2xl font-extrabold text-yellow-600">₹{pendingEarnings.toLocaleString()}</p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-muted/30">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow>
                      <TableHead className="p-4 text-xs">Order ID</TableHead>
                      <TableHead className="p-4 text-xs">Order Value</TableHead>
                      <TableHead className="p-4 text-xs">Commission</TableHead>
                      <TableHead className="p-4 text-xs">Status</TableHead>
                      <TableHead className="p-4 text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyModal.commissions.map((c: any) => (
                      <TableRow key={c.id} className="hover:bg-accent/10">
                        <TableCell className="p-4 font-mono text-xs text-muted-foreground">
                          {c.orderId || "—"}
                        </TableCell>
                        <TableCell className="p-4 text-sm font-semibold">
                          ₹{(c.orderValue || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="p-4">
                          <p className="text-sm font-bold text-primary">₹{(c.commissionAmount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{c.commissionRate}% RATE</p>
                        </TableCell>
                        <TableCell className="p-4">
                          <Badge className={`uppercase text-[10px] font-bold ${
                            c.status === "approved" || c.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                            c.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4 text-xs text-muted-foreground">
                          {c.createdAt?.toDate
                            ? c.createdAt.toDate().toLocaleDateString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
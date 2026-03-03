
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
import { Loader2, Filter, AlertTriangle, ExternalLink } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PayoutStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminAffiliatePayouts() {
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

  const isAdmin = profile?.role === "admin" || user?.email === 'seshuvakada1234@gmail.com';

  /* ---------------- SAFE QUERY ---------------- */

  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;

    // CollectionGroup queries with orderBy ALWAYS require a composite index.
    return query(
      collectionGroup(db, "payouts"),
      orderBy("createdAt", "desc")
    );
  }, [db, isAdmin]);

  const { data, isLoading: queryLoading, error } = useCollection(payoutsQuery);

  const payouts = Array.isArray(data) ? data : [];

  /* ---------------- ACTION ---------------- */

  const handleAction = async (payout: any, action: "approved" | "rejected") => {
    if (!db || payout.status !== "pending") return;

    setIsProcessing(payout.id);

    try {
      const payoutRef = doc(db, "affiliateProfiles", payout.userId, "payouts", payout.id);
      const affiliateProfileRef = doc(db, "affiliateProfiles", payout.userId);

      await updateDoc(payoutRef, {
        status: action,
        processedAt: serverTimestamp(),
        processedBy: user?.uid ?? "system",
        updatedAt: serverTimestamp(),
      });

      if (action === "approved") {
        await updateDoc(affiliateProfileRef, {
          paidEarnings: increment(payout.amount),
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: action === "approved" ? "Payout Approved" : "Payout Rejected",
      });
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
      p.userId?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      p.id?.toLowerCase()?.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /* ---------------- UI ---------------- */

  if (profileLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <h1 className="text-3xl font-headline font-extrabold text-primary">Payout Management</h1>

      {/* ERROR HANDLING: Detect Missing Index */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Query Error Detected</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              This dashboard uses a <strong>Collection Group Query</strong> which requires a specific Firestore Index.
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">How to fix:</p>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>Open your browser's Developer Tools (F12).</li>
                <li>Go to the <strong>Console</strong> tab.</li>
                <li>Look for an error starting with "The query requires an index".</li>
                <li><strong>Click the link</strong> provided in that error message to automatically create the index.</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by User ID..."
          className="flex-1"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-none shadow-sm rounded-3xl bg-white">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="p-6">Affiliate ID</TableHead>
              <TableHead className="p-6">Amount</TableHead>
              <TableHead className="p-6">Status</TableHead>
              <TableHead className="p-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {queryLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredPayouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                  {error ? "Unable to load data due to missing index." : "No payout requests found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredPayouts.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-accent/20 transition-colors">
                  <TableCell className="p-6 font-mono text-xs text-muted-foreground">
                    {p.userId}
                  </TableCell>
                  <TableCell className="p-6 font-bold text-primary">
                    ₹{p.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="p-6">
                    <Badge className={`uppercase text-[10px] font-bold ${
                      p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
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
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAction(p, "approved")}
                          disabled={!!isProcessing}
                        >
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleAction(p, "rejected")}
                          disabled={!!isProcessing}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Processed</span>
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

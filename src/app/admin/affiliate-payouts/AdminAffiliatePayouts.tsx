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
import { Loader2, Filter } from "lucide-react";
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
  collection,
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

type PayoutStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminAffiliatePayouts() {
  const db = useFirestore();
  const { user } = useUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<PayoutStatus>("all");
  const [isProcessing, setIsProcessing] =
    useState<string | null>(null);

  /* ---------------- ADMIN CHECK ---------------- */

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: profileLoading } =
    useDoc(profileRef);

  // Failsafe for master admin or role check
  const isAdmin = profile?.role === "admin" || user?.email === 'seshuvakada1234@gmail.com';

  /* ---------------- SAFE QUERY ---------------- */

  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;

    return query(
      collectionGroup(db, "payouts"),
      orderBy("createdAt", "desc")
    );
  }, [db, isAdmin]);

  const { data } = useCollection(payoutsQuery);

  const payouts = Array.isArray(data) ? data : [];

  /* ---------------- ACTION ---------------- */

  const handleAction = async (
    payout: any,
    action: "approved" | "rejected"
  ) => {
    if (!db || payout.status !== "pending") return;

    setIsProcessing(payout.id);

    const payoutRef = doc(
      db,
      "affiliateProfiles",
      payout.userId,
      "payouts",
      payout.id
    );

    const affiliateProfileRef = doc(
      db,
      "affiliateProfiles",
      payout.userId
    );

    try {
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
        title:
          action === "approved"
            ? "Payout Approved"
            : "Payout Rejected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Check Firestore rules.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  /* ---------------- FILTER ---------------- */

  const filteredPayouts = payouts.filter((p: any) => {
    const matchesSearch =
      p.userId
        ?.toLowerCase()
        ?.includes(searchTerm.toLowerCase()) ||
      p.id
        ?.toLowerCase()
        ?.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /* ---------------- STATS ---------------- */

  const stats = {
    total: payouts.length,
    pending: payouts.filter(
      (p: any) => p.status === "pending"
    ).length,
  };

  /* ---------------- ACCESS CONTROL ---------------- */

  if (profileLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        Access Denied
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">
        Payout Management
      </h1>

      <div className="flex gap-3">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
        />

        <Select
          value={statusFilter}
          onValueChange={(val: any) =>
            setStatusFilter(val)
          }
        >
          <SelectTrigger>
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">
              Pending
            </SelectItem>
            <SelectItem value="approved">
              Approved
            </SelectItem>
            <SelectItem value="rejected">
              Rejected
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4">
        Total Requests: {stats.total} |
        Pending: {stats.pending}
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Affiliate</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredPayouts.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.userId}</TableCell>
                <TableCell>₹{p.amount}</TableCell>
                <TableCell>
                  <Badge>{p.status}</Badge>
                </TableCell>
                <TableCell>
                  {p.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleAction(p, "approved")
                        }
                        disabled={
                          isProcessing === p.id
                        }
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleAction(p, "rejected")
                        }
                        disabled={
                          isProcessing === p.id
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    "Processed"
                  )}
                </TableCell>
              </TableRow>
            ))}

            {filteredPayouts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10"
                >
                  No payout requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

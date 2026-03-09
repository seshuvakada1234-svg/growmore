
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Search,
  Loader2,
  Clock,
  Award,
  Landmark,
  TrendingUp,
  UserMinus,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser
} from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  approveAffiliate,
  rejectAffiliate,
  removeAffiliate
} from "@/lib/adminAffiliateService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function AdminAffiliates() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    action: "reject" | "remove" | null;
    name: string;
  }>({ open: false, userId: "", action: null, name: "" });

  const isAdmin = user?.email === "seshuvakada1234@gmail.com";

  const appsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(
      collection(db, "affiliateApplications"),
      where("status", "==", "pending")
    );
  }, [db, isAdmin]);

  const { data: applicationsRaw, isLoading: appsLoading } =
    useCollection(appsQuery);

  const affiliatesQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(
      collection(db, "users"),
      where("role", "==", "affiliate")
    );
  }, [db, isAdmin]);

  const { data: affiliates, isLoading: affLoading } =
    useCollection(affiliatesQuery);

  const applications = applicationsRaw
    ? [...applicationsRaw].sort((a, b) => {
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return bTime - aTime;
      })
    : [];

  /* ---------------- HANDLERS ---------------- */

  const handleApprove = async (userId: string) => {
    setIsProcessing(userId);
    try {
      await approveAffiliate(userId);
      toast({ title: "Affiliate Approved", description: "User is now an affiliate partner" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to approve affiliate", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const openConfirm = (userId: string, action: "reject" | "remove", name: string) => {
    setConfirmDialog({ open: true, userId, action, name });
  };

  const closeConfirm = () => {
    setConfirmDialog({ open: false, userId: "", action: null, name: "" });
  };

  const handleConfirm = async () => {
    const { userId, action } = confirmDialog;
    closeConfirm();
    setIsProcessing(userId);
    try {
      if (action === "reject") {
        await rejectAffiliate(userId);
        toast({ title: "Application Rejected" });
      } else if (action === "remove") {
        await removeAffiliate(userId);
        toast({ title: "Affiliate Removed", description: "User is now a normal user" });
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  /* ---------------- EARLY RETURNS ---------------- */

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="text-center py-20 font-bold text-destructive">
        Access Denied
      </div>
    );
  }

  /* ---------------- FILTER ---------------- */

  const filteredAffiliates = affiliates?.filter((a) =>
    a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ---------------- RENDER ---------------- */

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Affiliate Management</h1>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search affiliates..."
            className="pl-10 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* PENDING APPLICATIONS */}
      <section className="space-y-4">
        <h2 className="text-xl font-headline font-extrabold flex items-center gap-2 text-primary">
          <Clock className="h-5 w-5 text-yellow-600" />
          Pending Applications
        </h2>
        <Card className="rounded-[2rem] overflow-hidden border-none shadow-sm bg-white">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User ID</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Applied On</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appsLoading ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : applications.length > 0 ? (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-accent/20 transition-colors border-b border-muted last:border-0">
                    <td className="p-6 text-sm font-mono text-primary font-bold">{app.userId}</td>
                    <td className="p-6 text-sm font-medium text-primary">
                      {app.createdAt?.seconds
                        ? format(new Date(app.createdAt.seconds * 1000), "MMM dd, yyyy")
                        : "Recent"}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => router.push(`/admin/affiliates/${app.userId}`)}
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirm(app.userId, "reject", app.userId)}
                          disabled={isProcessing === app.userId}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-full"
                        >
                          {isProcessing === app.userId
                            ? <Loader2 className="animate-spin h-3 w-3" />
                            : "Reject"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.userId)}
                          disabled={isProcessing === app.userId}
                          className="bg-emerald-600 hover:bg-emerald-700 rounded-full h-8"
                        >
                          {isProcessing === app.userId
                            ? <Loader2 className="animate-spin h-4 w-4" />
                            : "Approve"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-muted-foreground italic font-medium">
                    No applications pending review
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ACTIVE AFFILIATES */}
      <section className="space-y-4">
        <h2 className="text-xl font-headline font-extrabold flex items-center gap-2 text-primary">
          <Award className="h-5 w-5" />
          Active Partners
        </h2>
        <Card className="rounded-[2rem] overflow-hidden border-none shadow-sm bg-white">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Partner</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affLoading ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredAffiliates?.length ? (
                filteredAffiliates.map((aff) => (
                  <tr key={aff.id} className="hover:bg-accent/20 transition-colors border-b border-muted last:border-0">
                    <td className="p-6 font-bold text-primary">
                      {aff.displayName || (aff.firstName ? `${aff.firstName} ${aff.lastName || ""}` : aff.email)}
                    </td>
                    <td className="p-6 text-sm font-medium text-muted-foreground">{aff.email}</td>
                    <td className="p-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full h-8"
                          onClick={() => router.push(`/admin/affiliates/${aff.id}`)}
                        >
                          Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openConfirm(aff.id, "remove", aff.email || aff.id)}
                          disabled={isProcessing === aff.id}
                          className="text-red-600 hover:bg-red-50 rounded-full h-8"
                        >
                          {isProcessing === aff.id
                            ? <Loader2 className="animate-spin h-4 w-4" />
                            : (<><UserMinus className="h-4 w-4 mr-1" />Remove</>)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-muted-foreground italic font-medium">
                    No partners found matching search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* CONFIRMATION DIALOG */}
      <Dialog open={confirmDialog.open} onOpenChange={closeConfirm}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-headline font-extrabold">
              <AlertTriangle className="h-5 w-5" />
              {confirmDialog.action === "reject" ? "Reject Application?" : "Remove Affiliate?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2 font-medium">
            {confirmDialog.action === "reject"
              ? `This will reject the application from ${confirmDialog.name}.`
              : `This will remove ${confirmDialog.name} as an affiliate partner and convert them back to a regular user.`}
          </p>
          <DialogFooter className="gap-2 sm:flex-row">
            <Button variant="ghost" onClick={closeConfirm} className="rounded-full">Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              className="rounded-full font-bold"
            >
              {confirmDialog.action === "reject" ? "Yes, Reject" : "Yes, Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

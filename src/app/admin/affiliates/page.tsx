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
  UserMinus
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
  getAffiliateProfile,
  removeAffiliate
} from "@/lib/adminAffiliateService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export default function AdminAffiliates() {

  const db = useFirestore();
  const { user } = useUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // ✅ FIX: isAdmin check must be derived BEFORE any hooks
  const isAdmin = user?.email === "seshuvakada1234@gmail.com";

  // ✅ FIX: ALL hooks must be called before any early returns
  // Pass null to queries when not admin — hooks still run but fetch nothing

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

  // ✅ Sort applications client-side — no orderBy needed, no extra index
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
      toast({
        title: "Affiliate Approved",
        description: "User is now an affiliate partner"
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to approve affiliate",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm("Reject this affiliate application?")) return;
    setIsProcessing(userId);
    try {
      await rejectAffiliate(userId);
      toast({
        title: "Application Rejected",
        description: "The request has been marked as rejected"
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove affiliate partner?")) return;
    setIsProcessing(userId);
    try {
      await removeAffiliate(userId);
      toast({
        title: "Affiliate Removed",
        description: "User is now a normal user"
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to remove affiliate",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const viewDetails = async (userId: string) => {
    const data = await getAffiliateProfile(userId);
    setSelectedProfile(data);
  };

  /* ---------------- EARLY RETURNS (after all hooks) ---------------- */

  // ✅ FIX: Early returns ONLY after all hooks have been called above
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
    a.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ---------------- RENDER ---------------- */

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary">
          Affiliate Management
        </h1>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search affiliates..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* PENDING APPLICATIONS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Pending Applications
        </h2>
        <Card className="rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-xs uppercase">User</th>
                <th className="p-6 text-xs uppercase">Date</th>
                <th className="p-6 text-xs uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {appsLoading ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : applications.length > 0 ? (
                applications.map((app) => (
                  <tr key={app.id}>
                    <td className="p-6 text-sm font-mono">{app.userId}</td>
                    <td className="p-6 text-sm">
                      {app.createdAt?.seconds
                        ? format(new Date(app.createdAt.seconds * 1000), "MMM d")
                        : "Recent"}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDetails(app.userId)}
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(app.userId)}
                          disabled={isProcessing === app.userId}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {isProcessing === app.userId && <Loader2 className="animate-spin h-3 w-3 mr-1" />}
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.userId)}
                          disabled={isProcessing === app.userId}
                          className="bg-emerald-600 hover:bg-emerald-700"
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
                  <td colSpan={3} className="p-12 text-center text-muted-foreground">
                    No applications pending
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ACTIVE AFFILIATES */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Active Affiliates
        </h2>
        <Card className="rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-xs uppercase">Partner</th>
                <th className="p-6 text-xs uppercase">Email</th>
                <th className="p-6 text-xs uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {affLoading ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredAffiliates?.length ? (
                filteredAffiliates.map((aff) => (
                  <tr key={aff.id}>
                    <td className="p-6 font-bold">
                      {aff.displayName || aff.email}
                    </td>
                    <td className="p-6 text-sm">{aff.email}</td>
                    <td className="p-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDetails(aff.id)}
                        >
                          Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(aff.id)}
                          disabled={isProcessing === aff.id}
                          className="text-red-600 hover:bg-red-50"
                        >
                          {isProcessing === aff.id
                            ? <Loader2 className="animate-spin h-4 w-4" />
                            : (
                              <>
                                <UserMinus className="h-4 w-4 mr-1" />
                                Remove
                              </>
                            )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-muted-foreground">
                    No affiliates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* PROFILE DIALOG */}
      <Dialog
        open={!!selectedProfile}
        onOpenChange={() => setSelectedProfile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Affiliate Details
            </DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Account Holder</p>
                  <p className="font-medium">{selectedProfile.accountHolderName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">UPI ID</p>
                  <p className="font-medium text-primary">{selectedProfile.upiId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Bank Name</p>
                  <p className="font-medium">{selectedProfile.bankName || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Account Number</p>
                  <p className="font-mono text-sm">{selectedProfile.bankAccountNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">IFSC Code</p>
                  <p className="font-mono text-sm">{selectedProfile.ifscCode}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Address</p>
                <p className="text-sm">{selectedProfile.address}, {selectedProfile.city}, {selectedProfile.state} - {selectedProfile.pincode}</p>
              </div>
              <div className="flex gap-6 bg-muted/30 p-4 rounded-xl mt-2">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Earnings</p>
                    <p className="text-xl font-black text-primary">₹{selectedProfile.totalEarnings || 0}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Withdrawable</p>
                  <p className="text-xl font-black text-emerald-600">₹{selectedProfile.withdrawableAmount || 0}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

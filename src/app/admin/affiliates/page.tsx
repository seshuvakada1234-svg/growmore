"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Clock, Award, Landmark, ShieldAlert, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { approveAffiliate, suspendAffiliate, getAffiliateProfile } from "@/lib/adminAffiliateService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminAffiliates() {
  const db = useFirestore();
  const [searchTerm, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Fetch Pending Applications
  const appsQuery = useMemoFirebase(() => query(collection(db, 'affiliateApplications'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')), [db]);
  const { data: applications, isLoading: appsLoading } = useCollection(appsQuery);

  // Fetch Approved Partners
  const affiliatesQuery = useMemoFirebase(() => query(collection(db, 'users'), where('role', '==', 'affiliate')), [db]);
  const { data: affiliates, isLoading: affLoading } = useCollection(affiliatesQuery);

  const handleApprove = async (userId: string) => {
    setIsProcessing(userId);
    try {
      await approveAffiliate(userId);
      toast({ title: "Approved!", description: "Partner role activated." });
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm("Are you sure? This will remove their role and suspend all referral links.")) return;
    setIsProcessing(userId);
    try {
      await suspendAffiliate(userId);
      toast({ title: "Partner Suspended" });
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const viewDetails = async (userId: string) => {
    const data = await getAffiliateProfile(userId);
    setSelectedProfile(data);
  };

  if (appsLoading || affLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  const filteredAffiliates = affiliates?.filter(a => 
    a.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Affiliate Management</h1>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search partners..." className="pl-10 rounded-xl" value={searchTerm} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-600" /> Pending Approval</h2>
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">User ID</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Date</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {applications?.map(app => (
                <tr key={app.id}>
                  <td className="p-6 font-mono text-xs">{app.userId}</td>
                  <td className="p-6 text-sm">{app.createdAt?.seconds ? format(new Date(app.createdAt.seconds * 1000), 'MMM d') : 'Recent'}</td>
                  <td className="p-6 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => viewDetails(app.userId)} variant="outline">Details</Button>
                      <Button size="sm" onClick={() => handleApprove(app.userId)} disabled={isProcessing === app.userId} className="bg-emerald-600">Approve</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!applications || applications.length === 0) && <tr><td colSpan={3} className="p-12 text-center text-muted-foreground italic">No applications pending.</td></tr>}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Active Partners</h2>
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Partner</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Contact</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {filteredAffiliates?.map(aff => (
                <tr key={aff.id}>
                  <td className="p-6"><p className="font-bold text-primary">{aff.displayName || 'Unnamed'}</p></td>
                  <td className="p-6 text-sm">{aff.email}</td>
                  <td className="p-6 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => viewDetails(aff.id)}>Profile</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleSuspend(aff.id)} disabled={isProcessing === aff.id} className="text-destructive"><ShieldAlert className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-2"><Landmark className="h-6 w-6" /> Affiliate Data</DialogTitle></DialogHeader>
          {selectedProfile && (
            <div className="grid grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-muted-foreground">Bank Details</h4>
                <div className="space-y-1">
                  <p className="text-sm font-bold">{selectedProfile.accountHolderName}</p>
                  <p className="text-xs font-mono">{selectedProfile.bankAccountNumber}</p>
                  <p className="text-xs font-mono">IFSC: {selectedProfile.ifscCode}</p>
                  <p className="text-xs text-primary font-bold">UPI: {selectedProfile.upiId}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-muted-foreground">Location</h4>
                <p className="text-xs leading-relaxed">{selectedProfile.address}, {selectedProfile.city}, {selectedProfile.state} - {selectedProfile.pincode}</p>
              </div>
              <div className="col-span-2 bg-accent/30 p-6 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <TrendingUp className="text-primary h-8 w-8" />
                  <div><p className="text-[10px] uppercase font-black text-primary/60">Total Earnings</p><p className="text-2xl font-black text-primary">₹{selectedProfile.totalEarnings || 0}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-primary/60">Withdrawable</p>
                  <p className="text-2xl font-black text-emerald-600">₹{selectedProfile.withdrawableAmount || 0}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

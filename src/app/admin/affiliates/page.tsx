
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Clock, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy, collectionGroup } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function AdminAffiliates() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Fetch Applications
  const appsQuery = useMemoFirebase(() => query(collection(db, 'affiliateApplications'), orderBy('createdAt', 'desc')), [db]);
  const { data: applications, isLoading: appsLoading } = useCollection(appsQuery);

  // Fetch Approved Affiliates using collectionGroup
  const profilesQuery = useMemoFirebase(() => collectionGroup(db, 'profile'), [db]);
  const { data: affiliates, isLoading: affLoading } = useCollection(profilesQuery);

  const handleApprove = async (userId: string) => {
    setIsProcessing(userId);
    try {
      // 1. Update User Role
      await updateDoc(doc(db, 'users', userId), { role: 'affiliate', updatedAt: serverTimestamp() });
      
      // 2. Create Profile in nested path
      await setDoc(doc(db, 'users', userId, 'affiliate', 'profile'), {
        affiliateId: userId,
        totalEarnings: 0,
        paidEarnings: 0,
        totalClicks: 0,
        totalReferrals: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Delete Application
      await deleteDoc(doc(db, 'affiliateApplications', userId));

      toast({ title: "Approved!", description: "Partner has been added to the program." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to approve partner.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (userId: string) => {
    setIsProcessing(userId);
    try {
      await updateDoc(doc(db, 'affiliateApplications', userId), { status: 'rejected' });
      toast({ title: "Rejected", description: "Application has been declined." });
    } catch (e) {
      toast({ title: "Error", description: "Action failed.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  if (appsLoading || affLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-headline font-extrabold text-primary">Affiliate Program</h1>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search partners..." className="pl-10 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Applications Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-600" /> Pending Applications</h2>
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">User ID</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Applied Date</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {applications?.filter(a => a.status === 'pending').map(app => (
                <tr key={app.id}>
                  <td className="p-6 font-mono text-xs">{app.userId}</td>
                  <td className="p-6 text-sm">{app.createdAt?.seconds ? format(new Date(app.createdAt.seconds * 1000), 'MMM d, yyyy') : 'Recent'}</td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" onClick={() => handleApprove(app.id)} disabled={isProcessing === app.id} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReject(app.id)} disabled={isProcessing === app.id} className="text-destructive">Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {applications?.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-muted-foreground italic">No pending applications.</td></tr>}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Partners Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Active Partners</h2>
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Partner</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Clicks</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Total Earned</th>
                <th className="p-6 text-xs uppercase font-bold text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {affiliates?.map(aff => (
                <tr key={aff.id} className="hover:bg-accent/20 transition-colors">
                  <td className="p-6 font-mono text-xs font-bold text-primary">{aff.affiliateId?.substring(0, 12)}...</td>
                  <td className="p-6 font-bold">{aff.totalClicks || 0}</td>
                  <td className="p-6 font-bold text-emerald-600">₹{aff.totalEarnings || 0}</td>
                  <td className="p-6 font-bold">₹{(aff.totalEarnings || 0) - (aff.paidEarnings || 0)}</td>
                </tr>
              ))}
              {affiliates?.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-muted-foreground italic">No approved affiliates yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}


"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Wallet, Copy, Link as LinkIcon, CheckCircle2, Clock, Zap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, setDoc, serverTimestamp, query, collection, where, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function AffiliateDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  // 1. Fetch User Data
  const userRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  // 2. Fetch Application
  const appRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'affiliateApplications', user.uid), [db, user?.uid]);
  const { data: application } = useDoc(appRef);

  // 3. Fetch Stats from affiliateProfiles root collection
  const statsRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'affiliateProfiles', user.uid), [db, user?.uid]);
  const { data: stats } = useDoc(statsRef);

  // 4. Fetch Commissions from subcollection
  const commQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(db, 'affiliateProfiles', user.uid, 'commissions'), orderBy('createdAt', 'desc'));
  }, [db, user?.uid]);
  const { data: commissions } = useCollection(commQuery);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login?redirect=/affiliate');
  }, [user, isUserLoading, router]);

  const handleApply = async () => {
    if (!user?.uid) return;
    const appData = { userId: user.uid, status: "pending", createdAt: serverTimestamp() };
    await setDoc(doc(db, 'affiliateApplications', user.uid), appData);
    toast({ title: "Application Sent!", description: "We'll review your profile shortly." });
  };

  const handleCopy = () => {
    const link = `${window.location.origin}/?ref=${user?.uid}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied!" });
  };

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const role = profile?.role || 'user';
  const isApproved = role === 'affiliate';
  const isPending = !!application && application.status === 'pending';

  if (!isApproved) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-neutral/30 py-20">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            {isPending ? (
              <Card className="p-12 space-y-6 rounded-[3rem] border-none shadow-xl">
                <div className="h-20 w-20 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto"><Clock className="h-10 w-10 animate-pulse" /></div>
                <h1 className="text-4xl font-headline font-extrabold text-primary">Application Under Review</h1>
                <p className="text-muted-foreground text-lg">Thanks for your interest! Our team is verifying your profile.</p>
              </Card>
            ) : (
              <div className="space-y-12">
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-primary">Grow With Us.</h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Join the GreenScape Partner Program and earn up to 10% commission.</p>
                  <Button onClick={handleApply} size="lg" className="h-14 px-10 rounded-full text-lg font-bold mt-6 shadow-xl shadow-primary/20">Apply to Join</Button>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const balance = (stats?.totalEarnings || 0) - (stats?.paidEarnings || 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-headline font-extrabold text-primary">Partner Dashboard</h1>
              <p className="text-muted-foreground">Manage your links and track your earnings.</p>
            </div>
            <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Official GreenScape Partner
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Gross Earnings", value: `₹${(stats?.totalEarnings || 0).toLocaleString()}`, icon: Wallet, color: "bg-blue-50 text-blue-600" },
              { label: "Available", value: `₹${balance.toLocaleString()}`, icon: Zap, color: "bg-emerald-50 text-emerald-600" },
              { label: "Referrals", value: stats?.totalReferrals || 0, icon: Users, color: "bg-purple-50 text-purple-600" },
              { label: "Total Clicks", value: stats?.totalClicks || 0, icon: TrendingUp, color: "bg-orange-50 text-orange-600" }
            ].map((s, i) => (
              <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white flex flex-col justify-between">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${s.color}`}><s.icon className="h-6 w-6" /></div>
                <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p><h3 className="text-2xl font-extrabold text-primary mt-1">{s.value}</h3></div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Your Referral Link</h3>
                <div className="flex gap-2">
                  <div className="flex-grow p-4 bg-muted rounded-2xl font-mono text-sm overflow-hidden truncate">
                    {window.location.origin}/?ref={user?.uid}
                  </div>
                  <Button onClick={handleCopy} size="icon" className="h-auto w-14 rounded-2xl"><Copy className="h-5 w-5" /></Button>
                </div>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xl font-headline font-extrabold text-primary">Recent Commissions</h3>
                <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/30 border-b border-muted">
                        <th className="p-6 font-bold text-xs uppercase text-muted-foreground">Order ID</th>
                        <th className="p-6 font-bold text-xs uppercase text-muted-foreground">Amount</th>
                        <th className="p-6 font-bold text-xs uppercase text-muted-foreground">Date</th>
                        <th className="p-6 font-bold text-xs uppercase text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted">
                      {commissions?.map(c => (
                        <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                          <td className="p-6 font-mono text-xs font-bold text-primary">#{c.orderId?.substring(0, 10)}</td>
                          <td className="p-6 font-extrabold">₹{c.amount.toLocaleString()}</td>
                          <td className="p-6 text-sm text-muted-foreground">{c.createdAt?.seconds ? format(new Date(c.createdAt.seconds * 1000), 'MMM d, yyyy') : 'Recent'}</td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{c.status}</span>
                          </td>
                        </tr>
                      ))}
                      {commissions?.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-muted-foreground italic">No commissions earned yet.</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-sm bg-primary text-white p-8">
                <h3 className="text-xl font-headline font-bold mb-6">Withdraw Earnings</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-white/60 uppercase font-bold tracking-widest mb-1">Available</p>
                    <h4 className="text-4xl font-extrabold">₹{balance.toLocaleString()}</h4>
                  </div>
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <p className="text-xs text-white/70 italic">Minimum withdrawal is ₹500.</p>
                    <Link href="/affiliate/payouts" className="block">
                      <Button disabled={balance < 500} className="w-full h-12 rounded-full bg-white text-primary hover:bg-emerald-50 font-bold">Request Payout</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

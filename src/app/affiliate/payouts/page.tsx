
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowLeft, Clock, CheckCircle2, AlertCircle, Loader2, Banknote } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, addDoc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function AffiliatePayoutsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // FIXED: Query top-level affiliatePayouts collection instead of nested path
  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'affiliatePayouts'),
      where('affiliateId', '==', user.uid),
      orderBy('payoutDate', 'desc')
    );
  }, [db, user?.uid]);

  const { data: payouts, isLoading: isPayoutsLoading } = useCollection(payoutsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/affiliate/payouts');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
        <Footer />
      </div>
    );
  }

  const isApprovedAffiliate = profile?.role === 'affiliate' || profile?.affiliateStatus === 'approved';
  if (!isApprovedAffiliate) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-headline font-extrabold text-primary">Access Denied</h1>
          <Button onClick={() => router.push('/affiliate')} className="mt-6 rounded-full px-8">Return to Affiliate Program</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const totalEarnings = profile?.totalEarnings || 0;
  const paidEarnings = profile?.paidEarnings || 0;
  const pendingRequestsTotal = payouts?.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.payoutAmount || 0), 0) || 0;
  const availableBalance = Math.max(0, totalEarnings - paidEarnings - pendingRequestsTotal);
  const hasPendingRequest = payouts?.some(p => p.status === 'pending');

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestAmount = parseFloat(amount);

    if (isNaN(requestAmount) || requestAmount < 500) {
      toast({ title: "Invalid Amount", description: "Minimum withdrawal is ₹500.", variant: "destructive" });
      return;
    }

    if (requestAmount > availableBalance) {
      toast({ title: "Insufficient Balance", description: "Insufficient funds.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    // FIXED: Write to top-level affiliatePayouts collection
    const payoutData = {
      affiliateId: user!.uid,
      payoutAmount: requestAmount,
      payoutDate: serverTimestamp(),
      status: "pending",
      bankDetails: {
        accountName: profile?.bankAccountName || "",
        accountNumber: profile?.bankAccountNumber || "",
        ifsc: profile?.bankIfscCode || "",
        upiId: profile?.upiId || ""
      }
    };

    try {
      await addDoc(collection(db, 'affiliatePayouts'), payoutData);
      toast({ title: "Request Submitted", description: "Your payout request is now pending approval." });
      setAmount("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link href="/affiliate" className="inline-flex items-center gap-2 text-primary font-bold mb-8 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-sm bg-primary text-white overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3 opacity-80"><Wallet className="h-5 w-5" /><span className="text-sm font-bold uppercase tracking-wider">Available</span></div>
                  <h2 className="text-5xl font-extrabold font-headline">₹{availableBalance}</h2>
                  <div className="pt-4 space-y-2 text-sm border-t border-white/10">
                    <div className="flex justify-between opacity-70"><span>Total Earned</span><span className="font-bold">₹{totalEarnings}</span></div>
                    <div className="flex justify-between opacity-70"><span>Paid</span><span className="font-bold">₹{paidEarnings}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                <CardHeader className="p-0 mb-6"><CardTitle className="text-2xl font-headline font-extrabold text-primary">Request Payout</CardTitle></CardHeader>
                <form onSubmit={handleRequestPayout} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Withdrawal Amount (₹)</Label>
                    <Input id="amount" type="number" placeholder="500" className="h-14 rounded-2xl text-xl font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={isSubmitting || availableBalance < 500 || hasPendingRequest} className="w-full h-14 rounded-full font-bold text-lg">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : hasPendingRequest ? "Request Pending" : "Submit Request"}
                  </Button>
                </form>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xl font-headline font-extrabold text-primary">Payout History</h3>
                {isPayoutsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : payouts?.length === 0 ? (
                  <Card className="rounded-3xl border-dashed border-2 bg-transparent p-12 text-center text-muted-foreground">No history found.</Card>
                ) : (
                  <div className="space-y-3">
                    {payouts?.map((payout) => (
                      <Card key={payout.id} className="rounded-2xl border-none shadow-sm bg-white p-5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-primary">₹{payout.payoutAmount}</p>
                          <p className="text-xs text-muted-foreground uppercase font-bold">{payout.payoutDate?.seconds ? format(new Date(payout.payoutDate.seconds * 1000), "MMM d, yyyy") : 'Recent'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${payout.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : payout.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{payout.status}</span>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

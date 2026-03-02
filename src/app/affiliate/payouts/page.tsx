
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Wallet, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Banknote
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
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

  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'affiliateProfile', 'payouts'),
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
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  // Access check
  const isApprovedAffiliate = profile?.role === 'affiliate' || profile?.affiliateStatus === 'approved';
  if (!isApprovedAffiliate) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-headline font-extrabold text-primary">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Only approved affiliates can access the payouts page.</p>
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
      toast({ title: "Insufficient Balance", description: "You cannot withdraw more than your available balance.", variant: "destructive" });
      return;
    }

    if (hasPendingRequest) {
      toast({ title: "Request Already Pending", description: "You can only have one pending payout request at a time.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const payoutRef = collection(db, 'users', user!.uid, 'affiliateProfile', 'payouts');
    const payoutData = {
      affiliateId: user!.uid,
      payoutAmount: requestAmount,
      payoutDate: serverTimestamp(), // Used as requestedAt for pending status
      status: "pending",
      bankDetails: {
        accountName: profile?.bankAccountName || "",
        accountNumber: profile?.bankAccountNumber || "",
        ifsc: profile?.bankIfscCode || "",
        upiId: profile?.upiId || ""
      }
    };

    try {
      await addDoc(payoutRef, payoutData);
      toast({ title: "Request Submitted", description: "Your payout request has been sent for approval." });
      setAmount("");
    } catch (error) {
      console.error("Payout request error", error);
      toast({ title: "Error", description: "Failed to submit request. Please try again.", variant: "destructive" });
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
            {/* Wallet Sidebar */}
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-sm bg-primary text-white overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3 opacity-80">
                    <Wallet className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Available Balance</span>
                  </div>
                  <h2 className="text-5xl font-extrabold font-headline">₹{availableBalance}</h2>
                  <div className="pt-4 space-y-2 text-sm border-t border-white/10">
                    <div className="flex justify-between opacity-70">
                      <span>Total Earned</span>
                      <span className="font-bold">₹{totalEarnings}</span>
                    </div>
                    <div className="flex justify-between opacity-70">
                      <span>Total Paid</span>
                      <span className="font-bold">₹{paidEarnings}</span>
                    </div>
                    {pendingRequestsTotal > 0 && (
                      <div className="flex justify-between text-yellow-200">
                        <span>Locked (Pending)</span>
                        <span className="font-bold">₹{pendingRequestsTotal}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" /> Payout Method
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">Bank Account</p>
                    <p className="font-bold truncate">{profile?.bankAccountNumber || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">UPI ID</p>
                    <p className="font-bold truncate">{profile?.upiId || 'Not set'}</p>
                  </div>
                  <Link href="/affiliate" className="text-primary text-xs font-bold hover:underline inline-block mt-2">Edit Details →</Link>
                </div>
              </Card>
            </div>

            {/* Request Form & History */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-2xl font-headline font-extrabold text-primary">Request Payout</CardTitle>
                </CardHeader>
                <form onSubmit={handleRequestPayout} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Withdrawal Amount (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg text-muted-foreground">₹</span>
                      <Input 
                        id="amount"
                        type="number"
                        placeholder="500"
                        className="pl-8 h-14 rounded-2xl text-xl font-bold"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="500"
                        max={availableBalance}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      * Minimum withdrawal ₹500. Balance updates after admin approval.
                    </p>
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting || availableBalance < 500 || hasPendingRequest}
                    className="w-full h-14 rounded-full font-bold text-lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : hasPendingRequest ? (
                      "Request Pending Approval"
                    ) : availableBalance < 500 ? (
                      "Minimum ₹500 Required"
                    ) : (
                      "Submit Payout Request"
                    )}
                  </Button>
                </form>
              </Card>

              {/* History */}
              <div className="space-y-4">
                <h3 className="text-xl font-headline font-extrabold text-primary px-2">Payout History</h3>
                {isPayoutsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : payouts?.length === 0 ? (
                  <Card className="rounded-3xl border-dashed border-2 bg-transparent p-12 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No payout requests found.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {payouts?.map((payout) => (
                      <Card key={payout.id} className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                              payout.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                              payout.status === 'rejected' ? 'bg-red-50 text-red-600' :
                              'bg-yellow-50 text-yellow-600'
                            }`}>
                              {payout.status === 'approved' ? <CheckCircle2 className="h-5 w-5" /> :
                               payout.status === 'rejected' ? <AlertCircle className="h-5 w-5" /> :
                               <Clock className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-primary">₹{payout.payoutAmount}</p>
                              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                                {payout.payoutDate?.seconds ? format(new Date(payout.payoutDate.seconds * 1000), "MMM d, yyyy") : 'Recent'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              payout.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              payout.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payout.status}
                            </span>
                          </div>
                        </div>
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

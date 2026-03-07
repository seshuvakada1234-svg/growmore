"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowLeft, Landmark, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAffiliate } from "@/context/affiliate-context";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function AffiliatePayoutsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");

  const { isApproved, affiliateProfile: profile, loading: isAffiliateLoading } = useAffiliate();

  // Fetch Payout History
  const payoutsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'affiliateWithdrawRequests'), where('affiliateId', '==', user.uid), orderBy('requestedAt', 'desc'));
  }, [db, user?.uid]);
  const { data: payouts, isLoading: isPayoutsLoading } = useCollection(payoutsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login?redirect=/affiliate/payouts');
  }, [user, isUserLoading, router]);

  if (isUserLoading || isAffiliateLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const balance = profile?.withdrawableAmount || 0;

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestAmount = parseFloat(amount);

    if (isNaN(requestAmount) || requestAmount < 500) {
      toast({ title: "Invalid Amount", description: "Minimum payout is ₹500.", variant: "destructive" });
      return;
    }

    if (requestAmount > balance) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'affiliateWithdrawRequests'), {
        affiliateId: user!.uid,
        amount: requestAmount,
        bankAccountNumber: profile.bankAccountNumber,
        ifscCode: profile.ifscCode,
        upiId: profile.upiId,
        status: "pending",
        requestedAt: serverTimestamp()
      });
      toast({ title: "Request Submitted", description: "Admin will process your payout within 2-3 business days." });
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
                  <h2 className="text-5xl font-extrabold font-headline">₹{balance.toLocaleString()}</h2>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs opacity-70">Payouts sent to:</p>
                    <p className="text-sm font-bold mt-1">Bank: **** {profile?.bankAccountNumber?.slice(-4)}</p>
                    <p className="text-sm font-bold">UPI: {profile?.upiId || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
                <CardHeader className="p-0 mb-6"><CardTitle className="text-2xl font-headline font-extrabold text-primary">Request Payout</CardTitle></CardHeader>
                <form onSubmit={handleRequestPayout} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Withdrawal Amount (₹)</Label>
                    <Input type="number" placeholder="500" className="h-14 rounded-2xl text-xl font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={isSubmitting || balance < 500} className="w-full h-14 rounded-full font-bold text-lg">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Request Funds"}
                  </Button>
                </form>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xl font-headline font-extrabold text-primary">Request History</h3>
                {isPayoutsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : !payouts || payouts.length === 0 ? (
                  <Card className="rounded-3xl border-dashed border-2 bg-transparent p-12 text-center text-muted-foreground">No history found.</Card>
                ) : (
                  <div className="space-y-3">
                    {payouts.map((p) => (
                      <Card key={p.id} className="rounded-2xl border-none shadow-sm bg-white p-5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-primary">₹{p.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground uppercase font-bold">{p.requestedAt?.seconds ? format(new Date(p.requestedAt.seconds * 1000), "MMM d, yyyy") : 'Recent'}</p>
                        </div>
                        <Badge className={`rounded-full text-[10px] font-bold uppercase ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.status}
                        </Badge>
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

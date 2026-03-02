
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  Copy, 
  Link as LinkIcon, 
  CheckCircle2, 
  Clock, 
  Award,
  Zap,
  Loader2,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { generateMarketingContent } from "@/ai/flows/affiliate-marketing-content-generator";
import { PRODUCTS } from "@/lib/mock-data";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AffiliatePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketingContent, setMarketingContent] = useState<any>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/affiliate');
    }
  }, [user, isUserLoading, router]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfileRef) return;

    // Generate a clean 6-digit unique referral code
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      await updateDoc(userProfileRef, {
        affiliateStatus: "pending",
        referralCode: randomCode,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Application Submitted! 🌿",
        description: "Our team will review your profile and get back to you soon.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Submission failed. Try again later.", variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    if (!user?.uid) return;
    const refLink = `${window.location.origin}/?ref=${user.uid}`;
    navigator.clipboard.writeText(refLink);
    toast({ title: "Link Copied!", description: "Share it to start earning." });
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const plant = PRODUCTS[0];
      const referralLink = `${window.location.origin}/?ref=${user?.uid}`;
      const result = await generateMarketingContent({
        plantName: plant.name,
        plantCategory: plant.category,
        plantDescription: plant.description,
        plantPrice: plant.price,
        referralLink: referralLink,
        imageUrl: plant.imageUrl
      });
      setMarketingContent(result);
      toast({ title: "AI Magic Complete!", description: "Content ready for posting." });
    } catch (error) {
      toast({ title: "AI Error", description: "Generation failed. Try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-neutral/30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const status = profile?.role === 'affiliate' || profile?.affiliateStatus === 'approved' ? 'approved' : (profile?.affiliateStatus || 'none');

  // --- JOIN / LANDING ---
  if (status === "none" || status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-neutral/30 py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center space-y-6 mb-16">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold uppercase tracking-wider text-xs">
                <Award className="h-4 w-4" /> Official Partner Program
              </div>
              <h1 className="text-4xl md:text-6xl font-headline font-extrabold text-primary leading-tight">
                Grow Your Wealth <br />Along With Us
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Refer plant lovers to GreenScape Nursery and earn up to 10% commission on every successful sale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="space-y-8 py-6">
                {[
                  { icon: TrendingUp, t: "High Commission", d: "Earn consistent 10% on every order attributed to your link." },
                  { icon: Zap, t: "AI Content Studio", d: "Generate viral social posts instantly with our Genkit AI engine." },
                  { icon: Wallet, t: "Direct Payouts", d: "Withdraw your earnings directly to your bank account or UPI." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div><h3 className="font-bold text-lg mb-1">{item.t}</h3><p className="text-muted-foreground text-sm leading-relaxed">{item.d}</p></div>
                  </div>
                ))}
              </div>

              <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-8">
                <CardHeader className="p-0 mb-6"><CardTitle className="text-2xl font-headline font-extrabold text-primary">Apply Now</CardTitle></CardHeader>
                <form onSubmit={handleApply} className="space-y-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input defaultValue={user?.displayName || ""} required className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Banking UPI ID</Label><Input placeholder="yourname@upi" required className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Bank Account Number</Label><Input placeholder="0000 0000 0000" required className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Branch IFSC</Label><Input placeholder="IFSC CODE" required className="rounded-xl uppercase" /></div>
                  <Button className="w-full h-12 rounded-full font-bold text-lg mt-4 shadow-lg shadow-primary/20">Submit Application</Button>
                </form>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // --- PENDING STATE ---
  if (status === "pending") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-neutral/30 flex items-center justify-center p-4">
          <Card className="max-w-xl w-full rounded-[2.5rem] border-none shadow-xl text-center p-12 space-y-6">
            <div className="h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto text-yellow-600"><Clock className="h-12 w-12 animate-pulse" /></div>
            <h1 className="text-3xl font-headline font-extrabold text-primary">Application Pending</h1>
            <p className="text-muted-foreground text-lg">We are currently reviewing your partner application. You'll receive an email notification once approved (usually 12-24 hours).</p>
            <div className="bg-accent p-4 rounded-2xl border border-primary/10 text-sm font-medium text-primary">Status: Awaiting Admin Verification</div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // --- DASHBOARD (APPROVED) ---
  const availableBalance = (profile?.totalEarnings || 0) - (profile?.paidEarnings || 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-headline font-extrabold text-primary">Partner Dashboard</h1>
              <p className="text-muted-foreground">Track your referrals, earnings, and marketing campaigns.</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold text-xs border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Verified GreenScape Partner
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Gross Earnings", value: `₹${profile?.totalEarnings || 0}`, icon: Wallet, color: "bg-blue-50 text-blue-600" },
              { label: "Total Paid", value: `₹${profile?.paidEarnings || 0}`, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
              { label: "Referrals", value: profile?.totalReferrals || 0, icon: Users, color: "bg-purple-50 text-purple-600" },
              { label: "Link Clicks", value: profile?.totalClicks || 0, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" }
            ].map((stat, i) => (
              <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white flex flex-col justify-between">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}><stat.icon className="h-6 w-6" /></div>
                <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p><h3 className="text-2xl font-extrabold text-primary mt-1">{stat.value}</h3></div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Your Referral Link</h3>
                <div className="flex gap-2">
                  <div className="flex-grow p-4 bg-muted rounded-2xl font-mono text-sm overflow-hidden truncate">
                    {window.location.origin}/?ref={user?.uid}
                  </div>
                  <Button onClick={handleCopyLink} size="icon" className="h-auto w-14 rounded-2xl"><Copy className="h-5 w-5" /></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4 font-medium italic">* Earnings are credited instantly upon successful order payment.</p>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-headline font-extrabold text-primary flex items-center gap-2"><Zap className="h-5 w-5" /> AI Content Generator</h3>
                  <Button onClick={handleGenerateAI} disabled={isGenerating} size="sm" className="rounded-full px-6">{isGenerating ? "Processing..." : "Generate AI Post"}</Button>
                </div>
                {marketingContent ? (
                  <div className="space-y-6 animate-scale-in">
                    <div className="p-4 bg-accent/50 rounded-2xl text-sm leading-relaxed border border-primary/10">
                      <p>{marketingContent.socialMediaPost}</p>
                      <div className="mt-3 flex flex-wrap gap-2">{marketingContent.hashtags.map((h: string) => <span key={h} className="text-primary font-bold text-xs">#{h}</span>)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                    <Zap className="h-10 w-10 mb-2" />
                    <p className="text-sm font-medium">Click generate to create optimized posts.</p>
                  </div>
                )}
              </Card>
            </div>

            <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8 flex flex-col">
              <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2"><Wallet className="h-5 w-5" /> My Wallet</h3>
              <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 mb-8 flex-grow">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">Available for Withdrawal</p>
                <h4 className="text-5xl font-extrabold text-primary">₹{availableBalance.toLocaleString()}</h4>
                <div className="mt-8 grid grid-cols-2 gap-4 pt-8 border-t border-primary/10">
                  <div><p className="text-[10px] text-muted-foreground font-bold">Min. Withdrawal</p><p className="font-bold text-sm">₹500</p></div>
                  <div><p className="text-[10px] text-muted-foreground font-bold">Payout Mode</p><p className="font-bold text-sm">Direct Bank/UPI</p></div>
                </div>
              </div>
              <Link href="/affiliate/payouts" className="block w-full">
                <Button className="w-full h-14 rounded-full font-bold text-lg shadow-xl shadow-primary/10">Withdraw Earnings <ChevronRight className="ml-2 h-5 w-5" /></Button>
              </Link>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

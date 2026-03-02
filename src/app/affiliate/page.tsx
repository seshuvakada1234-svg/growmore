
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
  Check, 
  Award,
  Zap
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { generateMarketingContent } from "@/ai/flows/affiliate-marketing-content-generator";
import { PRODUCTS } from "@/lib/mock-data";

export default function AffiliatePage() {
  const [status, setStatus] = useState<"None" | "Pending" | "Approved">("None");
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketingContent, setMarketingContent] = useState<any>(null);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Pending");
    toast({
      title: "Application Submitted!",
      description: "Our team will review your application within 24-48 hours.",
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://greenscape.in/ref/user9921");
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const plant = PRODUCTS[0];
      const result = await generateMarketingContent({
        plantName: plant.name,
        plantCategory: plant.category,
        plantDescription: plant.description,
        plantPrice: plant.price,
        referralLink: "https://greenscape.in/ref/user9921",
        imageUrl: plant.imageUrl
      });
      setMarketingContent(result);
      toast({ title: "AI Content Ready!", description: "Marketing content generated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate AI content.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // 1. JOIN PAGE
  if (status === "None") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-neutral/30 py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center space-y-6 mb-16">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold uppercase tracking-wider">
                <Award className="h-5 w-5" /> Affiliate Program
              </div>
              <h1 className="text-4xl md:text-6xl font-headline font-extrabold text-primary leading-tight">
                Turn Your Green Thumb <br />Into Green Cash
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Join our family of plant lovers and earn up to 10% commission for every new plant parent you bring to GreenScape.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">High Commissions</h3>
                    <p className="text-muted-foreground text-sm">Earn up to 10% on every order. The more they buy, the more you earn.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">AI Marketing Tools</h3>
                    <p className="text-muted-foreground text-sm">Access our advanced AI content generator to create viral social posts.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Fast Payouts</h3>
                    <p className="text-muted-foreground text-sm">Direct bank transfers every month. No hidden fees or long waits.</p>
                  </div>
                </div>
              </div>

              <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-8">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-2xl font-headline font-extrabold text-primary">Apply Now</CardTitle>
                </CardHeader>
                <form onSubmit={handleApply} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input placeholder="Jane Doe" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="jane@example.com" required className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input placeholder="+91 XXXX" required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>UPI ID</Label>
                      <Input placeholder="jane@okaxis" required className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Account Number</Label>
                    <Input placeholder="XXXX XXXX XXXX XXXX" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank IFSC Code</Label>
                    <Input placeholder="e.g. SBIN0001234" required className="rounded-xl uppercase" />
                  </div>
                  <Button className="w-full h-12 rounded-full font-bold text-lg mt-4">Submit Application</Button>
                </form>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. PENDING PAGE
  if (status === "Pending") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-neutral/30 flex items-center justify-center p-4">
          <Card className="max-w-xl w-full rounded-[2.5rem] border-none shadow-xl text-center p-12 space-y-6">
            <div className="h-24 w-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto text-yellow-600">
              <Clock className="h-12 w-12 animate-pulse" />
            </div>
            <h1 className="text-3xl font-headline font-extrabold text-primary">Application Pending</h1>
            <p className="text-muted-foreground text-lg">
              We've received your application to join our affiliate program! Our admins are currently reviewing your profile.
            </p>
            <div className="bg-accent p-4 rounded-2xl border border-primary/10 text-sm font-medium text-primary">
              Expected review time: 12-24 hours
            </div>
            <div className="pt-6">
              <Button onClick={() => setStatus("Approved")} variant="outline" className="rounded-full px-8">
                Simulation: Approve Application
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // 3. DASHBOARD (APPROVED)
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-headline font-extrabold text-primary">Affiliate Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, GreenScape Partner! Here's your performance.</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold text-sm">
              <CheckCircle2 className="h-4 w-4" /> Active Partner
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Total Earnings", value: "₹4,250", icon: Wallet, color: "bg-blue-50 text-blue-600" },
              { label: "Pending Payout", value: "₹1,200", icon: Clock, color: "bg-yellow-50 text-yellow-600" },
              { label: "Total Referrals", value: "124", icon: Users, color: "bg-purple-50 text-purple-600" },
              { label: "Conversion Rate", value: "12.5%", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" }
            ].map((stat, i) => (
              <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-extrabold text-primary mt-1">{stat.value}</h3>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Referral Tools */}
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden p-8">
                <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" /> Your Referral Link
                </h3>
                <div className="flex gap-2">
                  <div className="flex-grow p-4 bg-muted rounded-2xl font-mono text-sm overflow-hidden whitespace-nowrap">
                    https://greenscape.in/ref/user9921
                  </div>
                  <Button onClick={handleCopyLink} size="icon" className="h-auto w-14 rounded-2xl">
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Share this link on your social media, blog, or with friends to start earning commissions.
                </p>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
                    <Zap className="h-5 w-5" /> AI Content Generator
                  </h3>
                  <Button 
                    onClick={handleGenerateAI} 
                    disabled={isGenerating}
                    className="rounded-full h-10 px-6 gap-2"
                  >
                    {isGenerating ? "Generating..." : "Generate Post"}
                  </Button>
                </div>
                
                {marketingContent ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Social Media Post</Label>
                      <div className="p-4 bg-accent rounded-2xl text-sm leading-relaxed border border-primary/10">
                        {marketingContent.socialMediaPost}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {marketingContent.hashtags.map((h: string) => (
                            <span key={h} className="text-primary font-bold">#{h}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Email Snippet</Label>
                      <div className="p-4 bg-accent rounded-2xl text-sm leading-relaxed border border-primary/10">
                        {marketingContent.emailSnippet}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="h-16 w-16 bg-accent rounded-full flex items-center justify-center text-primary/30">
                      <Zap className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-bold">Create Viral Content</h4>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Click generate to let our AI create the perfect marketing content for your next referral post.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Recent Payouts */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden p-8">
              <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Recent Earnings
              </h3>
              <div className="space-y-4">
                {[
                  { id: "ORD-1229", amount: "₹450", date: "Today, 10:30 AM", status: "Pending" },
                  { id: "ORD-1225", amount: "₹120", date: "Yesterday", status: "Approved" },
                  { id: "ORD-1210", amount: "₹980", date: "Mar 15, 2024", status: "Paid" },
                  { id: "ORD-1198", amount: "₹340", date: "Mar 12, 2024", status: "Paid" }
                ].map((txn, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${txn.status === "Paid" ? "bg-emerald-50 text-emerald-600" : "bg-yellow-50 text-yellow-600"}`}>
                        {txn.status === "Paid" ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">Order #{txn.id}</p>
                        <p className="text-xs text-muted-foreground">{txn.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{txn.amount}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${txn.status === "Paid" ? "text-emerald-600" : "text-yellow-600"}`}>{txn.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-6 text-primary font-bold">View All Earnings</Button>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

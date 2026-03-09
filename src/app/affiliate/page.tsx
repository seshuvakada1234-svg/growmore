"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  Copy, 
  Link as LinkIcon, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Loader2, 
  Landmark,
  AlertCircle,
  UserCheck,
  BadgeCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { 
  useUser, 
  useFirestore, 
  useDoc, 
  useMemoFirebase, 
  useCollection
} from "@/firebase";
import { 
  doc, 
  setDoc,
  writeBatch,
  serverTimestamp, 
  query, 
  collection, 
  orderBy, 
  where 
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAffiliate } from "@/context/affiliate-context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

function isValidPincode(pin: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pin);
}

export default function AffiliateDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    accountHolderName: "",
    bankAccountNumber: "",
    bankName: "",
    ifscCode: "",
    upiId: "",
    address: "",
    city: "",
    state: "",
    pincode: ""
  });

  // Helper States
  const [branchName, setBranchName] = useState("");
  const [ifscError, setIfscError] = useState("");
  const [isFetchingIfsc, setIsFetchingIfsc] = useState(false);

  // Unified status from context
  const { isApproved, affiliateProfile, loading: isAffiliateLoading } = useAffiliate();

  // Fetch Application status
  const appRef = useMemoFirebase(
    () => !user?.uid ? null : doc(db, 'affiliateApplications', user.uid), 
    [db, user?.uid]
  );
  const { data: application } = useDoc(appRef);

  // Fetch User Profile
  const userProfileRef = useMemoFirebase(
    () => !user?.uid ? null : doc(db, 'users', user.uid), 
    [db, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // Fetch Commissions
  const commQuery = useMemoFirebase(() => {
    if (!user?.uid || !db) return null;
    return query(
      collection(db, 'affiliate_commissions'), 
      where('affiliateId', '==', user.uid), 
      orderBy('createdAt', 'desc')
    );
  }, [db, user?.uid]);
  const { data: commissions } = useCollection(commQuery);

  // Countdown logic
  useEffect(() => {
    if (!application?.createdAt) return;
    
    const calculateTime = () => {
      const start = application.createdAt.seconds * 1000;
      const deadline = start + (48 * 60 * 60 * 1000);
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("EXPIRED");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m remaining`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, [application?.createdAt]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login?redirect=/affiliate');
  }, [user, isUserLoading, router]);

  const fetchBankFromIFSC = async (ifsc: string) => {
    if (ifsc.length !== 11) return;
    setIsFetchingIfsc(true);
    setIfscError("");
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
      if (!res.ok) throw new Error("Invalid IFSC");
      const data = await res.json();
      setFormData(prev => ({ ...prev, bankName: data.BANK }));
      setBranchName(data.BRANCH);
    } catch (err) {
      setFormData(prev => ({ ...prev, bankName: "" }));
      setBranchName("");
      setIfscError("Invalid IFSC Code");
    } finally {
      setIsFetchingIfsc(false);
    }
  };

  const handleIfscChange = (val: string) => {
    const code = val.toUpperCase().slice(0, 11);
    setFormData(prev => ({ ...prev, ifscCode: code }));
    if (code.length === 11) {
      fetchBankFromIFSC(code);
    } else {
      setBranchName("");
      setIfscError("");
    }
  };

  const handlePincodeChange = (val: string) => {
    const pin = val.replace(/\D/g, "").slice(0, 6);
    setFormData(prev => ({ ...prev, pincode: pin }));
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !db) return;

    if (!isValidPincode(formData.pincode)) {
      toast({ 
        title: "Invalid Pincode", 
        description: "Please enter a valid 6-digit Indian pincode", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsApplying(true);
    
    try {
      const batch = writeBatch(db);

      // 1. Affiliate Profile — user can create/update their own profile
      const profileRef = doc(db, 'affiliateProfiles', user.uid);
      batch.set(profileRef, {
        userId: user.uid,
        ...formData,
        totalEarnings: 0,
        withdrawableAmount: 0,
        paidEarnings: 0,
        approved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Affiliate Application — doc ID = user UID, status must be "pending"
      const applicationRef = doc(db, 'affiliateApplications', user.uid);
      batch.set(applicationRef, { 
        userId: user.uid, 
        status: "pending", 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // ✅ NO users update here — role is set by admin on approval only
      // Updating role/affiliateApproved yourself violates Firestore rules

      await batch.commit();

      toast({ 
        title: "Application Sent! 🎉", 
        description: "We'll review your bank details and profile shortly." 
      });

    } catch (error: any) {
      console.error("Affiliate application submission error:", error);
      toast({ 
        title: "Submission Failed", 
        description: error.message || "Could not save application data.",
        variant: "destructive" 
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopy = () => {
    if (typeof window === 'undefined' || !user?.uid) return;
    const link = `${window.location.origin}/?ref=${user.uid}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied!" });
  };

  const getStepStatus = (stepId: string) => {
    const status = application?.status || 'submitted';
    const order = ['submitted', 'verifying', 'review', 'approved'];
    const normalizedStatus = status === 'pending' ? 'submitted' : status;
    const currentIndex = order.indexOf(normalizedStatus);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  const steps = [
    { id: 'submitted', label: 'Application Submitted', icon: CheckCircle2 },
    { id: 'verifying', label: 'Bank Details Verification', icon: Clock },
    { id: 'review', label: 'Profile Review', icon: UserCheck },
    { id: 'approved', label: 'Affiliate Activated', icon: BadgeCheck },
  ];

  // --- LOADING STATE ---
  if (isUserLoading || isAffiliateLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-neutral/30">
          <Loader2 className="animate-spin text-primary h-10 w-10" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  // --- NOT APPROVED VIEW ---
  if (!isApproved) {
    const isPending = application?.status === 'pending' || profile?.role === 'affiliate' && profile?.affiliateApproved === false;

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-neutral/30 py-20">
          <div className="container mx-auto px-4 max-w-4xl">

            {isPending ? (
              // --- PENDING APPLICATION VIEW ---
              <Card className="p-8 md:p-12 space-y-10 rounded-[3rem] border-none shadow-xl text-center overflow-hidden bg-white">
                <div className="space-y-4">
                  <h1 className="text-4xl font-headline font-extrabold text-primary">
                    Application Under Review
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    We are processing your request to join the Monterra Partner Program.
                  </p>
                </div>

                {/* Progress Steps */}
                <div className="relative flex justify-between items-start max-w-2xl mx-auto mb-12 px-4">
                  <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-0">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-500" 
                      style={{ 
                        width: `${(Math.max(0, ['submitted', 'verifying', 'review', 'approved']
                          .indexOf(application?.status === 'pending' ? 'submitted' : application?.status)) / 3) * 100}%` 
                      }}
                    />
                  </div>

                  {steps.map((step) => {
                    const status = getStepStatus(step.id);
                    const Icon = step.icon;
                    return (
                      <div key={step.id} className="relative z-10 flex flex-col items-center text-center gap-3 w-1/4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                          status === 'completed' ? "bg-emerald-500 text-white" : 
                          status === 'active' ? "bg-yellow-500 text-white animate-pulse" : 
                          "bg-white border-2 border-gray-100 text-gray-400"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-tight leading-tight max-w-[80px]",
                          status === 'pending' ? "text-gray-400" : "text-primary"
                        )}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Countdown */}
                <div className="bg-neutral/50 rounded-3xl p-8 border border-muted flex flex-col items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                      Estimated Review Time Remaining
                    </p>
                    {timeLeft === "EXPIRED" ? (
                      <p className="text-emerald-600 font-bold text-lg">
                        Review taking longer than expected. Our team will update you shortly.
                      </p>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-4xl font-headline font-black text-primary tracking-tighter">
                          {timeLeft || "--h --m"}
                        </p>
                        <p className="text-[10px] text-muted-foreground italic">
                          Affiliate approval usually takes 24–48 hours.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
                  <AlertCircle className="h-4 w-4" />
                  <span>Need help? Contact partners@monterra.in</span>
                </div>
              </Card>

            ) : (
              // --- APPLICATION FORM VIEW ---
              <div className="space-y-12">
                <div className="text-center space-y-4">
                  <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-primary">
                    Earn with Monterra.
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Join our partner program and get paid directly to your bank account.
                  </p>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                  <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
                      <Landmark className="h-6 w-6" /> Partner Application
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleApply} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-2">
                          <Label>Account Holder Name</Label>
                          <Input 
                            required 
                            value={formData.accountHolderName} 
                            onChange={e => setFormData({...formData, accountHolderName: e.target.value})} 
                            placeholder="As per bank records" 
                            className="rounded-xl h-12" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Bank Account Number</Label>
                          <Input 
                            required 
                            value={formData.bankAccountNumber} 
                            onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})} 
                            placeholder="Your account number" 
                            className="rounded-xl h-12" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Bank Name</Label>
                          <Input 
                            readOnly 
                            value={formData.bankName} 
                            placeholder="Auto-filled from IFSC" 
                            className="rounded-xl h-12 bg-muted/50" 
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label>IFSC Code</Label>
                            {isFetchingIfsc && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                          </div>
                          <Input 
                            required 
                            value={formData.ifscCode} 
                            onChange={e => handleIfscChange(e.target.value)} 
                            placeholder="11-digit IFSC" 
                            className="rounded-xl h-12" 
                            maxLength={11} 
                          />
                          {branchName && <p className="text-[10px] text-primary font-bold">{branchName}</p>}
                          {ifscError && <p className="text-[10px] text-destructive font-bold">{ifscError}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label>UPI ID (Optional)</Label>
                          <Input 
                            value={formData.upiId} 
                            onChange={e => setFormData({...formData, upiId: e.target.value})} 
                            placeholder="example@upi" 
                            className="rounded-xl h-12" 
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label>Complete Address</Label>
                          <Input 
                            required 
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                            placeholder="House, Street, Area" 
                            className="rounded-xl h-12" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input 
                            required 
                            value={formData.city} 
                            onChange={e => setFormData({...formData, city: e.target.value})} 
                            className="rounded-xl h-12" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>State</Label>
                            <Select 
                              onValueChange={(val) => setFormData({...formData, state: val})} 
                              value={formData.state}
                            >
                              <SelectTrigger className="rounded-xl h-12">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {INDIA_STATES.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label>Pincode</Label>
                              {isValidPincode(formData.pincode) && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              )}
                            </div>
                            <Input 
                              required 
                              value={formData.pincode} 
                              onChange={e => handlePincodeChange(e.target.value)} 
                              placeholder="6 digits" 
                              className="rounded-xl h-12" 
                              maxLength={6}
                              inputMode="numeric"
                            />
                            {formData.pincode.length > 0 && !isValidPincode(formData.pincode) && (
                              <p className="text-[10px] text-destructive font-bold">
                                Enter a valid 6-digit Indian pincode
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isApplying} 
                        className="w-full h-14 rounded-full text-lg font-bold shadow-xl shadow-primary/20"
                      >
                        {isApplying 
                          ? <><Loader2 className="animate-spin mr-2" /> Submitting...</> 
                          : "Complete Application"
                        }
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // --- APPROVED AFFILIATE DASHBOARD ---
  const stats = affiliateProfile;
  const balance = stats?.withdrawableAmount || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4">

          <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-headline font-extrabold text-primary">Partner Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user?.displayName}.</p>
            </div>
            <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Official Monterra Partner
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Gross Earnings", value: `₹${(stats?.totalEarnings || 0).toLocaleString()}`, icon: Wallet, color: "bg-blue-50 text-blue-600" },
              { label: "Available", value: `₹${balance.toLocaleString()}`, icon: Zap, color: "bg-emerald-50 text-emerald-600" },
              { label: "Referrals", value: stats?.totalReferrals || 0, icon: Users, color: "bg-purple-50 text-purple-600" },
              { label: "Total Clicks", value: stats?.totalClicks || 0, icon: TrendingUp, color: "bg-orange-50 text-orange-600" }
            ].map((s, i) => (
              <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white flex flex-col justify-between">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <h3 className="text-2xl font-extrabold text-primary mt-1">{s.value}</h3>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {/* Referral Link */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
                <h3 className="text-xl font-headline font-extrabold text-primary mb-6 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" /> Your Referral Link
                </h3>
                <div className="flex gap-2">
                  <div className="flex-grow p-4 bg-muted rounded-2xl font-mono text-sm overflow-hidden truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/?ref=${user?.uid}` : ''}
                  </div>
                  <Button onClick={handleCopy} size="icon" className="h-auto w-14 rounded-2xl">
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </Card>

              {/* Recent Earnings */}
              <div className="space-y-4">
                <h3 className="text-xl font-headline font-extrabold text-primary">Recent Earnings</h3>
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
                          <td className="p-6 font-mono text-xs font-bold text-primary">
                            #{c.orderId?.substring(0, 10)}
                          </td>
                          <td className="p-6 font-extrabold">₹{c.commissionAmount.toLocaleString()}</td>
                          <td className="p-6 text-sm text-muted-foreground">
                            {c.createdAt?.seconds 
                              ? format(new Date(c.createdAt.seconds * 1000), 'MMM d, yyyy') 
                              : 'Recent'}
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                              c.status === 'paid' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!commissions || commissions.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-muted-foreground italic">
                            No commissions earned yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>

            {/* Withdraw Card */}
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-sm bg-primary text-white p-8">
                <h3 className="text-xl font-headline font-bold mb-6">Withdraw Balance</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-white/60 uppercase font-bold tracking-widest mb-1">Withdrawable</p>
                    <h4 className="text-4xl font-extrabold">₹{balance.toLocaleString()}</h4>
                  </div>
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <p className="text-xs text-white/70 italic">Minimum withdrawal amount is ₹500.</p>
                    <Link href="/affiliate/payouts" className="block">
                      <Button 
                        disabled={balance < 500} 
                        className="w-full h-12 rounded-full bg-white text-primary hover:bg-emerald-50 font-bold"
                      >
                        Request Payout
                      </Button>
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
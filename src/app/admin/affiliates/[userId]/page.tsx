
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Loader2,
  Copy,
  ExternalLink,
  TrendingUp,
  MousePointer2,
  ShoppingBag,
  Wallet,
  Landmark,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import {
  useFirestore,
  useUser,
} from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function PartnerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const userId = params?.userId as string;

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [affProfile, setAffProfile] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  const isAdmin = user?.email === "seshuvakada1234@gmail.com";

  useEffect(() => {
    if (!db || !userId || !isAdmin) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch User Profile
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) setUserProfile(userSnap.data());

        // 2. Fetch Affiliate Profile (Bank Details/Earnings)
        const affSnap = await getDoc(doc(db, "affiliateProfiles", userId));
        if (affSnap.exists()) setAffProfile(affSnap.data());

        // 3. Fetch Links
        const linksSnap = await getDocs(
          query(collection(db, "affiliate_links"), where("userId", "==", userId))
        );
        setLinks(linksSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 4. Fetch Commissions
        const commSnap = await getDocs(
          query(
            collection(db, "affiliate_commissions"),
            where("affiliateId", "==", userId),
            orderBy("createdAt", "desc")
          )
        );
        setCommissions(commSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching partner details:", err);
        toast({ title: "Error", description: "Failed to load partner details", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, userId, isAdmin]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="text-center py-20 font-bold text-destructive">
        Access Denied: Administrative privileges required.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading partner profile...</p>
      </div>
    );
  }

  const partnerName = userProfile?.displayName || 
                     (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}` : "Partner");

  const totalClicks = links.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full hover:bg-accent"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-headline font-extrabold text-primary">{partnerName}</h1>
              <Badge className={affProfile?.approved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                {affProfile?.approved ? "Active Partner" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm font-medium">{userProfile?.email}</p>
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clicks", value: totalClicks, icon: MousePointer2, color: "bg-blue-50 text-blue-600" },
          { label: "Total Orders", value: commissions.length, icon: ShoppingBag, color: "bg-purple-50 text-purple-600" },
          { label: "Total Earnings", value: `₹${(affProfile?.totalEarnings || 0).toLocaleString()}`, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
          { label: "Withdrawable", value: `₹${(affProfile?.withdrawableAmount || 0).toLocaleString()}`, icon: Wallet, color: "bg-orange-50 text-orange-600" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border-none shadow-sm p-5 bg-white">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
            <h3 className="text-xl font-extrabold text-primary">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BANK DETAILS */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-muted/30 p-6 border-b">
            <CardTitle className="text-lg font-headline font-extrabold text-primary flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Bank Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Account Holder</p>
                <p className="font-bold text-primary">{affProfile?.accountHolderName || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">UPI ID</p>
                <p className="font-bold text-primary">{affProfile?.upiId || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Bank Name</p>
                <p className="font-bold text-primary">{affProfile?.bankName || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">IFSC Code</p>
                <p className="font-mono text-sm font-bold text-primary">{affProfile?.ifscCode || "N/A"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Account Number</p>
                <p className="font-mono text-sm font-bold text-primary tracking-widest">{affProfile?.bankAccountNumber || "N/A"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Mailing Address</p>
                <p className="text-sm font-medium text-primary">
                  {affProfile?.address}, {affProfile?.city}, {affProfile?.state} - {affProfile?.pincode}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-muted">
              <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                <Clock className="h-3 w-3" /> Partner since {affProfile?.createdAt ? format(affProfile.createdAt.toDate(), "MMMM dd, yyyy") : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* USER INFO */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-muted/30 p-6 border-b">
            <CardTitle className="text-lg font-headline font-extrabold text-primary flex items-center gap-2">
              <UserIcon className="h-5 w-5" /> Account Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Registered Email</p>
                <p className="font-bold text-primary">{userProfile?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Platform Role</p>
                <Badge variant="outline" className="uppercase font-bold text-[10px] text-primary">{userProfile?.role}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Approval Status</p>
                <div className="flex items-center gap-2">
                  {userProfile?.affiliateApproved ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> <span className="font-bold text-emerald-700">Approved</span></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-red-500" /> <span className="font-bold text-red-700">Not Approved</span></>
                  )}
                </div>
              </div>
              {userProfile?.approvedAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Approved On</p>
                  <p className="font-bold text-primary">{format(userProfile.approvedAt.toDate(), "PPpp")}</p>
                </div>
              )}
              <div className="pt-4 mt-4 border-t border-muted">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider mb-1">System UID</p>
                <p className="font-mono text-[10px] text-muted-foreground select-all">{userId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REFERRAL LINKS */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Generated Referral Links
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="p-6">Destination URL</TableHead>
              <TableHead className="p-6">Clicks</TableHead>
              <TableHead className="p-6">Status</TableHead>
              <TableHead className="p-6">Created</TableHead>
              <TableHead className="p-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic">No referral links generated yet.</TableCell></TableRow>
            ) : (
              links.map((link) => (
                <TableRow key={link.id} className="hover:bg-accent/30 transition-colors border-b border-muted">
                  <TableCell className="p-6">
                    <div className="max-w-[300px] truncate font-medium text-xs text-primary">{link.originalUrl}</div>
                    <div className="max-w-[300px] truncate text-[10px] text-muted-foreground font-mono mt-1">{link.affiliateUrl}</div>
                  </TableCell>
                  <TableCell className="p-6">
                    <Badge variant="outline" className="font-bold">{link.clicks || 0}</Badge>
                  </TableCell>
                  <TableCell className="p-6">
                    <Badge className={link.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      {link.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-6 text-xs text-muted-foreground">
                    {link.createdAt ? format(link.createdAt.toDate(), "MMM dd, yyyy") : "N/A"}
                  </TableCell>
                  <TableCell className="p-6 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-primary"
                      onClick={() => copyToClipboard(link.affiliateUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ORDERS */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Referral Orders
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="p-6">Order ID</TableHead>
              <TableHead className="p-6">Order Value</TableHead>
              <TableHead className="p-6">Commission (Rate%)</TableHead>
              <TableHead className="p-6">Status</TableHead>
              <TableHead className="p-6 text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic">No orders recorded via referral yet.</TableCell></TableRow>
            ) : (
              commissions.map((comm) => (
                <TableRow key={comm.id} className="hover:bg-accent/30 transition-colors border-b border-muted">
                  <TableCell className="p-6 font-mono text-xs font-bold text-primary">
                    #{comm.orderId?.substring(0, 12)}
                  </TableCell>
                  <TableCell className="p-6 font-bold text-primary">₹{comm.orderValue.toLocaleString()}</TableCell>
                  <TableCell className="p-6">
                    <p className="font-black text-emerald-600">₹{comm.commissionAmount.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{comm.commissionRate}% rate</p>
                  </TableCell>
                  <TableCell className="p-6">
                    <Badge className={
                      comm.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                      comm.status === 'approved' ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }>
                      {comm.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-6 text-right text-xs text-muted-foreground">
                    {comm.createdAt ? format(comm.createdAt.toDate(), "MMM dd, yyyy") : "Recent"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

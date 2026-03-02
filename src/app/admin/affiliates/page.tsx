
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Award, 
  Loader2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Mail,
  TrendingUp,
  Wallet,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AdminAffiliates() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all users who have either applied or are already affiliates
  // We query the users collection based on affiliateStatus or role
  const affiliatesQuery = useMemoFirebase(() => 
    query(collection(db, 'users'), where('affiliateStatus', '!=', null)), 
    [db]
  );
  
  const { data: users, isLoading } = useCollection(affiliatesQuery);

  const handleUpdateStatus = async (userId: string, status: string) => {
    const userRef = doc(db, 'users', userId);
    const isApproving = status === 'approved';
    
    const updateData: any = {
      affiliateStatus: status,
      updatedAt: serverTimestamp()
    };

    // If approving, also update the global role
    if (isApproving) {
      updateData.role = 'affiliate';
    }

    try {
      await updateDoc(userRef, updateData);
      toast({
        title: "Status Updated",
        description: `Affiliate status changed to ${status}.`,
      });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: `users/${userId}`,
        operation: 'update',
        requestResourceData: updateData
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const filteredAffiliates = users?.filter(u => 
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users?.length || 0,
    approved: users?.filter(u => u.affiliateStatus === 'approved').length || 0,
    pending: users?.filter(u => u.affiliateStatus === 'pending').length || 0,
    earnings: users?.reduce((acc, u) => acc + (u.totalEarnings || 0), 0) || 0
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Affiliate Management</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4" />
            <span>Active Partners: <span className="font-bold text-primary">{stats.approved}</span></span>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-10 rounded-xl h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Applications", value: stats.total, icon: Award, color: "bg-blue-50 text-blue-600" },
          { label: "Approved Partners", value: stats.approved, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
          { label: "Total Payouts Paid", value: `₹${stats.earnings}`, icon: Wallet, color: "bg-purple-50 text-purple-600" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-6 bg-white overflow-hidden">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <h3 className="text-3xl font-extrabold text-primary mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Affiliate</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Commission %</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Stats</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAffiliates?.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-accent/30 transition-all border-b border-muted">
                    <TableCell className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold">
                          {u.firstName?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-none">{u.firstName} {u.lastName}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.affiliateStatus === 'approved' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : u.affiliateStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {u.affiliateStatus || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="p-6">
                      <span className="font-bold text-primary">10%</span>
                      <p className="text-[10px] text-muted-foreground">Standard Rate</p>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary">
                          <TrendingUp className="h-3 w-3" />
                          {u.totalReferrals || 0} Referrals
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Wallet className="h-3 w-3" />
                          ₹{u.totalEarnings || 0} Earned
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(u.id, 'approved')}
                            className="flex items-center gap-2 text-emerald-600 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve Partner
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(u.id, 'rejected')}
                            className="flex items-center gap-2 text-destructive cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" /> Reject Application
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(u.id, 'disabled')}
                            className="flex items-center gap-2 text-muted-foreground cursor-pointer"
                          >
                            <PauseCircle className="h-4 w-4" /> Disable Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAffiliates?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-20 text-center text-muted-foreground">
                      No affiliate applications found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

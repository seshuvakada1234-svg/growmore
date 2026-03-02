"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Users as UsersIcon, 
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AdminUsers() {
  const db = useFirestore();
  const [searchTerm, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Fetch all users from Firestore
  const usersQuery = useMemoFirebase(() => 
    query(collection(db, 'users'), orderBy('createdAt', 'desc')), 
    [db]
  );
  
  const { data: users, isLoading } = useCollection(usersQuery);

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    setIsProcessing(userId);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    const userRef = doc(db, 'users', userId);
    const roleAdminRef = doc(db, 'roles_admin', userId);

    try {
      // 1. Update user document role
      await updateDoc(userRef, { 
        role: newRole,
        updatedAt: serverTimestamp() 
      });

      // 2. Manage roles_admin collection document (Existence over Content DBAC)
      if (newRole === 'admin') {
        await setDoc(roleAdminRef, { 
          id: userId,
          assignedAt: serverTimestamp()
        });
      } else {
        await deleteDoc(roleAdminRef);
      }

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}.`,
      });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: `users/${userId}`,
        operation: 'update',
        requestResourceData: { role: newRole }
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredUsers = users?.filter(u => 
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">User Management</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UsersIcon className="h-4 w-4" />
            <span>Total Registered: <span className="font-bold text-primary">{users?.length || 0}</span></span>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-10 rounded-xl h-11"
            value={searchTerm}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">User</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Joined</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Role</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-accent/30 transition-all border-b border-muted">
                    <TableCell className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold">
                          {u.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-none">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground mt-1">UID: {u.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {u.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {u.createdAt?.seconds 
                          ? format(new Date(u.createdAt.seconds * 1000), "MMM d, yyyy")
                          : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-red-100 text-red-700' 
                          : u.role === 'affiliate'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </TableCell>
                    <TableCell className="p-6 text-right">
                      <Button
                        size="sm"
                        variant={u.role === 'admin' ? "destructive" : "outline"}
                        className="rounded-lg h-9 font-bold text-xs gap-2"
                        onClick={() => handleToggleAdmin(u.id, u.role)}
                        disabled={isProcessing === u.id}
                      >
                        {isProcessing === u.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : u.role === 'admin' ? (
                          <>
                            <ShieldAlert className="h-3 w-3" />
                            Revoke Admin
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3 w-3" />
                            Make Admin
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-20 text-center text-muted-foreground">
                      No users found matching your search.
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
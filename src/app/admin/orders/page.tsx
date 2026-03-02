
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  ShoppingBag, 
  Loader2,
  Calendar,
  User as UserIcon,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { StatusChip } from "@/components/shared/StatusChip";
import { OrderStatus } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AdminOrders() {
  const db = useFirestore();
  const [searchTerm, setSearchQuery] = useState("");

  // Fetch all orders from the root collection
  const ordersQuery = useMemoFirebase(() => 
    query(collection(db, 'orders'), orderBy('createdAt', 'desc')), 
    [db]
  );
  
  const { data: orders, isLoading } = useCollection(ordersQuery);

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, 'orders', orderId);
    
    updateDoc(orderRef, { 
      status: newStatus,
      updatedAt: serverTimestamp() 
    })
    .then(() => {
      toast({
        title: "Status Updated",
        description: `Order #${orderId.substring(0, 6)} is now ${newStatus}.`,
      });
    })
    .catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: `orders/${orderId}`,
        operation: 'update',
        requestResourceData: { status: newStatus }
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const filteredOrders = orders?.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Manage Orders</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingBag className="h-4 w-4" />
            <span>Total Orders: <span className="font-bold text-primary">{orders?.length || 0}</span></span>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, name or email..." 
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
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Order ID</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Total</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => (
                  <TableRow key={order.id} className="group hover:bg-accent/30 transition-all border-b border-muted">
                    <TableCell className="p-6 font-bold text-primary">
                      #{order.id.substring(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-none">{order.customerName || 'Guest'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{order.customerEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {order.createdAt?.seconds 
                          ? format(new Date(order.createdAt.seconds * 1000), "MMM d, yyyy")
                          : 'Recent'}
                      </div>
                    </TableCell>
                    <TableCell className="p-6 font-extrabold text-primary">
                      ₹{order.totalAmount || order.total || 0}
                    </TableCell>
                    <TableCell className="p-6">
                      <StatusChip status={order.status as OrderStatus} />
                    </TableCell>
                    <TableCell className="p-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Select 
                          defaultValue={order.status} 
                          onValueChange={(val) => handleStatusUpdate(order.id, val as OrderStatus)}
                        >
                          <SelectTrigger className="w-[130px] rounded-lg h-9 text-xs font-bold bg-white shadow-sm border-muted">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <button className="h-9 w-9 rounded-lg hover:bg-white flex items-center justify-center border border-transparent hover:border-muted transition-all text-muted-foreground hover:text-primary">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-20 text-center text-muted-foreground">
                      No orders found matching your search.
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

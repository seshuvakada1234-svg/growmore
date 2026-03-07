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
  ChevronRight,
  Eye,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Package
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { StatusChip } from "@/components/shared/StatusChip";
import { OrderStatus } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function AdminOrders() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Fetch role to gate queries
  const userProfileRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin = profile?.role === 'admin' || user?.email === 'seshuvakada1234@gmail.com';

  // Fetch all orders from the root collection - gated
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  }, [db, isAdmin]);
  
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

  if (!isAdmin && profile) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground italic">Restricted access...</div>;
  }

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

      {isLoading || !profile ? (
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg hover:bg-white flex items-center justify-center border border-transparent hover:border-muted transition-all text-muted-foreground hover:text-primary"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-extrabold text-primary flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              Order Details
            </DialogTitle>
            <DialogDescription className="font-mono text-xs uppercase tracking-widest font-bold">
              ID: {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> Customer Info
                  </h3>
                  <div className="bg-muted/30 p-5 rounded-2xl space-y-3">
                    <p className="font-bold text-lg text-primary">{selectedOrder.customerName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" /> {selectedOrder.customerEmail}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" /> {selectedOrder.customerPhone || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Shipping Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Delivery Address
                  </h3>
                  <div className="bg-muted/30 p-5 rounded-2xl space-y-2">
                    <p className="text-sm font-semibold text-primary leading-relaxed">
                      {selectedOrder.shippingAddress?.fullAddress || selectedOrder.shippingAddress?.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Order Summary
                </h3>
                <div className="space-y-3">
                  {(selectedOrder.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-muted rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          <img src={item.imageUrl || "https://picsum.photos/seed/plant/200/200"} alt={item.name} className="object-cover w-full h-full" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.qty || item.quantity || 1} • ₹{item.price}</p>
                        </div>
                      </div>
                      <p className="font-black text-primary">
                        ₹{(item.qty || item.quantity || 1) * item.price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Footer Stats */}
              <div className="flex flex-wrap items-center justify-between gap-6 bg-primary text-white p-6 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-60">Payment Method</p>
                    <p className="font-bold uppercase tracking-wider">{selectedOrder.paymentMethod || 'COD'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase font-black opacity-60">Grand Total</p>
                  <p className="text-3xl font-extrabold">₹{selectedOrder.totalAmount || selectedOrder.total || 0}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" className="rounded-full px-8" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Current Status:</span>
                  <StatusChip status={selectedOrder.status as OrderStatus} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

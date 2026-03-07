
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusChip } from "@/components/shared/StatusChip";
import { Package, Calendar, ArrowUpRight, Loader2, Search, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { format, differenceInHours } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function OrdersPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  // State for cancellation modal
  const [cancellingOrder, setCancellingOrder] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelFeedback, setCancelFeedback] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Fetch real orders from Firestore for the current user
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);

  const { data: orders, isLoading: isOrdersLoading } = useCollection(ordersQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/orders');
    }
  }, [user, isUserLoading, router]);

  const canCancel = (order: any) => {
    if (order.status === "Cancelled") return false;
    
    // Rule 1: Correct Status
    const isCorrectStatus = ["Pending", "Approved"].includes(order.status);
    if (!isCorrectStatus) return false;

    // Rule 2: Within 24 hours
    const createdAt = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
    const hoursElapsed = differenceInHours(new Date(), createdAt);
    return hoursElapsed <= 24;
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder || !cancelReason) return;

    setIsSubmittingCancel(true);
    const orderRef = doc(db, "orders", cancellingOrder.id);
    const cancelData = {
      status: "Cancelled",
      cancelled: true,
      cancelReason,
      cancelFeedback: cancelReason === "Other" ? cancelFeedback : "",
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(orderRef, cancelData);
      toast({
        title: "Order Cancelled",
        description: "Your order has been successfully cancelled.",
      });
      setCancellingOrder(null);
      setCancelReason("");
      setCancelFeedback("");
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: orderRef.path,
        operation: 'update',
        requestResourceData: cancelData
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (isUserLoading || isOrdersLoading) {
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

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-headline font-extrabold text-primary">Your Orders</h1>
              <p className="text-muted-foreground mt-1">Manage and track your plant purchases.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                placeholder="Search orders..." 
                className="pl-10 h-10 w-full md:w-64 rounded-full border-none bg-white shadow-sm text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {!orders || orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-muted">
              <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-primary">No orders found</h2>
              <p className="text-muted-foreground mt-2">When you order something, it will appear here.</p>
              <Link href="/plants">
                <button className="mt-6 bg-primary text-white px-8 py-2.5 rounded-full font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  Start Shopping
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order: any) => (
                <Card key={order.id} className="rounded-3xl border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all group">
                  <CardHeader className="bg-accent/30 border-b flex flex-row items-center justify-between p-6">
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">Order ID</p>
                        <p className="font-bold text-primary text-xs sm:text-sm font-mono">{order.id.substring(0, 12)}...</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">Date</p>
                        <div className="flex items-center gap-1 font-bold text-primary text-sm">
                          <Calendar className="h-3.5 w-3.5" /> 
                          {order.createdAt?.seconds 
                            ? format(new Date(order.createdAt.seconds * 1000), "MMM d, yyyy") 
                            : "Recent"}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">Total</p>
                        <p className="font-bold text-primary text-sm">₹{(order.totalAmount || order.total || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <StatusChip status={order.status || "Pending"} />
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6">
                      {(order.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border">
                            <Image 
                              src={item.imageUrl || "https://picsum.photos/seed/plant/200/200"} 
                              alt={item.name} 
                              fill 
                              className="object-cover" 
                            />
                          </div>
                          <div className="flex-grow min-w-0">
                            <h4 className="font-headline font-bold text-base sm:text-lg truncate">{item.name}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">Qty: {item.qty || item.quantity || 1} • ₹{item.price}</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <Link href={`/plants/${item.productId || item.id}`}>
                              <button className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                                Buy again <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-end items-center gap-3">
                      {canCancel(order) && (
                        <button 
                          onClick={() => setCancellingOrder(order)}
                          className="w-full sm:w-auto text-sm font-bold px-8 py-2.5 rounded-full text-destructive hover:bg-destructive/5 transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle className="h-4 w-4" /> Cancel Order
                        </button>
                      )}
                      <Link href={`/track-order/${order.id}`} className="w-full sm:w-auto">
                        <button className="w-full text-sm font-bold px-8 py-2.5 rounded-full border-2 border-primary/10 text-primary hover:bg-accent transition-all">
                          Track Order
                        </button>
                      </Link>
                      <button className="w-full sm:w-auto text-sm font-bold px-8 py-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-md">
                        Order Details
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Cancellation Modal */}
      <Dialog open={!!cancellingOrder} onOpenChange={(open) => !open && setCancellingOrder(null)}>
        <DialogContent className="rounded-[2rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-extrabold text-primary flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Cancel Order?
            </DialogTitle>
            <DialogDescription>
              We're sorry to see you go. Please let us know why you're cancelling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Reason for cancellation</Label>
              <Select onValueChange={setCancelReason} value={cancelReason}>
                <SelectTrigger className="rounded-xl h-12 border-muted">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ordered by mistake">Ordered by mistake</SelectItem>
                  <SelectItem value="Found cheaper elsewhere">Found cheaper elsewhere</SelectItem>
                  <SelectItem value="Changed my mind">Changed my mind</SelectItem>
                  <SelectItem value="Delivery time too long">Delivery time too long</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cancelReason === "Other" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="font-bold">Additional feedback</Label>
                <Textarea 
                  placeholder="Please tell us more..."
                  value={cancelFeedback}
                  onChange={(e) => setCancelFeedback(e.target.value)}
                  className="rounded-xl min-h-[100px] border-muted"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setCancellingOrder(null)}
              className="rounded-full flex-1"
            >
              Keep Order
            </Button>
            <Button 
              variant="destructive" 
              disabled={!cancelReason || (cancelReason === "Other" && !cancelFeedback) || isSubmittingCancel}
              onClick={handleConfirmCancel}
              className="rounded-full flex-1 font-bold h-11"
            >
              {isSubmittingCancel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

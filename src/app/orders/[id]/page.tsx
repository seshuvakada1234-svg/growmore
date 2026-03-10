"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StatusChip } from "@/components/shared/StatusChip";
import {
  ArrowLeft, Package, MapPin, CreditCard, Loader2,
  CheckCircle2, Clock, AlertTriangle, RefreshCw,
  XCircle, Calendar, Truck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { format, differenceInHours } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function OrderDetailPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [cancelReason, setCancelReason] = useState("");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const orderDocRef = useMemoFirebase(() => {
    if (!db || !orderId) return null;
    return doc(db, "orders", orderId);
  }, [db, orderId]);

  const { data: order, isLoading } = useDoc(orderDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login?redirect=/orders");
    }
  }, [user, isUserLoading, router]);

  // Redirect if order doesn't belong to this user
  useEffect(() => {
    if (!isLoading && order && user && order.userId !== user.uid) {
      router.push("/orders");
    }
  }, [order, isLoading, user, router]);

  const canCancel = () => {
    if (!order) return false;
    if (order.status === "Cancelled") return false;
    const cancellableStatuses = ["Pending", "Approved", "Paid"];
    if (!cancellableStatuses.includes(order.status)) return false;
    const createdAt = order.createdAt?.seconds
      ? new Date(order.createdAt.seconds * 1000)
      : new Date();
    return differenceInHours(new Date(), createdAt) <= 24;
  };

  const handleConfirmCancel = async () => {
    if (!order || !cancelReason) return;
    setIsSubmittingCancel(true);

    const orderRef = doc(db, "orders", orderId);
    const cancelData = {
      status: "Cancelled",
      cancelled: true,
      cancelReason,
      cancelFeedback: cancelReason === "Other" ? cancelFeedback : "",
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(orderRef, cancelData);

      if (order.paymentMethod === "online" && order.razorpayPaymentId) {
        const res = await fetch("/api/refund-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({
            title: "Order Cancelled",
            description: "Order cancelled, but refund initiation failed. Please contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Order Cancelled & Refund Initiated",
            description: `₹${(order.totalAmount || order.total || 0).toLocaleString()} will be refunded within 5–7 business days.`,
          });
        }
      } else {
        toast({ title: "Order Cancelled", description: "Your order has been successfully cancelled." });
      }

      setShowCancelModal(false);
      setCancelReason("");
      setCancelFeedback("");
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to cancel", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const getRefundSection = () => {
    if (order?.status !== "Cancelled" || order?.paymentMethod !== "online") return null;
    return (
      <div className={`flex items-start gap-3 rounded-2xl p-4 mt-4 ${
        order.refundStatus === "success" ? "bg-emerald-50" :
        order.refundStatus === "failed" ? "bg-red-50" : "bg-amber-50"
      }`}>
        {order.refundStatus === "success"
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          : order.refundStatus === "failed"
          ? <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          : <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0 animate-pulse" />
        }
        <div>
          <p className={`text-sm font-bold ${
            order.refundStatus === "success" ? "text-emerald-700" :
            order.refundStatus === "failed" ? "text-red-600" : "text-amber-700"
          }`}>
            {order.refundStatus === "success"
              ? `Refund of ₹${(order.refundAmount || 0).toLocaleString()} Initiated`
              : order.refundStatus === "failed"
              ? "Refund Failed"
              : "Refund Processing..."}
          </p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {order.refundStatus === "success"
              ? `Refund ID: ${order.refundId} · Credited to your original payment method within 5–7 business days`
              : order.refundStatus === "failed"
              ? order.refundError || "Please contact support"
              : "Your refund is being processed"}
          </p>
        </div>
      </div>
    );
  };

  const statusSteps = ["Pending", "Approved", "Shipped", "Delivered"];

  const getStepIndex = () => {
    if (order?.status === "Cancelled") return -1;
    return statusSteps.indexOf(order?.status);
  };

  if (isUserLoading || isLoading) {
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

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-neutral/30">
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary">Order not found</h2>
            <Link href="/orders">
              <button className="mt-4 text-primary font-bold hover:underline flex items-center gap-1 mx-auto">
                <ArrowLeft className="h-4 w-4" /> Back to Orders
              </button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const stepIndex = getStepIndex();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-10">
        <div className="container mx-auto px-4 max-w-3xl">

          {/* Back */}
          <Link href="/orders">
            <button className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to Orders
            </button>
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div>
              <h1 className="text-2xl font-headline font-extrabold text-primary">Order Details</h1>
              <p className="text-xs text-muted-foreground font-mono mt-1">{orderId}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusChip status={order.status || "Pending"} />
              {canCancel() && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm font-bold px-5 py-2 rounded-full text-destructive border border-destructive/20 hover:bg-destructive/5 transition-all flex items-center gap-1.5"
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5">

            {/* Order Status Timeline */}
            {order.status !== "Cancelled" && (
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Order Progress
                </h2>
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted mx-8" />
                  <div
                    className="absolute top-4 left-0 h-0.5 bg-primary mx-8 transition-all duration-500"
                    style={{ width: stepIndex >= 0 ? `${(stepIndex / (statusSteps.length - 1)) * 100}%` : "0%" }}
                  />
                  {statusSteps.map((step, i) => (
                    <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        i <= stepIndex
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-muted text-muted-foreground"
                      }`}>
                        {i < stepIndex ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${
                        i <= stepIndex ? "text-primary" : "text-muted-foreground"
                      }`}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled notice */}
            {order.status === "Cancelled" && (
              <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-700">Order Cancelled</p>
                    <p className="text-sm text-red-500 mt-0.5">
                      Reason: {order.cancelReason || "Not specified"}
                    </p>
                    {order.cancelledAt?.seconds && (
                      <p className="text-xs text-red-400 mt-1">
                        Cancelled on {format(new Date(order.cancelledAt.seconds * 1000), "MMM d, yyyy · h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
                {getRefundSection()}
              </div>
            )}

            {/* Items */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-5 flex items-center gap-2">
                <Package className="h-4 w-4" /> Items Ordered
              </h2>
              <div className="space-y-5">
                {(order.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border">
                      <Image
                        src={item.imageUrl || "https://picsum.photos/seed/plant/200/200"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-bold text-base truncate">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.qty || item.quantity || 1}
                      </p>
                    </div>
                    <p className="font-bold text-primary">
                      ₹{((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="mt-6 pt-5 border-t space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{(order.subtotal || order.total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>{(order.shippingCost || 0) === 0 ? <span className="text-emerald-600 font-semibold">Free</span> : `₹${order.shippingCost}`}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>−₹{order.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-primary text-base pt-2 border-t">
                  <span>Total</span>
                  <span>₹{(order.totalAmount || order.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Delivery Address
                </h2>
                <div className="text-sm text-foreground leading-relaxed">
                  <p className="font-bold text-base">{order.shippingAddress.name || order.shippingAddress.fullName}</p>
                  <p className="text-muted-foreground mt-1">
                    {order.shippingAddress.addressLine1 || order.shippingAddress.line1}
                    {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                  </p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode || order.shippingAddress.zip}
                  </p>
                  {order.shippingAddress.phone && (
                    <p className="text-muted-foreground mt-1">📞 {order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-bold capitalize">
                    {order.paymentMethod === "online" ? "💳 Online Payment" : "💵 Cash on Delivery"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-bold ${
                    order.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {order.paymentStatus === "paid" ? "✓ Paid" : order.paymentStatus || "Pending"}
                  </span>
                </div>
                {order.razorpayPaymentId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID</span>
                    <span className="font-mono text-xs text-muted-foreground">{order.razorpayPaymentId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Date</span>
                  <span className="font-bold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {order.createdAt?.seconds
                      ? format(new Date(order.createdAt.seconds * 1000), "MMM d, yyyy · h:mm a")
                      : "Recent"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Cancellation Modal */}
      <Dialog open={showCancelModal} onOpenChange={(open) => !open && setShowCancelModal(false)}>
        <DialogContent className="rounded-[2rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-extrabold text-primary flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Cancel Order?
            </DialogTitle>
            <DialogDescription>
              {order.paymentMethod === "online"
                ? "Your payment will be refunded to your original payment method within 5–7 business days."
                : "Please let us know why you're cancelling."}
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

            {order.paymentMethod === "online" && (
              <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-4">
                <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  ₹{(order.totalAmount || order.total || 0).toLocaleString()} will be automatically refunded to your original payment method.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setShowCancelModal(false)} className="rounded-full flex-1">
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

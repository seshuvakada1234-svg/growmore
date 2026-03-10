"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ShoppingBag,
  Loader2,
  User as UserIcon,
  Eye,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Package,
  AlertTriangle,
  Clock,
  RefreshCcw,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
} from "@/firebase";
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
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
  const [isRefunding, setIsRefunding] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (!user?.uid ? null : doc(db, "users", user.uid)),
    [db, user?.uid]
  );
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin =
    profile?.role === "admin" ||
    user?.email === "seshuvakada1234@gmail.com";

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, "orders"), orderBy("createdAt", "desc"));
  }, [db, isAdmin]);

  const { data: orders, isLoading } = useCollection(ordersQuery);

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, "orders", orderId);
    updateDoc(orderRef, { status: newStatus, updatedAt: serverTimestamp() })
      .then(() => {
        toast({
          title: "Status Updated",
          description: `Order #${orderId.substring(0, 6)} is now ${newStatus}.`,
        });
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
        }
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: `orders/${orderId}`,
          operation: "update",
          requestResourceData: { status: newStatus },
        });
        errorEmitter.emit("permission-error", permissionError);
      });
  };

  // ── Refund approval ────────────────────────────────────────────────────────
  const handleApproveRefund = async (orderId: string) => {
    setIsRefunding(orderId);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/refund-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "✅ Refund Processed",
          description: `Razorpay Refund ID: ${data.refundId || "N/A"}`,
        });
        // Auto-refresh table so refund button disappears
        window.location.reload();
      } else {
        throw new Error(data.error || "Failed to process refund");
      }
    } catch (err: any) {
      console.error("[handleApproveRefund]", err);
      toast({
        title: "Refund Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsRefunding(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredOrders = orders?.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Access guard ───────────────────────────────────────────────────────────
  if (!isAdmin && profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground italic">
        Restricted access...
      </div>
    );
  }

  // ── Refund badge helper ────────────────────────────────────────────────────
  const renderRefundBadge = (order: any) => {
    if (order.status !== "Cancelled" || order.paymentMethod !== "online") {
      return <span className="text-xs text-muted-foreground">N/A</span>;
    }
    if (order.refundStatus === "processed") {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" /> Processed
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-orange-600 border-orange-200 bg-orange-50/50 flex items-center gap-1 w-fit"
      >
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">
            Manage Orders
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingBag className="h-4 w-4" />
            <span>
              Total Orders:{" "}
              <span className="font-bold text-primary">
                {orders?.length || 0}
              </span>
            </span>
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

      {/* Table */}
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
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">
                    Order ID
                  </TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">
                    Customer
                  </TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">
                    Refund
                  </TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => {
                  // Handles older orders missing refundStatus field
                  const canRefund =
                    order.status === "Cancelled" &&
                    order.paymentMethod === "online" &&
                    (order.refundStatus === "pending" || !order.refundStatus);

                  return (
                    <TableRow
                      key={order.id}
                      className="group hover:bg-accent/30 transition-all border-b border-muted"
                    >
                      {/* Order ID */}
                      <TableCell className="p-6 font-bold text-primary">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm leading-none">
                              {order.customerName || "Guest"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.customerEmail}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="p-6">
                        <StatusChip status={order.status as OrderStatus} />
                      </TableCell>

                      {/* Refund badge */}
                      <TableCell className="p-6">
                        {renderRefundBadge(order)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="p-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* Approve & Refund button */}
                          {canRefund && (
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 px-4 rounded-xl flex gap-2 items-center"
                              onClick={() => handleApproveRefund(order.id)}
                              disabled={isRefunding === order.id}
                            >
                              {isRefunding === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCcw className="h-4 w-4" />
                              )}
                              {isRefunding === order.id
                                ? "Processing..."
                                : "Approve & Refund"}
                            </Button>
                          )}

                          {/* Refund done indicator */}
                          {order.status === "Cancelled" &&
                            order.paymentMethod === "online" &&
                            order.refundStatus === "processed" && (
                              <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                <BadgeCheck className="h-4 w-4" /> Refund Done
                              </span>
                            )}

                          {/* Status dropdown */}
                          <Select
                            defaultValue={order.status}
                            onValueChange={(val) =>
                              handleStatusUpdate(order.id, val as OrderStatus)
                            }
                          >
                            <SelectTrigger className="w-[130px] rounded-lg h-9 text-xs font-bold bg-white shadow-sm border-muted">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Paid">Paid</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Eye / detail view */}
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
                  );
                })}

                {filteredOrders?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="p-20 text-center text-muted-foreground"
                    >
                      No orders found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── Order Details Modal ──────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
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
                {/* Customer */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> Customer Info
                  </h3>
                  <div className="bg-muted/30 p-5 rounded-2xl space-y-3">
                    <p className="font-bold text-lg text-primary">
                      {selectedOrder.customerName}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" /> {selectedOrder.customerEmail}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />{" "}
                      {selectedOrder.customerPhone || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Shipping */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Delivery Address
                  </h3>
                  <div className="bg-muted/30 p-5 rounded-2xl space-y-2">
                    <p className="text-sm font-semibold text-primary leading-relaxed">
                      {selectedOrder.shippingAddress?.fullAddress ||
                        selectedOrder.shippingAddress?.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shippingAddress?.city},{" "}
                      {selectedOrder.shippingAddress?.state} -{" "}
                      {selectedOrder.shippingAddress?.pincode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancellation block */}
              {selectedOrder.status === "Cancelled" && (
                <div className="space-y-4 bg-red-50 border border-red-100 p-6 rounded-3xl">
                  <h3 className="text-sm font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Cancellation Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-red-400 uppercase font-black tracking-wider mb-1">
                        Reason
                      </p>
                      <p className="font-bold text-red-700">
                        {selectedOrder.cancelReason || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-red-400 uppercase font-black tracking-wider mb-1">
                        Refund Status
                      </p>
                      {selectedOrder.paymentMethod === "cod" ? (
                        <p className="font-bold text-red-700">
                          No Refund Needed (COD)
                        </p>
                      ) : selectedOrder.refundStatus === "processed" ? (
                        <div className="space-y-1">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" /> Refund Processed
                          </Badge>
                          {selectedOrder.refundId && (
                            <p className="text-[11px] font-mono text-muted-foreground">
                              ID: {selectedOrder.refundId}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200 bg-orange-50 flex items-center gap-1 w-fit"
                          >
                            <Clock className="h-3 w-3" /> Refund Pending
                          </Badge>
                          {selectedOrder.paymentMethod === "online" && (
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-8 px-3 rounded-xl flex gap-2 items-center w-fit mt-1"
                              onClick={() =>
                                handleApproveRefund(selectedOrder.id)
                              }
                              disabled={isRefunding === selectedOrder.id}
                            >
                              {isRefunding === selectedOrder.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCcw className="h-3 w-3" />
                              )}
                              {isRefunding === selectedOrder.id
                                ? "Processing..."
                                : "Approve & Refund"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Items */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Order Summary
                </h3>
                <div className="space-y-3">
                  {(selectedOrder.items || []).map(
                    (item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-white border border-muted rounded-2xl shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={
                                item.imageUrl ||
                                "https://picsum.photos/seed/plant/200/200"
                              }
                              alt={item.name}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-primary">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.qty || item.quantity || 1} • ₹
                              {item.price}
                            </p>
                          </div>
                        </div>
                        <p className="font-black text-primary">
                          ₹{(item.qty || item.quantity || 1) * item.price}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <Separator />

              {/* Footer */}
              <div className="flex flex-wrap items-center justify-between gap-6 bg-primary text-white p-6 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-60">
                      Payment Method
                    </p>
                    <p className="font-bold uppercase tracking-wider">
                      {selectedOrder.paymentMethod || "COD"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black opacity-60">
                    Grand Total
                  </p>
                  <p className="text-3xl font-extrabold">
                    ₹{selectedOrder.totalAmount || selectedOrder.total || 0}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="rounded-full px-8"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">
                    Current Status:
                  </span>
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
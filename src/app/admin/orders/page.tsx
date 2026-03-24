"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ShoppingBag, Loader2, User as UserIcon, Eye, Mail, Phone,
  MapPin, CreditCard, Package, AlertTriangle, Clock, RefreshCcw,
  CheckCircle2, BadgeCheck, Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import {
  collection, doc, updateDoc, serverTimestamp, query, orderBy, getDoc, getFirestore,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { StatusChip } from "@/components/shared/StatusChip";
import { OrderStatus } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function calcSubtotal(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => {
    const price = item.price || 0;
    const qty   = item.qty || item.quantity || 1;
    return acc + price * qty;
  }, 0);
}

function pdfRs(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

async function fetchBusinessInfo() {
  const defaults = {
    storeName: "Monterra", legalName: "", email: "support@monterra.in",
    phone: "", gstin: "", showGST: false,
  };
  try {
    const { app } = await import("@/lib/firebase");
    const db      = getFirestore(app);
    const snap    = await getDoc(doc(db, "settings", "businessInfo"));
    if (!snap.exists()) return defaults;
    const data = snap.data();
    return {
      storeName: data.storeName || defaults.storeName,
      legalName: data.legalName || "",
      email:     data.email     || defaults.email,
      phone:     data.phone     || "",
      gstin:     data.gstin     || "",
      showGST:   data.showGST   === true,
    };
  } catch { return defaults; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core PDF builder — returns jsPDF doc instance (not saved, not uploaded)
// ─────────────────────────────────────────────────────────────────────────────
async function buildInvoiceDoc(
  order: any,
  orderId: string,
  type: "FINAL" | "PROFORMA" | "CANCELLED",
) {
  const jsPDFModule     = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const jsPDF           = jsPDFModule.default;
  const autoTable       = autoTableModule.default ?? autoTableModule;

  const biz        = await fetchBusinessInfo();
  const isCancelled = type === "CANCELLED";
  const isProforma  = type === "PROFORMA";

  const doc        = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Totals
  const subtotal    = calcSubtotal(order.items || []);
  const discount    = order.discount || 0;
  const shipRaw     = order.shippingCost ?? order.shippingFee ?? order.deliveryCharge ?? order.shipping ?? 0;
  const storedTotal = order.totalAmount || order.total || 0;
  const shipping    = shipRaw === 0 && storedTotal > subtotal ? storedTotal - subtotal + discount : shipRaw;
  const total       = storedTotal || (subtotal + shipping - discount);

  const paymentMethodRaw   = order.paymentMethod?.toLowerCase();
  const paymentMethodLabel = paymentMethodRaw === "cod" ? "Cash on Delivery"
    : paymentMethodRaw === "online" ? "Online Payment" : order.paymentMethod || "-";

  let paymentStatusLabel = "Pending";
  if (paymentMethodRaw === "cod") {
    if (order.status === "Delivered")  paymentStatusLabel = "Paid";
    else if (isCancelled)              paymentStatusLabel = "Cancelled";
  } else {
    if (order.paymentStatus === "paid")        paymentStatusLabel = "Paid";
    else if (order.paymentStatus === "failed") paymentStatusLabel = "Failed";
  }

  const orderDate = order.createdAt?.seconds
    ? format(new Date(order.createdAt.seconds * 1000), "dd MMM yyyy, h:mm a")
    : "-";

  const headerColor: [number, number, number] = isCancelled ? [180, 30, 30] : isProforma ? [120, 120, 120] : [27, 94, 32];
  const invoiceTitle = isProforma ? "PROFORMA INVOICE" : isCancelled ? "CANCELLED INVOICE" : "INVOICE";

  // HEADER
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text((biz.legalName || biz.storeName).toUpperCase(), 15, 14);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 240, 210);
  doc.text("Premium Plants & Nursery", 15, 22);

  doc.setFontSize(8);
  doc.setTextColor(190, 230, 190);
  doc.text(biz.phone ? `${biz.email}   |   ${biz.phone}` : biz.email, 15, 29);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(invoiceTitle, pageWidth - 15, 14, { align: "right" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 240, 210);
  doc.text(`Invoice No : INV-${orderId}`, pageWidth - 15, 22, { align: "right" });
  doc.text(`Order ID   : #${orderId}`,    pageWidth - 15, 29, { align: "right" });
  doc.text(`Date       : ${orderDate}`,   pageWidth - 15, 36, { align: "right" });

  // Notice banners
  let y = 46;
  if (isCancelled) {
    doc.setFillColor(255, 235, 235);
    doc.rect(0, 38, pageWidth, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 30, 30);
    doc.text("This order was cancelled.", pageWidth / 2, 45, { align: "center" });
    y = 56;
  }
  if (isProforma) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "This is a provisional invoice. Final invoice will be generated after delivery.",
      pageWidth / 2, 45, { align: "center" },
    );
    y = 56; // ✅ FIX: push ORDER META ROW below the banner
  }

  // ORDER META ROW
  doc.setFillColor(250, 250, 250);
  doc.rect(0, y - 2, pageWidth, 16, "F");
  doc.setDrawColor(230, 230, 230);
  doc.line(0, y - 2, pageWidth, y - 2);
  doc.line(0, y + 14, pageWidth, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text("ORDER STATUS",   15,  y + 4);
  doc.text("PAYMENT METHOD", 80,  y + 4);
  doc.text("PAYMENT STATUS", 150, y + 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(order.status || "-", 15,  y + 11);
  doc.text(paymentMethodLabel,  80,  y + 11);
  doc.text(paymentStatusLabel,  150, y + 11);
  y += 22;

  // SHIP TO
  const addr = order.shippingAddress;
  if (addr) {
    doc.setFillColor(245, 252, 245);
    doc.setDrawColor(200, 230, 200);
    doc.roundedRect(15, y, pageWidth - 30, 34, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(27, 94, 32);
    doc.text("DELIVER TO", 20, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(addr.name || addr.fullName || order.customerName || "-", 20, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text(addr.fullAddress || addr.address || "-", 20, y + 20);
    doc.text([addr.city, addr.state, addr.pincode].filter(Boolean).join(", "), 20, y + 27);

    if (addr.phone || order.customerPhone) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`Ph: ${addr.phone || order.customerPhone}`, pageWidth - 20, y + 27, { align: "right" });
    }
    y += 42;
  }

  // ITEMS TABLE
  autoTable(doc, {
    startY: y,
    head: [["#", "Item Description", "Qty", "Unit Price", "Amount"]],
    body: (order.items || []).map((item: any, i: number) => {
      const qty = item.qty || item.quantity || 1;
      const price = item.price || 0;
      return [String(i + 1), item.name || "Unknown Item", String(qty), pdfRs(price), pdfRs(price * qty)];
    }),
    theme: "grid",
    headStyles: { fillColor: headerColor, textColor: 255, fontStyle: "bold", fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 } },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 30], cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }, lineColor: [220, 220, 220], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto", fontStyle: "bold" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 36, halign: "right" },
      4: { cellWidth: 36, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 252, 248] },
    margin: { left: 15, right: 15 },
  });

  // TOTALS
  const finalY     = (doc as any).lastAutoTable.finalY + 8;
  const totalsBoxX = pageWidth / 2 + 2;
  const totalsBoxW = pageWidth - 15 - totalsBoxX;
  const rowH       = 8;
  const totalsBoxH = (discount > 0 ? 4 : 3) * rowH + 14;

  doc.setFillColor(246, 252, 246);
  doc.setDrawColor(200, 230, 200);
  doc.roundedRect(totalsBoxX, finalY - 4, totalsBoxW, totalsBoxH, 3, 3, "FD");

  const labelCol = totalsBoxX + 6;
  const valueCol = totalsBoxX + totalsBoxW - 5;
  let tY = finalY;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  doc.text("Subtotal", labelCol, tY + 3);
  doc.text(pdfRs(subtotal), valueCol, tY + 3, { align: "right" });
  tY += rowH;

  doc.text("Shipping", labelCol, tY + 3);
  if (shipping === 0) {
    doc.setTextColor(27, 94, 32);
    doc.setFont("helvetica", "bold");
    doc.text("FREE", valueCol, tY + 3, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
  } else {
    doc.text(pdfRs(shipping), valueCol, tY + 3, { align: "right" });
  }
  tY += rowH;

  if (discount > 0) {
    doc.setTextColor(27, 94, 32);
    doc.text("Discount", labelCol, tY + 3);
    doc.text(`- ${pdfRs(discount)}`, valueCol, tY + 3, { align: "right" });
    doc.setTextColor(80, 80, 80);
    tY += rowH;
  }

  doc.setDrawColor(180, 215, 180);
  doc.setLineWidth(0.5);
  doc.line(labelCol, tY + 1, valueCol, tY + 1);
  doc.setLineWidth(0.2);
  tY += 5;

  doc.setFillColor(...headerColor);
  doc.roundedRect(totalsBoxX + 2, tY - 1, totalsBoxW - 4, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", labelCol, tY + 6);
  doc.text(pdfRs(total), valueCol, tY + 6, { align: "right" });

  // PAYMENT SUMMARY
  const psBoxX = 15;
  const psBoxW = pageWidth / 2 - 15 - 4;
  const psBoxH = totalsBoxH + 12;

  doc.setFillColor(250, 250, 255);
  doc.setDrawColor(210, 210, 230);
  doc.roundedRect(psBoxX, finalY - 4, psBoxW, psBoxH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(27, 94, 32);
  doc.text("PAYMENT SUMMARY", psBoxX + 5, finalY + 3);
  doc.setDrawColor(200, 230, 200);
  doc.line(psBoxX + 5, finalY + 6, psBoxX + psBoxW - 5, finalY + 6);

  const psLabel = psBoxX + 5;
  const psValue = psBoxX + psBoxW - 5;
  const pRow = (label: string, value: string, yPos: number) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text(label, psLabel, yPos);
    doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text(value, psValue, yPos, { align: "right" });
  };
  pRow("Payment Method", paymentMethodLabel,  finalY + 13);
  pRow("Payment Status", paymentStatusLabel,  finalY + 21);
  pRow("Order Status",   order.status || "-", finalY + 29);
  if (order.createdAt?.seconds) {
    pRow("Order Date", format(new Date(order.createdAt.seconds * 1000), "dd MMM yyyy"), finalY + 37);
  }

  // FOOTER
  doc.setFillColor(245, 245, 245);
  doc.rect(0, pageHeight - 22, pageWidth, 22, "F");
  doc.setDrawColor(215, 215, 215);
  doc.line(0, pageHeight - 22, pageWidth, pageHeight - 22);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("This is a system-generated invoice. GST not applicable.", pageWidth / 2, pageHeight - 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Thank you for shopping with ${biz.storeName}!`, pageWidth / 2, pageHeight - 6, { align: "center" });

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// R2 upload helper
// ─────────────────────────────────────────────────────────────────────────────
async function uploadToR2(pdfDoc: any, orderId: string, type: string): Promise<string> {
  const blob     = pdfDoc.output("blob");
  const formData = new FormData();
  formData.append("file", blob, `Invoice-${orderId}.pdf`);
  formData.append("orderId", orderId);
  formData.append("type", type);

  const res  = await fetch("/api/upload-invoice", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-type generators
// ─────────────────────────────────────────────────────────────────────────────
async function generateFinalInvoice(order: any, db: any) {
  const pdfDoc = await buildInvoiceDoc(order, order.id, "FINAL");
  const url    = await uploadToR2(pdfDoc, order.id, "final");
  await updateDoc(doc(db, "orders", order.id), { finalInvoiceUrl: url, invoiceType: "final" });
}

async function generateProformaInvoice(order: any, db: any) {
  const pdfDoc = await buildInvoiceDoc(order, order.id, "PROFORMA");
  const url    = await uploadToR2(pdfDoc, order.id, "proforma");
  await updateDoc(doc(db, "orders", order.id), { proformaInvoiceUrl: url, invoiceType: "proforma" });
}

async function generateCancelledInvoice(order: any, db: any) {
  const pdfDoc = await buildInvoiceDoc(order, order.id, "CANCELLED");
  const url    = await uploadToR2(pdfDoc, order.id, "cancelled");
  await updateDoc(doc(db, "orders", order.id), {
    cancelledInvoiceUrl: url,
    invoiceType: "cancelled",
    cancelledAt: new Date(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminOrders() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm,    setSearchQuery]   = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isRefunding,   setIsRefunding]   = useState<string | null>(null);

  // Prevent duplicate generation in the same session
  const invoiceTriggered = useRef<Set<string>>(new Set());

  const [refundOverrides, setRefundOverrides] = useState<
    Record<string, { refundStatus: string; refundId?: string }>
  >({});

  const userProfileRef = useMemoFirebase(
    () => (!user?.uid ? null : doc(db, "users", user.uid)),
    [db, user?.uid],
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

  // ── Auto invoice generation ────────────────────────────────────────────────
  useEffect(() => {
    if (!orders || !db) return;
    for (const order of orders) {
      const key = `${order.id}-${order.status}`;
      if (invoiceTriggered.current.has(key)) continue;

      if (order.status === "Delivered" && !order.finalInvoiceUrl) {
        invoiceTriggered.current.add(key);
        generateFinalInvoice(order, db).catch((e) => console.error("[invoice] Final:", e));
      } else if (order.status === "Approved" && !order.proformaInvoiceUrl) {
        invoiceTriggered.current.add(key);
        generateProformaInvoice(order, db).catch((e) => console.error("[invoice] Proforma:", e));
      } else if (order.status === "Cancelled" && !order.cancelledInvoiceUrl) {
        invoiceTriggered.current.add(key);
        generateCancelledInvoice(order, db).catch((e) => console.error("[invoice] Cancelled:", e));
      }
    }
  }, [orders, db]);

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, "orders", orderId);
    updateDoc(orderRef, { status: newStatus, updatedAt: serverTimestamp() })
      .then(() => {
        toast({ title: "Status Updated", description: `Order #${orderId.substring(0, 6)} is now ${newStatus}.` });
        if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      })
      .catch(() => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: `orders/${orderId}`, operation: "update", requestResourceData: { status: newStatus },
        }));
      });
  };

  // ── Refund approval ────────────────────────────────────────────────────────
  const handleApproveRefund = async (orderId: string) => {
    setIsRefunding(orderId);
    try {
      const auth      = getAuth();
      const userEmail = auth.currentUser?.email ?? "";
      if (!userEmail) throw new Error("Not authenticated");

      const res  = await fetch("/api/refund-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-email": userEmail },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();

      if (res.ok) {
        toast({ title: "✅ Refund Processed", description: `Razorpay Refund ID: ${data.refundId || "N/A"}` });
        const patch = { refundStatus: "processed", refundId: data.refundId };
        setRefundOverrides((prev) => ({ ...prev, [orderId]: patch }));
        if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, ...patch }));
      } else {
        throw new Error(data.error || "Failed to process refund");
      }
    } catch (err: any) {
      console.error("[handleApproveRefund]", err);
      toast({ title: "Refund Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRefunding(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredOrders = orders?.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isAdmin && profile) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground italic">Restricted access...</div>;
  }

  // ── Refund badge ───────────────────────────────────────────────────────────
  const renderRefundBadge = (order: any) => {
    const merged = { ...order, ...(refundOverrides[order.id] ?? {}) };
    if (merged.status !== "Cancelled" || merged.paymentMethod !== "online")
      return <span className="text-xs text-muted-foreground">N/A</span>;
    if (merged.refundStatus === "processed")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" /> Processed
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50/50 flex items-center gap-1 w-fit">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
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
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Order ID</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Refund</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Invoice</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => {
                  const merged = { ...order, ...(refundOverrides[order.id] ?? {}) };
                  const canRefund =
                    merged.status === "Cancelled" &&
                    merged.paymentMethod === "online" &&
                    (merged.refundStatus === "pending" || !merged.refundStatus);

                  const invoiceUrl =
                    order.finalInvoiceUrl ||
                    order.cancelledInvoiceUrl ||
                    order.proformaInvoiceUrl ||
                    null;
                  const invoiceLabel =
                    order.finalInvoiceUrl     ? "Final"
                    : order.cancelledInvoiceUrl ? "Cancelled"
                    : order.proformaInvoiceUrl  ? "Proforma"
                    : null;

                  return (
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
                            <p className="font-bold text-sm leading-none">{order.customerName || "Guest"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{order.customerEmail}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-6">
                        <StatusChip status={order.status as OrderStatus} />
                      </TableCell>

                      <TableCell className="p-6">{renderRefundBadge(order)}</TableCell>

                      {/* Invoice download */}
                      <TableCell className="p-6">
                        {invoiceUrl ? (
                          <a
                            href={invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Download className="h-3 w-3" /> {invoiceLabel}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Generating…</span>
                        )}
                      </TableCell>

                      <TableCell className="p-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {canRefund && (
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 px-4 rounded-xl flex gap-2 items-center"
                              onClick={() => handleApproveRefund(order.id)}
                              disabled={isRefunding === order.id}
                            >
                              {isRefunding === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                              {isRefunding === order.id ? "Processing..." : "Approve & Refund"}
                            </Button>
                          )}

                          {merged.status === "Cancelled" &&
                            merged.paymentMethod === "online" &&
                            merged.refundStatus === "processed" && (
                              <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                <BadgeCheck className="h-4 w-4" /> Refund Done
                              </span>
                            )}

                          <Select defaultValue={order.status} onValueChange={(val) => handleStatusUpdate(order.id, val as OrderStatus)}>
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
              <ShoppingBag className="h-6 w-6" /> Order Details
            </DialogTitle>
            <DialogDescription className="font-mono text-xs uppercase tracking-widest font-bold">
              ID: {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      <Phone className="h-4 w-4" /> {selectedOrder.customerPhone || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Delivery Address
                  </h3>
                  <div className="bg-muted/30 p-5 rounded-2xl space-y-2">
                    <p className="text-sm font-semibold text-primary leading-relaxed">
                      {selectedOrder.shippingAddress?.name || selectedOrder.shippingAddress?.fullName}
                    </p>
                    {selectedOrder.shippingAddress?.phone && (
                      <p className="text-sm text-muted-foreground font-medium">+91 {selectedOrder.shippingAddress.phone}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shippingAddress?.fullAddress || selectedOrder.shippingAddress?.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} -{" "}
                      {selectedOrder.shippingAddress?.pincode}
                    </p>
                  </div>
                </div>
              </div>

              {selectedOrder.status === "Cancelled" && (
                <div className="space-y-4 bg-red-50 border border-red-100 p-6 rounded-3xl">
                  <h3 className="text-sm font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Cancellation Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-red-400 uppercase font-black tracking-wider mb-1">Reason</p>
                      <p className="font-bold text-red-700">{selectedOrder.cancelReason || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-red-400 uppercase font-black tracking-wider mb-1">Refund Status</p>
                      {selectedOrder.paymentMethod === "cod" ? (
                        <p className="font-bold text-red-700">No Refund Needed (COD)</p>
                      ) : selectedOrder.refundStatus === "processed" ? (
                        <div className="space-y-1">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" /> Refund Processed
                          </Badge>
                          {selectedOrder.refundId && (
                            <p className="text-[11px] font-mono text-muted-foreground">ID: {selectedOrder.refundId}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" /> Refund Pending
                          </Badge>
                          {selectedOrder.paymentMethod === "online" && (
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-8 px-3 rounded-xl flex gap-2 items-center w-fit mt-1"
                              onClick={() => handleApproveRefund(selectedOrder.id)}
                              disabled={isRefunding === selectedOrder.id}
                            >
                              {isRefunding === selectedOrder.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                              {isRefunding === selectedOrder.id ? "Processing..." : "Approve & Refund"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Order Summary
                </h3>
                <div className="space-y-3">
                  {(selectedOrder.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-muted rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={item.imageUrl || "https://picsum.photos/seed/plant/200/200"}
                            alt={item.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.qty || item.quantity || 1} • ₹{item.price}</p>
                        </div>
                      </div>
                      <p className="font-black text-primary">₹{(item.qty || item.quantity || 1) * item.price}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-6 bg-primary text-white p-6 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-60">Payment Method</p>
                    <p className="font-bold uppercase tracking-wider">{selectedOrder.paymentMethod || "COD"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black opacity-60">Grand Total</p>
                  <p className="text-3xl font-extrabold">₹{selectedOrder.totalAmount || selectedOrder.total || 0}</p>
                </div>
              </div>

              {/* Invoice download in modal */}
              {(() => {
                const url =
                  selectedOrder.finalInvoiceUrl ||
                  selectedOrder.cancelledInvoiceUrl ||
                  selectedOrder.proformaInvoiceUrl ||
                  null;
                const label =
                  selectedOrder.finalInvoiceUrl     ? "Final Invoice"
                  : selectedOrder.cancelledInvoiceUrl ? "Cancelled Invoice"
                  : selectedOrder.proformaInvoiceUrl  ? "Proforma Invoice"
                  : null;
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors w-fit"
                  >
                    <Download className="h-4 w-4" /> Download {label}
                  </a>
                ) : null;
              })()}

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

"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StatusChip } from "@/components/shared/StatusChip";
import {
  ArrowLeft, Package, MapPin, CreditCard, Loader2,
  CheckCircle2, Clock, AlertTriangle, RefreshCw,
  XCircle, Calendar, Truck, Banknote, Download,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, updateDoc, serverTimestamp, getDoc, getFirestore } from "firebase/firestore";
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

function calcSubtotal(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => {
    const price = item.price || 0;
    const qty   = item.qty || item.quantity || 1;
    return acc + price * qty;
  }, 0);
}

// ── UPDATED: added refundStatus param + fixed online logic ───────────────────
function getPaymentStatusLabel(
  paymentMethod: string,
  paymentStatus: string,
  orderStatus: string,
  refundStatus?: string,
): { label: string; color: string } {

  // COD — unchanged
  if (paymentMethod === "cod") {
    if (orderStatus === "Delivered") return { label: "Paid",      color: "text-emerald-600" };
    if (orderStatus === "Cancelled") return { label: "Cancelled", color: "text-gray-500"    };
    return                                   { label: "Pending",  color: "text-amber-600"   };
  }

  // ONLINE — fixed
  if (paymentMethod === "online") {
    if (orderStatus === "Cancelled") {
      if (refundStatus === "processed") {
        return { label: "Refunded",       color: "text-emerald-600" };
      }
      return   { label: "Refund Pending", color: "text-amber-600"   };
    }
    return     { label: "Paid",           color: "text-emerald-600" };
  }

  return { label: "Pending", color: "text-amber-600" };
}

async function fetchBusinessInfo(): Promise<{
  storeName: string;
  legalName: string;
  email: string;
  phone: string;
  gstin: string;
  showGST: boolean;
}> {
  const defaults = {
    storeName: "Monterra",
    legalName: "",
    email:     "support@monterra.in",
    phone:     "",
    gstin:     "",
    showGST:   false,
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
  } catch (err) {
    console.warn("Could not fetch business info, using defaults:", err);
    return defaults;
  }
}

function pdfRs(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

async function downloadInvoice(order: any, orderId: string) {
  if (!order) return;

  try {
    const jsPDFModule     = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const jsPDF           = jsPDFModule.default;
    const autoTable       = autoTableModule.default ?? autoTableModule;

    const biz   = await fetchBusinessInfo();
    const today = new Date().toISOString().split("T")[0];

    const type =
      order.status === "Cancelled"
        ? "CANCELLED"
        : order.status === "Approved"
        ? "PROFORMA"
        : "FINAL";

    let invoiceTitle = "INVOICE";
    if (type === "PROFORMA")  invoiceTitle = "PROFORMA INVOICE";
    if (type === "CANCELLED") invoiceTitle = "CANCELLED INVOICE";

    const headerColor: [number, number, number] =
      type === "CANCELLED"
        ? [180, 30, 30]
        : type === "PROFORMA"
        ? [120, 120, 120]
        : [27, 94, 32];

    const doc        = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const subtotal    = calcSubtotal(order.items || []);
    const discount    = order.discount || 0;
    const shipRaw     = order.shippingCost ?? order.shippingFee ?? order.deliveryCharge ?? order.shipping ?? 0;
    const storedTotal = order.totalAmount || order.total || 0;
    const shipping    = shipRaw === 0 && storedTotal > subtotal
      ? storedTotal - subtotal + discount
      : shipRaw;
    const total = storedTotal || (subtotal + shipping - discount);

    const paymentMethodRaw   = order.paymentMethod?.toLowerCase();
    const paymentMethodLabel = paymentMethodRaw === "cod"
      ? "Cash on Delivery"
      : paymentMethodRaw === "online" ? "Online Payment" : order.paymentMethod || "-";

    let paymentStatusLabel = "Pending";

    if (paymentMethodRaw === "online") {
      if (type === "CANCELLED") {
        paymentStatusLabel = order.refundStatus === "processed"
          ? "Refunded"
          : "Refund Pending";
      } else {
        paymentStatusLabel = "Paid";
      }
    }

    if (paymentMethodRaw === "cod") {
      if (order.status === "Delivered") {
        paymentStatusLabel = "Paid";
      } else if (type === "CANCELLED") {
        paymentStatusLabel = "Not Paid";
      } else {
        paymentStatusLabel = "Pending";
      }
    }

    const orderDate = order.createdAt?.seconds
      ? format(new Date(order.createdAt.seconds * 1000), "dd MMM yyyy, h:mm a")
      : "-";

    // ══════════════════════════════════════════════════════════════════════════
    // HEADER
    // ══════════════════════════════════════════════════════════════════════════
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
    const contactLine = biz.phone ? `${biz.email}   |   ${biz.phone}` : biz.email;
    doc.text(contactLine, 15, 29);

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

    // ══════════════════════════════════════════════════════════════════════════
    // BANNER — one per invoice type
    // ══════════════════════════════════════════════════════════════════════════
    let y = 46;

    if (type === "CANCELLED") {
      doc.setFillColor(255, 235, 235);
      doc.rect(0, 38, pageWidth, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(180, 30, 30);
      doc.text("This order was cancelled.", pageWidth / 2, 45, { align: "center" });
      y = 56;

    } else if (type === "PROFORMA") {
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 38, pageWidth, 10, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "This is a provisional invoice. Final invoice will be generated after delivery.",
        pageWidth / 2,
        45,
        { align: "center" },
      );
      y = 56;

    } else {
      doc.setFillColor(235, 248, 235);
      doc.rect(0, 38, pageWidth, 14, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(27, 94, 32);
      doc.text("\u2714 Order successfully delivered.", pageWidth / 2, 46, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(60, 120, 60);
      const deliveredDate = order.deliveredAt?.seconds
        ? format(new Date(order.deliveredAt.seconds * 1000), "dd MMM yyyy")
        : format(new Date(), "dd MMM yyyy");
      doc.text(`Delivered on ${deliveredDate}`, pageWidth / 2, 50, { align: "center" });

      y = 60;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ORDER META ROW
    // ══════════════════════════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════════════════════════
    // SHIP TO
    // ══════════════════════════════════════════════════════════════════════════
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

      const cityLine = [addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
      doc.text(cityLine, 20, y + 27);

      if (addr.phone || order.customerPhone) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        doc.text(`Ph: ${addr.phone || order.customerPhone}`, pageWidth - 20, y + 27, { align: "right" });
      }

      y += 42;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ITEMS TABLE
    // ══════════════════════════════════════════════════════════════════════════
    const tableRows = (order.items || []).map((item: any, i: number) => {
      const qty   = item.qty || item.quantity || 1;
      const price = item.price || 0;
      return [
        String(i + 1),
        item.name || "Unknown Item",
        String(qty),
        pdfRs(price),
        pdfRs(price * qty),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Item Description", "Qty", "Unit Price", "Amount"]],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: headerColor,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [30, 30, 30],
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 10,     halign: "center" },
        1: { cellWidth: "auto", fontStyle: "bold" },
        2: { cellWidth: 14,     halign: "center" },
        3: { cellWidth: 36,     halign: "right"  },
        4: { cellWidth: 36,     halign: "right", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: [248, 252, 248] },
      margin: { left: 15, right: 15 },
    });

    // ══════════════════════════════════════════════════════════════════════════
    // TOTALS + PAYMENT SUMMARY
    // ══════════════════════════════════════════════════════════════════════════
    const finalY = (doc as any).lastAutoTable.finalY + 8;

    const totalsBoxX = pageWidth / 2 + 2;
    const totalsBoxW = pageWidth - 15 - totalsBoxX;
    const rowH       = 8;
    const numRows    = discount > 0 ? 4 : 3;
    const totalsBoxH = numRows * rowH + 14;

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
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(label, psLabel, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(value, psValue, yPos, { align: "right" });
    };

    pRow("Payment Method", paymentMethodLabel,  finalY + 13);
    pRow("Payment Status", paymentStatusLabel,  finalY + 21);
    pRow("Order Status",   order.status || "-", finalY + 29);
    if (order.createdAt?.seconds) {
      pRow(
        "Order Date",
        format(new Date(order.createdAt.seconds * 1000), "dd MMM yyyy"),
        finalY + 37,
      );
    }

    let postSummaryY = finalY - 4 + Math.max(totalsBoxH, psBoxH) + 10;

    // ══════════════════════════════════════════════════════════════════════════
    // REFUND HIGHLIGHT BOX (online + cancelled only)
    // ══════════════════════════════════════════════════════════════════════════
    if (paymentMethodRaw === "online" && type === "CANCELLED") {
      const isRefunded = order.refundStatus === "processed";

      doc.setFillColor(isRefunded ? 240 : 255, isRefunded ? 255 : 243, isRefunded ? 240 : 205);
      doc.setDrawColor(isRefunded ? 180 : 230, isRefunded ? 220 : 190, isRefunded ? 180 : 100);
      doc.roundedRect(14, postSummaryY, pageWidth - 28, 16, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(isRefunded ? 0 : 140, isRefunded ? 120 : 80, 0);
      doc.text(
        isRefunded ? "\u2714 Refund Processed" : "\u23F3 Refund Pending",
        18,
        postSummaryY + 6,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(
        isRefunded
          ? `Refund ID: ${order.refundId || "-"}`
          : "Your refund will be processed soon.",
        18,
        postSummaryY + 12,
      );

      postSummaryY += 22;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAYMENT TIMELINE (online only)
    // ══════════════════════════════════════════════════════════════════════════
    if (paymentMethodRaw === "online") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Payment Timeline", 14, postSummaryY);

      postSummaryY += 7;

      const dotY  = postSummaryY - 1;
      const dot2X = type === "CANCELLED" ? 70 : 0;

      doc.setFillColor(27, 94, 32);
      doc.circle(18, dotY, 2, "F");

      if (type === "CANCELLED") {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.4);
        doc.line(20, dotY, dot2X - 2, dotY);
        doc.setLineWidth(0.2);

        const refunded = order.refundStatus === "processed";
        doc.setFillColor(refunded ? 27 : 180, refunded ? 94 : 120, refunded ? 32 : 0);
        doc.circle(dot2X, dotY, 2, "F");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(27, 94, 32);
      doc.text("\u2714 Paid", 22, postSummaryY + 1);

      if (type === "CANCELLED") {
        const refunded = order.refundStatus === "processed";
        doc.setTextColor(refunded ? 27 : 180, refunded ? 94 : 80, refunded ? 32 : 0);
        doc.text(
          refunded ? "\u2714 Refunded" : "\u23F3 Refund Pending",
          dot2X + 4,
          postSummaryY + 1,
        );
      }

      postSummaryY += 12;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════════════════════════════════════════
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 22, pageWidth, 22, "F");
    doc.setDrawColor(215, 215, 215);
    doc.line(0, pageHeight - 22, pageWidth, pageHeight - 22);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      "This is a system-generated invoice. GST not applicable.",
      pageWidth / 2, pageHeight - 13, { align: "center" },
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Thank you for shopping with ${biz.storeName}!`,
      pageWidth / 2, pageHeight - 6, { align: "center" },
    );

    doc.save(`${biz.storeName}-Invoice-${orderId}-${today}.pdf`);
    toast({ title: "Invoice downloaded!" });

  } catch (err: any) {
    console.error("Invoice generation error:", err?.message || err);
    toast({
      title: "Failed to generate invoice",
      description: err?.message || "Check browser console for details",
      variant: "destructive",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { user, isUserLoading } = useUser();
  const db      = useFirestore();
  const router  = useRouter();
  const params  = useParams();
  const orderId = params?.id as string;

  const [cancelReason,       setCancelReason]       = useState("");
  const [cancelFeedback,     setCancelFeedback]     = useState("");
  const [showCancelModal,    setShowCancelModal]    = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const orderDocRef = useMemoFirebase(() => {
    if (!db || !orderId) return null;
    return doc(db, "orders", orderId);
  }, [db, orderId]);

  const { data: order, isLoading } = useDoc(orderDocRef);

  const paymentMethod = order?.paymentMethod?.toLowerCase();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login?redirect=/orders");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!isLoading && order && user && order.userId !== user.uid) {
      router.push("/orders");
    }
  }, [order, isLoading, user, router]);

  const subtotal    = calcSubtotal(order?.items || []);
  const shipRaw     = order?.shippingCost ?? order?.shippingFee ?? order?.deliveryCharge ?? order?.shipping ?? 0;
  const discount    = order?.discount || 0;
  const storedTotal = order?.totalAmount || order?.total || 0;

  const derivedShipping = shipRaw === 0 && storedTotal > subtotal
    ? storedTotal - subtotal + discount
    : shipRaw;
  const total = storedTotal || (subtotal + derivedShipping - discount);

  if (order) {
    console.log("[Order Totals Debug]", {
      subtotal, shipRaw, derivedShipping, discount, storedTotal, finalTotal: total,
      firestoreFields: {
        shippingCost: order.shippingCost, shippingFee: order.shippingFee,
        deliveryCharge: order.deliveryCharge, shipping: order.shipping,
        totalAmount: order.totalAmount, total: order.total,
      },
    });
  }

  // ── UPDATED: now passes order.refundStatus as 4th arg ────────────────────
  const { label: paymentStatusLabel, color: paymentStatusColor } = order
    ? getPaymentStatusLabel(
        paymentMethod || "",
        order.paymentStatus || "",
        order.status || "",
        order.refundStatus,
      )
    : { label: "-", color: "text-muted-foreground" };

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

    const cancelData: any = {
      status:         "Cancelled",
      cancelled:      true,
      cancelReason,
      cancelFeedback: cancelReason === "Other" ? cancelFeedback : "",
      cancelledAt:    serverTimestamp(),
      updatedAt:      serverTimestamp(),
    };

    if (paymentMethod === "cod") {
      cancelData.paymentStatus = "cancelled";
    }

    if (paymentMethod === "online" && order.razorpayPaymentId) {
      cancelData.refundStatus = "pending";
    }

    try {
      await updateDoc(orderRef, cancelData);
      toast({
        title: "Order Cancelled",
        description: paymentMethod === "online"
          ? "Our team will review and process your refund shortly."
          : "Your order has been successfully cancelled.",
      });
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
    if (order?.status !== "Cancelled") return null;

    if (paymentMethod === "cod") {
      return (
        <div className="flex items-start gap-3 rounded-2xl p-4 mt-4 bg-gray-50 border border-gray-200">
          <Banknote className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-700">No Refund Required</p>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Since this was a Cash on Delivery order, no payment was collected and no refund is required.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-start gap-3 rounded-2xl p-4 mt-4 ${
        order?.refundStatus === "processed" ? "bg-emerald-50" :
        order?.refundStatus === "failed"    ? "bg-red-50"     : "bg-amber-50"
      }`}>
        {order?.refundStatus === "processed"
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          : order?.refundStatus === "failed"
          ? <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          : <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0 animate-pulse" />
        }
        <div>
          <p className={`text-sm font-bold ${
            order?.refundStatus === "processed" ? "text-emerald-700" :
            order?.refundStatus === "failed"    ? "text-red-600"     : "text-amber-700"
          }`}>
            {order?.refundStatus === "processed" ? "Refund Processed"
              : order?.refundStatus === "failed" ? "Refund Failed"
              : "Refund Pending Review"}
          </p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {order?.refundStatus === "processed"
              ? `Refund ID: ${order?.refundId} · Your refund (if applicable) will be processed back to your original payment method within 5-7 business days.`
              : order?.refundStatus === "failed"
              ? order?.refundError || "Please contact support"
              : "An administrator will approve your refund request shortly."}
          </p>
        </div>
      </div>
    );
  };

  const statusSteps  = ["Pending", "Approved", "Shipped", "Delivered"];
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

          <Link href="/orders">
            <button className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to Orders
            </button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div>
              <h1 className="text-2xl font-headline font-extrabold text-primary">Order Details</h1>
              <p className="text-xs text-muted-foreground font-mono mt-1">{orderId}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusChip status={order.status || "Pending"} />
              <button
                onClick={() => { if (!order) return; downloadInvoice(order, orderId); }}
                disabled={!order || isLoading}
                className="text-sm font-bold px-5 py-2 rounded-full text-primary border border-primary/20 hover:bg-primary/5 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" /> Invoice
              </button>
            </div>
          </div>

          <div className="space-y-5">

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
                    <p className="text-xs text-red-400 mt-2 italic">
                      {paymentMethod === "cod"
                        ? "Since this was a Cash on Delivery order, no payment was collected and no refund is required."
                        : "Your refund (if applicable) will be processed back to your original payment method within 5-7 business days."}
                    </p>
                  </div>
                </div>
                {getRefundSection()}
              </div>
            )}

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

              <div className="mt-6 pt-5 border-t space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>
                    {derivedShipping === 0
                      ? <span className="text-emerald-600 font-semibold">Free</span>
                      : `₹${derivedShipping.toLocaleString("en-IN")}`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>-₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-primary text-base pt-2 border-t">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {order.shippingAddress && (
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Delivery Address
                </h2>
                <div className="text-sm text-foreground leading-relaxed">
                  <p className="font-bold text-base">{order.shippingAddress.name || order.shippingAddress.fullName}</p>
                  <p className="text-muted-foreground mt-1">
                    {order.shippingAddress.fullAddress || order.shippingAddress.address}
                  </p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
                  </p>
                  {order.shippingAddress.phone && (
                    <p className="text-muted-foreground mt-1">📞 {order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-bold capitalize">
                    {paymentMethod === "online" ? "💳 Online Payment" : "Cash on Delivery"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-bold ${paymentStatusColor}`}>
                    {paymentStatusLabel}
                  </span>
                </div>
                {order.status === "Cancelled" && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Refund</span>
                    {paymentMethod === "cod" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                        <Banknote className="h-3 w-3" /> Not Required
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                        order.refundStatus === "processed" ? "bg-emerald-100 text-emerald-700"
                          : order.refundStatus === "failed" ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {order.refundStatus === "processed" ? (
                          <><CheckCircle2 className="h-3 w-3" /> Processed</>
                        ) : order.refundStatus === "failed" ? (
                          <><AlertTriangle className="h-3 w-3" /> Failed</>
                        ) : (
                          <><Clock className="h-3 w-3" /> Processing</>
                        )}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center">
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

      <Dialog open={showCancelModal} onOpenChange={(open) => !open && setShowCancelModal(false)}>
        <DialogContent className="rounded-[2rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-extrabold text-primary flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Cancel Order?
            </DialogTitle>
            <DialogDescription>
              {paymentMethod === "online"
                ? "Your refund request will be sent to our team for approval."
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

            {paymentMethod === "online" ? (
              <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-4">
                <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Upon approval, ₹{total.toLocaleString("en-IN")} will be automatically refunded to your original payment method.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <Banknote className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  Since this is a Cash on Delivery order, no payment was collected and no refund is required.
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
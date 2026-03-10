// src/app/api/refund-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    // ── 1. Admin auth check ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const isAdmin = decoded.admin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // ── 2. Parse body ────────────────────────────────────────────────────────
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // ── 3. Fetch order from Firestore ────────────────────────────────────────
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderSnap.data()!;

    // ── 4. Must be a cancelled order ─────────────────────────────────────────
    if (order.status !== "Cancelled") {
      return NextResponse.json(
        { error: "Refund can only be issued for cancelled orders" },
        { status: 400 }
      );
    }

    // ── 5. Prevent duplicate refunds ─────────────────────────────────────────
    if (order.refundStatus === "processed") {
      return NextResponse.json(
        { error: "Refund already processed" },
        { status: 400 }
      );
    }

    // ── 6. Allow refunds only for Razorpay payments ──────────────────────────
    if (!order.razorpayPaymentId) {
      return NextResponse.json(
        { error: "No Razorpay payment found for this order" },
        { status: 400 }
      );
    }

    // ── 7. Call Razorpay refund API ──────────────────────────────────────────
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      speed: "normal",
    });

    // ── 8. Update Firestore after successful refund ──────────────────────────
    await orderRef.update({
      refundStatus: "processed",
      refundId: refund.id,
      refundedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, refundId: refund.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[refund-order] Error:", error);
    const message =
      error?.error?.description ?? error?.message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { adminDb } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderSnap.data();

    // 🛑 Prevent duplicate refunds
    if (order?.refundStatus === "processed") {
      return NextResponse.json({ message: "Refund already processed" }, { status: 200 });
    }

    // 🛑 Guard: Only cancelled orders can be refunded via this flow
    if (order?.status !== "Cancelled") {
      return NextResponse.json({ error: "Order must be cancelled first" }, { status: 400 });
    }

    // 🛑 Guard: Only online payments via Razorpay
    if (order?.paymentMethod !== "online" || !order?.razorpayPaymentId) {
      return NextResponse.json({ error: "Order not eligible for Razorpay refund" }, { status: 400 });
    }

    // 💳 Call Razorpay refund API
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100), // convert ₹ → paise
      speed: "optimum",
      notes: {
        orderId: orderId,
        reason: order.cancelReason || "Admin approved refund",
      },
    });

    // ✅ Update Firestore with 'processed' status
    await orderRef.update({
      refundStatus: "processed",
      refundId: refund.id,
      refundedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: order.totalAmount,
    });

  } catch (error: any) {
    console.error("Refund API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Refund failed" },
      { status: 500 }
    );
  }
}

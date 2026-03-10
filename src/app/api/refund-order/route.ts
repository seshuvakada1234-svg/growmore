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
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const order = orderSnap.data();

    // 🛑 Guard 1: Only cancelled orders can be refunded
    if (order?.status !== "Cancelled") {
      return NextResponse.json(
        { error: "Order is not cancelled" },
        { status: 400 }
      );
    }

    // 🛑 Guard 2: Only online payments
    if (order?.paymentMethod !== "online" || !order?.razorpayPaymentId) {
      return NextResponse.json(
        { error: "This order was not paid online" },
        { status: 400 }
      );
    }

    // 🛑 Guard 3: Prevent duplicate refunds
    if (order?.refundStatus === "success" || order?.refundStatus === "initiated") {
      return NextResponse.json(
        { error: "Refund already processed" },
        { status: 400 }
      );
    }

    // Mark refund initiated
    await orderRef.update({
      refundStatus: "initiated",
      refundInitiatedAt: FieldValue.serverTimestamp(),
    });

    // 💳 Call Razorpay refund API
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100), // convert ₹ → paise
      speed: "optimum",
      notes: {
        orderId: orderId,
        reason: order.cancelReason || "Order cancelled by customer",
      },
    });

    // Save refund result
    await orderRef.update({
      refundStatus: "success",
      refundId: refund.id,
      refundAmount: order.totalAmount,
      refundCompletedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: order.totalAmount,
    });

  } catch (error: any) {
    console.error("Refund error:", error);

    return NextResponse.json(
      {
        error:
          error?.error?.description ||
          error?.message ||
          "Refund failed",
      },
      { status: 500 }
    );
  }
}

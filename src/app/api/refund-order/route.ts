import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ADMIN_EMAILS = ["seshuvakada1234@gmail.com"];

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay keys missing");
  return new Razorpay({ key_id, key_secret });
}

export async function POST(req: NextRequest) {
  try {
    const adminEmail = req.headers.get("x-admin-email");
    console.log("[refund-order] x-admin-email:", adminEmail);

    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const order = orderSnap.data()!;
    if (order.status !== "Cancelled") return NextResponse.json({ error: "Order not cancelled" }, { status: 400 });
    if (order.refundStatus === "processed") return NextResponse.json({ error: "Already refunded" }, { status: 409 });
    if (!order.razorpayPaymentId) return NextResponse.json({ error: "No Razorpay payment found" }, { status: 400 });

    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, { speed: "normal" });

    await orderRef.update({
      refundStatus: "processed",
      refundId: refund.id,
      refundedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, refundId: refund.id }, { status: 200 });
  } catch (error: any) {
    console.error("[refund-order] Error:", error);
    return NextResponse.json({ error: error?.error?.description ?? error?.message ?? "Server error" }, { status: 500 });
  }
}

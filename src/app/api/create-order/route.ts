import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { adminDb } from "@/lib/firebase-admin";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/create-order
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { amount, currency, paymentMethod } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    // ── Block COD orders if disabled in Firestore ─────────────────────────
    if (paymentMethod === "cod") {
      const snap = await adminDb.collection("settings").doc("paymentMethods").get();
      const codEnabled = snap.exists ? (snap.data()?.codEnabled ?? true) : true;

      if (!codEnabled) {
        return NextResponse.json(
          { error: "Cash on Delivery is currently unavailable. Please choose another payment method." },
          { status: 403 }
        );
      }

      // COD doesn't need a Razorpay order
      return NextResponse.json({ success: true, method: "cod" });
    }

    // ── Online payment: create Razorpay order ─────────────────────────────
    const key_id     = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error("Razorpay keys missing");

    const razorpay = new Razorpay({ key_id, key_secret });

    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: currency || "INR",
      receipt:  `receipt_${Date.now()}`,
    });

    console.log("✅ Razorpay Order:", order);
    return NextResponse.json(order);

  } catch (error: any) {
    console.error("❌ create-order error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
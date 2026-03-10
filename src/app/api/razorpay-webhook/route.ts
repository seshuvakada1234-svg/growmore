// src/app/api/razorpay-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

// ── Signature verification ─────────────────────────────────────────────────
function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(signature, "hex")
  );
}

// ── Find order by razorpayPaymentId ────────────────────────────────────────
async function findOrderByPaymentId(
  paymentId: string
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData } | null> {
  const snap = await adminDb
    .collection("orders")
    .where("razorpayPaymentId", "==", paymentId)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return { ref: docSnap.ref, data: docSnap.data() };
}

// ── Main handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[webhook] RAZORPAY_WEBHOOK_SECRET not set");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // ── 1. Read raw body for signature check ─────────────────────────────────
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 }
      );
    }

    // ── 2. Verify signature ───────────────────────────────────────────────────
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn("[webhook] Invalid signature — possible spoofed request");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // ── 3. Parse payload ──────────────────────────────────────────────────────
    const payload = JSON.parse(rawBody);
    const event: string = payload.event;
    const entity =
      payload.payload?.refund?.entity ??
      payload.payload?.payment?.entity ??
      null;

    console.log(`[webhook] Received event: ${event}`);

    // ── 4. Handle events ──────────────────────────────────────────────────────
    switch (event) {

      // ── refund.created ───────────────────────────────────────────────────────
      case "refund.created": {
        const paymentId: string = entity?.payment_id;
        if (!paymentId) break;

        const order = await findOrderByPaymentId(paymentId);
        if (!order) {
          console.warn(`[webhook] refund.created — no order found for payment ${paymentId}`);
          break;
        }

        if (order.data.refundStatus !== "processed") {
          await order.ref.update({
            refundStatus: "pending",
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[webhook] refund.created — order ${order.ref.id} marked pending`);
        }
        break;
      }

      // ── refund.processed ─────────────────────────────────────────────────────
      case "refund.processed": {
        const paymentId: string = entity?.payment_id;
        const refundId: string = entity?.id;
        if (!paymentId) break;

        const order = await findOrderByPaymentId(paymentId);
        if (!order) {
          console.warn(`[webhook] refund.processed — no order found for payment ${paymentId}`);
          break;
        }

        // Prevent duplicate update if already processed
        if (order.data.refundStatus === "processed") {
          console.log(`[webhook] refund.processed — order ${order.ref.id} already processed, skipping`);
          break;
        }

        await order.ref.update({
          refundStatus: "processed",
          refundId: refundId ?? null,
          refundedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[webhook] refund.processed — order ${order.ref.id} updated`);
        break;
      }

      // ── refund.failed ────────────────────────────────────────────────────────
      case "refund.failed": {
        const paymentId: string = entity?.payment_id;
        if (!paymentId) break;

        const order = await findOrderByPaymentId(paymentId);
        if (!order) {
          console.warn(`[webhook] refund.failed — no order found for payment ${paymentId}`);
          break;
        }

        await order.ref.update({
          refundStatus: "failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[webhook] refund.failed — order ${order.ref.id} marked failed`);
        break;
      }

      // ── payment.captured ─────────────────────────────────────────────────────
      case "payment.captured": {
        const paymentId: string = entity?.id;
        if (!paymentId) break;

        const order = await findOrderByPaymentId(paymentId);
        if (!order) {
          console.log(`[webhook] payment.captured — no matching order for payment ${paymentId}`);
          break;
        }

        if (["Pending", "Approved"].includes(order.data.status)) {
          await order.ref.update({
            status: "Paid",
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[webhook] payment.captured — order ${order.ref.id} marked Paid`);
        }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event} — acknowledged`);
        break;
    }

    // ── 5. Always return 200 so Razorpay doesn't retry ───────────────────────
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[webhook] Unhandled error:", error);
    return NextResponse.json(
      { received: true, warning: "Internal processing error" },
      { status: 200 }
    );
  }
}
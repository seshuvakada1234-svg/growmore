import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
  increment,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function cancelCommissionByOrder(
  orderId: string,
  reason: "order_cancelled" | "order_returned" = "order_cancelled"
) {
  try {
    // ✅ Normalize orderId (CRITICAL FIX)
    const cleanOrderId = String(orderId).trim().toUpperCase();

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return;

    // ✅ Primary query (fast path)
    const q = query(
      collection(db, "affiliate_commissions"),
      where("orderId", "==", cleanOrderId)
    );

    const snap = await getDocs(q);

    let docs = snap.docs;

    // ✅ Fallback scan (handles bad stored data)
    if (snap.empty) {
      console.warn("[AffiliateService] Indexed query empty — running fallback scan");

      const allSnap = await getDocs(collection(db, "affiliate_commissions"));

      docs = allSnap.docs.filter(
        (d) =>
          String(d.data().orderId).trim().toUpperCase() === cleanOrderId
      );
    }

    // ✅ Still nothing → exit
    if (docs.length === 0) {
      console.warn(`[AffiliateService] No commissions found for ${cleanOrderId}`);
      return;
    }

    const batch = writeBatch(db);

    for (const commDoc of docs) {
      const data = commDoc.data();

      // ✅ Skip already cancelled
      if (data.status === "cancelled") continue;

      const affiliateId = data.affiliateId;
      const oldAmount = Number(data.commissionAmount || 0);

      // ✅ Update commission doc
      batch.update(commDoc.ref, {
        status: "cancelled",
        reason: reason,
        commissionAmount: 0,
        originalCommissionAmount: oldAmount,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // ✅ Update affiliate profile
      if (affiliateId && oldAmount > 0) {
        const profileRef = doc(db, "affiliateProfiles", affiliateId);

        const profileUpdate: any = {
          totalEarnings: increment(-oldAmount),
          updatedAt: serverTimestamp(),
        };

        // Only deduct withdrawable if approved
        if (data.status === "approved") {
          profileUpdate.withdrawableAmount = increment(-oldAmount);
        }

        batch.update(profileRef, profileUpdate);
      }
    }

    await batch.commit();

    console.log(`[AffiliateService] ✅ Commissions cancelled for order ${cleanOrderId}`);
  } catch (e) {
    console.error("[AffiliateService] ❌ Failed to cancel commissions:", e);
  }
}
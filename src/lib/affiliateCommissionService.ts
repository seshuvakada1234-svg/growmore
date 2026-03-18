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
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return;

    const q = query(
      collection(db, "affiliate_commissions"),
      where("orderId", "==", orderId)
    );
    const snap = await getDocs(q);

    if (snap.empty) return;

    const batch = writeBatch(db);

    for (const commDoc of snap.docs) {
      const data = commDoc.data();
      if (data.status === "cancelled") continue;

      const affiliateId = data.affiliateId;
      const oldAmount = data.commissionAmount || 0;

      batch.update(commDoc.ref, {
        status: "cancelled",
        reason: reason,
        commissionAmount: 0,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const profileRef = doc(db, "affiliateProfiles", affiliateId);
      const profileUpdate: any = {
        totalEarnings: increment(-oldAmount),
        updatedAt: serverTimestamp(),
      };

      if (data.status === "approved") {
        profileUpdate.withdrawableAmount = increment(-oldAmount);
      }

      batch.update(profileRef, profileUpdate);
    }

    await batch.commit();
    console.log(`[AffiliateService] Commissions cancelled for order ${orderId}`);
  } catch (e) {
    console.error("[AffiliateService] Failed to cancel commissions:", e);
  }
}

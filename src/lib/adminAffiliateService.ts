'use client';

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  getDoc,
  writeBatch,
  serverTimestamp,
  orderBy,
  getCountFromServer
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Approves a user's affiliate status.
 * Queries affiliateApplications by userId field — works with any document ID format.
 */
export async function approveAffiliate(userId: string) {
  const batch = writeBatch(db);
  
  // 1. Update user profile
  batch.update(doc(db, "users", userId), {
    role: "affiliate",
    affiliateApproved: true,
    approvedAt: serverTimestamp()
  });

  // 2. FIX: Query by userId field instead of document ID
  const appSnap = await getDocs(
    query(
      collection(db, "affiliateApplications"),
      where("userId", "==", userId)
    )
  );

  // Update all matching documents to approved
  appSnap.forEach((d) => {
    batch.update(d.ref, {
      status: "approved",
      approvedAt: serverTimestamp()
    });
  });

  return await batch.commit();
}

/**
 * Rejects an affiliate application.
 * Queries affiliateApplications by userId field — works with any document ID format.
 */
export async function rejectAffiliate(userId: string) {
  const appSnap = await getDocs(
    query(
      collection(db, "affiliateApplications"),
      where("userId", "==", userId)
    )
  );

  const batch = writeBatch(db);

  appSnap.forEach((d) => {
    batch.update(d.ref, {
      status: "rejected",
      rejectedAt: serverTimestamp()
    });
  });

  return await batch.commit();
}

/**
 * Suspends an affiliate and all their links.
 */
export async function suspendAffiliate(userId: string) {
  const batch = writeBatch(db);
  
  batch.update(doc(db, "users", userId), { 
    affiliateApproved: false,
    role: "user" 
  });
  
  const linksSnap = await getDocs(
    query(collection(db, "affiliate_links"), where("userId", "==", userId))
  );
  linksSnap.forEach(linkDoc => {
    batch.update(linkDoc.ref, { status: "suspended" });
  });
  
  return await batch.commit();
}

/**
 * Removes an affiliate completely:
 * - Resets role back to "user"
 * - Resets affiliateProfiles.approved to false
 * - Suspends all affiliate links
 * - Marks application as "removed" so they must re-apply
 */
export async function removeAffiliate(userId: string) {
  const batch = writeBatch(db);
  
  // 1. Reset user document
  batch.update(doc(db, "users", userId), {
    role: "user",
    affiliateApproved: false,
    updatedAt: serverTimestamp()
  });

  // 2. Reset affiliateProfiles.approved to false
  const profileSnap = await getDoc(doc(db, "affiliateProfiles", userId));
  if (profileSnap.exists()) {
    batch.update(doc(db, "affiliateProfiles", userId), {
      approved: false,
      updatedAt: serverTimestamp()
    });
  }

  // 3. Suspend all affiliate links
  const linksSnap = await getDocs(
    query(collection(db, "affiliate_links"), where("userId", "==", userId))
  );
  linksSnap.forEach(linkDoc => {
    batch.update(linkDoc.ref, { 
      status: "suspended",
      updatedAt: serverTimestamp()
    });
  });

  // 4. Mark application as removed — they must re-apply fresh
  const appSnap = await getDocs(
    query(
      collection(db, "affiliateApplications"),
      where("userId", "==", userId)
    )
  );
  appSnap.forEach((d) => {
    batch.update(d.ref, {
      status: "removed",
      removedAt: serverTimestamp()
    });
  });

  return await batch.commit();
}

/**
 * Returns bank details and profile info for an affiliate.
 */
export async function getAffiliateProfile(userId: string) {
  const snap = await getDoc(doc(db, "affiliateProfiles", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Calculates real-time performance stats for an affiliate.
 */
export async function getAffiliateStats(userId: string) {
  const [clicksSnap, commsSnap] = await Promise.all([
    getCountFromServer(
      query(collection(db, "affiliateClicks"), where("referrerId", "==", userId))
    ),
    getDocs(
      query(collection(db, "affiliate_commissions"), where("affiliateId", "==", userId))
    )
  ]);

  const commissions = commsSnap.docs.map(d => d.data());
  const totalEarnings = commissions.reduce(
    (acc, curr) => acc + (curr.commissionAmount || 0), 0
  );

  return {
    totalClicks: clicksSnap.data().count,
    totalOrders: commissions.length,
    totalEarnings
  };
}

/**
 * Returns all users with the affiliate role.
 */
export async function getAllAffiliates() {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "affiliate"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Returns all payout requests sorted by date.
 */
export async function getAllWithdrawRequests() {
  const snap = await getDocs(
    query(
      collection(db, "affiliateWithdrawRequests"),
      orderBy("requestedAt", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Approve a withdraw request.
 */
export async function approveWithdrawRequest(requestId: string) {
  await updateDoc(doc(db, "affiliateWithdrawRequests", requestId), {
    status: "approved",
    processedAt: serverTimestamp()
  });
}

/**
 * Mark withdraw as paid and reset affiliate withdrawable balance to 0.
 */
export async function markWithdrawPaid(requestId: string, affiliateId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "affiliateWithdrawRequests", requestId), {
    status: "paid",
    processedAt: serverTimestamp()
  });
  batch.update(doc(db, "affiliateProfiles", affiliateId), {
    withdrawableAmount: 0,
    updatedAt: serverTimestamp()
  });
  return await batch.commit();
}

/**
 * Reject a withdraw request.
 */
export async function rejectWithdrawRequest(requestId: string) {
  await updateDoc(doc(db, "affiliateWithdrawRequests", requestId), {
    status: "rejected",
    processedAt: serverTimestamp()
  });
}

/**
 * Admin: get all affiliate links.
 */
export async function adminGetAllAffiliateLinks() {
  const snap = await getDocs(collection(db, "affiliate_links"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

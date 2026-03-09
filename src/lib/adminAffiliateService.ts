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
 */
export async function approveAffiliate(userId: string) {
  const userRef = doc(db, "users", userId);
  return await updateDoc(userRef, {
    role: "affiliate",
    affiliateApproved: true,
    approvedAt: serverTimestamp()
  });
}

/**
 * Rejects or suspends an affiliate and their links.
 */
export async function suspendAffiliate(userId: string) {
  const batch = writeBatch(db);
  
  // 1. Update user profile
  const userRef = doc(db, "users", userId);
  batch.update(userRef, { 
    affiliateApproved: false,
    role: "user" 
  });
  
  // 2. Suspend all links
  const linksQuery = query(collection(db, "affiliate_links"), where("userId", "==", userId));
  const linksSnap = await getDocs(linksQuery);
  linksSnap.forEach(linkDoc => {
    batch.update(linkDoc.ref, { status: "suspended" });
  });
  
  return await batch.commit();
}

/**
 * Removes an affiliate, converts them back to a user and suspends their links.
 */
export async function removeAffiliate(userId: string) {
  const batch = writeBatch(db);
  
  // 1. Update the user document
  const userRef = doc(db, "users", userId);
  batch.update(userRef, {
    role: "user",
    affiliateApproved: false,
    updatedAt: serverTimestamp()
  });

  // 2. Find and suspend all associated affiliate links
  const linksQuery = query(
    collection(db, "affiliate_links"),
    where("userId", "==", userId)
  );

  const linksSnapshot = await getDocs(linksQuery);
  linksSnapshot.forEach(linkDoc => {
    batch.update(linkDoc.ref, { 
      status: "suspended",
      updatedAt: serverTimestamp()
    });
  });

  // 3. Commit all changes
  return await batch.commit();
}

/**
 * Returns bank details and profile info.
 */
export async function getAffiliateProfile(userId: string) {
  const snap = await getDoc(doc(db, "affiliateProfiles", userId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Calculates real-time performance stats.
 */
export async function getAffiliateStats(userId: string) {
  const clicksQuery = query(collection(db, "affiliateClicks"), where("referrerId", "==", userId));
  const commsQuery = query(collection(db, "affiliate_commissions"), where("affiliateId", "==", userId));
  
  const [clicksSnap, commsSnap] = await Promise.all([
    getCountFromServer(clicksQuery),
    getDocs(commsQuery)
  ]);

  const commissions = commsSnap.docs.map(d => d.data());
  const totalEarnings = commissions.reduce((acc, curr) => acc + (curr.commissionAmount || 0), 0);
  const totalOrders = commissions.length;

  return {
    totalClicks: clicksSnap.data().count,
    totalOrders,
    totalEarnings
  };
}

/**
 * Returns all users with the affiliate role.
 */
export async function getAllAffiliates() {
  const q = query(collection(db, "users"), where("role", "==", "affiliate"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Returns all payout requests sorted by date.
 */
export async function getAllWithdrawRequests() {
  const q = query(collection(db, "affiliateWithdrawRequests"), orderBy("requestedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Legacy support for fetching all links (admin only).
 */
export async function adminGetAllAffiliateLinks() {
  const snap = await getDocs(collection(db, "affiliate_links"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

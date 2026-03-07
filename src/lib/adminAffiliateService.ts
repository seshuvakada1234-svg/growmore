import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  getDoc,
  deleteDoc, 
  writeBatch,
  serverTimestamp,
  orderBy,
  getCountFromServer
} from "firebase/firestore";
import { initializeFirebase } from "@/firebase";

const { firestore: db } = initializeFirebase();

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
 * Returns bank details and profile info.
 */
export async function getAffiliateProfile(userId: string) {
  const profileRef = doc(db, "affiliateProfiles", userId);
  const snap = await getDoc(profileRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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

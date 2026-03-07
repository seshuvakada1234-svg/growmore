import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  serverTimestamp 
} from "firebase/firestore";
import { initializeFirebase } from "@/firebase";

const { firestore: db } = initializeFirebase();

/**
 * Admin utilities for managing affiliate accounts and links.
 */
export async function adminGetAllAffiliateLinks() {
  const snap = await getDocs(collection(db, "affiliate_links"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function adminGetLinksByUser(userId: string) {
  const q = query(collection(db, "affiliate_links"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function adminGetAllAffiliateProfiles() {
  const q = query(collection(db, "users"), where("role", "==", "affiliate"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Approves a user's affiliate status.
 */
export async function adminApproveAffiliate(userId: string) {
  const userRef = doc(db, "users", userId);
  return await updateDoc(userRef, {
    role: "affiliate",
    affiliateApproved: true,
    approvedAt: serverTimestamp()
  });
}

/**
 * Rejects an affiliate and suspends all their links in a single transaction.
 */
export async function adminRejectAffiliate(userId: string) {
  const batch = writeBatch(db);
  
  // 1. Update user profile
  const userRef = doc(db, "users", userId);
  batch.update(userRef, { affiliateApproved: false });
  
  // 2. Suspend all links
  const linksQuery = query(collection(db, "affiliate_links"), where("userId", "==", userId));
  const linksSnap = await getDocs(linksQuery);
  linksSnap.forEach(linkDoc => {
    batch.update(linkDoc.ref, { status: "suspended" });
  });
  
  return await batch.commit();
}

export async function adminUpdateClicks(linkId: string, clicks: number) {
  return await updateDoc(doc(db, "affiliate_links", linkId), { clicks });
}

export async function adminUpdateCommission(commId: string, data: { status: string, paidAt?: any }) {
  return await updateDoc(doc(db, "affiliate_commissions", commId), data);
}

export async function adminSetLinkStatus(linkId: string, status: "active" | "suspended") {
  return await updateDoc(doc(db, "affiliate_links", linkId), { status });
}

export async function adminDeleteLink(linkId: string) {
  return await deleteDoc(doc(db, "affiliate_links", linkId));
}

'use client';

import { 
  collection, 
  addDoc, 
  getDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  Firestore 
} from "firebase/firestore";
import { initializeFirebase } from "@/firebase";
import { MonterraUser, SharePlatform, MonterraProduct } from "@/types/affiliate.types";

const { firestore: db } = initializeFirebase();

/**
 * 1. Generates a referral link if the user is an approved affiliate.
 */
export function generateShareLink(productSlug: string, user: MonterraUser | null) {
  const baseUrl = `https://monterra.com/plants/${productSlug}`;
  if (user?.affiliateApproved) {
    return `${baseUrl}?ref=${user.uid}`;
  }
  return baseUrl;
}

/**
 * 2. Calculates the potential earning based on price and commission rate.
 */
export function calculateEarning(price: number, commissionPercent: number | undefined) {
  if (!commissionPercent || commissionPercent <= 0) return null;
  return Math.round((price * commissionPercent / 100) * 100) / 100;
}

/**
 * 3. Generates a custom share message.
 */
export function generateShareMessage(product: MonterraProduct, affiliateLink: string, user: MonterraUser | null) {
  const earning = calculateEarning(product.price, product.affiliateCommission);
  if (user?.affiliateApproved && earning) {
    return `Check out this beautiful ${product.name} on Monterra! 🌿\n\n💰 Earn ₹${earning} if someone buys through your link 🌱\n\n${affiliateLink}`;
  }
  return `I found this amazing ${product.name} on Monterra! You should check it out: ${affiliateLink}`;
}

/**
 * 4. Triggers the sharing mechanism for various platforms.
 */
export async function triggerShare(platform: SharePlatform, message: string, link: string, productName: string) {
  switch (platform) {
    case "whatsapp":
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      break;
    case "telegram":
      window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(productName)}`, "_blank");
      break;
    case "facebook":
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
      break;
    case "copy":
    case "instagram":
      await navigator.clipboard.writeText(link);
      return { copied: true };
    default:
      break;
  }
  return { copied: false };
}

/**
 * 5. Captures and logs affiliate clicks from URL parameters.
 */
export async function trackAffiliateClick() {
  if (typeof window === "undefined") return;
  
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  
  if (ref) {
    const existingRef = localStorage.getItem("monterra_referrer");
    if (!existingRef) {
      localStorage.setItem("monterra_referrer", ref);
      
      const landingPage = window.location.pathname;
      const productSlug = landingPage.startsWith('/plants/') ? landingPage.split('/')[2] : 'home';
      
      try {
        await addDoc(collection(db, "affiliateClicks"), {
          referrerId: ref,
          landingPage,
          productSlug,
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to log click", e);
      }
    }
  }
}

/**
 * 6. Utilities for referrer ID management.
 */
export const getStoredReferrer = () => typeof window !== "undefined" ? localStorage.getItem("monterra_referrer") : null;
export const clearStoredReferrer = () => typeof window !== "undefined" ? localStorage.removeItem("monterra_referrer") : null;

/**
 * 8. Saves or retrieves an existing unique affiliate link.
 */
export async function saveAffiliateLink(userId: string, originalUrl: string, affiliateUrl: string) {
  const q = query(
    collection(db, "affiliate_links"), 
    where("userId", "==", userId), 
    where("originalUrl", "==", originalUrl)
  );
  
  const snap = await getDocs(q);
  if (!snap.empty) {
    const doc = snap.docs[0];
    return { affiliateUrl: doc.data().affiliateUrl, isNew: false };
  }
  
  await addDoc(collection(db, "affiliate_links"), {
    userId,
    originalUrl,
    affiliateUrl,
    createdAt: serverTimestamp(),
    clicks: 0,
    status: "active"
  });
  
  return { affiliateUrl, isNew: true };
}

/**
 * 9. Records a commission entry after a successful purchase.
 */
export async function saveCommissionRecord({ 
  productId, 
  orderId, 
  orderValue, 
  commissionRate 
}: { 
  productId: string, 
  orderId: string, 
  orderValue: number, 
  commissionRate: number 
}) {
  const referrerId = getStoredReferrer();
  if (!referrerId) return;

  const commissionAmount = Math.round((orderValue * commissionRate / 100) * 100) / 100;
  
  try {
    await addDoc(collection(db, "affiliate_commissions"), {
      affiliateId: referrerId,
      productId,
      orderId,
      orderValue,
      commissionRate,
      commissionAmount,
      status: "pending",
      createdAt: serverTimestamp()
    });
    
    // Attribution completed
    clearStoredReferrer();
  } catch (e) {
    console.error("Failed to save commission record", e);
  }
}

/**
 * 10. Checks if a user is an approved affiliate.
 */
export async function isApprovedAffiliate(uid: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() && snap.data().affiliateApproved === true;
}

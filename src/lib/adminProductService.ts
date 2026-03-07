'use client';

import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MonterraProduct } from "@/types/affiliate.types";

/**
 * Admin utility to create a new product with commission validation.
 */
export async function adminCreateProduct(productData: Omit<MonterraProduct, 'id' | 'createdAt'>) {
  // Validations
  if (productData.affiliateCommission < 0 || productData.affiliateCommission > 100) {
    throw new Error("Commission rate must be between 0 and 100.");
  }

  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(productData.slug)) {
    throw new Error("Invalid slug format. Use lowercase letters, numbers, and hyphens only.");
  }

  return await addDoc(collection(db, "products"), {
    ...productData,
    createdAt: serverTimestamp()
  });
}

/**
 * Admin utility to update commission rates for a product.
 */
export async function adminUpdateCommissionRate(productId: string, commissionPercent: number) {
  const productRef = doc(db, "products", productId);
  return await updateDoc(productRef, {
    affiliateCommission: commissionPercent
  });
}

/**
 * Admin utility to fetch all products.
 */
export async function adminGetAllProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Admin utility to delete a product.
 */
export async function adminDeleteProduct(productId: string) {
  return await deleteDoc(doc(db, "products", productId));
}

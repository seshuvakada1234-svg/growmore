"use client";

/**
 * useCart — Centralized persistent cart hook
 *
 * Guest  → localStorage only
 * Login  → mergeGuestCart() runs once, then Firestore only
 * Logout → stop listener, back to localStorage
 * Real-time → onSnapshot syncs across tabs/devices for logged-in users
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  getDocs, writeBatch, serverTimestamp, getFirestore,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_KEY        = "plantshop_cart";
const LS_MERGED_KEY = "plantshop_cart_merged"; // flag: guest cart already merged

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  quantity: number;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
export function lsGetCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    // Normalize old format { productId, plantId } → { id }
    return raw.map((item: any) => ({
      id:       item.id || item.productId || item.plantId,
      quantity: item.quantity || 1,
    })).filter((i: CartItem) => !!i.id);
  } catch { return []; }
}

export function lsSetCart(items: CartItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
  } catch { /* ignore */ }
}

export function lsClearCart() {
  try {
    localStorage.removeItem(LS_KEY);
    window.dispatchEvent(new Event("cart-updated"));
  } catch { /* ignore */ }
}

// ── Firestore path helpers ────────────────────────────────────────────────────
function cartCol(db: any, uid: string) {
  return collection(db, "users", uid, "cart");
}
function cartDoc(db: any, uid: string, productId: string) {
  return doc(db, "users", uid, "cart", productId);
}

// ── Main Hook ─────────────────────────────────────────────────────────────────
export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [userId,    setUserId]    = useState<string | null>(null);
  const [db,        setDb]        = useState<any>(null);
  const unsubRef                  = useRef<(() => void) | null>(null);
  const mergedRef                 = useRef(false); // prevent double-merge in StrictMode

  // ── Init Firebase + Auth listener ──────────────────────────────────────────
  useEffect(() => {
    let unsubAuth: (() => void) | null = null;

    (async () => {
      try {
        const { app } = await import("@/lib/firebase");
        const firestoreDb = getFirestore(app);
        const auth        = getAuth(app);
        setDb(firestoreDb);

        unsubAuth = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // ── Logged in ──────────────────────────────────────────────────
            setUserId(user.uid);

            // Merge guest cart ONCE per login session
            if (!mergedRef.current) {
              mergedRef.current = true;
              await mergeGuestCart(firestoreDb, user.uid);
            }

            // Start real-time Firestore listener
            startListener(firestoreDb, user.uid);
          } else {
            // ── Logged out ─────────────────────────────────────────────────
            stopListener();
            mergedRef.current = false;
            setUserId(null);
            setCartItems(lsGetCart());
          }
        });
      } catch (err) {
        console.error("useCart init error:", err);
      }
    })();

    return () => {
      unsubAuth?.();
      stopListener();
    };
  }, []);

  // ── Listen to localStorage events (guest users only) ──────────────────────
  useEffect(() => {
    if (userId) return;
    const handler = () => setCartItems(lsGetCart());
    window.addEventListener("cart-updated", handler);
    setCartItems(lsGetCart()); // initial load
    return () => window.removeEventListener("cart-updated", handler);
  }, [userId]);

  // ── Real-time Firestore listener ──────────────────────────────────────────
  const startListener = useCallback((firestoreDb: any, uid: string) => {
    stopListener();
    const unsub = onSnapshot(cartCol(firestoreDb, uid), (snap) => {
      const items: CartItem[] = snap.docs.map((d) => ({
        id:       d.id,
        quantity: d.data().quantity || 1,
      }));
      setCartItems(items);
      // Keep localStorage in sync so CheckoutPage can still read it
      lsSetCart(items);
    });
    unsubRef.current = unsub;
  }, []);

  const stopListener = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
  }, []);

  // ── mergeGuestCart: runs once after login ─────────────────────────────────
  const mergeGuestCart = useCallback(async (firestoreDb: any, uid: string) => {
    const guestItems = lsGetCart();
    if (guestItems.length === 0) return;

    try {
      // Get existing Firestore cart to avoid overwriting
      const snap     = await getDocs(cartCol(firestoreDb, uid));
      const existing: Record<string, number> = {};
      snap.docs.forEach((d) => { existing[d.id] = d.data().quantity || 1; });

      // Merge: add guest quantities on top of Firestore quantities
      const batch = writeBatch(firestoreDb);
      guestItems.forEach(({ id, quantity }) => {
        if (!id) return;
        batch.set(cartDoc(firestoreDb, uid, id), {
          productId: id,
          quantity:  (existing[id] || 0) + quantity,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();

      // Clear guest localStorage cart after successful merge
      lsClearCart();
    } catch (err) {
      console.error("Cart merge error:", err);
    }
  }, []);

  // ── addToCart ─────────────────────────────────────────────────────────────
  // Logged-in  → writes directly to Firestore (onSnapshot updates UI)
  // Guest      → writes to localStorage
  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    if (userId && db) {
      // ── Firestore path ──────────────────────────────────────────────────
      try {
        const existing = cartItems.find((i) => i.id === productId);
        await setDoc(cartDoc(db, userId, productId), {
          productId,
          quantity:  (existing?.quantity || 0) + quantity,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        // onSnapshot will update cartItems automatically
      } catch (err) {
        console.error("addToCart Firestore error:", err);
      }
    } else {
      // ── localStorage path ───────────────────────────────────────────────
      const cart = lsGetCart();
      const idx  = cart.findIndex((i) => i.id === productId);
      if (idx !== -1) {
        cart[idx].quantity += quantity;
      } else {
        cart.push({ id: productId, quantity });
      }
      lsSetCart(cart);
    }
  }, [userId, db, cartItems]);

  // ── updateQty ─────────────────────────────────────────────────────────────
  const updateQty = useCallback(async (productId: string, delta: number) => {
    const existing = cartItems.find((i) => i.id === productId);
    const newQty   = Math.max(1, (existing?.quantity || 1) + delta);

    if (userId && db) {
      try {
        await setDoc(cartDoc(db, userId, productId), {
          productId, quantity: newQty, updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error("updateQty Firestore error:", err);
      }
    } else {
      const cart = lsGetCart();
      const idx  = cart.findIndex((i) => i.id === productId);
      if (idx !== -1) { cart[idx].quantity = newQty; lsSetCart(cart); }
    }
  }, [userId, db, cartItems]);

  // ── removeFromCart ────────────────────────────────────────────────────────
  const removeFromCart = useCallback(async (productId: string) => {
    if (userId && db) {
      try {
        await deleteDoc(cartDoc(db, userId, productId));
      } catch (err) {
        console.error("removeFromCart Firestore error:", err);
      }
    } else {
      lsSetCart(lsGetCart().filter((i) => i.id !== productId));
    }
  }, [userId, db]);

  // ── clearCart ─────────────────────────────────────────────────────────────
  const clearCart = useCallback(async () => {
    if (userId && db) {
      try {
        const snap  = await getDocs(cartCol(db, userId));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.error("clearCart Firestore error:", err);
      }
    } else {
      lsClearCart();
    }
  }, [userId, db]);

  const totalItems = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return {
    cartItems,
    totalItems,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
  };
}
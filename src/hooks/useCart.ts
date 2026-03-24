"use client";

/**
 * useCart — Centralized persistent cart hook
 *
 * Guest  → localStorage only
 * Login  → mergeGuestCart() runs once, then Firestore only
 * Logout → stop listener, back to localStorage
 * Real-time → onSnapshot syncs across tabs/devices for logged-in users
 *
 * FIXES:
 * - updateQty/removeFromCart now read fresh localStorage (no stale closure)
 * - Optimistic UI update for guest users (instant feedback)
 * - removeFromCart guest path fixed to update state immediately
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  getDocs, writeBatch, serverTimestamp, getFirestore,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_KEY        = "plantshop_cart";
const LS_MERGED_KEY = "plantshop_cart_merged";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  quantity: number;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
export function lsGetCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
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
  const mergedRef                 = useRef(false);

  // Keep a ref of cartItems so callbacks always have the latest value
  // without needing cartItems in their dependency arrays (fixes stale closure)
  const cartItemsRef = useRef<CartItem[]>([]);
  useEffect(() => { cartItemsRef.current = cartItems; }, [cartItems]);

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
            setUserId(user.uid);
            if (!mergedRef.current) {
              mergedRef.current = true;
              await mergeGuestCart(firestoreDb, user.uid);
            }
            startListener(firestoreDb, user.uid);
          } else {
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
    setCartItems(lsGetCart());
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
      lsSetCart(items);
    });
    unsubRef.current = unsub;
  }, []);

  const stopListener = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
  }, []);

  // ── mergeGuestCart ────────────────────────────────────────────────────────
  const mergeGuestCart = useCallback(async (firestoreDb: any, uid: string) => {
    const guestItems = lsGetCart();
    if (guestItems.length === 0) return;

    try {
      const snap     = await getDocs(cartCol(firestoreDb, uid));
      const existing: Record<string, number> = {};
      snap.docs.forEach((d) => { existing[d.id] = d.data().quantity || 1; });

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
      lsClearCart();
    } catch (err) {
      console.error("Cart merge error:", err);
    }
  }, []);

  // ── addToCart ─────────────────────────────────────────────────────────────
  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    if (userId && db) {
      try {
        // Use ref to avoid stale closure
        const existing = cartItemsRef.current.find((i) => i.id === productId);
        await setDoc(cartDoc(db, userId, productId), {
          productId,
          quantity:  (existing?.quantity || 0) + quantity,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error("addToCart Firestore error:", err);
      }
    } else {
      // ── Optimistic update for guest ──────────────────────────────────────
      const cart = lsGetCart(); // always read fresh from localStorage
      const idx  = cart.findIndex((i) => i.id === productId);
      if (idx !== -1) {
        cart[idx].quantity += quantity;
      } else {
        cart.push({ id: productId, quantity });
      }
      lsSetCart(cart);
      setCartItems([...cart]); // immediate UI update
    }
  }, [userId, db]);

  // ── updateQty ─────────────────────────────────────────────────────────────
  const updateQty = useCallback(async (productId: string, delta: number) => {
    if (userId && db) {
      // Use ref for latest quantity without stale closure
      const existing = cartItemsRef.current.find((i) => i.id === productId);
      const newQty   = Math.max(1, (existing?.quantity || 1) + delta);
      try {
        await setDoc(cartDoc(db, userId, productId), {
          productId, quantity: newQty, updatedAt: serverTimestamp(),
        }, { merge: true });
        // onSnapshot will update state automatically
      } catch (err) {
        console.error("updateQty Firestore error:", err);
      }
    } else {
      // ── Optimistic update for guest ──────────────────────────────────────
      const cart = lsGetCart(); // fresh read — no stale closure
      const idx  = cart.findIndex((i) => i.id === productId);
      if (idx !== -1) {
        cart[idx].quantity = Math.max(1, cart[idx].quantity + delta);
        lsSetCart(cart);
        setCartItems([...cart]); // immediate UI update
      }
    }
  }, [userId, db]);

  // ── removeFromCart ────────────────────────────────────────────────────────
  const removeFromCart = useCallback(async (productId: string) => {
    if (userId && db) {
      try {
        await deleteDoc(cartDoc(db, userId, productId));
        // onSnapshot will update state automatically
      } catch (err) {
        console.error("removeFromCart Firestore error:", err);
      }
    } else {
      // ── Optimistic update for guest ──────────────────────────────────────
      const cart = lsGetCart().filter((i) => i.id !== productId); // fresh read
      lsSetCart(cart);
      setCartItems([...cart]); // immediate UI update
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
      setCartItems([]); // immediate UI update
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
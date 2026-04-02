"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  getDocs, writeBatch, serverTimestamp, getFirestore,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
// ✅ FIX: Import lsGetCart/lsSetCart/lsClearCart from cartStorage instead of
// re-implementing normalization inline. cartStorage.lsReadCart already handles
// legacy { plantId, productId, qty } → canonical { id, quantity } normalization.
import { lsReadCart as lsGetCart, lsSetCart, lsClearCart, CART_KEY as LS_KEY } from "@/lib/cartStorage";

// ── Constants ─────────────────────────────────────────────────────────────────
const MERGE_FLAG_PREFIX = "plantshop_cart_merged_v1";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  quantity: number;
}

// ── session merge flag helpers ────────────────────────────────────────────────
function mergeFlagKey(uid: string) { return `${MERGE_FLAG_PREFIX}:${uid}`; }
function hasMergedThisSession(uid: string): boolean {
  try { return sessionStorage.getItem(mergeFlagKey(uid)) === "1"; } catch { return false; }
}
function setMergedThisSession(uid: string) {
  try { sessionStorage.setItem(mergeFlagKey(uid), "1"); } catch { /* ignore */ }
}
function clearMergedThisSession(uid: string) {
  try { sessionStorage.removeItem(mergeFlagKey(uid)); } catch { /* ignore */ }
}

// ── Firestore path helpers ────────────────────────────────────────────────────
function cartCol(db: any, uid: string) { return collection(db, "users", uid, "cart"); }
function cartDoc(db: any, uid: string, productId: string) { return doc(db, "users", uid, "cart", productId); }

// ── Main Hook ─────────────────────────────────────────────────────────────────
export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [db, setDb] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const unsubRef = useRef<(() => void) | null>(null);
  const cartItemsRef = useRef<CartItem[]>([]);
  const mergeInFlightRef = useRef<Promise<void> | null>(null);
  const lastUidRef = useRef<string | null>(null);

  useEffect(() => { cartItemsRef.current = cartItems; }, [cartItems]);

  const stopListener = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
  }, []);

  const startListener = useCallback((firestoreDb: any, uid: string) => {
    stopListener();
    const unsub = onSnapshot(cartCol(firestoreDb, uid), (snap) => {
      // ✅ Reads doc ID (d.id) as the product id — correct, d.data().productId is NOT read
      const items: CartItem[] = snap.docs.map((d) => ({
        id: d.id,
        quantity: d.data().quantity || 1,
      }));
      setCartItems(items);
    });
    unsubRef.current = unsub;
  }, [stopListener]);

  const mergeGuestCart = useCallback(async (firestoreDb: any, uid: string) => {
    // ✅ FIX: lsGetCart() = lsReadCart from cartStorage — already normalized
    const guestItems = lsGetCart();
    if (guestItems.length === 0) { setMergedThisSession(uid); return; }

    try {
      const snap = await getDocs(cartCol(firestoreDb, uid));
      const existing: Record<string, number> = {};
      snap.docs.forEach((d) => { existing[d.id] = d.data().quantity || 1; });

      lsClearCart(); // clear guest cart before writing merged result

      const batch = writeBatch(firestoreDb);
      guestItems.forEach(({ id, quantity }) => {
        if (!id) return;
        batch.set(
          cartDoc(firestoreDb, uid, id),
          {
            // ✅ FIX: was { productId: id } — renamed to { id } to match
            //    canonical CartItem shape. The Firestore doc key (d.id) is
            //    always used for lookups, but the body field should be consistent.
            id,
            quantity: (existing[id] || 0) + quantity,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      await batch.commit();
      setMergedThisSession(uid);
    } catch (err) {
      console.error("Cart merge error:", err);
      lsSetCart(guestItems); // rollback guest cart
      throw err;
    }
  }, []);

  // ── Init Firebase + Auth listener ──────────────────────────────────────────
  useEffect(() => {
    let unsubAuth: (() => void) | null = null;

    (async () => {
      try {
        const { app } = await import("@/lib/firebase");
        const firestoreDb = getFirestore(app);
        const auth = getAuth(app);
        setDb(firestoreDb);

        unsubAuth = onAuthStateChanged(auth, async (user) => {
          if (user) {
            const uid = user.uid;
            setUserId(uid);

            if (lastUidRef.current && lastUidRef.current !== uid) {
              mergeInFlightRef.current = null;
            }
            lastUidRef.current = uid;

            if (!hasMergedThisSession(uid)) {
              if (!mergeInFlightRef.current) {
                mergeInFlightRef.current = mergeGuestCart(firestoreDb, uid)
                  .catch(() => { /* mergeGuestCart already logs */ })
                  .finally(() => { mergeInFlightRef.current = null; });
              }
              await mergeInFlightRef.current;
            }

            startListener(firestoreDb, uid);
          } else {
            stopListener();
            if (lastUidRef.current) clearMergedThisSession(lastUidRef.current);
            lastUidRef.current = null;
            mergeInFlightRef.current = null;
            setUserId(null);
            // ✅ FIX: was inline lsGetCart with manual normalization — now uses
            //    cartStorage.lsReadCart which already normalizes legacy formats
            setCartItems(lsGetCart());
          }

          setIsAuthReady(true);
        });
      } catch (err) {
        console.error("useCart init error:", err);
        setIsAuthReady(true);
      }
    })();

    return () => {
      unsubAuth?.();
      stopListener();
    };
  }, [mergeGuestCart, startListener, stopListener]);

  // ── Listen to localStorage events (guest users only) ──────────────────────
  useEffect(() => {
    if (!isAuthReady || userId) return;
    // ✅ FIX: uses lsGetCart from cartStorage (already normalized)
    const handler = () => setCartItems(lsGetCart());
    window.addEventListener("cart-updated", handler);
    setCartItems(lsGetCart());
    return () => window.removeEventListener("cart-updated", handler);
  }, [userId, isAuthReady]);

  // ── addToCart ─────────────────────────────────────────────────────────────
  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    if (userId && db) {
      try {
        const existing = cartItemsRef.current.find((i) => i.id === productId);
        await setDoc(
          cartDoc(db, userId, productId),
          {
            // ✅ FIX: was { productId, quantity, updatedAt } — renamed field to
            //    { id } so Firestore doc body matches CartItem { id, quantity }.
            //    The doc key (d.id) is used for all reads, but body must stay
            //    consistent so any direct Firestore query returns the right shape.
            id: productId,
            quantity: (existing?.quantity || 0) + quantity,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("addToCart Firestore error:", err);
      }
    } else {
      // ✅ FIX: uses lsGetCart/lsSetCart from cartStorage
      const cart = lsGetCart();
      const idx = cart.findIndex((i) => i.id === productId);
      if (idx !== -1) { cart[idx].quantity += quantity; }
      else { cart.push({ id: productId, quantity }); }
      lsSetCart(cart);
      setCartItems([...cart]);
    }
  }, [userId, db]);

  // ── updateQty ─────────────────────────────────────────────────────────────
  const updateQty = useCallback(async (productId: string, delta: number) => {
    if (userId && db) {
      const existing = cartItemsRef.current.find((i) => i.id === productId);
      const newQty = Math.max(1, (existing?.quantity || 1) + delta);
      try {
        await setDoc(
          cartDoc(db, userId, productId),
          {
            // ✅ FIX: was { productId, quantity, updatedAt } — renamed to { id }
            id: productId,
            quantity: newQty,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("updateQty Firestore error:", err);
      }
    } else {
      const cart = lsGetCart();
      const idx = cart.findIndex((i) => i.id === productId);
      if (idx !== -1) {
        cart[idx].quantity = Math.max(1, cart[idx].quantity + delta);
        lsSetCart(cart); // ✅ uses cartStorage writer (dedupes, dispatches event)
        setCartItems([...cart]);
      }
    }
  }, [userId, db]);

  // ── removeFromCart ────────────────────────────────────────────────────────
  const removeFromCart = useCallback(async (productId: string) => {
    if (userId && db) {
      try {
        await deleteDoc(cartDoc(db, userId, productId));
      } catch (err) {
        console.error("removeFromCart Firestore error:", err);
      }
    } else {
      const cart = lsGetCart().filter((i) => i.id !== productId);
      lsSetCart(cart); // ✅ uses cartStorage writer
      setCartItems([...cart]);
    }
  }, [userId, db]);

  // ── clearCart ─────────────────────────────────────────────────────────────
  const clearCart = useCallback(async () => {
    if (userId && db) {
      try {
        const snap = await getDocs(cartCol(db, userId));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.error("clearCart Firestore error:", err);
      }
    } else {
      lsClearCart(); // ✅ uses cartStorage (removes key, dispatches event)
      setCartItems([]);
    }
  }, [userId, db]);

  const totalItems = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return { cartItems, totalItems, addToCart, updateQty, removeFromCart, clearCart };
}
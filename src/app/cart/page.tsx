"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PRODUCTS } from "@/lib/mock-data";
import {
  Trash2, Minus, Plus, ArrowRight,
  ShoppingBag, ShieldCheck, Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFirestore } from "@/firebase";
import { doc, getDoc, collection, onSnapshot, getDocs, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  lsReadCart,
  lsWriteCart,
  migrateLegacyCartKeys,
  lsClearCart,
  CART_KEY,
} from "@/lib/cartStorage";

const LS_KEY = CART_KEY;
const lsGetCart = lsReadCart;

function resolveImage(raw: string | undefined, w = 300): string {
  if (!raw) return "/placeholder.svg";
  if (raw.includes("ik.imagekit.io")) {
    const parts = raw.split("ik.imagekit.io/")[1]?.split("/") ?? [];
    const key = parts.slice(1).join("/");
    if (key) return `/api/image?file=${encodeURIComponent(key)}&w=${w}`;
  }
  return raw;
}

async function mergeGuestCartToFirestore(
  user: { uid: string },
  db: ReturnType<typeof useFirestore>
) {
  if (!db) return;
  const localCart = lsReadCart();
  if (localCart.length === 0) return;

  const cartRef = collection(db, "users", user.uid, "cart");
  const snap = await getDocs(cartRef);

  const existing = new Map<string, number>();
  snap.docs.forEach((d) => {
    existing.set(d.id, d.data().quantity || 1);
  });

  for (const item of localCart) {
    const existingQty = existing.get(item.id) || 0;
    await setDoc(
      doc(db, "users", user.uid, "cart", item.id),
      { id: item.id, quantity: existingQty + item.quantity },
      { merge: true }
    );
  }

  lsClearCart();
}

export default function CartPage() {
  const db = useFirestore();
  const [enrichedItems, setEnrichedItems] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const dbRef = useRef(db);
  dbRef.current = db;

  const enrichRunRef  = useRef<number>(0);
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  const enrichCartItems = useCallback(
    async (rawItems: { id: string; quantity: number }[]) => {
      const runId = ++enrichRunRef.current;
      console.log("[Cart] Enrich run started, runId:", runId, "items:", rawItems);

      if (rawItems.length === 0) {
        if (runId !== enrichRunRef.current) return;
        setEnrichedItems([]);
        setIsLoaded(true);
        return;
      }

      try {
        const liveDb = dbRef.current;
        if (!liveDb) {
          console.warn("[Cart] DB not ready, retrying...");
          setTimeout(() => {
            enrichCartItems(rawItems);
          }, 100);
          return;
        }

        const enriched = await Promise.all(
          rawItems.map(async ({ id, quantity }) => {
            try {
              const snap = await getDoc(doc(liveDb, "products", id));
              if (snap.exists()) {
                const data = snap.data();
                const raw = data.images?.[0] || data.imageUrl || "";
                console.log(`[Cart] Firestore product: id=${id} qty=${quantity} price=${data.price}`);
                return {
                  id: snap.id,
                  name: data.name || "Unknown Plant",
                  price: data.price || 0,
                  oldPrice: data.oldPrice || null,
                  category: data.category || "",
                  imageUrl: resolveImage(raw, 300),
                  quantity,
                };
              }
            } catch (e) {
              console.warn(`[Cart] Firestore product fetch failed for ${id}`, e);
            }
            const mock = PRODUCTS.find((p) => p.id === id);
            if (mock) {
              console.log(`[Cart] Using mock for: id=${id} qty=${quantity}`);
              return { ...mock, imageUrl: resolveImage(mock.imageUrl, 300), quantity };
            }
            return null;
          })
        );

        if (runId !== enrichRunRef.current) {
          console.log("[Cart] Enrich runId", runId, "superseded — discarding");
          return;
        }
        setEnrichedItems(enriched.filter(Boolean));
      } catch (e) {
        console.error("[Cart] Enrich error:", e);
        if (runId !== enrichRunRef.current) return;
        setEnrichedItems([]);
      }

      setIsLoaded(true);
    },
    []
  );

  useEffect(() => {
    migrateLegacyCartKeys();
    console.log("[Cart] localStorage after migration:", lsGetCart());
  }, []);

  useEffect(() => {
    if (!db) return;
    setIsLoaded(false);
    setAuthChecked(false);

    let cancelled = false;
    const { app } = require("@/lib/firebase");
    const auth = getAuth(app);

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      unsubRef.current?.();
      unsubRef.current = null;

      const nextId = user?.uid ?? null;
      if (lastUserIdRef.current !== undefined && lastUserIdRef.current !== nextId) {
        console.log("[Cart] Identity changed:", lastUserIdRef.current, "→", nextId);
        setIsLoaded(false);
        setEnrichedItems([]);
      }
      lastUserIdRef.current = nextId;

      setAuthChecked(true);
      console.log("[Cart] Auth resolved. User:", user?.uid ?? "guest");

      if (user) {
        // ✅ Merge guest localStorage cart into Firestore before attaching listener
        await mergeGuestCartToFirestore(user, db);

        console.log("[Cart] Attaching Firestore cart listener for user:", user.uid);
        const cartCol = collection(db, "users", user.uid, "cart");
        const unsubCart = onSnapshot(cartCol, (snap) => {
          if (cancelled) return;
          const items = snap.docs.map((d) => ({
            id: d.id,
            quantity: d.data().quantity || 1,
          }));
          console.log("[Cart] Firestore snapshot received:", items);
          enrichCartItems(items);
        });
        unsubRef.current = unsubCart;

      } else {
        console.log("[Cart] Guest user — reading localStorage");
        const items = lsGetCart();
        console.log("[Cart] localStorage cart:", items);

        const handleStorageUpdate = () => {
          if (!cancelled) {
            const latest = lsGetCart();
            console.log("[Cart] cart-updated event, new items:", latest);
            enrichCartItems(latest);
          }
        };

        window.addEventListener("cart-updated", handleStorageUpdate);
        unsubRef.current = () => window.removeEventListener("cart-updated", handleStorageUpdate);
        enrichCartItems(items);
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [db, enrichCartItems]);

  const subtotal = enrichedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal === 0 ? 0 : subtotal > 999 ? 0 : 150;
  const total    = subtotal + shipping;

  const updateQty = useCallback(
    async (productId: string, delta: number) => {
      const { app } = require("@/lib/firebase");
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (user) {
        const { doc: fsDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const existing = enrichedItems.find((i) => i.id === productId);
        const newQty = Math.max(1, (existing?.quantity || 1) + delta);
        console.log(`[Cart] updateQty Firestore: id=${productId} newQty=${newQty}`);
        await setDoc(
          fsDoc(db, "users", user.uid, "cart", productId),
          {
            id: productId,
            quantity: newQty,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        const cart = lsGetCart();
        const idx = cart.findIndex((i) => i.id === productId);
        if (idx !== -1) {
          cart[idx].quantity = Math.max(1, cart[idx].quantity + delta);
          lsWriteCart(cart);
          console.log(`[Cart] updateQty localStorage: id=${productId} newQty=${cart[idx].quantity}`);
        }
      }
    },
    [db, enrichedItems]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      const { app } = require("@/lib/firebase");
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (user) {
        const { doc: fsDoc, deleteDoc } = await import("firebase/firestore");
        console.log(`[Cart] removeFromCart Firestore: id=${productId}`);
        await deleteDoc(fsDoc(db, "users", user.uid, "cart", productId));
      } else {
        const cart = lsGetCart().filter((i) => i.id !== productId);
        lsWriteCart(cart);
        console.log(`[Cart] removeFromCart localStorage: id=${productId}`);
      }
    },
    [db]
  );

  if (!authChecked || !isLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your cart...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (enrichedItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="h-24 w-24 bg-accent rounded-full flex items-center justify-center mx-auto text-primary">
              <ShoppingBag className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-headline font-extrabold text-primary">
              Your cart is empty
            </h1>
            <p className="text-muted-foreground">
              Looks like you haven&apos;t added any greenery to your cart yet.
            </p>
            <Link href="/plants" className="block">
              <Button className="rounded-full px-8 py-6 text-lg font-bold w-full">
                Start Shopping
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-headline font-extrabold text-primary mb-8">
            Shopping Cart
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              {enrichedItems.map((item) => (
                <Card
                  key={`cart-item-${item.id}`}
                  className="rounded-2xl border-none shadow-sm overflow-hidden bg-white"
                >
                  <CardContent className="p-4 flex gap-4">
                    <div className="relative h-24 w-24 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      {item.imageUrl && item.imageUrl !== "/placeholder.svg" ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-3xl">🌿</div>
                      )}
                    </div>

                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between">
                        <h3 className="font-headline font-bold text-lg text-primary">{item.name}</h3>
                        <span className="font-bold text-lg text-primary">₹{item.price * item.quantity}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.category}</p>

                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center border rounded-full bg-muted/50 h-8 px-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQty(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQty(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Link href="/plants" className="inline-flex items-center gap-2 text-primary font-bold hover:underline py-4">
                <ShoppingBag className="h-4 w-4" /> Continue Shopping
              </Link>
            </div>

            <div className="lg:col-span-1 sticky top-24">
              <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <h3 className="text-xl font-headline font-bold text-primary">Order Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-bold text-emerald-600">{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
                    </div>
                    {shipping > 0 && (
                      <p className="text-xs text-muted-foreground bg-accent p-3 rounded-xl border border-primary/10">
                        Add ₹{999 - subtotal} more for FREE delivery!
                      </p>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-3xl font-extrabold text-primary">₹{total}</span>
                  </div>
                  <Link href="/checkout" className="block">
                    <Button className="w-full h-14 rounded-full text-lg font-bold gap-2">
                      Proceed to Checkout <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <div className="flex items-center justify-center gap-2 pt-4 opacity-50">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-medium">Secure Payment Guaranteed</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
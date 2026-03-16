"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PRODUCTS } from "@/lib/mock-data";
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

// ── Helper: resolve product image → proxy URL ────────────────────────────────
function resolveImage(raw: string | undefined, w = 300): string {
  if (!raw) return "/placeholder.svg";
  if (raw.includes("ik.imagekit.io")) {
    const parts = raw.split("ik.imagekit.io/")[1]?.split("/") ?? [];
    const key = parts.slice(1).join("/");
    if (key) return `/api/image?file=${encodeURIComponent(key)}&w=${w}`;
  }
  return raw;
}

export default function CartPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadCart = useCallback(async () => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("plantshop_cart") || "[]");

      // Group by id and sum quantities
      const grouped = savedCart.reduce((acc: any, cartItem: any) => {
        const id = cartItem.id || cartItem.productId || cartItem.plantId;
        if (!id) return acc;
        if (acc[id]) {
          acc[id].quantity += cartItem.quantity || 1;
        } else {
          acc[id] = { id, quantity: cartItem.quantity || 1 };
        }
        return acc;
      }, {});

      const ids = Object.keys(grouped);
      if (ids.length === 0) {
        setItems([]);
        setIsLoaded(true);
        return;
      }

      // ── Fetch each product from Firestore (supports new R2 products) ──────
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const firebaseModule = await import("@/lib/firebase");
      // support both named export `app` and default export
      const app = (firebaseModule as any).app || (firebaseModule as any).default;
      const db = getFirestore(app);

      const enrichedItems = await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "products", id));
            if (snap.exists()) {
              const data = snap.data();
              const raw = data.images?.[0] || data.imageUrl || "";
              return {
                id: snap.id,
                name: data.name || "Unknown Plant",
                price: data.price || 0,
                oldPrice: data.oldPrice || null,
                category: data.category || "",
                imageUrl: resolveImage(raw, 300),
                quantity: grouped[id].quantity,
              };
            }
          } catch {
            // Firestore fetch failed — fall through to mock data
          }

          // Fallback: check mock data (for old seeded products)
          const mock = PRODUCTS.find((p) => p.id === id);
          if (mock) {
            return {
              ...mock,
              imageUrl: resolveImage(mock.imageUrl, 300),
              quantity: grouped[id].quantity,
            };
          }

          return null;
        })
      );

      setItems(enrichedItems.filter(Boolean));
    } catch (e) {
      console.error("Cart load error:", e);
      setItems([]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadCart();
    window.addEventListener("cart-updated", loadCart);
    return () => window.removeEventListener("cart-updated", loadCart);
  }, [loadCart]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal === 0 ? 0 : subtotal > 999 ? 0 : 150;
  const total = subtotal + shipping;

  const updateQty = (id: string, delta: number) => {
    const cart = JSON.parse(localStorage.getItem("plantshop_cart") || "[]");
    const idx = cart.findIndex((i: any) => (i.id || i.productId || i.plantId) === id);
    if (idx !== -1) {
      const newQty = Math.max(1, (cart[idx].quantity || 1) + delta);
      cart[idx] = { id, quantity: newQty };
      localStorage.setItem("plantshop_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
    }
  };

  const removeItem = (id: string) => {
    const cart = JSON.parse(localStorage.getItem("plantshop_cart") || "[]");
    const updated = cart.filter((i: any) => (i.id || i.productId || i.plantId) !== id);
    localStorage.setItem("plantshop_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-primary font-bold">Loading your cart...</div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="h-24 w-24 bg-accent rounded-full flex items-center justify-center mx-auto text-primary">
              <ShoppingBag className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-headline font-extrabold text-primary">Your cart is empty</h1>
            <p className="text-muted-foreground">Looks like you haven't added any greenery to your cart yet.</p>
            <Link href="/plants" className="block">
              <Button className="rounded-full px-8 py-6 text-lg font-bold w-full">Start Shopping</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Cart with items ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-headline font-extrabold text-primary mb-8">Shopping Cart</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={`cart-item-${item.id}`} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-4 flex gap-4">
                    <div className="relative h-24 w-24 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      {item.imageUrl && item.imageUrl !== "/placeholder.svg" ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => updateQty(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => updateQty(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(item.id)}
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

            {/* Order Summary */}
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
                      <span className="font-bold text-emerald-600">
                        {shipping === 0 ? "FREE" : `₹${shipping}`}
                      </span>
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
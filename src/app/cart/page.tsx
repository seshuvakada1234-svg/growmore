
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

export default function CartPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadCart = useCallback(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      
      // Deduplicate items by ID to prevent key collisions
      const grouped = savedCart.reduce((acc: any, cartItem: any) => {
        const id = cartItem.id || cartItem.productId || cartItem.plantId;
        if (!id) return acc;
        if (acc[id]) {
          acc[id].quantity += (cartItem.quantity || 1);
        } else {
          acc[id] = { id, quantity: cartItem.quantity || 1 };
        }
        return acc;
      }, {});

      const enrichedItems = Object.values(grouped).map((cartItem: any) => {
        const product = PRODUCTS.find(p => p.id === cartItem.id);
        if (product) {
          return { ...product, quantity: cartItem.quantity };
        }
        return null;
      }).filter(Boolean);
      
      setItems(enrichedItems);
    } catch (e) {
      setItems([]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadCart();
    window.addEventListener('cart-updated', loadCart);
    return () => window.removeEventListener('cart-updated', loadCart);
  }, [loadCart]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal === 0 ? 0 : subtotal > 1500 ? 0 : 150;
  const total = subtotal + shipping;

  const updateQty = (id: string, delta: number) => {
    const cart = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
    const existingIndex = cart.findIndex((i: any) => (i.id || i.productId || i.plantId) === id);
    
    if (existingIndex !== -1) {
      const newQty = Math.max(1, (cart[existingIndex].quantity || 1) + delta);
      // Standardize to 'id'
      cart[existingIndex] = { id, quantity: newQty };
      localStorage.setItem('plantshop_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
    }
  };

  const removeItem = (id: string) => {
    const cart = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
    const updatedCart = cart.filter((i: any) => (i.id || i.productId || i.plantId) !== id);
    localStorage.setItem('plantshop_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-headline font-extrabold text-primary mb-8">Shopping Cart</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <Card key={`cart-item-${item.id}`} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-4 flex gap-4">
                    <div className="relative h-24 w-24 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
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
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.id)}>
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

            {/* Summary */}
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
                        Add ₹{1500 - subtotal} more for FREE delivery!
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

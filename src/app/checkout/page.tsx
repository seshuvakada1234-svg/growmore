
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingBag, ChevronLeft, CreditCard, Banknote, Wallet, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc, increment, addDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { PRODUCTS } from "@/lib/mock-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      const enriched = stored.map((item: any) => {
        const product = PRODUCTS.find(p => p.id === (item.id || item.productId));
        return product ? { ...product, quantity: item.quantity } : null;
      }).filter(Boolean);
      setCartItems(enriched);
    } catch (e) {
      setCartItems([]);
    }
  }, []);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 1500 ? 0 : 150;
  const total = subtotal + shipping;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    setIsSubmitting(true);

    const affiliateRefId = localStorage.getItem('affiliate_ref');
    const isSelfReferral = affiliateRefId === user.uid;
    const finalReferrerId = isSelfReferral ? null : affiliateRefId;

    try {
      let calculatedCommission = 0;
      if (finalReferrerId) {
        const productPromises = cartItems.map(item => getDoc(doc(db, 'products', item.id)));
        const productSnaps = await Promise.all(productPromises);
        
        cartItems.forEach((item, idx) => {
          const snap = productSnaps[idx];
          if (snap?.exists()) {
            const prodData = snap.data();
            const rate = prodData.affiliateCommission || 10;
            calculatedCommission += (item.price * item.quantity * (rate / 100));
          }
        });
      }

      const orderId = `GS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const globalOrderRef = doc(db, 'orders', orderId);
      const userOrderRef = doc(db, 'users', user.uid, 'orders', orderId);
      
      const orderData = {
        id: orderId,
        userId: user.uid,
        customerName: user.displayName || "Customer",
        customerEmail: user.email || "N/A",
        totalAmount: total,
        status: "Pending",
        referrerUserId: finalReferrerId,
        commissionAmount: calculatedCommission,
        rejectedSelfReferral: isSelfReferral,
        items: cartItems.map(i => ({ productId: i.id, name: i.name, qty: i.quantity, price: i.price })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      setDoc(globalOrderRef, orderData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: globalOrderRef.path, operation: 'create', requestResourceData: orderData }));
      });

      setDoc(userOrderRef, orderData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userOrderRef.path, operation: 'create', requestResourceData: orderData }));
      });

      // attribution logic - write to root level commissions collection
      if (finalReferrerId && calculatedCommission > 0) {
        const affiliateProfileRef = doc(db, 'users', finalReferrerId);
        updateDoc(affiliateProfileRef, {
          totalEarnings: increment(calculatedCommission),
          totalReferrals: increment(1),
          updatedAt: serverTimestamp()
        });

        // FIXED: Log to root level affiliateCommissions collection
        await addDoc(collection(db, 'affiliateCommissions'), {
          orderId,
          affiliateId: finalReferrerId,
          amount: calculatedCommission,
          createdAt: serverTimestamp()
        });
      }

      toast({ title: "Order Placed! 🌿", description: "Success! Your order is being processed." });
      localStorage.removeItem('plantshop_cart');
      window.dispatchEvent(new Event('cart-updated'));
      router.push("/orders");

    } catch (error) {
      toast({ title: "Order Failed", description: "Try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center space-y-6">
            <div className="h-24 w-24 bg-accent rounded-full flex items-center justify-center mx-auto text-primary"><ShoppingBag className="h-12 w-12" /></div>
            <h2 className="text-2xl font-headline font-bold text-primary">Empty Cart</h2>
            <Link href="/plants"><Button className="rounded-full">Start Shopping</Button></Link>
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
        <div className="container mx-auto px-4 max-w-5xl">
          <Link href="/cart" className="inline-flex items-center gap-1 text-primary font-bold mb-6 hover:underline">
            <ChevronLeft className="h-4 w-4" /> Back to Cart
          </Link>
          <h1 className="text-3xl font-headline font-extrabold text-primary mb-10">Checkout</h1>
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-2xl font-headline font-bold text-primary">Shipping</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>First Name</Label><Input required className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input required className="rounded-xl" /></div>
                </div>
                <div className="space-y-2"><Label>Full Address</Label><Input required className="rounded-xl" /></div>
              </div>
            </div>
            <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden p-8 sticky top-24">
              <h3 className="text-2xl font-headline font-bold text-primary mb-6">Summary</h3>
              <div className="border-t pt-6 space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span></div>
                <div className="flex justify-between text-xl font-headline font-extrabold pt-4 border-t text-primary"><span>Total</span><span>₹{total}</span></div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-full text-lg font-bold mt-6">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Place Order Now"}
              </Button>
            </Card>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

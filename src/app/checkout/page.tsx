
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

    // 1. Security: Identify Referrer & Prevent Self-Referral
    const affiliateRefId = localStorage.getItem('affiliate_ref');
    const isSelfReferral = affiliateRefId === user.uid;
    const finalReferrerId = isSelfReferral ? null : affiliateRefId;

    try {
      // 2. Secure Commission Engine (Fetch Rates from Source of Truth)
      let calculatedCommission = 0;
      if (finalReferrerId) {
        const productPromises = cartItems.map(item => getDoc(doc(db, 'products', item.id)));
        const productSnaps = await Promise.all(productPromises);
        
        cartItems.forEach((item, idx) => {
          const snap = productSnaps[idx];
          if (snap.exists()) {
            const prodData = snap.data();
            const rate = prodData.affiliateCommission || 10; // Default to 10%
            calculatedCommission += (item.price * item.quantity * (rate / 100));
          }
        });
      }

      // 3. Prepare Multi-Record Transaction Data
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

      // 4. Persistence
      // A. Global Order (Admin Visible)
      setDoc(globalOrderRef, orderData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: globalOrderRef.path, operation: 'create', requestResourceData: orderData }));
      });

      // B. User Private Order
      setDoc(userOrderRef, orderData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userOrderRef.path, operation: 'create', requestResourceData: orderData }));
      });

      // C. Attribution Logic (Only if valid external referral)
      if (finalReferrerId && calculatedCommission > 0) {
        const affiliateProfileRef = doc(db, 'users', finalReferrerId);
        updateDoc(affiliateProfileRef, {
          totalEarnings: increment(calculatedCommission),
          totalReferrals: increment(1),
          updatedAt: serverTimestamp()
        });

        // Audit Log for Commission
        addDoc(collection(db, 'affiliateCommissions'), {
          orderId,
          affiliateId: finalReferrerId,
          amount: calculatedCommission,
          createdAt: serverTimestamp()
        });
      }

      toast({
        title: "Order Placed! 🌿",
        description: isSelfReferral ? "Order successful. (Self-referral detected: no commission)" : "Your plants are being prepared for shipping.",
      });

      localStorage.removeItem('plantshop_cart');
      window.dispatchEvent(new Event('cart-updated'));
      router.push("/orders");

    } catch (error) {
      console.error("Order process error", error);
      toast({ title: "Order Failed", description: "Payment could not be processed. Try again.", variant: "destructive" });
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
            <div className="h-24 w-24 bg-accent rounded-full flex items-center justify-center mx-auto text-primary">
              <ShoppingBag className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-headline font-bold text-primary">Your cart is empty</h2>
            <Link href="/plants"><Button className="rounded-full px-8">Start Shopping</Button></Link>
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
                <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm">1</span>
                  Shipping Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>First Name</Label><Input required className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input required className="rounded-xl" /></div>
                </div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder="+91" required className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Full Address</Label><Input placeholder="Street, Landmark" required className="rounded-xl" /></div>
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm">2</span>
                  Payment Method
                </h2>
                <RadioGroup defaultValue="card" className="grid gap-4">
                  <Label htmlFor="card" className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted cursor-pointer hover:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all">
                    <div className="flex items-center gap-4">
                      <CreditCard className="h-6 w-6 text-primary" />
                      <div className="space-y-1"><span className="font-bold">Credit / Debit Card</span><p className="text-xs text-muted-foreground">Visa, Mastercard, RuPay</p></div>
                    </div>
                    <RadioGroupItem value="card" id="card" />
                  </Label>
                  <Label htmlFor="upi" className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted cursor-pointer hover:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all">
                    <div className="flex items-center gap-4">
                      <Wallet className="h-6 w-6 text-primary" />
                      <div className="space-y-1"><span className="font-bold">UPI</span><p className="text-xs text-muted-foreground">Google Pay, PhonePe</p></div>
                    </div>
                    <RadioGroupItem value="upi" id="upi" />
                  </Label>
                </RadioGroup>
              </div>
            </div>

            <div>
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden sticky top-24">
                <CardContent className="p-8 space-y-6">
                  <h3 className="text-2xl font-headline font-bold text-primary">Order Summary</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-6 space-y-3 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{subtotal}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="text-emerald-600 font-bold">{shipping === 0 ? "FREE" : `₹${shipping}`}</span></div>
                    <div className="flex justify-between text-xl font-headline font-extrabold pt-4 border-t text-primary"><span>Total</span><span>₹{total}</span></div>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-full text-lg font-bold">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Place Order Now"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

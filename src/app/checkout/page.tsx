
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

    // 1. Referral Check (Self-commission prevention)
    const storedRef = localStorage.getItem('affiliate_ref');
    const isSelfReferral = storedRef === user.uid;
    const referrerUserId = isSelfReferral ? null : storedRef;

    try {
      // 2. Secure Commission Calculation
      // Fetch fresh commission rates from Firestore for each product
      let calculatedCommission = 0;
      if (referrerUserId) {
        const productPromises = cartItems.map(item => getDoc(doc(db, 'products', item.id)));
        const productSnaps = await Promise.all(productPromises);
        
        cartItems.forEach((item, index) => {
          const snap = productSnaps[index];
          if (snap.exists()) {
            const data = snap.data();
            const rate = data.affiliateCommission || 10; // Default 10%
            calculatedCommission += (item.price * item.quantity * (rate / 100));
          }
        });
      }

      // 3. Prepare Order Data
      const orderId = `GS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const userOrderRef = doc(db, 'users', user.uid, 'orders', orderId);
      const globalOrderRef = doc(db, 'orders', orderId);
      
      const orderData = {
        id: orderId,
        userId: user.uid,
        customerName: user.displayName || "Customer",
        customerEmail: user.email || "N/A",
        orderDate: new Date().toISOString(),
        totalAmount: total,
        status: "Pending",
        paymentMethod: "Credit Card",
        referrerUserId: referrerUserId || null,
        commissionAmount: calculatedCommission,
        commissionStatus: calculatedCommission > 0 ? "earned" : "none",
        rejectedSelfReferral: isSelfReferral,
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 4. Save to Firestore (Non-blocking writes)
      
      // A. Save Private Order
      setDoc(userOrderRef, orderData).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userOrderRef.path, operation: 'create', requestResourceData: orderData }));
      });

      // B. Save Global Admin Order
      setDoc(globalOrderRef, orderData).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: globalOrderRef.path, operation: 'create', requestResourceData: orderData }));
      });

      // C. Update Affiliate Stats & Logs if applicable
      if (referrerUserId && calculatedCommission > 0) {
        const affiliateRef = doc(db, 'users', referrerUserId);
        const commissionLogRef = collection(db, 'affiliateCommissions');

        // Increment earnings and referrals on affiliate profile
        updateDoc(affiliateRef, {
          totalEarnings: increment(calculatedCommission),
          totalReferrals: increment(1),
          updatedAt: serverTimestamp()
        }).catch(error => console.error("Affiliate update error:", error));

        // Create commission log
        addDoc(commissionLogRef, {
          orderId,
          affiliateId: referrerUserId,
          commissionAmount: calculatedCommission,
          createdAt: serverTimestamp()
        }).catch(error => console.error("Commission log error:", error));
      }

      // 5. Success handling
      toast({
        title: "Order Placed!",
        description: isSelfReferral 
          ? "Your order was placed successfully. (Self-referral detected: commission skipped)" 
          : "Your green friends will be with you shortly.",
      });

      // Clear cart
      localStorage.removeItem('plantshop_cart');
      window.dispatchEvent(new Event('cart-updated'));
      
      router.push("/orders");
    } catch (error) {
      console.error("Order error:", error);
      toast({
        title: "Order Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
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
            <Link href="/plants">
              <Button className="rounded-full px-8">Start Shopping</Button>
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
        <div className="container mx-auto px-4 max-w-5xl">
          <Link href="/cart" className="inline-flex items-center gap-1 text-primary font-bold mb-6 hover:underline">
            <ChevronLeft className="h-4 w-4" /> Back to Cart
          </Link>
          
          <h1 className="text-3xl font-headline font-extrabold text-primary mb-10">Checkout</h1>

          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              {/* Shipping Form */}
              <div className="space-y-6">
                <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm">1</span>
                  Shipping Address
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Jane" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required className="rounded-xl" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 XXXXX XXXXX" required className="rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Input id="address" placeholder="House No, Street Name" required className="rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Bangalore" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" placeholder="560XXX" required className="rounded-xl" />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-6">
                <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm">2</span>
                  Payment Method
                </h2>
                
                <RadioGroup defaultValue="card" className="grid grid-cols-1 gap-4">
                  <Label htmlFor="card" className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted cursor-pointer hover:border-primary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <CreditCard className="h-6 w-6 text-primary" />
                      <div className="space-y-1">
                        <span className="font-bold">Credit / Debit Card</span>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard, RuPay</p>
                      </div>
                    </div>
                    <RadioGroupItem value="card" id="card" />
                  </Label>

                  <Label htmlFor="upi" className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted cursor-pointer hover:border-primary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <Wallet className="h-6 w-6 text-primary" />
                      <div className="space-y-1">
                        <span className="font-bold">UPI Payment</span>
                        <p className="text-xs text-muted-foreground">Google Pay, PhonePe, Paytm</p>
                      </div>
                    </div>
                    <RadioGroupItem value="upi" id="upi" />
                  </Label>

                  <Label htmlFor="cod" className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted cursor-pointer hover:border-primary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <Banknote className="h-6 w-6 text-primary" />
                      <div className="space-y-1">
                        <span className="font-bold">Cash on Delivery</span>
                        <p className="text-xs text-muted-foreground">Pay when your plant arrives</p>
                      </div>
                    </div>
                    <RadioGroupItem value="cod" id="cod" />
                  </Label>
                </RadioGroup>
              </div>
            </div>

            {/* Order Summary Sticky Card */}
            <div>
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden sticky top-24">
                <CardContent className="p-8 space-y-6">
                  <h3 className="text-2xl font-headline font-bold text-primary">Order Summary</h3>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold bg-accent p-1 px-2 rounded-lg">{item.quantity}x</span>
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-6 space-y-3">
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
                    <div className="flex justify-between text-xl font-headline font-extrabold pt-2 border-t mt-4">
                      <span>Total</span>
                      <span className="text-primary">₹{total}</span>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-full text-lg font-bold">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Place Order Now"}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By placing your order, you agree to GreenScape's <br />
                    <Link href="#" className="underline">Terms of Service</Link> and <Link href="#" className="underline">Privacy Policy</Link>.
                  </p>
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

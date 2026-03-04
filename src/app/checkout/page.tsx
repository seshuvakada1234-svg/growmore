
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShoppingBag, 
  ChevronLeft, 
  Loader2, 
  Truck, 
  ShieldCheck, 
  CreditCard, 
  Banknote, 
  Smartphone,
  MapPin,
  PackageCheck
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc, increment, addDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { PRODUCTS } from "@/lib/mock-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import Image from "next/image";

const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
].sort();

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: user?.email || "",
    address: "",
    city: "",
    state: "",
    pincode: ""
  });

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

  useEffect(() => {
    if (user && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || "", fullName: user.displayName || "" }));
    }
  }, [user]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 1500 ? 0 : 150;
  const discount = subtotal > 3000 ? 200 : 0;
  const total = subtotal + shipping - discount;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    if (!formData.state) {
      toast({ title: "Please select a state", variant: "destructive" });
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
          const rate = snap?.exists() ? (snap.data().affiliateCommission || 5) : 5;
          calculatedCommission += (item.price * item.quantity * (rate / 100));
        });
      }

      const orderId = `GS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const orderRef = doc(db, 'orders', orderId);
      
      const orderData = {
        id: orderId,
        userId: user.uid,
        customerName: formData.fullName,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        },
        paymentMethod,
        totalAmount: total,
        status: "Pending",
        affiliateId: finalReferrerId,
        commissionAmount: calculatedCommission,
        items: cartItems.map(i => ({ productId: i.id, name: i.name, qty: i.quantity, price: i.price, imageUrl: i.imageUrl })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rejectedSelfReferral: isSelfReferral
      };

      await setDoc(orderRef, orderData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'create', requestResourceData: orderData }));
      });

      if (finalReferrerId && calculatedCommission > 0) {
        // Update Affiliate Profile
        const profileRef = doc(db, 'affiliateProfiles', finalReferrerId);
        updateDoc(profileRef, {
          totalEarnings: increment(calculatedCommission),
          totalReferrals: increment(1),
          updatedAt: serverTimestamp()
        }).catch(() => {});

        // Log Commission
        await addDoc(collection(db, 'affiliateProfiles', finalReferrerId, 'commissions'), {
          affiliateId: finalReferrerId,
          orderId: orderId,
          amount: calculatedCommission,
          status: "unpaid",
          createdAt: serverTimestamp()
        });
      }

      toast({ title: "Order Placed Successfully! 🌿", description: "Your nature bundle is being prepared." });
      localStorage.removeItem('plantshop_cart');
      window.dispatchEvent(new Event('cart-updated'));
      router.push("/orders");

    } catch (error) {
      console.error(error);
      toast({ title: "Order Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0 && !isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold text-primary">Your cart is empty</h1>
          <p className="text-muted-foreground mt-2">Add some green friends to your collection before checkout.</p>
          <Link href="/plants" className="mt-6">
            <Button className="rounded-full px-8 h-12 font-bold">Start Shopping</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Header />
      
      <main className="flex-grow py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <Link href="/cart" className="inline-flex items-center gap-1 text-primary font-bold hover:underline mb-4 group">
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Cart
            </Link>
            <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-primary">Checkout</h1>
          </div>

          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Forms */}
            <div className="lg:col-span-7 space-y-8">
              {/* Shipping Details */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-headline font-bold text-primary">Shipping Information</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName" 
                        required 
                        placeholder="John Doe" 
                        className="rounded-xl h-12 bg-accent/30 border-none focus-visible:ring-primary" 
                        value={formData.fullName}
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Mobile Number</Label>
                      <Input 
                        id="phone" 
                        required 
                        type="tel"
                        placeholder="98765 43210" 
                        className="rounded-xl h-12 bg-accent/30 border-none focus-visible:ring-primary"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        required 
                        type="email"
                        placeholder="john@example.com" 
                        className="rounded-xl h-12 bg-accent/30 border-none focus-visible:ring-primary"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Full Address (House No, Street, Area)</Label>
                      <Input 
                        id="address" 
                        required 
                        placeholder="Flat 101, Green Heights, HSR Layout" 
                        className="rounded-xl h-12 bg-accent/30 border-none focus-visible:ring-primary"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city" 
                        required 
                        placeholder="Bengaluru" 
                        className="rounded-xl h-12 bg-accent/30 border-none focus-visible:ring-primary"
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select 
                          value={formData.state} 
                          onValueChange={(value) => setFormData({...formData, state: value})}
                          required
                        >
                          <SelectTrigger className="rounded-xl h-12 bg-accent/30 border-none focus:ring-primary">
                            <SelectValue placeholder="Select State" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[300px]">
                            {INDIAN_STATES_AND_UTS.map((state) => (
                              <SelectItem key={state} value={state} className="rounded-lg">
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input 
                          id="pincode" 
                          required 
                          placeholder="560102" 
                          className="rounded-xl h-12 bg-accent/30 border-none focus-visible:ring-primary"
                          value={formData.pincode}
                          onChange={e => setFormData({...formData, pincode: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-primary">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-headline font-bold text-primary">Payment Method</h2>
                  </div>

                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-4">
                    <Label
                      htmlFor="cod"
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-muted hover:border-accent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="cod" id="cod" />
                        <div className="flex items-center gap-2">
                          <Banknote className="h-5 w-5 text-primary" />
                          <span className="font-bold">Cash on Delivery</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Pay when you receive</span>
                    </Label>

                    <Label
                      htmlFor="upi"
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'upi' ? 'border-primary bg-primary/5' : 'border-muted hover:border-accent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="upi" id="upi" />
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-primary" />
                          <span className="font-bold">UPI (GPay / PhonePe)</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground text-emerald-600">Secure & Instant</span>
                    </Label>

                    <Label
                      htmlFor="card"
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-muted hover:border-accent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="card" id="card" />
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-primary" />
                          <span className="font-bold">Debit / Credit Card</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Visa, Master, RuPay</span>
                    </Label>
                  </RadioGroup>
                </div>
              </Card>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-5 sticky top-24">
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <h3 className="text-xl font-headline font-bold text-primary">Order Summary</h3>
                  
                  {/* Item List */}
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-bold text-sm text-primary truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.category} • Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right font-bold text-sm text-primary">
                          ₹{item.price * item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-muted" />

                  {/* Calculations */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-medium text-primary">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Delivery Charge</span>
                      <span className={`font-medium ${shipping === 0 ? 'text-emerald-600' : 'text-primary'}`}>
                        {shipping === 0 ? 'FREE' : `₹${shipping}`}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600 font-bold">
                        <span>Bundle Discount</span>
                        <span>-₹{discount}</span>
                      </div>
                    )}
                    <Separator className="bg-muted" />
                    <div className="flex justify-between items-baseline pt-2">
                      <span className="text-lg font-headline font-bold text-primary">Total Amount</span>
                      <span className="text-3xl font-extrabold text-primary">₹{total}</span>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-accent/30 text-center">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-tight text-primary">Safe Plants</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-accent/30 text-center">
                      <Truck className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-tight text-primary">Quick Ship</span>
                    </div>
                  </div>

                  {/* Submit Button - Desktop */}
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-14 rounded-full text-lg font-bold shadow-xl shadow-primary/20 hidden md:flex"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <PackageCheck className="h-5 w-5 mr-2" />}
                    Place Order
                  </Button>
                </div>
              </Card>
            </div>

            {/* Mobile Sticky Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-[60] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full h-14 rounded-full text-lg font-bold shadow-lg"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : `Place Order (₹${total})`}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

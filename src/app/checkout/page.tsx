"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingBag, ChevronLeft, Loader2, Truck,
  ShieldCheck, CreditCard, Banknote, Smartphone,
  MapPin, PackageCheck, Lock, RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { PRODUCTS } from "@/lib/mock-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
].sort();

type PaymentMethod = "cod" | "upi" | "card";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [upiId, setUpiId] = useState("");
  const [cardNum, setCardNum] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: user?.email || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("plantshop_cart") || "[]");
      const enriched = stored
        .map((item: any) => {
          const product = PRODUCTS.find((p) => p.id === (item.id || item.productId));
          return product ? { ...product, quantity: item.quantity } : null;
        })
        .filter(Boolean);
      setCartItems(enriched);
    } catch {
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    if (user && !formData.email) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || "",
        fullName: user.displayName || "",
      }));
    }
  }, [user]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 1500 ? 0 : 150;
  const discount = subtotal > 3000 ? 200 : 0;
  const total = subtotal + shipping - discount;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!user) { router.push("/login?redirect=/checkout"); return; }
    if (cartItems.length === 0) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    if (!formData.state) { toast({ title: "Please select a state", variant: "destructive" }); return; }

    setIsSubmitting(true);

    const affiliateRefId = localStorage.getItem("affiliate_ref");
    const isSelfReferral = affiliateRefId === user.uid;
    const finalReferrerId = isSelfReferral ? null : affiliateRefId;

    try {
      let calculatedCommission = 0;

      if (finalReferrerId) {
        const productSnaps = await Promise.all(
          cartItems.map((item) => getDoc(doc(db, "products", item.id)))
        );
        cartItems.forEach((item, idx) => {
          const rate = productSnaps[idx]?.exists()
            ? productSnaps[idx].data().affiliateCommission || 5
            : 5;
          calculatedCommission += item.price * item.quantity * (rate / 100);
        });
      }

      const orderId = `GS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const orderRef = doc(db, "orders", orderId);

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
          pincode: formData.pincode,
        },
        paymentMethod,
        totalAmount: total,
        status: "Pending",
        affiliateId: finalReferrerId,
        commissionAmount: calculatedCommission,
        items: cartItems.map((i) => ({
          productId: i.id,
          name: i.name,
          qty: i.quantity,
          price: i.price,
          imageUrl: i.imageUrl,
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rejectedSelfReferral: isSelfReferral,
      };

      await setDoc(orderRef, orderData).catch((err) => {
        errorEmitter.emit(
          "permission-error",
          new FirestorePermissionError({
            path: orderRef.path,
            operation: "create",
            requestResourceData: orderData,
          })
        );
      });

      toast({ title: "Order Placed Successfully 🌿", description: "Your plants are being prepared" });
      localStorage.removeItem("plantshop_cart");
      window.dispatchEvent(new Event("cart-updated"));
      router.push("/orders");
    } catch (error) {
      console.error(error);
      toast({ title: "Order Failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Empty cart ──────────────────────────────────────────
  if (cartItems.length === 0 && !isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold text-primary">Your cart is empty</h1>
          <p className="text-muted-foreground mt-2">Add some plants before checkout</p>
          <Link href="/plants" className="mt-6">
            <Button className="rounded-full px-8 h-12 font-bold">Start Shopping</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Payment option button ────────────────────────────────
  const PayOption = ({
    id, icon, label, desc, badge, badgeCls,
  }: {
    id: PaymentMethod; icon: React.ReactNode; label: string;
    desc: string; badge?: string; badgeCls?: string;
  }) => (
    <button
      type="button"
      onClick={() => setPaymentMethod(id)}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left
        ${paymentMethod === id
          ? "border-[#388E3C] bg-[#F1F8E9]"
          : "border-[#E8E8E8] hover:border-[#D8EDD5]"}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
        ${paymentMethod === id ? "bg-[#388E3C] text-white" : "bg-[#F1F8E9] text-[#388E3C]"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${paymentMethod === id ? "text-[#388E3C]" : "text-[#1A2E1A]"}`}>
            {label}
          </span>
          {badge && (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeCls}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
        ${paymentMethod === id ? "border-[#388E3C] bg-[#388E3C]" : "border-[#D8EDD5]"}`}>
        {paymentMethod === id && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Header />

      <form onSubmit={handlePlaceOrder} className="flex-grow flex flex-col">
        <main className="flex-grow pb-28 sm:pb-12">
          <div className="container mx-auto px-4 max-w-6xl py-8 md:py-10">

            {/* Back */}
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-5"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Cart
            </Link>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A2E1A] mb-4 font-headline">
              Checkout
            </h1>

            {/* Trust strip */}
            <div className="flex items-center gap-4 sm:gap-8 flex-wrap mb-7">
              {[
                { icon: <Truck className="h-3.5 w-3.5" />, text: "Free delivery above ₹1500" },
                { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: "100% secure payments" },
                { icon: <RefreshCcw className="h-3.5 w-3.5" />, text: "Easy 7-day returns" },
              ].map((t) => (
                <div key={t.text} className="flex items-center gap-1.5 text-xs font-semibold text-[#388E3C]">
                  {t.icon} {t.text}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── LEFT COLUMN ─────────────────────────────── */}
              <div className="lg:col-span-7 space-y-5">

                {/* SHIPPING */}
                <Card className="rounded-2xl shadow-sm bg-white border border-[#E8E8E8] overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#F5F5F5]">
                    <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Shipping Information
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* Full name – full width */}
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-sm font-medium">Full Name</Label>
                        <Input
                          required
                          placeholder="Ravi Kumar"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] focus:ring-[#388E3C]/10"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Mobile Number</Label>
                        <Input
                          required type="tel" pattern="[0-9]{10}" maxLength={10}
                          placeholder="98765 43210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                          className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] focus:ring-[#388E3C]/10"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Email</Label>
                        <Input
                          required type="email" placeholder="ravi@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] focus:ring-[#388E3C]/10"
                        />
                      </div>

                      {/* Address – full width */}
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-sm font-medium">Address</Label>
                        <Input
                          required placeholder="Flat 4B, Green Valley Apartments, MG Road"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] focus:ring-[#388E3C]/10"
                        />
                      </div>

                      {/* City */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">City</Label>
                        <Input
                          required placeholder="Bengaluru"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] focus:ring-[#388E3C]/10"
                        />
                      </div>

                      {/* State + Pincode */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">State</Label>
                          <Select
                            value={formData.state}
                            onValueChange={(v) => setFormData({ ...formData, state: v })}
                          >
                            <SelectTrigger className="rounded-2xl border-[#E8E8E8] h-12">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[280px]">
                              {INDIAN_STATES_AND_UTS.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Pincode</Label>
                          <Input
                            required pattern="[0-9]{6}" maxLength={6} placeholder="560001"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })}
                            className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] focus:ring-[#388E3C]/10"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </Card>

                {/* PAYMENT METHOD */}
                <Card className="rounded-2xl shadow-sm bg-white border border-[#E8E8E8] overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#F5F5F5]">
                    <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Payment Method
                    </h2>
                  </div>
                  <div className="p-6 space-y-3">

                    <PayOption
                      id="cod" icon={<Banknote className="h-5 w-5" />}
                      label="Cash on Delivery" desc="Pay when your order arrives"
                      badge="Popular" badgeCls="bg-emerald-100 text-emerald-700"
                    />

                    <PayOption
                      id="upi" icon={<Smartphone className="h-5 w-5" />}
                      label="UPI" desc="GPay, PhonePe, Paytm & more"
                      badge="Instant" badgeCls="bg-blue-100 text-blue-700"
                    />
                    {paymentMethod === "upi" && (
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-sm font-medium">UPI ID</Label>
                        <Input
                          value={upiId} onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@upi"
                          className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C]"
                        />
                      </div>
                    )}

                    <PayOption
                      id="card" icon={<CreditCard className="h-5 w-5" />}
                      label="Credit / Debit Card" desc="Visa, Mastercard, RuPay"
                    />
                    {paymentMethod === "card" && (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Card Number</Label>
                          <Input
                            value={cardNum} onChange={(e) => setCardNum(e.target.value)}
                            placeholder="1234 5678 9012 3456" maxLength={19}
                            className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] font-mono tracking-widest"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Expiry</Label>
                            <Input
                              value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)}
                              placeholder="MM / YY" maxLength={7}
                              className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium">CVV</Label>
                            <Input
                              value={cardCvv} onChange={(e) => setCardCvv(e.target.value)}
                              placeholder="•••" maxLength={3}
                              className="rounded-2xl border-[#E8E8E8] h-12 focus:border-[#388E3C] font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1 pt-1">
                      <Lock className="h-3 w-3" /> Your payment info is 100% secure & encrypted
                    </p>
                  </div>
                </Card>

              </div>

              {/* ── RIGHT COLUMN: ORDER SUMMARY ─────────────── */}
              <div className="lg:col-span-5">
                <div className="sticky top-20">
                  <Card className="rounded-2xl shadow-sm bg-white border border-[#E8E8E8] overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#F5F5F5]">
                      <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                        Summary
                        <span className="text-xs font-bold bg-primary text-white px-2 py-0.5 rounded-full ml-1">
                          {cartItems.reduce((a, i) => a + i.quantity, 0)}
                        </span>
                      </h2>
                    </div>

                    {/* Cart items */}
                    <div className="divide-y divide-[#F8F8F8] max-h-56 overflow-y-auto">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#F1F8E9] flex-shrink-0 border border-[#F0F0F0]">
                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-[#1A2E1A] line-clamp-2 leading-tight">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
                            <p className="text-xs font-bold text-primary mt-0.5">{fmt(item.price)}</p>
                          </div>
                          <p className="font-bold text-sm text-[#1A2E1A] flex-shrink-0">
                            {fmt(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Price breakdown */}
                    <div className="px-5 py-4 border-t border-[#F5F5F5] space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{fmt(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5" /> Shipping
                        </span>
                        {shipping === 0
                          ? <span className="font-bold text-emerald-600">FREE</span>
                          : <span className="font-semibold">{fmt(shipping)}</span>}
                      </div>
                      {shipping > 0 && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
                          🚚 Add {fmt(1500 - subtotal)} more for free delivery
                        </p>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600 font-semibold">Discount</span>
                          <span className="font-bold text-emerald-600">−{fmt(discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-headline font-bold text-lg text-[#1A2E1A]">Total</span>
                        <span className="font-headline font-extrabold text-2xl text-primary">{fmt(total)}</span>
                      </div>
                      {discount > 0 && (
                        <p className="text-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 py-2 rounded-xl">
                          🎉 You're saving {fmt(discount)} on this order!
                        </p>
                      )}

                      {/* Complete Order button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-14 rounded-2xl text-base font-semibold mt-2 gap-2"
                      >
                        {isSubmitting
                          ? <><Loader2 className="h-5 w-5 animate-spin" /> Placing Order...</>
                          : <><PackageCheck className="h-5 w-5" /> Complete Order</>}
                      </Button>

                      <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Secure checkout powered by Monterra
                      </p>
                    </div>
                  </Card>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* Mobile sticky button */}
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8E8E8] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
          >
            {isSubmitting
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Placing Order...</>
              : `Complete Order · ${fmt(total)}`}
          </Button>
        </div>
      </form>

      <Footer />
    </div>
  );
}

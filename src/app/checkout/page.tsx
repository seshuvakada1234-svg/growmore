"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag, ChevronLeft, Loader2, Truck,
  ShieldCheck, CreditCard, Banknote, Smartphone,
  MapPin, PackageCheck, Lock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import {
  doc, setDoc, serverTimestamp, getDoc,
  getDocs, writeBatch, collection, onSnapshot,
} from "firebase/firestore";
import { useState, useEffect, useRef } from "react";
import { PRODUCTS } from "@/lib/mock-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { saveCommissionRecord } from "@/lib/affiliateEngine";
import { AddressList } from "@/components/checkout/AddressList";
import type { SavedAddress } from "@/components/checkout/AddressCard";
import { isValidIndianMobile } from "@/components/checkout/AddressForm";

declare global {
  interface Window { Razorpay: any; }
}

type PaymentMethod = "cod" | "upi" | "card";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const generateOrderId = (method: PaymentMethod) => {
  const prefix = method === "cod" ? "GS-COD" : "GS-ONL";
  return `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
};

function resolveImage(raw: string | undefined, w = 200): string {
  if (!raw) return "/placeholder.svg";
  if (raw.includes("ik.imagekit.io")) {
    const parts = raw.split("ik.imagekit.io/")[1]?.split("/") ?? [];
    const key = parts.slice(1).join("/");
    if (key) return `/api/image?file=${encodeURIComponent(key)}&w=${w}`;
  }
  return raw;
}

async function fetchProduct(db: any, id: string): Promise<any | null> {
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
        imageUrl: resolveImage(raw, 200),
      };
    }
  } catch { /* fallthrough */ }
  const mock = PRODUCTS.find((p) => p.id === id);
  if (mock) return { ...mock, imageUrl: resolveImage(mock.imageUrl, 200) };
  return null;
}

// ── Real-time COD status hook ─────────────────────────────────────────────────
function useCodEnabled(db: any): boolean {
  const [codEnabled, setCodEnabled] = useState<boolean>(true);
  useEffect(() => {
    if (!db) return;
    const ref = doc(db, "settings", "paymentMethods");
    const unsub = onSnapshot(ref, (snap) => {
      setCodEnabled(snap.exists() ? (snap.data().codEnabled ?? true) : true);
    });
    return () => unsub();
  }, [db]);
  return codEnabled;
}

function CheckoutContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useUser();
  const db           = useFirestore();

  const codEnabled = useCodEnabled(db);

  const isBuyNow = useRef(searchParams.get("mode") === "buynow").current;

  const addressSectionRef = useRef<HTMLDivElement>(null);
  const [addressError,    setAddressError]    = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);

  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [cartItems,     setCartItems]     = useState<any[]>([]);
  const [cartLoading,   setCartLoading]   = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // If COD gets disabled while user has it selected, switch to upi
  useEffect(() => {
    if (!codEnabled && paymentMethod === "cod") {
      setPaymentMethod("upi");
    }
  }, [codEnabled, paymentMethod]);

  // ── Load cart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      setCartLoading(true);
      try {
        const raw = isBuyNow
          ? sessionStorage.getItem("buynow_cart")
          : localStorage.getItem("plantshop_cart");
        const stored: any[] = JSON.parse(raw || "[]");
        const grouped: Record<string, number> = {};
        for (const item of stored) {
          const id = item.id || item.productId || item.plantId;
          if (!id) continue;
          grouped[id] = (grouped[id] || 0) + (item.quantity || 1);
        }
        const ids = Object.keys(grouped);
        if (ids.length === 0) { setCartItems([]); setCartLoading(false); return; }
        const enriched = await Promise.all(
          ids.map(async (id) => {
            const product = await fetchProduct(db, id);
            if (!product) return null;
            return { ...product, quantity: grouped[id] };
          })
        );
        if (!cancelled) setCartItems(enriched.filter(Boolean));
      } catch {
        if (!cancelled) setCartItems([]);
      } finally {
        if (!cancelled) setCartLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [db, isBuyNow]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 999 ? 0 : 150;
  const discount = subtotal > 3000 ? 200 : 0;
  const total    = subtotal + shipping - discount;

  // ── Order notifications ───────────────────────────────────────────────────
  const sendOrderNotifications = async (orderId: string, addr: SavedAddress) => {
    try {
      const res = await fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerName:   addr.fullName,
          customerEmail:  user?.email || "",
          customerPhone:  addr.phone,
          customerPhone2: addr.phone2 || null,
          items: cartItems.map((i) => ({ name: i.name, qty: i.quantity, price: i.price })),
          total,
          paymentMethod,
          status: paymentMethod === 'cod' ? 'Pending' : 'Approved',
          shippingAddress: {
            fullAddress: addr.address,
            city:        addr.city,
            district:    addr.district,
            state:       addr.state,
            pincode:     addr.pincode,
          },
        }),
      });
      return await res.json();
    } catch (err) { console.error('Notification error:', err); return null; }
  };

  // ── Clear cart ────────────────────────────────────────────────────────────
  const clearCartEverywhere = async () => {
    if (isBuyNow) { sessionStorage.removeItem("buynow_cart"); return; }
    localStorage.removeItem("plantshop_cart");
    window.dispatchEvent(new Event("cart-updated"));
    if (user && db) {
      try {
        const cartSnap = await getDocs(collection(db, "users", user.uid, "cart"));
        if (!cartSnap.empty) {
          const batch = writeBatch(db);
          cartSnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) { console.error("Failed to clear Firestore cart:", err); }
    }
  };

  // ── Save order ────────────────────────────────────────────────────────────
  const saveOrderToFirestore = async (
    orderId: string,
    addr: SavedAddress,
    razorpayPaymentId: string | null = null,
    razorpayOrderId:   string | null = null,
  ) => {
    if (!user) return;

    const affiliateRefId  = localStorage.getItem("monterra_referrer");
    const isSelfReferral  = !!affiliateRefId && affiliateRefId === user.uid;
    const finalReferrerId = affiliateRefId && !isSelfReferral ? affiliateRefId : null;

    const orderRef  = doc(db, "orders", orderId);
    const orderData = {
      id:             orderId,
      userId:         user.uid,
      customerName:   addr.fullName,
      customerEmail:  user?.email || "",
      customerPhone:  addr.phone,
      customerPhone2: addr.phone2 || null,
      shippingAddress: {
        fullAddress: addr.address,
        city:        addr.city,
        district:    addr.district,
        state:       addr.state,
        pincode:     addr.pincode,
        label:       addr.label,
        phone:       addr.phone,
        phone2:      addr.phone2 || null,
      },
      paymentMethod:     razorpayPaymentId ? "online" : "cod",
      paymentStatus:     razorpayPaymentId ? "paid"   : "pending",
      razorpayPaymentId: razorpayPaymentId || null,
      razorpayOrderId:   razorpayOrderId   || null,
      totalAmount:  total,
      status:       razorpayPaymentId ? "Approved" : "Pending",
      affiliateId:  finalReferrerId,
      items: cartItems.map((i) => ({
        productId: i.id,
        name:      i.name,
        qty:       i.quantity,
        price:     i.price,
        imageUrl:  i.imageUrl,
      })),
      createdAt:            serverTimestamp(),
      updatedAt:            serverTimestamp(),
      rejectedSelfReferral: isSelfReferral,
      refundStatus:         null,
    };

    try {
      await setDoc(orderRef, orderData);

      if (finalReferrerId) {
        try {
          for (const item of cartItems) {
            const productSnap = await getDoc(doc(db, "products", item.id));
            const rate = productSnap.exists() ? (productSnap.data().affiliateCommission ?? 5) : 5;
            await saveCommissionRecord({
              productId:      item.id,
              orderId,
              orderValue:     item.price * item.quantity,
              commissionRate: rate,
            });
          }
        } catch (commissionErr) {
          console.error("Commission recording failed for order", orderId, commissionErr);
        }
      }

      const notifications = await sendOrderNotifications(orderId, addr);
      await clearCartEverywhere();

      const waParam = notifications?.customerWaLink
        ? `&wa=${encodeURIComponent(notifications.customerWaLink)}` : '';
      router.push(`/order-success?id=${orderId}${waParam}`);
    } catch (err) {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: orderRef.path, operation: "create", requestResourceData: orderData,
      }));
    }
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!user) { router.push("/login?redirect=/checkout"); return; }

    if (!selectedAddress) {
      setAddressError(true);
      toast({
        title: "Select Address",
        description: "Please select or add a delivery address to continue",
        variant: "destructive",
      });
      addressSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!isValidIndianMobile(selectedAddress.phone)) {
      toast({ title: "Invalid Phone Number", description: "Please edit your address and enter a valid Indian mobile number", variant: "destructive" });
      return;
    }

    if (selectedAddress.phone2 && !isValidIndianMobile(selectedAddress.phone2)) {
      toast({ title: "Invalid Alternate Number", description: "Please edit your address and enter a valid alternate mobile number", variant: "destructive" });
      return;
    }

    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" }); return;
    }

    setIsSubmitting(true);

    try {
      if (paymentMethod === 'cod') {
        const orderId = generateOrderId("cod");
        await saveOrderToFirestore(orderId, selectedAddress);
        toast({ title: "Order Placed Successfully 🌿" });

      } else {
        const firestoreOrderId = generateOrderId("upi");

        const res = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            currency: "INR",
            paymentMethod
          }),
        });
        const razorpayOrder = await res.json();

        if (!window.Razorpay) {
          toast({ title: "Payment system loading...", description: "Please try again in a second", variant: "destructive" });
          setIsSubmitting(false); return;
        }

        const options = {
          key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount:      razorpayOrder.amount,
          currency:    razorpayOrder.currency,
          name:        "Monterra",
          description: "Premium Plant Purchase",
          order_id:    razorpayOrder.id,
          handler: async function (response: any) {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                firestoreOrderId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              await saveOrderToFirestore(
                firestoreOrderId,
                selectedAddress,
                response.razorpay_payment_id,
                response.razorpay_order_id,
              );
              toast({ title: "Payment Successful 🌿", description: "Your order has been recorded" });
            } else {
              toast({ title: "Payment Verification Failed", variant: "destructive" });
              setIsSubmitting(false);
            }
          },
          prefill: {
            name:    selectedAddress.fullName,
            email:   user?.email || "",
            contact: selectedAddress.phone,
          },
          theme: { color: "#1B5E20" },
          modal: { ondismiss: () => setIsSubmitting(false) },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Order Failed", description: "Please try again", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const PayOption = ({ id, icon, label, desc, badge, badgeCls }: {
    id: PaymentMethod; icon: React.ReactNode; label: string;
    desc: string; badge?: string; badgeCls?: string;
  }) => (
    <button type="button" onClick={() => setPaymentMethod(id)}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left
        ${paymentMethod === id ? "border-[#388E3C] bg-[#F1F8E9]" : "border-[#E8E8E8] hover:border-[#D8EDD5]"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
        ${paymentMethod === id ? "bg-[#388E3C] text-white" : "bg-[#F1F8E9] text-[#388E3C]"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${paymentMethod === id ? "text-[#388E3C]" : "text-[#1A2E1A]"}`}>{label}</span>
          {badge && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeCls}`}>{badge}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
        ${paymentMethod === id ? "border-[#388E3C] bg-[#388E3C]" : "border-[#D8EDD5]"}`}>
        {paymentMethod === id && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );

  const backHref      = isBuyNow ? "/plants" : "/cart";
  const backLabel     = isBuyNow ? "Back to Product" : "Back to Cart";
  const canPlaceOrder = !!selectedAddress && isValidIndianMobile(selectedAddress.phone);

  return (
    <form onSubmit={handlePlaceOrder} className="flex-grow flex flex-col">
      <main className="flex-grow pb-28 sm:pb-12">
        <div className="container mx-auto px-4 max-w-6xl py-8 md:py-10">

          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-5">
            <ChevronLeft className="h-4 w-4" /> {backLabel}
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A2E1A] mb-4 font-headline">Checkout</h1>

          <div className="flex items-center gap-4 sm:gap-8 flex-wrap mb-7">
            {[
              { icon: <Truck className="h-3.5 w-3.5" />,       text: "Free delivery above ₹999" },
              { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: "100% secure payments" },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-1.5 text-xs font-semibold text-[#388E3C]">
                {t.icon} {t.text}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">

              {/* Address */}
              <Card className="rounded-2xl shadow-sm bg-white border border-[#E8E8E8] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#F5F5F5]">
                  <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Delivery Address
                  </h2>
                </div>
                <div
                  ref={addressSectionRef}
                  className={`p-5 transition-all duration-300 ${addressError ? "ring-2 ring-red-400 ring-offset-2 rounded-b-2xl" : ""}`}
                >
                  {user && (
                    <AddressList
                      db={db}
                      userId={user.uid}
                      selectedAddressId={selectedAddress?.id ?? null}
                      onSelect={(addr) => { setSelectedAddress(addr); setAddressError(false); }}
                    />
                  )}
                  {addressError && (
                    <p className="mt-2 text-xs text-red-500 font-semibold flex items-center gap-1.5 px-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      Please select a delivery address to continue
                    </p>
                  )}
                </div>
              </Card>

              {/* Payment */}
              <Card className="rounded-2xl shadow-sm bg-white border border-[#E8E8E8] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#F5F5F5]">
                  <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Payment Method
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  {/* COD — only shown when enabled in admin */}
                  {codEnabled && (
                    <PayOption
                      id="cod"
                      icon={<Banknote className="h-5 w-5" />}
                      label="Cash on Delivery"
                      desc="Pay when your order arrives"
                      badge="Popular"
                      badgeCls="bg-emerald-100 text-emerald-700"
                    />
                  )}
                  <PayOption id="upi"  icon={<Smartphone className="h-5 w-5" />} label="UPI"                 desc="GPay, PhonePe, Paytm & more"   badge="Secure"  badgeCls="bg-blue-100 text-blue-700" />
                  <PayOption id="card" icon={<CreditCard className="h-5 w-5" />} label="Credit / Debit Card" desc="Visa, Mastercard, RuPay" />
                  <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1 pt-1">
                    <Lock className="h-3 w-3" /> Your payment info is 100% secure & encrypted
                  </p>
                </div>
              </Card>

            </div>

            {/* Order Summary */}
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

                  <div className="divide-y divide-[#F8F8F8] max-h-56 overflow-y-auto">
                    {cartLoading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                          <div className="w-14 h-14 rounded-xl bg-gray-200 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-2 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      ))
                    ) : cartItems.length === 0 ? (
                      <div className="px-5 py-6 text-center text-sm text-muted-foreground">No items in cart</div>
                    ) : (
                      cartItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#F1F8E9] flex-shrink-0 border border-[#F0F0F0]">
                            {item.imageUrl && item.imageUrl !== "/placeholder.svg" ? (
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-xl">🌿</div>
                            )}
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-[#1A2E1A] line-clamp-2 leading-tight">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
                            <p className="text-xs font-bold text-primary mt-0.5">{fmt(item.price)}</p>
                          </div>
                          <p className="font-bold text-sm text-[#1A2E1A] flex-shrink-0">{fmt(item.price * item.quantity)}</p>
                        </div>
                      ))
                    )}
                  </div>

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
                        🚚 Add {fmt(999 - subtotal)} more for free delivery
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

                    <Button
                      type="submit"
                      disabled={isSubmitting || cartLoading || !canPlaceOrder}
                      className="w-full h-14 rounded-2xl text-base font-semibold mt-2 gap-2"
                    >
                      {isSubmitting
                        ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                        : <><PackageCheck className="h-5 w-5" /> Complete Order</>}
                    </Button>

                    {!canPlaceOrder && !isSubmitting && (
                      <p className="text-center text-[10px] text-amber-600 font-semibold">
                        ⚠️ {!selectedAddress ? "Select a delivery address to continue" : "Address has invalid phone number"}
                      </p>
                    )}

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

      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8E8E8] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <Button
          type="submit"
          disabled={isSubmitting || cartLoading || !canPlaceOrder}
          className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
        >
          {isSubmitting
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
            : canPlaceOrder
              ? `Complete Order · ${fmt(total)}`
              : "Select Address to Continue"}
        </Button>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Header />
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <CheckoutContent />
      </Suspense>
      <Footer />
    </div>
  );  
}
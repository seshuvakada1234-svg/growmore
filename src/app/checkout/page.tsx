"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc
} from "@/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  doc
} from "firebase/firestore";
import { PRODUCTS } from "@/lib/mock-data";
import { 
  ShoppingBag, 
  Truck, 
  CreditCard, 
  MapPin, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getStoredReferrer } from "@/lib/affiliateEngine";

export default function CheckoutPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAddressId, setSelectedAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  
  // Custom address fields (if not selecting saved)
  const [manualAddress, setManualAddress] = useState({
    fullName: "",
    phone: "",
    house: "",
    area: "",
    city: "",
    state: "",
    pincode: ""
  });

  // 1. Load cart
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      const enriched = saved.map((item: any) => {
        const id = item.id || item.productId || item.plantId;
        const product = PRODUCTS.find(p => p.id === id);
        return product ? { ...product, quantity: item.quantity } : null;
      }).filter(Boolean);
      setCartItems(enriched);
      
      if (!isUserLoading && enriched.length === 0) {
        router.push('/plants');
      }
    } catch (e) {
      setCartItems([]);
    }
  }, [isUserLoading, router]);

  // 2. Fetch addresses
  const addressQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "users", user.uid, "addresses"), orderBy("createdAt", "desc"));
  }, [db, user?.uid]);
  
  const { data: addresses, isLoading: isAddressesLoading } = useCollection(addressQuery);

  // 3. Sync profile
  const profileRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // 4. Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = subtotal > 1500 ? 0 : 150;
  const total = subtotal + shipping;

  const handlePlaceOrder = async () => {
    if (!user || isProcessing) return;

    // Validation
    let shippingAddress: any = null;
    if (selectedAddressId === "new" || !addresses?.length) {
      const { fullName, phone, house, area, city, state, pincode } = manualAddress;
      if (!fullName || !phone || !house || !area || !city || !state || !pincode) {
        toast({ title: "Address Incomplete", description: "Please fill all required shipping fields.", variant: "destructive" });
        return;
      }
      shippingAddress = { ...manualAddress, fullAddress: `${house}, ${area}` };
    } else {
      const found = addresses.find(a => a.id === selectedAddressId);
      if (!found) {
        toast({ title: "Select Address", description: "Please select a delivery address.", variant: "destructive" });
        return;
      }
      shippingAddress = { ...found, fullAddress: `${found.house}, ${found.area}` };
    }

    setIsProcessing(true);

    try {
      const referrerId = getStoredReferrer();
      
      const orderData = {
        userId: user.uid,
        customerName: shippingAddress.fullName,
        customerEmail: user.email,
        customerPhone: shippingAddress.phone,
        items: cartItems.map(i => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          qty: i.quantity,
          imageUrl: i.imageUrl
        })),
        totalAmount: total,
        shippingAddress,
        paymentMethod,
        status: "Pending",
        affiliateId: referrerId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 1. Save to Firestore
      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // 2. Trigger Email Notification (Non-blocking)
      fetch("/api/send-order-email", {
        method: "POST",
        body: JSON.stringify({
          orderId: orderRef.id,
          ...orderData
        })
      }).catch(err => console.error("Email API failed", err));

      // 3. Clear Cart
      localStorage.removeItem('plantshop_cart');
      window.dispatchEvent(new Event('cart-updated'));

      toast({ title: "Order Placed! 🌿", description: "We've received your order." });
      router.push(`/order-success?id=${orderRef.id}`);

    } catch (error: any) {
      console.error("Order processing error", error);
      toast({ title: "Order Failed", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isUserLoading || (user && isAddressesLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral/30">
      <Header />
      
      <main className="flex-grow py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-primary mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* 1. Shipping Section */}
              <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0">
                  <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> 1. Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  {addresses && addresses.length > 0 ? (
                    <RadioGroup 
                      value={selectedAddressId} 
                      onValueChange={setSelectedAddress}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      {addresses.map((addr) => (
                        <div key={addr.id} className="relative">
                          <RadioGroupItem value={addr.id} id={addr.id} className="peer sr-only" />
                          <Label 
                            htmlFor={addr.id}
                            className="flex flex-col h-full p-5 rounded-2xl border-2 border-muted cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent/30 hover:bg-neutral/50"
                          >
                            <span className="font-bold text-primary block mb-1">{addr.fullName}</span>
                            <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {addr.house}, {addr.area}, {addr.city}, {addr.state} - {addr.pincode}
                            </span>
                            <span className="text-[10px] mt-2 font-bold uppercase tracking-wider opacity-50">{addr.type}</span>
                          </Label>
                        </div>
                      ))}
                      
                      <div className="relative">
                        <RadioGroupItem value="new" id="addr-new" className="peer sr-only" />
                        <Label 
                          htmlFor="addr-new"
                          className="flex flex-col items-center justify-center h-full p-5 rounded-2xl border-2 border-dashed border-muted cursor-pointer transition-all peer-data-[state=checked]:border-primary hover:bg-neutral/50 text-muted-foreground"
                        >
                          <CheckCircle2 className="h-5 w-5 mb-2 opacity-20" />
                          <span className="font-bold text-sm">Add New Address</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  ) : null}

                  {(!addresses?.length || selectedAddressId === "new") && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="md:col-span-2 space-y-2">
                        <Label>Full Name</Label>
                        <Input value={manualAddress.fullName} onChange={e => setManualAddress({...manualAddress, fullName: e.target.value})} placeholder="Receiver's name" className="rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={manualAddress.phone} onChange={e => setManualAddress({...manualAddress, phone: e.target.value})} placeholder="10-digit mobile" className="rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label>Pincode</Label>
                        <Input value={manualAddress.pincode} onChange={e => setManualAddress({...manualAddress, pincode: e.target.value})} placeholder="6-digit" className="rounded-xl h-12" />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label>House / Street / Area</Label>
                        <Input value={manualAddress.house} onChange={e => setManualAddress({...manualAddress, house: e.target.value})} placeholder="Flat no., Street details" className="rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={manualAddress.city} onChange={e => setManualAddress({...manualAddress, city: e.target.value})} className="rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={manualAddress.state} onChange={e => setManualAddress({...manualAddress, state: e.target.value})} className="rounded-xl h-12" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Payment Section */}
              <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0">
                  <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> 2. Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="cod" id="pay-cod" className="peer sr-only" />
                      <Label 
                        htmlFor="pay-cod"
                        className="flex items-center gap-4 p-5 rounded-2xl border-2 border-muted cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent/30 hover:bg-neutral/50"
                      >
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-primary">Cash on Delivery</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Pay when you receive</p>
                        </div>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem value="online" id="pay-online" className="peer sr-only" />
                      <Label 
                        htmlFor="pay-online"
                        className="flex items-center gap-4 p-5 rounded-2xl border-2 border-muted cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent/30 hover:bg-neutral/50"
                      >
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-primary">Online Payment</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Cards, UPI, Netbanking</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-white overflow-hidden sticky top-24">
                <CardContent className="p-8 space-y-6">
                  <h3 className="text-xl font-headline font-bold border-b border-white/10 pb-4">Order Summary</h3>
                  
                  <div className="space-y-4">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="opacity-80 truncate max-w-[150px]">{item.name} x {item.quantity}</span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="opacity-70">Subtotal</span>
                      <span className="font-bold">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-70">Shipping</span>
                      <span className="font-bold">{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-4xl font-extrabold">₹{total}</span>
                  </div>

                  <Button 
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="w-full h-14 rounded-full bg-white text-primary hover:bg-neutral font-extrabold text-lg shadow-xl shadow-black/10 mt-4 group"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>Place Order <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </Button>

                  <div className="space-y-3 pt-4 opacity-60">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                      <ShieldCheck className="h-4 w-4" /> 100% Secure Checkout
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                      <AlertCircle className="h-4 w-4" /> Live Plant Guarantee
                    </div>
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

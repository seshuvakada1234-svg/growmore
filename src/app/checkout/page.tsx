
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingBag, ChevronLeft, CreditCard, Banknote, Wallet } from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Order Placed!",
      description: "Your green friends will be with you shortly.",
    });
    router.push("/orders");
  };

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
                  
                  <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold bg-accent p-1 px-2 rounded-lg">1x</span>
                        <span className="text-sm">Monstera Deliciosa</span>
                      </div>
                      <span className="text-sm font-bold">₹1,299</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold bg-accent p-1 px-2 rounded-lg">2x</span>
                        <span className="text-sm">Snake Plant Zeylanica</span>
                      </div>
                      <span className="text-sm font-bold">₹998</span>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold">₹2,297</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-bold text-emerald-600">FREE</span>
                    </div>
                    <div className="flex justify-between text-xl font-headline font-extrabold pt-2 border-t mt-4">
                      <span>Total</span>
                      <span className="text-primary">₹2,297</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 rounded-full text-lg font-bold">
                    Place Order Now
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

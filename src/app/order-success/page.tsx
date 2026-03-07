"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  return (
    <div className="container mx-auto px-4 max-w-2xl py-20">
      <div className="bg-white rounded-[3rem] shadow-xl p-10 text-center border border-emerald-50">
        <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-reveal-up">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        
        <h1 className="text-4xl font-headline font-extrabold text-[#1A2E1A] mb-4">
          Order Confirmed!
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Thank you for choosing Monterra. Your plants are being carefully prepared for their journey to your home.
        </p>

        <div className="bg-neutral/30 rounded-2xl p-6 mb-10 inline-block w-full">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Order Reference</span>
            <span className="text-2xl font-mono font-bold text-primary">{orderId || "GS-XXXXX"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/orders">
            <Button variant="outline" className="w-full h-14 rounded-full font-bold gap-2">
              <Package className="h-5 w-5" /> View My Orders
            </Button>
          </Link>
          <Link href="/plants">
            <Button className="w-full h-14 rounded-full font-bold gap-2">
              Continue Shopping <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-12 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShoppingBag className="h-4 w-4" />
          <span className="text-sm font-medium">A confirmation email has been sent to you.</span>
        </div>
        <p className="text-xs">Need help? Contact our plant experts at support@monterra.in</p>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

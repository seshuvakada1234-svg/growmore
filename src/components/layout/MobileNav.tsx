"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Leaf, ShoppingCart, User } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  // Hide bottom nav on product detail pages (e.g., /plants/1 or /plant-detail)
  const segments = pathname?.split("/") || [];
  const isProductDetailPage = (segments.length === 3 && segments[1] === "plants") || pathname === "/plant-detail";

  if (isProductDetailPage) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t flex justify-around py-3 md:hidden z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <Link href="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
        <Home className="h-5 w-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
      </Link>
      <Link href="/plants" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
        <Leaf className="h-5 w-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Plants</span>
      </Link>
      <Link href="/cart" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
        <ShoppingCart className="h-5 w-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Cart</span>
      </Link>
      <Link href="/profile" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-all">
        <User className="h-5 w-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Account</span>
      </Link>
    </nav>
  );
}

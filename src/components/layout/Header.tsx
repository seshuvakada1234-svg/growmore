"use client";

import Link from "next/link";
import { Search, ShoppingCart, User, Leaf, Menu, LogOut, Award, Home, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { useAffiliate } from "@/context/affiliate-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [cartCount, setCartCount] = useState(0);
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const { isApproved: isAffiliate } = useAffiliate();

  const userProfileRef = useMemoFirebase(() => (!db || !user?.uid) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin && !pathname.startsWith('/admin')) {
      router.push('/admin');
    }
  }, [isAdmin, pathname, router]);

  useEffect(() => {
    const updateCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
        setCartCount(cart.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0));
      } catch { setCartCount(0); }
    };
    updateCount();
    window.addEventListener('cart-updated', updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener('cart-updated', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('plantshop_cart');
    localStorage.removeItem('plantshop_wishlist');
    localStorage.removeItem('plantshop_user');
    window.dispatchEvent(new Event('cart-updated'));
    router.push('/');
  };

  // --- ADMIN HEADER ---
  if (isAdmin) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-primary text-white h-16 flex items-center shadow-lg">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Leaf className="h-8 w-8 fill-current" />
            <span className="font-headline font-extrabold text-xl tracking-tight">Monterra Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 uppercase tracking-widest text-[10px]">Super Admin</Badge>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-red-500/20">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // --- STOREFRONT HEADER ---
  return (
    // ✅ FIXED: removed "md:static" — now sticky on ALL screen sizes including mobile
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 flex items-center"
      style={{ position: 'sticky', top: 0 }}
    >
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="flex flex-col gap-6 mt-12">
                <Link href="/plants" className="text-xl font-bold flex items-center gap-2">
                  <Leaf className="h-5 w-5" /> Shop Plants
                </Link>
                <Link href="/affiliate" className="text-xl font-bold flex items-center gap-2">
                  <Award className="h-5 w-5" /> Monterra Partners
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2 text-primary group">
            <Leaf className="h-8 w-8 fill-current transition-transform group-hover:rotate-12" />
            <span className="font-headline font-extrabold text-xl tracking-tight hidden sm:inline-block">Monterra</span>
          </Link>
        </div>

        {/* Search — desktop only */}
        <div className="flex-1 max-md:hidden max-w-md flex items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Find your perfect plant..." className="pl-10 h-10 bg-muted/50 border-none rounded-full" />
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <Home className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </Link>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </Link>

          <Link href="/wishlist">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-accent text-primary p-0 overflow-hidden shadow-sm border-2 border-white">
                  {user.photoURL
                    ? <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                    : <User className="h-5 w-5" />
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl mt-2 p-2">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="font-bold truncate">{user.displayName || "User"}</div>
                  {isAffiliate && (
                    <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">Official Partner</div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/profile"><User className="mr-2 h-4 w-4" /> My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/orders"><ShoppingCart className="mr-2 h-4 w-4" /> My Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/affiliate"><Award className="mr-2 h-4 w-4" /> {isAffiliate ? "Partner Dashboard" : "Become a Partner"}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl cursor-pointer text-destructive focus:bg-red-50 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button className="rounded-full px-4 sm:px-6 font-bold shadow-lg shadow-primary/20 text-sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

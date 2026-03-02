"use client";

import Link from "next/link";
import { Search, ShoppingCart, User, Leaf, Menu, Home, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    const updateCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
        const count = cart.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
        setCartCount(count);
      } catch (e) {
        setCartCount(0);
      }
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
    try {
      await signOut(auth);
      localStorage.removeItem('plantshop_cart');
      window.dispatchEvent(new Event('cart-updated'));
      router.push('/');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/plants" className="text-lg font-medium">All Plants</Link>
                <Link href="/plants?cat=Indoor" className="text-lg font-medium">Indoor</Link>
                <Link href="/plants?cat=Outdoor" className="text-lg font-medium">Outdoor</Link>
                <Link href="/plants?cat=Bonsai" className="text-lg font-medium">Bonsai</Link>
                <Link href="/affiliate" className="text-lg font-medium">Affiliate Program</Link>
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2 text-primary">
            <Leaf className="h-8 w-8 fill-current" />
            <span className="font-headline font-extrabold text-xl tracking-tight hidden sm:inline-block">GreenScape</span>
          </Link>
        </div>

        <div className="flex-1 max-w-md hidden md:flex items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for plants..." 
            className="pl-10 h-10 bg-muted/50 border-none rounded-full"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <Home className="h-6 w-6" />
            </Button>
          </Link>
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-white">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </Link>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-accent text-primary p-0 overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl mt-2">
                <DropdownMenuLabel className="font-headline font-bold">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                  <Link href="/profile" className="flex items-center gap-2 w-full">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                  <Link href="/orders" className="flex items-center gap-2 w-full">
                    <ShoppingCart className="h-4 w-4" /> Orders
                  </Link>
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg lg:hidden">
                    <Link href="/admin" className="flex items-center gap-2 w-full">
                      <LayoutDashboard className="h-4 w-4" /> Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button className="rounded-full px-6 font-bold">
                Login
              </Button>
            </Link>
          )}

          {user && (
            <Link href="/admin" className="hidden lg:block">
              <Button variant="outline" size="sm" className="rounded-full border-primary/20 text-primary">Admin</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}


"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/shop/ProductCard";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { PRODUCTS } from "@/lib/mock-data";
import { Heart, ShoppingBag, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // 1. Fetch Wishlist IDs from Firestore
  const wishlistQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "users", user.uid, "wishlist"),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);

  const { data: wishlistItems, isLoading: isWishlistLoading } = useCollection(wishlistQuery);

  // 2. Fetch all products from DB to resolve potential custom plants
  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "products");
  }, [db]);

  const { data: dbProducts, isLoading: isProductsLoading } = useCollection(productsQuery);

  // 3. Resolve Product Objects
  const resolvedWishlistProducts = useMemoFirebase(() => {
    if (!wishlistItems) return [];

    // Combine mock products and DB products
    const allAvailableProducts = [...PRODUCTS, ...(dbProducts || [])];
    
    // Create a lookup map for efficiency
    const productMap = new Map(allAvailableProducts.map(p => [p.id, p]));

    // Map wishlist IDs to full product objects
    return wishlistItems
      .map(item => productMap.get(item.productId))
      .filter(Boolean); // Remove nulls if a product was deleted from store but remains in wishlist
  }, [wishlistItems, dbProducts]);

  if (isUserLoading || isWishlistLoading || (user && isProductsLoading)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-neutral/30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-neutral/30 p-4">
          <div className="text-center max-w-md space-y-6">
            <div className="h-20 w-20 bg-accent rounded-full flex items-center justify-center mx-auto text-primary">
              <Heart className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-headline font-extrabold text-primary">Your Wishlist</h1>
            <p className="text-muted-foreground">Please sign in to view and manage your saved plants.</p>
            <Link href="/login?redirect=/wishlist" className="block">
              <Button className="rounded-full px-8 py-6 text-lg font-bold w-full">Sign In to Continue</Button>
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
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-headline font-extrabold text-primary">My Wishlist</h1>
              <p className="text-muted-foreground mt-1">
                {resolvedWishlistProducts.length} {resolvedWishlistProducts.length === 1 ? 'plant' : 'plants'} saved
              </p>
            </div>
            {resolvedWishlistProducts.length > 0 && (
              <Link href="/plants">
                <Button variant="ghost" className="text-primary font-bold gap-2">
                  Continue Shopping <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          {resolvedWishlistProducts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] shadow-sm border-2 border-dashed border-muted">
              <div className="h-24 w-24 bg-accent/50 rounded-full flex items-center justify-center mx-auto text-primary/40 mb-6">
                <Heart className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-primary">Your wishlist is empty ❤️</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                Explore our collection and tap the heart icon to save your favorite plants for later.
              </p>
              <Link href="/plants" className="block mt-8">
                <Button className="rounded-full px-10 h-12 font-bold shadow-lg shadow-primary/20">
                  Browse Plants
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {resolvedWishlistProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

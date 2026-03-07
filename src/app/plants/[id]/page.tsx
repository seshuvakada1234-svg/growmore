"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCTS } from "@/lib/mock-data";
import { Star, Truck, ShieldCheck, Heart, ShoppingCart, Minus, Plus, Sun, Droplets, Leaf } from "lucide-react";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/shared/ShareButton";
import { calculateEarning } from "@/lib/affiliateEngine";
import { MonterraUser } from "@/types/affiliate.types";

export default function PlantDetailPage() {
  const { id } = useParams();
  const product = PRODUCTS.find(p => p.id === id) || PRODUCTS[0];
  const [qty, setQty] = useState(1);
  const { user } = useUser();
  const db = useFirestore();
  const [isAnimating, setIsAnimating] = useState(false);

  const wishlistRef = useMemoFirebase(() => 
    user?.uid ? doc(db, 'users', user.uid, 'wishlist', product.id) : null
  , [db, user?.uid, product.id]);

  const { data: wishlistItem } = useDoc(wishlistRef);
  const isWishlisted = !!wishlistItem;

  const userProfileRef = useMemoFirebase(() => !user?.uid ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);
  const monterraUser = profile as unknown as MonterraUser;

  const earning = calculateEarning(product.price, (product as any).affiliateCommission);

  const handleToggleWishlist = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to use wishlist",
        variant: "destructive"
      });
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'wishlist', product.id);

    if (isWishlisted) {
      deleteDoc(docRef).then(() => {
        toast({ title: "Removed from Wishlist" });
      });
    } else {
      setIsAnimating(true);
      setDoc(docRef, {
        productId: product.id,
        createdAt: serverTimestamp()
      }).then(() => {
        toast({ title: "Added to Wishlist ❤️" });
        setTimeout(() => setIsAnimating(false), 400);
      });
    }
  };

  const handleAddToCart = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      const existingItem = cart.find((item: any) => 
        (item.id || item.productId || item.plantId) === product.id
      );
      
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 0) + qty;
        existingItem.id = product.id;
        delete existingItem.productId;
        delete existingItem.plantId;
      } else {
        cart.push({ id: product.id, quantity: qty });
      }
      
      localStorage.setItem('plantshop_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));

      toast({
        title: "Success!",
        description: `${qty} x ${product.name} added to your cart.`,
      });
    } catch (error) {
      console.error("Failed to add to cart", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-muted">
              <Image 
                src={product.imageUrl} 
                alt={product.name} 
                fill 
                className="object-cover"
                priority
              />
              <div className="absolute top-6 right-6 flex flex-col gap-2">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  onClick={handleToggleWishlist}
                  className="rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
                >
                  <Heart 
                    className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isWishlisted ? "fill-red-500 text-red-500" : "text-primary",
                      isAnimating && "scale-[1.2]"
                    )} 
                  />
                </Button>
                <ShareButton 
                  product={product} 
                  className="rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white" 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square relative rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary cursor-pointer transition-all">
                  <Image src={`https://picsum.photos/seed/plant${i}${product.id}/400/400`} alt="Gallery" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-6 space-y-4">
              <Badge variant="secondary" className="rounded-full px-4 py-1 text-primary bg-accent font-bold">
                {product.category}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-primary leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-bold text-lg">{product.rating}</span>
                </div>
                <span className="text-muted-foreground border-l pl-4 font-medium">
                  {product.reviewsCount} verified reviews
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                  In Stock
                </Badge>
              </div>
            </div>

            <div className="mb-8 flex items-baseline gap-4">
              <span className="text-4xl font-extrabold text-primary">₹{product.price}</span>
              {product.oldPrice && (
                <span className="text-2xl text-muted-foreground line-through font-medium">₹{product.oldPrice}</span>
              )}
            </div>

            {/* Affiliate Earning Info */}
            {monterraUser?.affiliateApproved && earning && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                <span className="text-xl">💰</span>
                <p className="text-sm font-bold text-emerald-800">
                  Earn ₹{earning} if someone buys this plant through your link 🌱
                </p>
              </div>
            )}

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {product.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-accent rounded-2xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-primary">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Light Needs</h4>
                  <p className="text-xs text-muted-foreground">Bright Indirect Light</p>
                </div>
              </div>
              <div className="bg-accent rounded-2xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-primary">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Watering</h4>
                  <p className="text-xs text-muted-foreground">Every 7-10 days</p>
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-full h-12 px-2 bg-muted/50">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQty(Math.max(1, qty - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-bold text-lg">{qty}</span>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQty(qty + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="h-12 rounded-full flex-1 text-lg font-bold gap-2" onClick={handleAddToCart}>
                  <ShoppingCart className="h-5 w-5" /> Add to Cart
                </Button>
              </div>
              <Link href="/cart" className="block w-full">
                <Button onClick={handleAddToCart} size="lg" variant="outline" className="w-full h-12 rounded-full border-primary text-primary hover:bg-primary hover:text-white font-bold text-lg">
                  Buy It Now
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 border-t pt-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-5 w-5 text-primary" /> Free delivery over ₹1500
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 text-primary" /> 15-day plant health guarantee
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and rest of content... */}
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="care" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-14 bg-transparent p-0 gap-8">
              <TabsTrigger value="care" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-lg px-0">
                Care Guide
              </TabsTrigger>
              <TabsTrigger value="details" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-lg px-0">
                Product Details
              </TabsTrigger>
              <TabsTrigger value="reviews" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-lg px-0">
                Reviews
              </TabsTrigger>
            </TabsList>
            <TabsContent value="care" className="py-8 space-y-6">
              <div className="prose max-w-none text-muted-foreground">
                <h3 className="text-primary font-headline font-bold text-2xl mb-4">How to keep your {product.name} happy</h3>
                <p className="text-lg leading-relaxed">{product.careGuide}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                  <div className="space-y-4">
                    <h4 className="font-bold text-primary text-lg">Temperature</h4>
                    <p>Ideal between 18°C and 24°C. Avoid cold drafts or direct heat vents.</p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-primary text-lg">Humidity</h4>
                    <p>Prefers moderate to high humidity. Consider placing near a humidifier or misting once a week.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="details" className="py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground font-medium">SKU</span>
                  <span className="font-bold">GS-{product.id}992</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground font-medium">Scientific Name</span>
                  <span className="font-bold italic">Monstera deliciosa</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground font-medium">Difficulty Level</span>
                  <span className="font-bold">Easy to Medium</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground font-medium">Pet Friendly</span>
                  <span className="font-bold text-red-500">No</span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="reviews" className="py-8">
              <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-3xl border-2 border-dashed">
                <Leaf className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-bold">No reviews yet</h3>
                <p className="text-muted-foreground">Be the first to review this plant!</p>
                <Button className="mt-4 rounded-full">Write a Review</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}


"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ShareButton } from "@/components/shared/ShareButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [isAnimating, setIsAnimating] = useState(false);

  const wishlistRef = useMemoFirebase(() =>
    user?.uid ? doc(db, 'users', user.uid, 'wishlist', product.id) : null
  , [db, user?.uid, product.id]);

  const { data: wishlistItem } = useDoc(wishlistRef);
  const isWishlisted = !!wishlistItem;

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const cart = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      const existingItem = cart.find((item: any) =>
        (item.id || item.productId || item.plantId) === product.id
      );

      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 0) + 1;
        existingItem.id = product.id;
        delete existingItem.productId;
        delete existingItem.plantId;
      } else {
        cart.push({ id: product.id, quantity: 1 });
      }

      localStorage.setItem('plantshop_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));

      toast({
        title: "Added to cart!",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error) {
      console.error("Failed to add to cart", error);
    }
  };

  const discountPercent = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : null;

  return (
    <Link href={`/plants/${product.id}`}>
      <Card className="group overflow-hidden bg-card border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-xl sm:rounded-2xl h-full flex flex-col relative">

        {/* Image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            data-ai-hint="plant image"
          />

          {/* Category Badge — top left */}
          <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-primary font-bold text-[8px] sm:text-xs px-1 sm:px-1.5 py-0.5">
              {product.category}
            </Badge>
          </div>

          {/* Discount Badge — top right area, below action buttons */}
          {discountPercent && (
            <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3">
              <Badge variant="destructive" className="font-bold text-[8px] sm:text-xs px-1 sm:px-1.5 py-0.5">
                {discountPercent}%
              </Badge>
            </div>
          )}

          {/* Action Buttons — always visible on mobile, hover on desktop */}
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-auto sm:top-10 sm:right-3 z-10 flex flex-row sm:flex-col gap-1 sm:gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleWishlist}
              className="p-1.5 rounded-full bg-white/90 shadow-sm transition-all hover:bg-white hover:scale-110"
              aria-label="Add to wishlist"
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-300",
                  isWishlisted ? "fill-red-500 text-red-500" : "text-primary",
                  isAnimating && "scale-125"
                )}
              />
            </button>
            <ShareButton
              product={product}
              className="p-1.5 h-auto w-auto rounded-full bg-white/90 shadow-sm transition-all hover:bg-white text-primary"
              variant="ghost"
            />
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-2 sm:p-4 flex-grow flex flex-col gap-1 sm:gap-1.5">
          {/* Rating */}
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{product.rating}</span>
          </div>

          {/* Name */}
          <h3 className="font-headline font-bold text-[11px] sm:text-sm md:text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1 sm:gap-2 mt-auto pt-1">
            <span className="text-primary font-extrabold text-sm sm:text-base md:text-lg">₹{product.price}</span>
            {product.oldPrice && (
              <span className="text-muted-foreground line-through text-[9px] sm:text-xs">₹{product.oldPrice}</span>
            )}
          </div>

          {/* Delivery & Difficulty badges */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-[8px] sm:text-[10px] text-green-700 font-semibold">🟢 Easy</span>
            <span className="text-[8px] sm:text-[10px] text-blue-600 font-semibold">🚚 Free</span>
          </div>
        </CardContent>

        {/* Add to Cart */}
        <CardFooter className="p-2 sm:p-4 pt-0">
          <Button
            className="w-full rounded-lg sm:rounded-xl flex items-center justify-center gap-1 sm:gap-2 h-8 sm:h-10 text-[10px] sm:text-sm font-bold px-2"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="xs:inline">Add</span>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

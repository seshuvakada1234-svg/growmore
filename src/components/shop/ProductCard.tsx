
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
        description: `${product.name} has been added to your shopping cart.`,
      });
    } catch (error) {
      console.error("Failed to add to cart", error);
    }
  };

  return (
    <Link href={`/plants/${product.id}`}>
      <Card className="group overflow-hidden plant-card-hover bg-card border-none shadow-sm rounded-2xl h-full flex flex-col relative">
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105 w-full h-auto"
            data-ai-hint="plant image"
          />
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-primary font-bold text-[10px] sm:text-xs">
              {product.category}
            </Badge>
          </div>
          
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex flex-col gap-1.5 sm:gap-2">
            <button 
              onClick={handleToggleWishlist}
              className="p-1.5 sm:p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:bg-white"
            >
              <Heart 
                className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300",
                  isWishlisted ? "fill-red-500 text-red-500" : "text-primary",
                  isAnimating && "scale-[1.2]"
                )} 
              />
            </button>
            <ShareButton 
              product={product} 
              className="p-1.5 sm:p-2 h-auto w-auto rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:bg-white text-primary" 
              variant="ghost"
            />
          </div>

          {product.oldPrice && (
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
              <Badge variant="destructive" className="font-bold text-[9px] sm:text-xs">
                {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-3 sm:p-4 flex-grow flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{product.rating}</span>
          </div>
          <h3 className="font-headline font-bold text-sm sm:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-auto">
            <span className="text-primary font-extrabold text-lg sm:text-xl">₹{product.price}</span>
            {product.oldPrice && (
              <span className="text-muted-foreground line-through text-[10px] sm:text-sm">₹{product.oldPrice}</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-3 sm:p-4 pt-0">
          <Button 
            className="w-full rounded-xl flex gap-1.5 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm" 
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

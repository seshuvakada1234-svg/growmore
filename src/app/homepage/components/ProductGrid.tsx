'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import { Heart, Star, ArrowRight } from 'lucide-react';
import { PRODUCTS, Product } from '@/lib/mock-data';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ShareButton } from '@/components/shared/ShareButton';

// ── Utils ──
const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

// ── Plant Card ──
function PlantCard({ plant }: { plant: Product }) {
  const [addedToCart, setAddedToCart] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const [isAnimating, setIsAnimating] = useState(false);

  const wishlistRef = useMemoFirebase(() => 
    user?.uid ? doc(db, 'users', user.uid, 'wishlist', plant.id) : null
  , [db, user?.uid, plant.id]);

  const { data: wishlistItem } = useDoc(wishlistRef);
  const isWishlisted = !!wishlistItem;

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to use wishlist",
        variant: "destructive"
      });
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'wishlist', plant.id);

    if (isWishlisted) {
      deleteDoc(docRef).then(() => {
        toast({ title: "Removed from Wishlist" });
      });
    } else {
      setIsAnimating(true);
      setDoc(docRef, {
        productId: plant.id,
        createdAt: serverTimestamp()
      }).then(() => {
        toast({ title: "Added to Wishlist ❤️" });
        setTimeout(() => setIsAnimating(false), 400);
      });
    }
  };

  const addToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const cart: { id: string; quantity: number }[] = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      const existing = cart.find(i => (i.id || (i as any).productId || (i as any).plantId) === plant.id);
      
      if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
        existing.id = plant.id;
        delete (existing as any).productId;
        delete (existing as any).plantId;
      } else {
        cart.push({ id: plant.id, quantity: 1 });
      }
      
      localStorage.setItem('plantshop_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 1500);
    } catch (err) {
      console.error("Cart error", err);
    }
  };

  const careLevel = plant.careLevel || 'easy';
  const careLevelColor = { easy: 'bg-emerald-100 text-emerald-700', moderate: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' }[careLevel];
  const careLevelLabel = { easy: '🟢 Easy', moderate: '🟡 Moderate', hard: '🔴 Hard' }[careLevel];

  const discount = plant.oldPrice ? Math.round(((plant.oldPrice - plant.price) / plant.oldPrice) * 100) : 0;

  return (
    <div 
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-border/50" 
      onClick={() => router.push(`/plants/${plant.id}`)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <AppImage
          src={plant.imageUrl || null}
          alt={plant.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110 w-full h-auto"
          data-ai-hint="plant"
        />
        
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {plant.isBestseller && (
            <span className="text-[10px] bg-[#FF6F00] text-white font-black px-2 py-1 rounded shadow-sm uppercase tracking-wider">BESTSELLER</span>
          )}
          {plant.isNew && (
            <span className="text-[10px] bg-primary text-white font-black px-2 py-1 rounded shadow-sm uppercase tracking-wider">NEW</span>
          )}
          {discount > 0 && (
            <span className="text-[10px] bg-destructive text-white font-black px-2 py-1 rounded shadow-sm uppercase tracking-wider">{discount}% OFF</span>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button 
            className="p-2 rounded-full transition-all bg-white/60 hover:bg-white backdrop-blur-sm shadow-sm"
            onClick={toggleWishlist}
            aria-label="Add to wishlist"
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-all duration-300",
                isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground",
                isAnimating && "scale-[1.2]"
              )} 
            />
          </button>
          <ShareButton 
            product={plant} 
            className="p-2 h-auto w-auto rounded-full bg-white/60 hover:bg-white backdrop-blur-sm text-muted-foreground shadow-sm" 
            variant="ghost"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
          <button 
            onClick={addToCart}
            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg ${addedToCart ? 'bg-primary text-white' : 'bg-white/95 text-primary hover:bg-primary hover:text-white'}`}
          >
            {addedToCart ? '✓ Added' : '+ Quick Add'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-headline font-bold text-[#1A2E1A] text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {plant.name}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{plant.category}</p>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              <span>{plant.rating}</span>
              <Star className="h-2.5 w-2.5 fill-current" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">({plant.reviewCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary text-base">{formatPrice(plant.price)}</span>
            {plant.oldPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(plant.oldPrice)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-dashed border-border">
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${careLevelColor}`}>
            {careLevelLabel}
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            {plant.price >= 499 ? '🚚 Free' : '🚚 ₹49'}
          </p>
        </div>
      </div>
    </div>
  );
}

type FilterKey = 'bestseller' | 'new' | 'featured' | 'all';

interface ProductGridProps {
  title: string;
  subtitle?: string;
  filterKey?: FilterKey;
  limit?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
}

function applyFilter(plants: Product[], filterKey?: FilterKey): Product[] {
  switch (filterKey) {
    case 'bestseller': return plants.filter(p => !!p.isBestseller);
    case 'new': return plants.filter(p => !!p.isNew);
    case 'featured': return plants.filter(p => !!p.isFeatured);
    default: return plants;
  }
}

export default function ProductGrid({ title, subtitle, filterKey, limit = 8, showViewAll = true, viewAllHref = '/plants' }: ProductGridProps) {
  const plants = applyFilter(PRODUCTS, filterKey).slice(0, limit);
  const router = useRouter();

  return (
    <section className="py-8 md:py-16 bg-neutral/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
          <div>
            {subtitle && <div className="text-primary font-bold uppercase tracking-wider text-xs mb-1">{subtitle}</div>}
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#1A2E1A]">{title}</h2>
          </div>
          {showViewAll && (
            <button 
              onClick={() => router.push(viewAllHref)}
              className="flex items-center gap-2 text-sm font-bold text-primary hover:underline group"
            >
              Explore Collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {plants.map(plant => (
            <PlantCard key={`grid-plant-${plant.id}`} plant={plant} />
          ))}
        </div>
      </div>
    </section>
  );
}
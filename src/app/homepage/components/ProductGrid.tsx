'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Star, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  documentId,
  getDocs 
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ShareMenu } from '@/components/shared/ShareButton';

const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

// ── Proxy ImageKit URLs ───────────────────────────────────────────────────────
function proxyUrl(url: string, w = 600): string {
  if (!url) return '/placeholder.svg';
  if (url.includes('ik.imagekit.io')) {
    const parts = url.split('ik.imagekit.io/')[1]?.split('/') ?? [];
    const key = parts.slice(1).join('/');
    if (key) return `/api/image?file=${encodeURIComponent(key)}&w=${w}`;
  }
  return url;
}

// ── Get best image from product ───────────────────────────────────────────────
function getProductImage(product: any, w = 600): string {
  const raw = product?.images?.[0] || product?.imageUrl || '';
  return raw ? proxyUrl(raw, w) : '/placeholder.svg';
}

// ── Plant Card ────────────────────────────────────────────────────────────────
function PlantCard({ plant }: { plant: any }) {
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
    e.stopPropagation(); e.preventDefault();
    if (!user) { toast({ title: "Login Required", description: "Please login to use wishlist", variant: "destructive" }); return; }
    const docRef = doc(db, 'users', user.uid, 'wishlist', plant.id);
    if (isWishlisted) {
      deleteDoc(docRef).then(() => toast({ title: "Removed from Wishlist" }));
    } else {
      setIsAnimating(true);
      setDoc(docRef, { productId: plant.id, createdAt: serverTimestamp() }).then(() => {
        toast({ title: "Added to Wishlist ❤️" });
        setTimeout(() => setIsAnimating(false), 400);
      });
    }
  };

  const addToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const cart: any[] = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      const existing = cart.find(i => (i.id || i.productId || i.plantId) === plant.id);
      if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
        existing.id = plant.id;
        delete existing.productId; delete existing.plantId;
      } else {
        cart.push({ id: plant.id, quantity: 1 });
      }
      localStorage.setItem('plantshop_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 1500);
    } catch (err) { console.error("Cart error", err); }
  };

  const careLevel = plant.careLevel || 'easy';
  const careLevelColor = { easy: 'bg-emerald-100 text-emerald-700', moderate: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' }[careLevel as string] || 'bg-emerald-100 text-emerald-700';
  const careLevelLabel = { easy: '🟢 Easy', moderate: '🟡 Moderate', hard: '🔴 Hard' }[careLevel as string] || '🟢 Easy';
  const discount = plant.oldPrice ? Math.round(((plant.oldPrice - plant.price) / plant.oldPrice) * 100) : 0;
  const imgSrc = getProductImage(plant, 600);

  return (
    <div
      className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-border/50 flex flex-col h-full"
      onClick={() => router.push(`/plants/${plant.id}`)}
    >
      <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: '1/1' }}>
        <Image src={imgSrc} alt={plant.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" unoptimized />

        <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
          {plant.isBestseller && <span className="text-[8px] sm:text-[10px] bg-[#FF6F00] text-white font-black px-1 sm:px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">BESTSELLER</span>}
          {plant.isNew && <span className="text-[8px] sm:text-[10px] bg-primary text-white font-black px-1 sm:px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">NEW</span>}
          {discount > 0 && <span className="text-[8px] sm:text-[10px] bg-destructive text-white font-black px-1 sm:px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">{discount}% OFF</span>}
        </div>

        <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-10 flex flex-col gap-1 sm:gap-2">
          <button className="p-1 sm:p-2 rounded-full transition-all bg-white/70 hover:bg-white backdrop-blur-sm shadow-sm" onClick={toggleWishlist} aria-label="Add to wishlist">
            <Heart className={cn("h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300", isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground", isAnimating && "scale-125")} />
          </button>
          <ShareMenu product={plant} className="p-1 sm:p-2 h-auto w-auto rounded-full bg-white/70 hover:bg-white backdrop-blur-sm text-muted-foreground shadow-sm" variant="ghost" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-3 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300 z-10">
          <button onClick={addToCart}
            className={`w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-xs font-bold uppercase tracking-widest transition-all shadow-lg ${addedToCart ? 'bg-primary text-white' : 'bg-white/95 text-primary hover:bg-primary hover:text-white'}`}>
            {addedToCart ? '✓ Added' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-4 flex flex-col flex-1">
        <h3 className="font-headline font-bold text-[#1A2E1A] text-[11px] sm:text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-0.5 sm:mb-1">{plant.name}</h3>
        <p className="text-[9px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-3">{plant.category}</p>
        <div className="flex items-center justify-between mb-1.5 sm:mb-3">
          <div className="flex items-center gap-0.5">
            <div className="flex items-center gap-0.5 bg-primary text-white text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded">
              <span>{plant.rating || '4.5'}</span>
              <Star className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-current" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="font-bold text-primary text-xs sm:text-base">{formatPrice(plant.price)}</span>
            {plant.oldPrice && <span className="text-[8px] sm:text-xs text-muted-foreground line-through hidden xs:inline">{formatPrice(plant.oldPrice)}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1.5 sm:pt-3 border-t border-dashed border-border">
          <div className={`px-1 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold ${careLevelColor}`}>{careLevelLabel}</div>
          <p className="text-[8px] sm:text-[10px] text-muted-foreground font-semibold">{plant.price >= 499 ? '🚚 Free' : '🚚 ₹49'}</p>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-border/50 animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-2 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

function SectionBanner({ imageUrl, imageUrl2 }: { imageUrl: string; imageUrl2?: string }) {
  if (!imageUrl && !imageUrl2) return null;
  if (imageUrl && imageUrl2) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="relative rounded-2xl overflow-hidden h-[120px] sm:h-[200px]">
          <Image src={proxyUrl(imageUrl, 800)} alt="Section banner 1" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
        <div className="relative rounded-2xl overflow-hidden h-[120px] sm:h-[200px]">
          <Image src={proxyUrl(imageUrl2, 800)} alt="Section banner 2" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-6 h-[120px] sm:h-[200px]">
      <Image src={proxyUrl(imageUrl || imageUrl2 || '', 1200)} alt="Section banner" fill className="object-cover" unoptimized />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
    </div>
  );
}

interface ProductGridProps {
  title: string;
  subtitle?: string;
  filterKey?: 'bestseller' | 'new' | 'featured' | 'all';
  limit?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  pickedProductIds?: string[];
  categoryFilter?: string;
  bannerImageUrl?: string;
  bannerImageUrl2?: string;
}

export default function ProductGrid({
  title,
  subtitle,
  filterKey,
  limit: limitCount = 5,
  showViewAll = true,
  viewAllHref = '/plants',
  pickedProductIds,
  categoryFilter,
  bannerImageUrl,
  bannerImageUrl2,
}: ProductGridProps) {
  const router = useRouter();
  const db = useFirestore();
  
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stabilize pickedProductIds for the dependency array
  const pickedIdsString = JSON.stringify(pickedProductIds);

  useEffect(() => {
    if (!db) return;
    let isMounted = true;

    const fetchGridData = async () => {
      setLoading(true);
      try {
        let results: any[] = [];

        // 1. Priority: Hand-picked products (Admin selection)
        if (pickedProductIds && pickedProductIds.length > 0) {
          const q = query(
            collection(db, "products"), 
            where(documentId(), "in", pickedProductIds)
          );
          const snap = await getDocs(q);
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // CRITICAL: Manual reorder to match pickedProductIds array order
          results = pickedProductIds
            .map(id => docs.find(p => p.id === id))
            .filter((p): p is any => !!p)
            .slice(0, limitCount);
        } 
        // 2. Fallback: Optimized Filter Queries
        else {
          const constraints: any[] = [];

          if (categoryFilter && categoryFilter !== 'all') {
            constraints.push(where("category", "==", categoryFilter));
          }

          switch (filterKey) {
            case 'bestseller':
              constraints.push(where("isBestseller", "==", true));
              break;
            case 'new':
              constraints.push(orderBy("createdAt", "desc"));
              break;
            case 'featured':
              constraints.push(where("isFeatured", "==", true));
              break;
            case 'all':
            default:
              constraints.push(orderBy("rating", "desc"));
          }

          constraints.push(limit(limitCount));
          const q = query(collection(db, "products"), ...constraints);
          const snap = await getDocs(q);
          results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (isMounted) {
          setPlants(results);
          setLoading(false);
        }
      } catch (error) {
        console.error(`[ProductGrid: ${title}] fetch error:`, error);
        if (isMounted) setLoading(false);
      }
    };

    fetchGridData();

    return () => {
      isMounted = false;
    };
  }, [db, filterKey, categoryFilter, limitCount, pickedIdsString, title]);

  if (loading) {
    return (
      <section className="py-6 sm:py-8 md:py-16 bg-neutral/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  if (plants.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 md:py-16 bg-neutral/30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <SectionBanner imageUrl={bannerImageUrl || ''} imageUrl2={bannerImageUrl2 || ''} />

        <div className="flex flex-row items-center justify-between mb-4 sm:mb-8 gap-2">
          <div>
            {subtitle && <div className="text-primary font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-0.5 sm:mb-1">{subtitle}</div>}
            <h2 className="text-lg sm:text-2xl md:text-3xl font-headline font-extrabold text-[#1A2E1A] leading-tight">{title}</h2>
          </div>
          {showViewAll && (
            <button onClick={() => router.push(viewAllHref)}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold text-primary hover:underline group flex-shrink-0">
              <span className="hidden sm:inline">Explore Collection</span>
              <span className="sm:hidden">See All</span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4 md:gap-5">
          {plants.map(plant => <PlantCard key={`grid-${plant.id}`} plant={plant} />)}
        </div>
      </div>
    </section>
  );
}

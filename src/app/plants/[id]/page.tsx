"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { PRODUCTS } from "@/lib/mock-data";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import {
  doc, setDoc, deleteDoc, serverTimestamp,
  collection, getDocs, query, orderBy, Timestamp,
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/shared/ShareButton";
import { calculateEarning } from "@/lib/affiliateEngine";
import { MonterraUser } from "@/types/affiliate.types";
import {
  Star, Truck, Heart, ShoppingCart, Minus, Plus,
  Sun, Droplets, Leaf, Send, Loader2, ChevronLeft, ChevronRight, Clock,
} from "lucide-react";
import {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Timestamp | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recently Viewed helpers
// ─────────────────────────────────────────────────────────────────────────────

const RV_KEY = "monterra_recently_viewed";
const RV_MAX = 6;

function trackRecentlyViewed(productId: string): void {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(RV_KEY) || "[]");
    const next = [productId, ...ids.filter((id) => id !== productId)].slice(0, RV_MAX + 1);
    localStorage.setItem(RV_KEY, JSON.stringify(next));
  } catch { /* blocked */ }
}

function getRecentlyViewed(excludeId: string): string[] {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(RV_KEY) || "[]");
    return ids.filter((id) => id !== excludeId).slice(0, RV_MAX);
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// StarPicker
// ─────────────────────────────────────────────────────────────────────────────

const StarPicker = memo(function StarPicker({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s} type="button" role="radio" aria-checked={value === s}
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="p-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <Star className={cn(
            "h-6 w-6 md:h-7 md:w-7 transition-colors",
            s <= (hover || value) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          )} />
        </button>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// StarDisplay
// ─────────────────────────────────────────────────────────────────────────────

const StarDisplay = memo(function StarDisplay({
  rating, size = "sm",
}: { rating: number; size?: "xs" | "sm" | "md" }) {
  const cls =
    size === "xs" ? "h-2.5 w-2.5"
    : size === "sm" ? "h-3 w-3 md:h-4 md:w-4"
    : "h-4 w-4 md:h-5 md:w-5";
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn(cls, s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// QuantityStepper
// ─────────────────────────────────────────────────────────────────────────────

const QuantityStepper = memo(function QuantityStepper({
  value, onChange, min = 1, max = 99, size = "md",
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-11" : "h-12";
  const btn = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const spanW = size === "sm" ? "w-8" : "w-12";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className={cn("flex items-center border rounded-full px-1 bg-muted/50 flex-shrink-0", h)}>
      <Button variant="ghost" size="icon" aria-label="Decrease quantity"
        className={cn("rounded-full touch-manipulation", btn)}
        onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus className={icon} />
      </Button>
      <span className={cn("text-center font-bold text-base", spanW)} aria-live="polite">
        {value}
      </span>
      <Button variant="ghost" size="icon" aria-label="Increase quantity"
        className={cn("rounded-full touch-manipulation", btn)}
        onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className={icon} />
      </Button>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ImageGallery
// ─────────────────────────────────────────────────────────────────────────────

const ImageGallery = memo(function ImageGallery({
  images, productName, isWishlisted, isAnimating, onToggleWishlist, product,
}: {
  images: string[]; productName: string;
  isWishlisted: boolean; isAnimating: boolean;
  onToggleWishlist: () => void; product: any;
}) {
  const [selected, setSelected] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const goTo = useCallback((idx: number) =>
    setSelected(Math.max(0, Math.min(images.length - 1, idx))),
  [images.length]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > dy && dx > 8) { isDragging.current = true; e.preventDefault(); }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (isDragging.current && Math.abs(delta) > 40) goTo(selected + (delta < 0 ? 1 : -1));
    touchStartX.current = null; touchStartY.current = null; isDragging.current = false;
  }, [selected, goTo]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goTo(selected - 1);
    if (e.key === "ArrowRight") goTo(selected + 1);
  }, [selected, goTo]);

  return (
    <div className="space-y-2 md:space-y-4">
      {/* Main image */}
      <div
        role="region" aria-label="Product image gallery" aria-roledescription="carousel"
        tabIndex={0}
        className="relative w-full rounded-2xl md:rounded-[2rem] overflow-hidden bg-muted select-none cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ aspectRatio: "1 / 1", maxHeight: "min(100vw, 480px)" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onKeyDown={onKeyDown}
      >
        {images.map((src, i) => (
          <Image
            key={src} src={src}
            alt={`${productName} — view ${i + 1} of ${images.length}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
            className={cn(
              "object-cover transition-opacity duration-300 pointer-events-none",
              i === selected ? "opacity-100" : "opacity-0"
            )}
            priority={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
            draggable={false}
          />
        ))}

        {/* Desktop prev/next arrows */}
        {selected > 0 && (
          <button onClick={() => goTo(selected - 1)} aria-label="Previous image"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow hover:bg-white transition-colors z-10">
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>
        )}
        {selected < images.length - 1 && (
          <button onClick={() => goTo(selected + 1)} aria-label="Next image"
            className="hidden md:flex absolute right-14 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow hover:bg-white transition-colors z-10">
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        )}

        {/* Mobile dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden z-10" aria-hidden="true">
          {images.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={cn("h-1.5 rounded-full transition-all duration-200 touch-manipulation",
                i === selected ? "w-5 bg-primary" : "w-1.5 bg-white/70")} />
          ))}
        </div>

        {/* Image counter */}
        <div className="absolute top-3 left-3 md:hidden bg-black/40 text-white text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm z-10" aria-hidden="true">
          {selected + 1} / {images.length}
        </div>

        {/* Wishlist + Share */}
        <div className="absolute top-3 right-3 md:top-5 md:right-5 flex flex-col gap-2 z-10">
          <Button variant="secondary" size="icon"
            onClick={onToggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWishlisted}
            className="rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:bg-white w-9 h-9 md:w-10 md:h-10 touch-manipulation">
            <Heart className={cn(
              "h-4 w-4 md:h-5 md:w-5 transition-all duration-300",
              isWishlisted ? "fill-red-500 text-red-500" : "text-primary",
              isAnimating && "scale-125"
            )} />
          </Button>
          <ShareButton product={product}
            className="rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:bg-white w-9 h-9 md:w-10 md:h-10 touch-manipulation" />
        </div>
      </div>

      {/* Thumbnail strip */}
      <div role="tablist" aria-label="Image thumbnails"
        className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-0.5">
        {images.map((src, i) => (
          <button key={src} role="tab" aria-selected={i === selected}
            aria-label={`View image ${i + 1}`} onClick={() => goTo(i)}
            className={cn(
              "relative flex-shrink-0 rounded-xl md:rounded-2xl overflow-hidden border-2 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "w-[62px] h-[62px] sm:w-[72px] sm:h-[72px] md:flex-1 md:w-auto md:h-auto md:aspect-square",
              i === selected ? "border-primary" : "border-transparent hover:border-primary/40"
            )}>
            <Image src={src} alt={`${productName} thumbnail ${i + 1}`}
              fill sizes="80px" className="object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ProductCard
// ─────────────────────────────────────────────────────────────────────────────

const ProductCard = memo(function ProductCard({
  p, imgSizes,
}: { p: (typeof PRODUCTS)[number]; imgSizes: string }) {
  return (
    <Link href={`/plant-detail/${p.id}`} className="block group">
      <div className="bg-white rounded-xl md:rounded-2xl border border-[#F0F0F0] overflow-hidden hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation">
        <div className="relative overflow-hidden bg-accent" style={{ aspectRatio: "1 / 1" }}>
          <Image src={p.imageUrl} alt={p.name} fill sizes={imgSizes}
            className="object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        </div>
        <div className="p-2 md:p-3">
          <p className="font-bold text-[11px] md:text-xs text-[#1A2E1A] line-clamp-2 leading-tight mb-1">{p.name}</p>
          <div className="flex items-center gap-0.5 md:gap-1 mb-1">
            <Star className="h-2.5 w-2.5 md:h-3 md:w-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
            <span className="text-[10px] md:text-xs text-muted-foreground">{p.rating}</span>
          </div>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="font-extrabold text-xs md:text-sm text-primary">₹{p.price}</span>
            {p.oldPrice && (
              <span className="text-[9px] md:text-[10px] text-muted-foreground line-through">₹{p.oldPrice}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ReviewCard
// ─────────────────────────────────────────────────────────────────────────────

const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  const dateStr = review.createdAt?.seconds
    ? new Date(review.createdAt.seconds * 1000).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "Just now";
  return (
    <article className="bg-white border border-[#F0F0F0] rounded-2xl md:rounded-3xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-sm flex-shrink-0" aria-hidden="true">
            {review.userName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs md:text-sm truncate">{review.userName}</p>
            <time
              dateTime={review.createdAt?.seconds
                ? new Date(review.createdAt.seconds * 1000).toISOString()
                : undefined}
              className="text-[10px] md:text-xs text-muted-foreground"
            >
              {dateStr}
            </time>
          </div>
        </div>
        <StarDisplay rating={review.rating} size="sm" />
      </div>
      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-10 md:pl-12">
        {review.comment}
      </p>
    </article>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// WriteReviewForm
// ─────────────────────────────────────────────────────────────────────────────

function WriteReviewForm({
  hasReviewed,
  userRating,
  setUserRating,
  userComment,
  setUserComment,
  isSubmittingReview,
  onSubmit,
}: {
  hasReviewed: boolean;
  userRating: number;
  setUserRating: (v: number) => void;
  userComment: string;
  setUserComment: (v: string) => void;
  isSubmittingReview: boolean;
  onSubmit: () => void;
}) {
  if (hasReviewed) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 md:p-4 text-xs md:text-sm font-semibold text-emerald-700 flex items-center gap-2">
        <span aria-hidden="true">✅</span> You have already reviewed this plant. Thank you!
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl md:rounded-3xl p-4 md:p-6 space-y-3 md:space-y-4">
      <h3 className="font-bold text-base md:text-lg text-primary">Write a Review</h3>
      <div>
        <p className="text-xs md:text-sm text-muted-foreground mb-2">Your Rating</p>
        <StarPicker value={userRating} onChange={setUserRating} />
      </div>
      <div>
        <label htmlFor="review-comment" className="block text-xs md:text-sm text-muted-foreground mb-2">
          Your Review
        </label>
        <Textarea
          id="review-comment"
          placeholder="Share your experience with this plant..."
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          className="rounded-xl md:rounded-2xl min-h-[90px] md:min-h-[100px] border-[#E8E8E8] text-sm resize-none"
        />
      </div>
      <Button
        onClick={onSubmit}
        disabled={isSubmittingReview}
        className="w-full sm:w-auto rounded-full gap-2 text-sm h-11 touch-manipulation"
      >
        {isSubmittingReview
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Send className="h-4 w-4" />}
        Submit Review
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PlantDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  // ── Derived product data ──────────────────────────────

  const product = useMemo(
    () =>
      PRODUCTS.find((p) => p.id === id || p.id === String(id)) ||
      PRODUCTS.find((p) => String(p.id) === String(id)) ||
      PRODUCTS[0],
    [id]
  );

  const similarProducts = useMemo(
    () => PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 6),
    [product.category, product.id]
  );

  const galleryImages = useMemo(
    () => [
      product.imageUrl,
      ...[1, 2, 3].map((i) => `https://picsum.photos/seed/plant${i}${product.id}/400/400`),
    ],
    [product.imageUrl, product.id]
  );

  const discountPct = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  // ── State ─────────────────────────────────────────────────────────────────

  const [qty, setQty] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Review form state
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  // ── Firebase ──────────────────────────────────────────────────────────────

  const { user } = useUser();
  const db = useFirestore();

  const wishlistRef = useMemoFirebase(
    () => (user?.uid ? doc(db, "users", user.uid, "wishlist", product.id) : null),
    [db, user?.uid, product.id]
  );
  const { data: wishlistItem } = useDoc(wishlistRef);
  const isWishlisted = !!wishlistItem;

  const userProfileRef = useMemoFirebase(
    () => (!user?.uid ? null : doc(db, "users", user.uid)),
    [db, user?.uid]
  );
  const { data: profile } = useDoc(userProfileRef);
  const monterraUser = profile as unknown as MonterraUser;
  const earning = calculateEarning(product.price, (product as any).affiliateCommission);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    trackRecentlyViewed(product.id);
    setRecentlyViewedIds(getRecentlyViewed(product.id));
  }, [product.id]);

  useEffect(() => {
    if (!db || !product.id) return;
    let cancelled = false;
    (async () => {
      setReviewsLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, "products", String(product.id), "reviews"), orderBy("createdAt", "desc"))
        );
        if (cancelled) return;
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
        setReviews(data);
        if (user?.uid) setHasReviewed(data.some((r) => r.userId === user.uid));
      } catch { /* fail silently */ }
      finally { if (!cancelled) setReviewsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [db, product.id, user?.uid]);

  // ── Derived values ────────────────────────────────────────────────────────

  const avgRating = useMemo(
    () =>
      reviews.length
        ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
        : product.rating,
    [reviews, product.rating]
  );

  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((rvId) => PRODUCTS.find((p) => p.id === rvId))
        .filter(Boolean) as typeof PRODUCTS,
    [recentlyViewedIds]
  );

  // ── Handlers ─────────────────────────

  const handleToggleWishlist = useCallback(async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to use wishlist", variant: "destructive" });
      return;
    }
    const docRef = doc(db, "users", user.uid, "wishlist", product.id);
    if (isWishlisted) {
      await deleteDoc(docRef);
      toast({ title: "Removed from Wishlist" });
    } else {
      setIsAnimating(true);
      await setDoc(docRef, { productId: product.id, createdAt: serverTimestamp() });
      toast({ title: "Added to Wishlist ❤️" });
      setTimeout(() => setIsAnimating(false), 400);
    }
  }, [user, db, product.id, isWishlisted]);

  const handleAddToCart = useCallback(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("plantshop_cart") || "[]");
      const existing = cart.find(
        (item: any) => (item.id || item.productId || item.plantId) === product.id
      );
      if (existing) {
        existing.quantity = (existing.quantity || 0) + qty;
        existing.id = product.id;
        delete existing.productId;
        delete existing.plantId;
      } else {
        cart.push({ id: product.id, quantity: qty });
      }
      localStorage.setItem("plantshop_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
      toast({ title: "Added to cart!", description: `${qty} × ${product.name}` });
    } catch (err) {
      console.error("handleAddToCart:", err);
    }
  }, [product.id, product.name, qty]);

  const handleBuyItNow = useCallback(() => {
    try {
      sessionStorage.setItem("buynow_cart", JSON.stringify([{ id: product.id, quantity: qty }]));
      router.push("/checkout?mode=buynow");
    } catch (err) {
      console.error("handleBuyItNow:", err);
    }
  }, [product.id, qty, router]);

  const handleSubmitReview = useCallback(async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to leave a review", variant: "destructive" });
      return;
    }
    if (userRating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (!userComment.trim()) {
      toast({ title: "Please write a comment", variant: "destructive" });
      return;
    }
    setIsSubmittingReview(true);
    try {
      const reviewRef = doc(db, "products", String(product.id), "reviews", user.uid);
      const reviewData = {
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        rating: userRating,
        comment: userComment.trim(),
        createdAt: serverTimestamp(),
      };
      await setDoc(reviewRef, reviewData);
      setReviews((prev) => [{ id: user.uid, ...reviewData, createdAt: null }, ...prev]);
      setHasReviewed(true);
      setUserRating(0);
      setUserComment("");
      toast({ title: "Review submitted! 🌿" });
    } catch {
      toast({ title: "Failed to submit review", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  }, [user, db, product.id, userRating, userComment]);

  const CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px";

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full" id="main-content">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-10 lg:py-14 pb-24 sm:pb-6">

          {/* ── Product Hero ── */}
          <section
            aria-label="Product details"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-14 mb-10 md:mb-16 lg:mb-24"
          >
            <ImageGallery
              images={galleryImages}
              productName={product.name}
              isWishlisted={isWishlisted}
              isAnimating={isAnimating}
              onToggleWishlist={handleToggleWishlist}
              product={product}
            />

            {/* Info panel */}
            <div className="flex flex-col">

              {/* Category + title + rating */}
              <div className="mb-4 space-y-2 md:space-y-3">
                <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-xs md:text-sm text-primary bg-accent font-bold">
                  {product.category}
                </Badge>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold text-primary leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 md:h-5 md:w-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    <span className="font-bold text-sm md:text-lg">{avgRating}</span>
                  </div>
                  <span className="text-muted-foreground border-l pl-2 md:pl-4 text-xs md:text-sm font-medium">
                    {reviews.length || product.reviewsCount} verified reviews
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-xs">
                    In Stock
                  </Badge>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4 md:mb-6 flex items-baseline gap-2 md:gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary">
                  ₹{product.price}
                </span>
                {product.oldPrice && (
                  <span className="text-lg md:text-2xl text-muted-foreground line-through font-medium">
                    ₹{product.oldPrice}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {discountPct}% off
                  </span>
                )}
              </div>

              {/* Affiliate banner */}
              {monterraUser?.affiliateApproved && earning && (
                <div className="mb-4 p-3 md:p-4 bg-emerald-50 border border-emerald-100 rounded-xl md:rounded-2xl flex items-center gap-3">
                  <span className="text-xl flex-shrink-0" aria-hidden="true">💰</span>
                  <p className="text-xs md:text-sm font-bold text-emerald-800">
                    Earn ₹{earning} when someone buys through your link 🌱
                  </p>
                </div>
              )}

              {/* Description */}
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground mb-4 md:mb-6 leading-relaxed">
                {product.description}
              </p>

              {/* Care badges */}
              <div className="grid grid-cols-2 gap-2 md:gap-4 mb-6 md:mb-8">
                <div className="bg-accent rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white flex items-center justify-center text-primary flex-shrink-0">
                    <Sun className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs md:text-sm">Light Needs</h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">Bright Indirect</p>
                  </div>
                </div>
                <div className="bg-accent rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white flex items-center justify-center text-primary flex-shrink-0">
                    <Droplets className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs md:text-sm">Watering</h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">Every 7–10 days</p>
                  </div>
                </div>
              </div>

              {/* ── Purchase Section ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg">
                  <Truck className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Free delivery on orders over ₹999
                </div>

                <div className="flex flex-col gap-3">
                  {/* Row: Qty + Add to Cart */}
                  <div className="flex items-center gap-3">
                    <QuantityStepper value={qty} onChange={setQty} />
                    <Button
                      className="h-12 rounded-full flex-1 font-bold gap-2 touch-manipulation shadow-sm"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-5 w-5" aria-hidden="true" /> Add to Cart
                    </Button>
                  </div>

                  {/* Row: Buy Now */}
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-12 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white font-extrabold transition-all touch-manipulation"
                    onClick={handleBuyItNow}
                  >
                    Buy It Now
                  </Button>
                </div>
              </div>

            </div>
          </section>

          {/* ── Tabs ── */}
          <section aria-label="Product info tabs" className="w-full mb-10 md:mb-16 lg:mb-24">
            <Tabs defaultValue="care" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-12 md:h-14 bg-transparent p-0 gap-5 md:gap-8 overflow-x-auto no-scrollbar flex-nowrap">
                {(["care", "details", "reviews"] as string[]).map((tab) => (
                  <TabsTrigger key={tab} value={tab}
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm md:text-base px-1 whitespace-nowrap flex-shrink-0 touch-manipulation">
                    {tab === "care" ? "Care Guide" : tab === "details" ? "All Details" : `Reviews (${reviews.length})`}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Care Guide */}
              <TabsContent value="care" className="py-5 md:py-8 space-y-4 md:space-y-6">
                <div className="prose max-w-none text-muted-foreground">
                  <h2 className="text-primary font-headline font-bold text-lg md:text-2xl mb-3">
                    How to keep your {product.name} happy
                  </h2>
                  <p className="text-sm md:text-base leading-relaxed">{product.careGuide}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 mt-5 md:mt-10">
                    {[
                      { title: "Temperature", body: "Ideal between 18°C and 24°C. Avoid cold drafts or direct heat vents." },
                      { title: "Humidity", body: "Prefers moderate to high humidity. Consider a humidifier or misting once a week." },
                    ].map(({ title, body }) => (
                      <div key={title} className="space-y-2">
                        <h3 className="font-bold text-primary text-base md:text-lg">{title}</h3>
                        <p className="text-sm md:text-base">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* All Details */}
              <TabsContent value="details" className="py-5 md:py-8">
                <div className="space-y-6 md:space-y-8">
                  {[
                    { title: "In the Box", rows: [{ label: "Pack of", value: "1" }] },
                    {
                      title: "General",
                      rows: [
                        { label: "SKU",             value: `GS-${product.id}-992` },
                        { label: "Scientific Name", value: "Monstera deliciosa" },
                        { label: "Category",        value: product.category },
                        { label: "Type",            value: "Indoor Plant" },
                      ],
                    },
                    {
                      title: "Plant Details",
                      rows: [
                        { label: "Difficulty Level",    value: "Easy to Medium" },
                        { label: "Light Requirement",   value: "Bright Indirect Light" },
                        { label: "Watering",            value: "Every 7–10 days" },
                        { label: "Pet Friendly",        value: "No",       cls: "text-red-500" },
                        { label: "Air Purifying",       value: "Yes",      cls: "text-emerald-600" },
                        { label: "Growth Rate",         value: "Moderate" },
                        { label: "Ideal Temperature",   value: "18°C – 24°C" },
                        { label: "Pot Included",        value: "Yes" },
                      ],
                    },
                    {
                      title: "Packaging & Delivery",
                      rows: [
                        { label: "Container Type",   value: "Nursery Pot" },
                        { label: "Pot Size",         value: "4 inch" },
                        { label: "Shipping Weight",  value: "~500g" },
                        { label: "Delivery",         value: "Free above ₹999" },
                      ],
                    },
                  ].map((section) => (
                    <div key={section.title}>
                      <h3 className="font-bold text-base md:text-lg text-primary mb-3 pb-2 border-b">
                        {section.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12">
                        {section.rows.map((row: any) => (
                          <div key={row.label} className="flex justify-between border-b py-2.5 md:py-3 gap-4">
                            <span className="text-muted-foreground font-medium text-sm md:text-base">{row.label}</span>
                            <span className={cn("font-bold text-right text-sm md:text-base", row.cls)}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Reviews */}
              <TabsContent value="reviews" className="py-5 md:py-8 space-y-5 md:space-y-8">

                {/* Rating summary */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-4 md:gap-6 bg-accent rounded-2xl md:rounded-3xl p-4 md:p-6">
                    <div className="text-center flex-shrink-0">
                      <p className="text-4xl md:text-5xl font-extrabold text-primary">{avgRating}</p>
                      <StarDisplay rating={Number(avgRating)} size="sm" />
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1 md:space-y-1.5 min-w-0">
                      {[5, 4, 3, 2, 1].map((s) => {
                        const count = reviews.filter((r) => r.rating === s).length;
                        const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={s} className="flex items-center gap-1.5 text-xs">
                            <span className="w-3 text-muted-foreground flex-shrink-0">{s}</span>
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 flex-shrink-0" aria-hidden="true" />
                            <div className="flex-1 h-1.5 md:h-2 bg-white rounded-full overflow-hidden min-w-0">
                              <div
                                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                                role="progressbar"
                                aria-valuenow={count}
                                aria-valuemin={0}
                                aria-valuemax={reviews.length}
                              />
                            </div>
                            <span className="w-4 text-muted-foreground flex-shrink-0 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <WriteReviewForm
                  hasReviewed={hasReviewed}
                  userRating={userRating}
                  setUserRating={setUserRating}
                  userComment={userComment}
                  setUserComment={setUserComment}
                  isSubmittingReview={isSubmittingReview}
                  onSubmit={handleSubmitReview}
                />

                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 md:py-12 bg-muted/30 rounded-2xl md:rounded-3xl border-2 border-dashed">
                    <Leaf className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 opacity-20" aria-hidden="true" />
                    <h3 className="text-lg md:text-xl font-bold">No reviews yet</h3>
                    <p className="text-sm text-muted-foreground">Be the first to review this plant!</p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4" aria-label="Customer reviews">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>

          {/* ── Similar Products ── */}
          {similarProducts.length > 0 && (
            <section aria-label="Similar plants" className="w-full mb-10 md:mb-16">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-headline font-extrabold text-primary">Similar Plants</h2>
                <Link href="/plants">
                  <Button variant="outline" className="rounded-full text-xs md:text-sm font-bold h-8 md:h-10 px-3 md:px-4 touch-manipulation">
                    View All →
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {similarProducts.map((p) => <ProductCard key={p.id} p={p} imgSizes={CARD_SIZES} />)}
              </div>
            </section>
          )}

          {/* ── Recently Viewed ── */}
          {recentlyViewedProducts.length > 0 && (
            <section aria-label="Recently viewed" className="w-full">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-xl md:text-2xl font-headline font-extrabold text-primary">Recently Viewed</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {recentlyViewedProducts.map((p) => <ProductCard key={p.id} p={p} imgSizes={CARD_SIZES} />)}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ── Fixed Mobile Bottom Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t p-3 flex items-center gap-3 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        
        <QuantityStepper value={qty} onChange={setQty} size="sm" />

        <Button 
          variant="outline" 
          className="flex-1 h-11 rounded-full border-2 border-primary text-primary font-extrabold text-xs"
          onClick={handleAddToCart}
        >
          Add to Cart
        </Button>
        <Button 
          className="flex-1 h-11 rounded-full font-extrabold text-xs"
          onClick={handleBuyItNow}
        >
          Buy Now
        </Button>
      </div>

      <Footer />
    </div>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { PRODUCTS } from "@/lib/mock-data";
import {
  Star, Truck, Heart, ShoppingCart,
  Minus, Plus, Sun, Droplets, Send, Loader2, ChevronRight, Share2
} from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import {
  doc, setDoc, deleteDoc, serverTimestamp,
  collection, getDocs, query, orderBy, Timestamp, addDoc
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/shared/ShareButton";
import { calculateEarning } from "@/lib/affiliateEngine";
import { MonterraUser } from "@/types/affiliate.types";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Timestamp | null;
}

export default function PlantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching ---
  const product = PRODUCTS.find((p) => String(p.id) === String(id)) || PRODUCTS[0];
  const similarProducts = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 6);

  // --- State ---
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const { user } = useUser();
  const db = useFirestore();

  // Firebase State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // --- Recently Viewed Logic ---
  useEffect(() => {
    const list = JSON.parse(localStorage.getItem("recently_viewed") || "[]");
    const filtered = list.filter((p: any) => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 6);
    localStorage.setItem("recently_viewed", JSON.stringify(updated));
    setRecentlyViewed(updated.filter(p => p.id !== product.id));
  }, [product.id]);

  // --- Firebase Hooks ---
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

  // --- Fetch Reviews ---
  useEffect(() => {
    if (!db || !product.id) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const q = query(collection(db, "products", String(product.id), "reviews"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
        setReviews(data);
        if (user?.uid) setHasReviewed(data.some((r) => r.userId === user.uid));
      } catch (e) { console.error(e); } finally { setReviewsLoading(false); }
    };
    fetchReviews();
  }, [db, product.id, user?.uid]);

  // --- Handlers ---
  const handleAddToCart = useCallback(() => {
    const cart = JSON.parse(localStorage.getItem("plantshop_cart") || "[]");
    const idx = cart.findIndex((item: any) => item.id === product.id);
    if (idx > -1) cart[idx].quantity += qty;
    else cart.push({ id: product.id, quantity: qty });
    localStorage.setItem("plantshop_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    toast({ title: "Added to cart", description: `${product.name} (x${qty})` });
  }, [product, qty]);

  const handleBuyItNow = () => {
    sessionStorage.setItem("buynow_cart", JSON.stringify([{ id: product.id, quantity: qty }]));
    router.push("/checkout?mode=buynow");
  };

  const handleToggleWishlist = async () => {
    if (!user) return toast({ title: "Login required", variant: "destructive" });
    const docRef = doc(db, "users", user.uid, "wishlist", product.id);
    if (isWishlisted) {
      await deleteDoc(docRef);
      toast({ title: "Removed from wishlist" });
    } else {
      await setDoc(docRef, { productId: product.id, createdAt: serverTimestamp() });
      toast({ title: "Added to wishlist ❤️" });
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: "Login required", description: "Please sign in to leave a review.", variant: "destructive" });
      return;
    }
    if (userRating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }
    if (!userComment.trim()) {
      toast({ title: "Comment required", description: "Please write a few words about the plant.", variant: "destructive" });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewData = {
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        rating: userRating,
        comment: userComment,
        createdAt: serverTimestamp(),
      };

      const reviewsColRef = collection(db, "products", String(product.id), "reviews");
      await addDoc(reviewsColRef, reviewData);

      setHasReviewed(true);
      toast({ title: "Review submitted!", description: "Thank you for your feedback 🌿" });
      
      // Update local state
      const newReview: Review = {
        id: Date.now().toString(),
        ...reviewData,
        createdAt: Timestamp.now(),
      } as Review;
      setReviews(prev => [newReview, ...prev]);
      
      setUserRating(0);
      setUserComment("");
    } catch (e) {
      console.error("Review submission error:", e);
      toast({ title: "Error submitting review", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const galleryImages = [
    product.imageUrl,
    ...([1, 2, 3].map((i) => `https://picsum.photos/seed/plant${i}${product.id}/800/800`)),
  ];

  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : product.rating;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Header />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href="/plants" className="hover:text-primary transition-colors">Shop All</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-slate-900 truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* --- LEFT: Image Gallery --- */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Image with Swipe Support */}
            <div 
              className="relative aspect-square w-full rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-slate-100 flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
              ref={scrollContainerRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const index = Math.round(el.scrollLeft / el.clientWidth);
                if (index !== selectedImage) setSelectedImage(index);
              }}
            >
              {galleryImages.map((img, i) => (
                <div key={i} className="relative min-w-full h-full snap-center">
                  <Image
                    src={img}
                    alt={`${product.name} view ${i + 1}`}
                    fill
                    className="object-cover"
                    priority={i === 0}
                    sizes="(max-width: 1024px) 100vw, 800px"
                  />
                </div>
              ))}
              
              {/* Overlays */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="rounded-full shadow-lg bg-white/90 backdrop-blur"
                  onClick={handleToggleWishlist}
                >
                  <Heart className={cn("h-5 w-5", isWishlisted ? "fill-red-500 text-red-500" : "text-slate-600")} />
                </Button>
                <ShareButton product={product} className="rounded-full shadow-lg bg-white/90 backdrop-blur" />
              </div>

              {/* Mobile Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                {galleryImages.map((_, i) => (
                  <div key={i} className={cn("h-1.5 rounded-full transition-all", selectedImage === i ? "w-6 bg-primary" : "w-1.5 bg-white/60")} />
                ))}
              </div>
            </div>

            {/* Thumbnails - Desktop Layout */}
            <div className="hidden md:grid grid-cols-4 gap-4">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedImage(i);
                    scrollContainerRef.current?.scrollTo({ left: i * scrollContainerRef.current.clientWidth, behavior: 'smooth' });
                  }}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    selectedImage === i ? "border-primary ring-2 ring-primary/10" : "border-transparent opacity-80 hover:opacity-100"
                  )}
                >
                  <Image src={img} alt="Thumbnail" fill className="object-cover" sizes="200px" />
                </button>
              ))}
            </div>
          </div>

          {/* --- RIGHT: Product Info --- */}
          <div className="lg:col-span-5 flex flex-col">
            <header className="space-y-4">
              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {product.category}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-bold">{avgRating}</span>
                </div>
                <span className="text-slate-400 text-sm font-medium">{reviews.length} Verified Reviews</span>
              </div>
            </header>

            <div className="mt-6 flex items-baseline gap-4">
              <span className="text-4xl font-black text-primary">₹{product.price}</span>
              {product.oldPrice && (
                <span className="text-xl text-slate-400 line-through font-medium">₹{product.oldPrice}</span>
              )}
            </div>

            {earning && monterraUser?.affiliateApproved && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                <div className="text-2xl">💸</div>
                <p className="text-sm font-bold text-emerald-800">
                  Earn ₹{earning} by sharing this plant!
                </p>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">About this plant</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                {product.description}
              </p>
            </div>

            {/* Care Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Sun className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Sunlight</p>
                  <p className="text-sm font-bold">Indirect Light</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Droplets className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Watering</p>
                  <p className="text-sm font-bold">7-10 Days</p>
                </div>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex flex-col gap-4 mt-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-slate-100 rounded-full h-14 bg-slate-50 px-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white" onClick={() => setQty(Math.max(1, qty - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center font-black text-lg">{qty}</span>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white" onClick={() => setQty(qty + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="flex-1 h-14 rounded-full text-lg font-black gap-2 shadow-xl shadow-primary/20" onClick={handleAddToCart}>
                  <ShoppingCart className="h-5 w-5" /> Add to Cart
                </Button>
              </div>
              <Button variant="outline" className="h-14 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white font-black text-lg" onClick={handleBuyItNow}>
                Buy It Now
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-sm text-slate-500">
              <Truck className="h-5 w-5 text-primary" />
              <span>Free delivery on orders above <span className="font-bold text-slate-900">₹999</span></span>
            </div>
          </div>
        </div>

        {/* --- TABS SECTION --- */}
        <section className="mt-16 md:mt-24">
          <Tabs defaultValue="care">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-12 p-0 gap-8 overflow-x-auto no-scrollbar whitespace-nowrap">
              {['care', 'details', 'reviews'].map(t => (
                <TabsTrigger 
                  key={t} value={t} 
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black text-slate-400 data-[state=active]:text-primary px-0 text-base md:text-lg"
                >
                  {t === 'care' ? 'Care Guide' : t === 'details' ? 'Specifications' : `Reviews (${reviews.length})`}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="care" className="py-10 animate-in fade-in slide-in-from-bottom-2">
              <article className="max-w-3xl prose prose-slate">
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Thriving with your {product.name}</h3>
                <p className="text-slate-600 text-lg leading-relaxed">{product.careGuide}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                    <h4 className="font-black text-primary mb-2">Ideal Setting</h4>
                    <p className="text-sm text-slate-600">Keep in a bright spot away from direct midday sun to prevent leaf burn.</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <h4 className="font-black text-slate-900 mb-2">Quick Tip</h4>
                    <p className="text-sm text-slate-600">Rotate the plant 90° every week to ensure even growth toward the light.</p>
                  </div>
                </div>
              </article>
            </TabsContent>

            <TabsContent value="reviews" className="py-10 space-y-12">
              {/* Reviews Summary and Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1 space-y-6">
                  <div className="text-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="text-6xl font-black text-primary mb-2">{avgRating}</p>
                    <div className="flex justify-center gap-1 mb-2 text-yellow-400">
                      {[1,2,3,4,5].map(s => <Star key={s} className={cn("h-5 w-5", s <= Math.round(Number(avgRating)) ? "fill-current" : "text-slate-200")} />)}
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Global Rating</p>
                  </div>
                  
                  {!hasReviewed && (
                    <div className="space-y-4">
                      <h4 className="font-black text-slate-900">Write a Review</h4>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setUserRating(s)} className="p-1">
                            <Star className={cn("h-8 w-8", s <= userRating ? "fill-yellow-400 text-yellow-400" : "text-slate-200")} />
                          </button>
                        ))}
                      </div>
                      <Textarea 
                        placeholder="Your thoughts..." 
                        value={userComment} 
                        onChange={e => setUserComment(e.target.value)}
                        className="rounded-2xl border-slate-200 focus:ring-primary h-32"
                      />
                      <Button onClick={handleSubmitReview} disabled={isSubmittingReview} className="w-full rounded-full h-12 font-bold">
                        {isSubmittingReview ? <Loader2 className="animate-spin" /> : "Submit Review"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {reviewsLoading ? <Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /> : (
                    reviews.map(r => (
                      <div key={r.id} className="p-6 border-b border-slate-100 flex gap-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center font-black text-primary">
                          {r.userName[0].toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">{r.userName}</p>
                          <div className="flex gap-0.5 text-yellow-400">
                            {[1,2,3,4,5].map(s => <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-current" : "text-slate-200")} />)}
                          </div>
                          <p className="text-slate-600 pt-2 leading-relaxed">{r.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* --- SIMILAR PRODUCTS --- */}
        <section className="mt-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Similar Plants</h2>
            <Link href="/plants" className="text-primary font-bold hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* --- RECENTLY VIEWED --- */}
        {recentlyViewed.length > 0 && (
          <section className="mt-24 pb-20 md:pb-0">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-8">Recently Viewed</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentlyViewed.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* --- MOBILE STICKY BAR --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] safe-area-bottom">
        <div className="flex gap-3 items-center">
          <div className="flex items-center bg-slate-100 rounded-full h-12 px-1 border border-slate-200">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setQty(Math.max(1, qty - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-black">{qty}</span>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setQty(qty + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button className="flex-1 h-12 rounded-full font-black text-sm shadow-lg shadow-primary/20" onClick={handleAddToCart}>
            Add to Cart
          </Button>
          <Button variant="secondary" className="h-12 w-12 rounded-full flex items-center justify-center bg-slate-100" onClick={handleBuyItNow}>
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Footer />
      
      {/* Utility Styles */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-area-bottom { padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)); }
      `}</style>
    </div>
  );
}

// --- Subcomponent: Product Card ---
function ProductCard({ product }: { product: any }) {
  return (
    <Link href={`/plant-detail/${product.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all group-hover:shadow-xl group-hover:shadow-primary/5">
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <Image 
            src={product.imageUrl} 
            alt={product.name} 
            fill 
            loading="lazy"
            className="object-cover group-hover:scale-105 transition-transform duration-500" 
            sizes="250px"
          />
        </div>
        <div className="p-3 md:p-4 space-y-1">
          <h4 className="font-bold text-slate-900 line-clamp-1 text-sm md:text-base">{product.name}</h4>
          <div className="flex items-baseline gap-2">
            <span className="font-black text-primary">₹{product.price}</span>
            {product.oldPrice && <span className="text-[10px] text-slate-400 line-through">₹{product.oldPrice}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
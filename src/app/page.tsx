
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Truck, ShieldCheck, Flower2, Clock, Loader2 } from "lucide-react";
import AffiliateBanner from "@/app/homepage/components/AffiliateBanner";
import CategorySection from "@/app/homepage/components/CategorySection";
import HeroSection from "@/app/homepage/components/HeroSection";
import MarqueeStrip from "@/app/homepage/components/MarqueeStrip";
import OfferBanner from "@/app/homepage/components/OfferBanner";
import ProductGrid from "@/app/homepage/components/ProductGrid";
import StatsBar from "@/app/homepage/components/StatsBar";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

export default function Home() {
  const db = useFirestore();
  const settingsRef = useMemoFirebase(() => doc(db, "home_settings", "sections"), [db]);
  const { data: sections, isLoading } = useDoc(settingsRef);

  // Defaults if Firestore is empty
  const config = sections || {
    topRated: { enabled: true, title: "Top Rated Plants" },
    crowdFavorites: { enabled: true, title: "Crowd Favorites" },
    topSales: { enabled: true, title: "Best Sellers" },
    newArrivals: { enabled: true, title: "New Arrivals" }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <HeroSection />
        <MarqueeStrip />
        <StatsBar />
        <CategorySection />

        {config.newArrivals?.enabled && (
          <ProductGrid 
            title={config.newArrivals.title}
            subtitle="Greenhouse Fresh" 
            filterKey="new" 
            limit={4} 
          />
        )}

        <OfferBanner />

        {config.crowdFavorites?.enabled && (
          <ProductGrid 
            title={config.crowdFavorites.title}
            subtitle="Most Loved" 
            filterKey="bestseller" 
            limit={4} 
          />
        )}

        <section className="py-12 md:py-20 bg-primary text-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center">
                  <Truck className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <h4 className="font-headline font-bold text-sm md:text-lg">Safe Delivery</h4>
                <p className="text-white/70 text-[11px] md:text-sm">Perfect condition delivery guaranteed.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <h4 className="font-headline font-bold text-sm md:text-lg">Quality Guaranteed</h4>
                <p className="text-white/70 text-[11px] md:text-sm">Hand-selected premium plants.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center">
                  <Flower2 className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <h4 className="font-headline font-bold text-sm md:text-lg">Free Care Guides</h4>
                <p className="text-white/70 text-[11px] md:text-sm">Expert advice with every order.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <h4 className="font-headline font-bold text-sm md:text-lg">24/7 Support</h4>
                <p className="text-white/70 text-[11px] md:text-sm">Plant experts just a chat away.</p>
              </div>
            </div>
          </div>
        </section>

        {config.topRated?.enabled && (
          <ProductGrid 
            title={config.topRated.title}
            subtitle="Handpicked For You" 
            filterKey="featured" 
            limit={8} 
          />
        )}

        <AffiliateBanner />
      </main>

      <Footer />
    </div>
  );
}

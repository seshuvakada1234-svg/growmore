"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Truck, ShieldCheck, Flower2, Clock } from "lucide-react";

import AffiliateBanner from "@/app/homepage/components/AffiliateBanner";
import CategorySection from "@/app/homepage/components/CategorySection";
import HeroSection from "@/app/homepage/components/HeroSection";
import MarqueeStrip from "@/app/homepage/components/MarqueeStrip";
import OfferBanner from "@/app/homepage/components/OfferBanner";
import ProductGrid from "@/app/homepage/components/ProductGrid";
import StatsBar from "@/app/homepage/components/StatsBar";

import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

// 🔥 mappings
const SECTION_FILTER: Record<string, any> = {
  topSales: "bestseller",
  crowdFavorites: "featured",
  topRated: "all",
  newArrivals: "new",
};

const SECTION_SUBTITLE: Record<string, string> = {
  topSales: "Most Loved",
  crowdFavorites: "Crowd Picks",
  topRated: "Handpicked For You",
  newArrivals: "Greenhouse Fresh",
};

export default function Home() {
  const db = useFirestore();

  const sectionsRef = useMemoFirebase(
    () => doc(db, "home_settings", "sections"),
    [db]
  );

  const { data: sectionsData } = useDoc(sectionsRef);

  const sections = React.useMemo(() => {
    if (!sectionsData) return [];

    const { updatedAt, ...rest } = sectionsData as any;

    return Object.entries(rest)
      .map(([key, val]: [string, any]) => ({
        key,
        title: val.title || key,
        enabled: val.enabled ?? true,
        imageUrl: val.imageUrl || "",
        imageUrl2: val.imageUrl2 || "",
        productIds: val.productIds || [],
        category: val.category || "",
        order: val.order ?? 99,
      }))
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);
  }, [sectionsData]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        <HeroSection />
        <MarqueeStrip />
        <StatsBar />
        <CategorySection />

        {/* 🔥 DYNAMIC SECTIONS */}
        {sections.map((section, idx) => (
          <React.Fragment key={section.key}>
            <ProductGrid
              title={section.title}
              subtitle={SECTION_SUBTITLE[section.key] || "For You"}
              filterKey={
                section.productIds?.length > 0
                  ? undefined
                  : section.category && section.category !== "all"
                  ? undefined
                  : SECTION_FILTER[section.key] || "all"
              }
              categoryFilter={
                section.productIds?.length > 0
                  ? undefined
                  : section.category && section.category !== "all"
                  ? section.category
                  : undefined
              }
              pickedProductIds={
                section.productIds?.length > 0
                  ? section.productIds
                  : undefined
              }
              bannerImageUrl={section.imageUrl}
              bannerImageUrl2={section.imageUrl2}
              limit={5}
              showViewAll
              viewAllHref="/plants"
            />

            {/* banners */}
            {idx === 0 && <OfferBanner />}
            {idx === 2 && <AffiliateBanner />}
          </React.Fragment>
        ))}

        {/* features */}
        <section className="py-12 md:py-20 bg-primary text-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { icon: Truck, title: "Safe Delivery", desc: "Perfect condition delivery guaranteed." },
                { icon: ShieldCheck, title: "Quality Guaranteed", desc: "Hand-selected premium plants." },
                { icon: Flower2, title: "Free Care Guides", desc: "Expert advice with every order." },
                { icon: Clock, title: "24/7 Support", desc: "Plant experts just a chat away." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center text-center gap-3 md:gap-4">
                  <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <h4 className="font-headline font-bold text-sm md:text-lg">{title}</h4>
                  <p className="text-white/70 text-[11px] md:text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
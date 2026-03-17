'use client';

import React from 'react';
import { Header } from "@/components/layout/Header";
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import StatsBar from './components/StatsBar';
import CategorySection from './components/CategorySection';
import ProductGrid from './components/ProductGrid';
import OfferBanner from './components/OfferBanner';
import AffiliateBanner from './components/AffiliateBanner';
import MarqueeStrip from './components/MarqueeStrip';
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

// ── Section key → filterKey mapping ─────────────────────────────────────────
const SECTION_FILTER: Record<string, any> = {
  topSales:       'bestseller',
  crowdFavorites: 'featured',
  topRated:       'all',
  newArrivals:    'new',
};

// ── Section key → subtitle mapping ──────────────────────────────────────────
const SECTION_SUBTITLE: Record<string, string> = {
  topSales:       'Most Loved',
  crowdFavorites: 'Crowd Picks',
  topRated:       'Handpicked For You',
  newArrivals:    'Just In',
};

export default function HomepagePage() {
  const db = useFirestore();

  // Load sections config from Firestore
  const sectionsRef = useMemoFirebase(() => doc(db, "home_settings", "sections"), [db]);
  const { data: sectionsData } = useDoc(sectionsRef);

  // Default sections if Firestore not loaded yet
  const defaultSections = [
    { key: 'newArrivals',    title: 'New Arrivals',     enabled: true },
    { key: 'topSales',       title: 'Best Sellers',     enabled: true },
    { key: 'crowdFavorites', title: 'Crowd Favorites',  enabled: true },
    { key: 'topRated',       title: 'Top Rated Plants', enabled: true },
  ];

  // Build sections list from Firestore data
  const sections = React.useMemo(() => {
    if (!sectionsData) return defaultSections;

    // Filter out metadata fields like updatedAt
    const { updatedAt, ...rest } = sectionsData;
    return Object.entries(rest)
      .map(([key, val]: [string, any]) => ({
        key,
        title:        val.title        || key,
        enabled:      val.enabled      ?? true,
        imageUrl:     val.imageUrl     || '',
        imageUrl2:    val.imageUrl2    || '', // Fix: Extract second banner
        productIds:   val.productIds   || [],
        category:     val.category     || '',
        isCustom:     val.isCustom     || false,
        order:        val.order        ?? 99,
      }))
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);
  }, [sectionsData]);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <Header />
      <main className="pb-16 sm:pb-0">

        {/* Hero */}
        <HeroSection />

        {/* Stats */}
        <StatsBar />

        {/* Marquee */}
        <MarqueeStrip />

        {/* Categories */}
        <CategorySection />

        {/* Dynamic Sections from Home Editor */}
        {sections.map((section, idx) => (
          <React.Fragment key={section.key}>
            <ProductGrid
              title={section.title}
              subtitle={SECTION_SUBTITLE[section.key] || 'For You'}
              filterKey={
                section.productIds?.length > 0
                  ? undefined  // hand-picked → no filter needed
                  : section.category && section.category !== 'all'
                    ? undefined
                    : SECTION_FILTER[section.key] || 'all'
              }
              categoryFilter={
                section.category && section.category !== 'all'
                  ? section.category
                  : undefined
              }
              pickedProductIds={
                section.productIds?.length > 0
                  ? section.productIds
                  : undefined
              }
              bannerImageUrl={section.imageUrl || ''}
              bannerImageUrl2={section.imageUrl2 || ''}
              limit={5}
              showViewAll
              viewAllHref="/plants"
            />

            {/* Insert Offer Banner after 2nd section */}
            {idx === 1 && <OfferBanner />}

            {/* Insert Affiliate Banner after 3rd section */}
            {idx === 2 && <AffiliateBanner />}
          </React.Fragment>
        ))}

      </main>
      <Footer />
    </div>
  );
}

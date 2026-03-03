import React from 'react';
import type { Metadata } from 'next';
import { Header } from "@/components/layout/Header";
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import StatsBar from './components/StatsBar';
import CategorySection from './components/CategorySection';
import ProductGrid from './components/ProductGrid';
import OfferBanner from './components/OfferBanner';
import AffiliateBanner from './components/AffiliateBanner';
import MarqueeStrip from './components/MarqueeStrip';

export const metadata: Metadata = {
  title: 'Monterra – India\'s Best Online Plant Store | Grow Naturally',
  description: 'Shop 500+ indoor plants, succulents, and outdoor plants online with Monterra. Free delivery above ₹499. 100% live plant guarantee. Bestsellers, new arrivals & affiliate rewards.',
  keywords: 'buy plants online, indoor plants, succulents, air purifying plants, plant delivery India, Monterra',
};

export default function HomepagePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <Header />

      <main>
        {/* Hero */}
        <HeroSection />

        {/* Stats */}
        <StatsBar />

        {/* Marquee */}
        <MarqueeStrip />

        {/* Categories */}
        <CategorySection />

        {/* New Arrivals */}
        <ProductGrid
          title="New Arrivals"
          subtitle="Just In"
          filterKey="new"
          limit={4}
          showViewAll
          viewAllHref="/plant-listing"
        />

        {/* Offer Banners */}
        <OfferBanner />

        {/* Bestsellers */}
        <ProductGrid
          title="Bestselling Plants"
          subtitle="Most Loved"
          filterKey="bestseller"
          limit={8}
          showViewAll
          viewAllHref="/plant-listing"
        />

        {/* Affiliate Banner */}
        <AffiliateBanner />

        {/* All Featured */}
        <ProductGrid
          title="Featured Plants"
          subtitle="Handpicked For You"
          filterKey="featured"
          limit={8}
          showViewAll
          viewAllHref="/plant-listing"
        />
      </main>

      <Footer />
    </div>
  );
}

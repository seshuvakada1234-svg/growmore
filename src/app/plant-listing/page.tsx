
import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import PlantListingGrid from './components/PlantListingGrid';

export const metadata: Metadata = {
  title: 'All Plants | PlantShop India',
  description: 'Browse our extensive collection of indoor plants, succulents, air purifying plants and more. Use filters to find the perfect plant for your space.',
};

export default function PlantListingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <Header />
      <main>
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <div className="text-5xl mb-4" style={{ animation: 'float-y 2s ease-in-out infinite' }}>🌿</div>
            <p className="text-[#4A6741] font-semibold">Cultivating your collection...</p>
          </div>
        }>
          <PlantListingGrid />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

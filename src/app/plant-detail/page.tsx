import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Header } from "@/components/layout/Header";
import Footer from '@/components/Footer';
import PlantDetailClient from './components/PlantDetailClient';

export const metadata: Metadata = {
  title: 'Plant Details | Monterra India',
  description: 'View detailed plant information, care guides, shipping info and customer reviews on Monterra. Buy premium plants online with free delivery above ₹499.',
};

export default function PlantDetailPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <Header />
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4" style={{ animation: 'float-y 2s ease-in-out infinite' }}>🌿</div>
          <p className="text-[#4A6741] font-semibold">Loading plant details...</p>
        </div>
      }>
        <PlantDetailClient />
      </Suspense>
      <Footer />
    </div>
  );
}

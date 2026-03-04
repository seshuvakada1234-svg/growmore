'use client';

import React from 'react';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">

      <Image
        src="https://picsum.photos/seed/hero/1200/800"
        alt="Plants"
        fill
        className="absolute inset-0 w-full h-full object-cover"
        priority
        data-ai-hint="lush plants"
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 max-w-7xl mx-auto px-12 flex flex-row items-center justify-between w-full">

        <div className="max-w-xl">
          <span className="bg-white/20 px-4 py-2 rounded-full text-white text-sm inline-block">
            New Arrivals
          </span>

          <h1 className="text-5xl font-bold mt-4 text-white leading-tight">
            Bring Nature Home
          </h1>

          <p className="mt-4 text-white text-base leading-relaxed opacity-90">
            Handpicked plants delivered fresh to your doorstep.
            500+ varieties, expert care guides included.
          </p>

          <div className="flex flex-row gap-4 mt-8">
            <button className="bg-white text-green-700 px-8 py-3 rounded-full font-bold hover:bg-white/90 transition-all active:scale-95">
              Shop Now
            </button>

            <button className="bg-black/40 text-white px-8 py-3 rounded-full font-bold hover:bg-black/60 transition-all border border-white/20 active:scale-95">
              View All Plants
            </button>
          </div>
        </div>

      </div>

    </section>
  );
}

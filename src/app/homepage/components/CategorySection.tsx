'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const CATEGORIES = [
  {
    id: 'indoor',
    label: 'Indoor Plants',
    count: '120+ plants',
    image: PlaceHolderImages.find(img => img.id === 'cat-indoor')?.imageUrl || "https://picsum.photos/seed/indoor/600/800",
    gradient: 'from-[#1B5E20]/80 to-transparent',
    emoji: '🪴'
  },
  {
    id: 'succulents',
    label: 'Succulents & Cacti',
    count: '85+ plants',
    image: PlaceHolderImages.find(img => img.id === 'cat-succulents')?.imageUrl || "https://picsum.photos/seed/succulent/600/800",
    gradient: 'from-[#E65100]/80 to-transparent',
    emoji: '🌵'
  },
  {
    id: 'outdoor',
    label: 'Outdoor Plants',
    count: '60+ plants',
    image: PlaceHolderImages.find(img => img.id === 'cat-outdoor')?.imageUrl || "https://picsum.photos/seed/outdoor/600/800",
    gradient: 'from-[#1565C0]/80 to-transparent',
    emoji: '🌳'
  },
  {
    id: 'tropical',
    label: 'Tropical Plants',
    count: '45+ plants',
    image: PlaceHolderImages.find(img => img.id === 'cat-tropical')?.imageUrl || "https://picsum.photos/seed/tropical/600/800",
    gradient: 'from-[#4527A0]/80 to-transparent',
    emoji: '🌴'
  },
  {
    id: 'air-purifying',
    label: 'Air Purifying',
    count: '90+ plants',
    image: PlaceHolderImages.find(img => img.id === 'cat-air-purifying')?.imageUrl || "https://picsum.photos/seed/air/600/800",
    gradient: 'from-[#006064]/80 to-transparent',
    emoji: '💨'
  },
  {
    id: 'gifting',
    label: 'Gift Plants',
    count: '30+ sets',
    image: PlaceHolderImages.find(img => img.id === 'cat-gifting')?.imageUrl || "https://picsum.photos/seed/gift/600/800",
    gradient: 'from-[#880E4F]/80 to-transparent',
    emoji: '🎁'
  }
];

export default function CategorySection() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-6 sm:py-10 md:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <div className="text-primary font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-0.5 sm:mb-1">Browse by Type</div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-[#1A2E1A] font-headline">Shop by Category</h2>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#D8EDD5] flex items-center justify-center hover:bg-[#F1F8E9] hover:border-[#388E3C] transition-all text-[#4A6741]"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#D8EDD5] flex items-center justify-center hover:bg-[#F1F8E9] hover:border-[#388E3C] transition-all text-[#4A6741]"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        {/* Category Cards — horizontal scroll on all screens */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 sm:pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => router.push(`/plants?cat=${cat.label}`)}
              className="flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer group relative shadow-md"
              style={{
                width: 'clamp(110px, 28vw, 208px)',
                height: 'clamp(150px, 35vw, 220px)'
              }}
            >
              <Image
                src={cat.image}
                alt={`${cat.label} collection`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                data-ai-hint={cat.label.toLowerCase()}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-70 group-hover:opacity-85 transition-opacity`}></div>
              <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
                <div className="text-lg sm:text-2xl mb-0.5 sm:mb-1">{cat.emoji}</div>
                <h3 className="text-white font-bold text-xs sm:text-sm leading-tight">{cat.label}</h3>
                <p className="text-white/75 text-[10px] sm:text-xs mt-0.5">{cat.count}</p>
              </div>

              {/* Hover Arrow */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-7 sm:h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Scroll hint dots */}
        <div className="flex justify-center gap-1 mt-2 sm:hidden">
          {CATEGORIES.map((_, i) => (
            <div key={i} className={`h-1 rounded-full bg-[#A5D6A7] ${i === 0 ? 'w-4' : 'w-1.5 opacity-40'}`} />
          ))}
        </div>

      </div>
    </section>
  );
}

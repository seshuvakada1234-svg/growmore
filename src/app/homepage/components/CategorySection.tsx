
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
      scrollRef.current.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-primary font-bold uppercase tracking-wider text-xs mb-1">Browse by Type</div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1A2E1A] font-headline">Shop by Category</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-full border border-[#D8EDD5] flex items-center justify-center hover:bg-[#F1F8E9] hover:border-[#388E3C] transition-all text-[#4A6741]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-full border border-[#D8EDD5] flex items-center justify-center hover:bg-[#F1F8E9] hover:border-[#388E3C] transition-all text-[#4A6741]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Cards – Horizontal Scroll */}
        <div 
          ref={scrollRef} 
          className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => router.push(`/plants?cat=${cat.label}`)}
              className="flex-shrink-0 w-44 md:w-52 rounded-2xl overflow-hidden cursor-pointer group relative shadow-md"
              style={{ height: 220 }}
            >
              <Image
                src={cat.image}
                alt={`${cat.label} collection`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                data-ai-hint={cat.label.toLowerCase()}
              />
            
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-70 group-hover:opacity-85 transition-opacity`}></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-2xl mb-1">{cat.emoji}</div>
                <h3 className="text-white font-bold text-sm leading-tight">{cat.label}</h3>
                <p className="text-white/75 text-xs mt-0.5">{cat.count}</p>
              </div>
              
              {/* Hover Arrow */}
              <div className="absolute top-3 right-3 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-3 w-3 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

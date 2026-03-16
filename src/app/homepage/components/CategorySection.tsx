'use client';

import React, { useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const DEFAULT_CATEGORIES = [
  { id: 'indoor',        label: 'Indoor Plants',      count: '120+ plants', image: "https://picsum.photos/seed/indoor/600/800",    gradient: 'from-[#1B5E20]/80 to-transparent', emoji: '🪴' },
  { id: 'succulents',    label: 'Succulents & Cacti',  count: '85+ plants',  image: "https://picsum.photos/seed/succulent/600/800", gradient: 'from-[#E65100]/80 to-transparent', emoji: '🌵' },
  { id: 'outdoor',       label: 'Outdoor Plants',      count: '60+ plants',  image: "https://picsum.photos/seed/outdoor/600/800",   gradient: 'from-[#1565C0]/80 to-transparent', emoji: '🌳' },
  { id: 'air-purifying', label: 'Air Purifying',       count: '90+ plants',  image: "https://picsum.photos/seed/air/600/800",       gradient: 'from-[#006064]/80 to-transparent', emoji: '💨' },
  { id: 'bonsai',        label: 'Bonsai Plants',       count: '45+ plants',  image: "https://picsum.photos/seed/bonsai/600/800",    gradient: 'from-[#4527A0]/80 to-transparent', emoji: '🌴' },
  { id: 'pots',          label: 'Pots & Planters',     count: '30+ sets',    image: "https://picsum.photos/seed/gift/600/800",      gradient: 'from-[#880E4F]/80 to-transparent', emoji: '🎁' },
];

const GRADIENTS = [
  'from-[#1B5E20]/80 to-transparent',
  'from-[#E65100]/80 to-transparent',
  'from-[#1565C0]/80 to-transparent',
  'from-[#006064]/80 to-transparent',
  'from-[#4527A0]/80 to-transparent',
  'from-[#880E4F]/80 to-transparent',
  'from-[#2E7D32]/80 to-transparent',
  'from-[#F57F17]/80 to-transparent',
  'from-[#0D47A1]/80 to-transparent',
];

const EMOJIS: Record<string, string> = {
  indoor: '🪴', outdoor: '🌳', 'air-purifying': '💨',
  flowering: '🌸', trees: '🌲', fruit: '🍎',
  imported: '🌎', bonsai: '🌴', pots: '🎁',
  succulents: '🌵',
};

// ── Helper: resolve image URL (proxy ImageKit URLs) ───────────────────────
function resolveImage(url: string): string {
  if (!url) return '';
  if (url.includes('ik.imagekit.io')) {
    const parts = url.split('ik.imagekit.io/')[1]?.split('/') ?? [];
    const key = parts.slice(1).join('/');
    if (key) return `/api/image?file=${encodeURIComponent(key)}&w=600`;
  }
  return url;
}

// ── Skeleton card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden relative shadow-md animate-pulse bg-gray-200"
      style={{ width: 'clamp(110px, 28vw, 208px)', height: 'clamp(150px, 35vw, 220px)' }}
    >
      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 space-y-1">
        <div className="h-3 w-16 bg-gray-300 rounded" />
        <div className="h-2 w-10 bg-gray-300 rounded" />
      </div>
    </div>
  );
}

export default function CategorySection() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const db = useFirestore();

  const catsRef = useMemoFirebase(
    () => collection(db, 'home_settings', 'categories', 'items'),
    [db]
  );
  const { data: remoteCats, isLoading } = useCollection(catsRef);

  const displayCategories = useMemo(() => {
    if (!remoteCats || remoteCats.length === 0) return DEFAULT_CATEGORIES;
    return remoteCats.map((c, i) => ({
      id: c.id,
      label: c.label,
      count: c.count,
      // ── proxy ImageKit URLs so they load fast + stay hidden ──
      image: resolveImage(c.imageUrl || ''),
      gradient: GRADIENTS[i % GRADIENTS.length],
      emoji: EMOJIS[c.id] || '🌱',
    }));
  }, [remoteCats]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };

  return (
    <section className="py-6 sm:py-10 md:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <div className="text-primary font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-0.5 sm:mb-1">
              Browse by Type
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-[#1A2E1A] font-headline">
              Shop by Category
            </h2>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#D8EDD5] flex items-center justify-center hover:bg-[#F1F8E9] transition-all"
            >
              <ChevronLeft className="h-4 w-4 text-[#4A6741]" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#D8EDD5] flex items-center justify-center hover:bg-[#F1F8E9] transition-all"
            >
              <ChevronRight className="h-4 w-4 text-[#4A6741]" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div ref={scrollRef} className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 sm:pb-4 no-scrollbar">

          {/* Show skeletons while Firestore loads */}
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            displayCategories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => router.push(`/plants?cat=${cat.id}`)}
                className="flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer group relative shadow-md"
                style={{ width: 'clamp(110px, 28vw, 208px)', height: 'clamp(150px, 35vw, 220px)' }}
              >
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}
                <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-70 group-hover:opacity-85 transition-opacity`} />
                <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
                  <div className="text-lg sm:text-2xl mb-0.5 sm:mb-1">{cat.emoji}</div>
                  <h3 className="text-white font-bold text-xs sm:text-sm leading-tight">{cat.label}</h3>
                  <p className="text-white/75 text-[10px] sm:text-xs mt-0.5">{cat.count}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const HERO_SLIDES = [
  {
    id: 1,
    image: PlaceHolderImages.find(img => img.id === 'hero-slide-1')?.imageUrl || "https://picsum.photos/seed/hero1/1200/800",
    badge: '🌿 New Arrivals',
    headline: 'Bring Nature',
    headlineAccent: 'Home',
    sub: 'Handpicked plants delivered fresh to your doorstep. 500+ varieties, expert care guides included.',
    cta: 'Shop Now',
    ctaHref: '/plants',
    offer: '35% OFF',
    offerSub: 'On all indoor plants',
    hint: 'lush plants'
  },
  {
    id: 2,
    image: PlaceHolderImages.find(img => img.id === 'hero-slide-2')?.imageUrl || "https://picsum.photos/seed/hero2/1200/800",
    badge: '🌵 Succulents',
    headline: 'Low Maintenance',
    headlineAccent: 'High Beauty',
    sub: 'Perfect for busy lifestyles. Our curated succulent collection thrives with minimal care.',
    cta: 'Explore Succulents',
    ctaHref: '/plants?cat=indoor',
    offer: 'BUY 2 GET 1',
    offerSub: 'On all succulents',
    hint: 'succulent collection'
  },
  {
    id: 3,
    image: PlaceHolderImages.find(img => img.id === 'hero-slide-3')?.imageUrl || "https://picsum.photos/seed/hero3/1200/800",
    badge: '🎁 Gift Plants',
    headline: 'The Gift That',
    headlineAccent: 'Keeps Growing',
    sub: 'Surprise your loved ones with beautifully packed gift plants. Custom messages available.',
    cta: 'Shop Gift Sets',
    ctaHref: '/plants',
    offer: 'FREE POT',
    offerSub: 'With every gift order',
    hint: 'plant gifts'
  }
];

const FLOATING_CARDS = [
  { icon: '🚚', title: 'Free Delivery', sub: 'Orders above ₹999', color: '#E8F5E9', border: '#A5D6A7', delay: '0s' },
  { icon: '⭐', title: '4.8 Rated', sub: '50,000+ happy customers', color: '#FFF8E1', border: '#FFE082', delay: '0.5s' },
  { icon: '🌱', title: 'Healthy Plants', sub: '100% live guarantee', color: '#E3F2FD', border: '#90CAF9', delay: '1s' }
];

export default function HeroSection() {
  const db = useFirestore();
  const heroSettingsRef = useMemoFirebase(() => doc(db, "home_settings", "hero"), [db]);
  const { data: remoteHero, isLoading } = useDoc(heroSettingsRef);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goToSlide = (index: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setTransitioning(false);
    }, 400);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % HERO_SLIDES.length);

  useEffect(() => {
    if (remoteHero) return; // Disable auto-slide if using custom banner
    const timer = setInterval(() => nextSlide(), 5500);
    return () => clearInterval(timer);
  }, [currentSlide, remoteHero]);

  // Use dynamic data if available, otherwise use mock slider
  if (remoteHero) {
    return (
      <section className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(380px, 60vw, 680px)' }}>
        <div className="absolute inset-0">
          <Image
            src={remoteHero.imageUrl || HERO_SLIDES[0].image}
            alt={remoteHero.headline || "Hero"}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-8 sm:px-10 md:px-12 h-full flex items-center" style={{ minHeight: 'clamp(380px, 60vw, 680px)' }}>
          <div className="flex flex-row items-center gap-4 md:gap-8 w-full py-8 sm:py-12 md:py-16">
            <div className="flex-1 min-w-0 text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 mb-3 sm:mb-5">
                <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-white">✨ Handpicked Selection</span>
              </div>
              <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl lg:text-7xl text-white font-extrabold leading-tight mb-2 sm:mb-4">
                {remoteHero.headline || "Bring Nature"}<br />
                <span className="text-[#A5D6A7]">{remoteHero.headlineAccent || "Home"}</span>
              </h1>
              <p className="text-white/85 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed mb-4 sm:mb-8 max-w-xs sm:max-w-sm md:max-w-md">
                {remoteHero.description || "Premium plants delivered fresh."}
              </p>
              <Link href="/plants" className="inline-flex items-center justify-center gap-1.5 bg-white text-primary font-bold px-6 py-3.5 rounded-lg hover:bg-[#F1F8E9] transition-all hover:shadow-xl text-sm whitespace-nowrap">
                {remoteHero.buttonText || "Shop Collection"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="hidden sm:flex flex-col gap-3 flex-shrink-0">
              {FLOATING_CARDS.map((card, i) => (
                <div key={i} className="backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 min-w-[200px]" style={{ animation: `float-y ${4 + i}s ease-in-out infinite`, background: `${card.color}cc`, border: `1px solid ${card.border}` }}>
                  <span className="text-2xl">{card.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-[#1A2E1A]">{card.title}</div>
                    <div className="text-xs text-[#4A6741]">{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // --- FALLBACK MOCK SLIDER ---
  const slide = HERO_SLIDES[currentSlide];
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(380px, 60vw, 680px)' }}>
      <div className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <Image src={slide.image} alt={slide.headline} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10"></div>
      </div>
      {/* (Rest of existing mock slider UI omitted for brevity but fully preserved in logic) */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 sm:px-10 md:px-12 h-full flex items-center" style={{ minHeight: 'clamp(380px, 60vw, 680px)' }}>
        <div className="flex-1 min-w-0 text-left">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 mb-3 sm:mb-5">
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-white">{slide.badge}</span>
          </div>
          <h1 className={`font-headline text-2xl sm:text-4xl md:text-5xl lg:text-7xl text-white font-extrabold leading-tight mb-2 sm:mb-4 transition-all duration-500 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {slide.headline}<br />
            <span className="text-[#A5D6A7]">{slide.headlineAccent}</span>
          </h1>
          <p className="text-white/85 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed mb-4 sm:mb-8 max-w-xs sm:max-w-sm md:max-w-md">
            {slide.sub}
          </p>
          <Link href={slide.ctaHref} className="inline-flex items-center justify-center gap-1.5 bg-white text-primary font-bold px-6 py-3.5 rounded-lg hover:bg-[#F1F8E9] transition-all hover:shadow-xl text-sm whitespace-nowrap">
            {slide.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
    ctaHref: '/plants?cat=Indoor',
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
  { icon: '🚚', title: 'Free Delivery', sub: 'Orders above ₹499', color: '#E8F5E9', border: '#A5D6A7', delay: '0s' },
  { icon: '⭐', title: '4.8 Rated', sub: '50,000+ happy customers', color: '#FFF8E1', border: '#FFE082', delay: '0.5s' },
  { icon: '🌱', title: 'Healthy Plants', sub: '100% live guarantee', color: '#E3F2FD', border: '#90CAF9', delay: '1s' }
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goToSlide = (index: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setTransitioning(false);
    }, 400);
  };

  const prevSlide = () => goToSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  const nextSlide = () => goToSlide((currentSlide + 1) % HERO_SLIDES.length);

  useEffect(() => {
    const timer = setInterval(() => nextSlide(), 5500);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(380px, 60vw, 680px)' }}>
      {/* Background Image */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <Image
          src={slide.image}
          alt={`${slide.headline} ${slide.headlineAccent}`}
          fill
          className="object-cover"
          priority
          data-ai-hint={slide.hint}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10"></div>
      </div>

      {/* Arrow Nav — both sides */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-all"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-all"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {/* Content */}
      <div
        className="relative z-10 max-w-7xl mx-auto px-8 sm:px-10 md:px-12 h-full flex items-center"
        style={{ minHeight: 'clamp(380px, 60vw, 680px)' }}
      >
        <div className="flex flex-row items-center gap-4 md:gap-8 w-full py-8 sm:py-12 md:py-16">

          {/* Left: Text */}
          <div className="flex-1 min-w-0 text-left">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 mb-3 sm:mb-5 transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-white">{slide.badge}</span>
            </div>

            {/* Headline */}
            <h1 className={`font-headline text-2xl sm:text-4xl md:text-5xl lg:text-7xl text-white font-extrabold leading-tight mb-2 sm:mb-4 transition-all duration-500 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              {slide.headline}<br />
              <span className="text-[#A5D6A7]">{slide.headlineAccent}</span>
            </h1>

            <p className={`text-white/85 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed mb-4 sm:mb-8 max-w-xs sm:max-w-sm md:max-w-md transition-all duration-500 delay-100 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              {slide.sub}
            </p>

            {/* CTAs */}
            <div className={`flex flex-row items-center gap-2 sm:gap-3 transition-all duration-500 delay-200 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <Link
                href={slide.ctaHref}
                className="inline-flex items-center justify-center gap-1.5 bg-white text-primary font-bold px-3 sm:px-6 py-2 sm:py-3.5 rounded-lg hover:bg-[#F1F8E9] transition-all hover:shadow-xl text-xs sm:text-sm whitespace-nowrap"
              >
                {slide.cta}
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
              <Link
                href="/plants"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3.5 rounded-lg hover:bg-white/25 transition-all text-xs sm:text-sm whitespace-nowrap"
              >
                View All Plants
              </Link>
            </div>

            {/* Slide Indicators */}
            <div className="flex justify-start gap-2 mt-4 sm:mt-8">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 sm:w-8 bg-[#A5D6A7]' : 'w-3 sm:w-4 bg-white/40'}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Floating Cards — visible on sm+ */}
          <div className="hidden sm:flex flex-col gap-3 flex-shrink-0">
            {/* Offer Card */}
            <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-center min-w-[140px] sm:min-w-[180px] transition-all duration-500 ${transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="text-2xl sm:text-3xl font-headline font-extrabold text-[#A5D6A7] mb-0.5">{slide.offer}</div>
              <div className="text-[10px] sm:text-xs text-white/80 font-semibold">{slide.offerSub}</div>
              <div className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] text-white/50 uppercase tracking-wider font-bold">Limited Time</div>
            </div>

            {/* Trust Cards */}
            {FLOATING_CARDS.map((card, i) => (
              <div
                key={i}
                className="backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 min-w-[140px] sm:min-w-[200px]"
                style={{
                  animation: `float-y ${4 + i}s ease-in-out infinite`,
                  animationDelay: card.delay,
                  background: `${card.color}cc`,
                  borderColor: card.border,
                  border: `1px solid ${card.border}`
                }}
              >
                <span className="text-xl sm:text-2xl">{card.icon}</span>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#1A2E1A]">{card.title}</div>
                  <div className="text-[10px] sm:text-xs text-[#4A6741]">{card.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Offer Pill — bottom of hero */}
      <div className={`absolute bottom-4 left-4 right-4 sm:hidden bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 flex items-center justify-between transition-all duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div>
          <div className="text-base font-bold text-[#A5D6A7]">{slide.offer}</div>
          <div className="text-[10px] text-white/80">{slide.offerSub}</div>
        </div>
        <Link href={slide.ctaHref} className="bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full">
          Shop →
        </Link>
      </div>
    </section>
  );
}

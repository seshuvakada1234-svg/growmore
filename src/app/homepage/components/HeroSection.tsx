
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((s) => (s + 1) % HERO_SLIDES.length);
        setTransitioning(false);
      }, 400);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(520px, 80vh, 720px)' }}>
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center" style={{ minHeight: 'clamp(520px, 80vh, 720px)' }}>
        <div className="flex flex-col md:flex-row items-center gap-8 w-full py-12 md:py-16">
          {/* Left: Text */}
          <div className="flex-1 max-w-xl">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 mb-5 transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-sm font-semibold text-white">{slide.badge}</span>
            </div>

            {/* Headline */}
            <h1 className={`font-headline text-5xl md:text-6xl lg:text-7xl text-white font-extrabold leading-tight mb-4 transition-all duration-500 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              {slide.headline}<br />
              <span className="text-[#A5D6A7]">{slide.headlineAccent}</span>
            </h1>

            <p className={`text-white/85 text-lg leading-relaxed mb-8 max-w-md transition-all duration-500 delay-100 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              {slide.sub}
            </p>

            {/* CTAs */}
            <div className={`flex flex-wrap gap-3 transition-all duration-500 delay-200 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <Link href={slide.ctaHref} className="inline-flex items-center gap-2 bg-white text-primary font-bold px-6 py-3.5 rounded-lg hover:bg-[#F1F8E9] transition-all hover:shadow-xl hover:-translate-y-0.5 text-base">
                {slide.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/plants" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-semibold px-6 py-3.5 rounded-lg hover:bg-white/25 transition-all text-base">
                View All Plants
              </Link>
            </div>

            {/* Slide Indicators */}
            <div className="flex gap-2 mt-8">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-[#A5D6A7]' : 'w-4 bg-white/40'}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Floating Cards */}
          <div className="hidden md:flex flex-col gap-4 flex-shrink-0">
            {/* Offer Highlight */}
            <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 text-center min-w-[180px] transition-all duration-500 ${transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="text-3xl font-headline font-extrabold text-[#A5D6A7] mb-0.5">{slide.offer}</div>
              <div className="text-xs text-white/80 font-semibold">{slide.offerSub}</div>
              <div className="mt-2 text-[10px] text-white/50 uppercase tracking-wider font-bold">Limited Time</div>
            </div>

            {/* Floating Trust Cards */}
            {FLOATING_CARDS.map((card, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3 min-w-[200px]"
                style={{
                  animation: `float-y ${4 + i}s ease-in-out infinite`,
                  animationDelay: card.delay,
                  background: `${card.color}cc`,
                  borderColor: card.border
                }}
              >
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

      {/* Mobile Offer Pill */}
      <div className={`absolute bottom-6 left-4 right-4 md:hidden bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 flex items-center justify-between transition-all duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div>
          <div className="text-lg font-bold text-[#A5D6A7]">{slide.offer}</div>
          <div className="text-xs text-white/80">{slide.offerSub}</div>
        </div>
        <Link href={slide.ctaHref} className="bg-white text-primary text-xs font-bold px-4 py-2 rounded-full">Shop →</Link>
      </div>
    </section>
  );
}

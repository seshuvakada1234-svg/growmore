'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const OFFERS = [
  {
    title: 'Plant Starter Kit',
    sub: 'Everything a beginner needs',
    discount: 'Save ₹300',
    image: PlaceHolderImages.find(img => img.id === 'offer-starter-kit')?.imageUrl || "https://picsum.photos/seed/kit/600/400",
    bg: 'linear-gradient(135deg, #1B5E20, #2E7D32)',
    badge: 'BUNDLE DEAL',
    href: '/plants',
    hint: 'gardening tools'
  },
  {
    title: 'Monstera Collection',
    sub: '4 varieties, 1 amazing price',
    discount: '40% OFF',
    image: PlaceHolderImages.find(img => img.id === 'offer-monstera')?.imageUrl || "https://picsum.photos/seed/monstera-deal/600/400",
    bg: 'linear-gradient(135deg, #33691E, #558B2F)',
    badge: 'HOT DEAL',
    href: '/plants?cat=Indoor',
    hint: 'monstera collection'
  },
  {
    title: 'Self-Watering Pots',
    sub: 'Perfect for busy plant parents',
    discount: '25% OFF',
    image: PlaceHolderImages.find(img => img.id === 'offer-watering-pots')?.imageUrl || "https://picsum.photos/seed/pots/600/400",
    bg: 'linear-gradient(135deg, #004D40, #00695C)',
    badge: 'NEW ARRIVAL',
    href: '/plants',
    hint: 'plant pots'
  }
];

export default function OfferBanner() {
  return (
    <section className="py-14 bg-accent/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <div className="text-primary font-bold uppercase tracking-wider text-xs mb-1">Limited Time</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2E1A] font-headline">Today's Best Deals</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OFFERS.map((offer, i) => (
            <Link 
              key={i} 
              href={offer.href}
              className="group relative rounded-[2rem] overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl h-[220px]"
            >
              <Image
                src={offer.image}
                alt={offer.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                data-ai-hint={offer.hint}
              />
            
              <div className="absolute inset-0" style={{ background: offer.bg, opacity: 0.85 }}></div>
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <span className="self-start bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {offer.badge}
                </span>
                <div>
                  <h3 className="text-white font-headline font-bold text-xl leading-tight mb-1">{offer.title}</h3>
                  <p className="text-white/80 text-sm mb-3">{offer.sub}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#A5D6A7] font-extrabold text-2xl">{offer.discount}</span>
                    <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 text-white text-xs font-bold group-hover:bg-white group-hover:text-primary transition-all">
                      Shop Now <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
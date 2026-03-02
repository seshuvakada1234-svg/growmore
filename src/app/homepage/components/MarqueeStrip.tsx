'use client';

import React from 'react';

const ITEMS = [
  '🌿 Free Delivery Above ₹999',
  '🌱 100% Live Plant Guarantee',
  '⭐ 4.8 Star Rated by Customers',
  '🚚 Same Day Dispatch',
  '🎁 Gift Wrapping Available',
  '💰 upto 10% Affiliate Commission',
  '🌿 500+ Plant Varieties',
  '♻️ Eco-friendly Packaging',
];

export default function MarqueeStrip() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="bg-[#1B5E20] py-3 overflow-hidden border-y border-[#2E7D32]">
      <div 
        className="flex whitespace-nowrap" 
        style={{ width: 'max-content', animation: 'marquee-scroll 30s linear infinite' }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="text-white/90 text-sm font-semibold px-8 tracking-wide">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

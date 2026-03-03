import React from 'react';
import Link from 'next/link';

import Icon from '@/components/ui/AppIcon';

export default function Footer() {
  return (
    <footer className="bg-[#0F2B10] text-white pt-12 pb-6 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#66BB6A] rounded-lg flex items-center justify-center text-white font-bold text-sm">🌿</div>
              <span className="font-bold text-lg tracking-tight">Monterra</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              India's most loved online plant store. Bringing nature closer to your home since 2022.
            </p>
            <div className="flex gap-3">
              {['Instagram', 'Facebook', 'YouTube']?.map(s => (
                <a key={s} href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#66BB6A] transition-colors text-xs font-bold">
                  {s?.[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-[#A5D6A7]">Shop</h4>
            <ul className="space-y-2">
              {[
                { label: 'All Plants', href: '/plant-listing' },
                { label: 'Indoor Plants', href: '/plant-listing?category=indoor' },
                { label: 'Succulents', href: '/plant-listing?category=succulents' },
                { label: 'Outdoor Plants', href: '/plant-listing?category=outdoor' },
                { label: 'New Arrivals', href: '/plant-listing?filter=new' },
              ]?.map(link => (
                <li key={link?.label}>
                  <Link href={link?.href} className="text-white/60 hover:text-white text-sm transition-colors">{link?.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-[#A5D6A7]">Help</h4>
            <ul className="space-y-2">
              {['Track Order', 'Return Policy', 'Care Guides', 'FAQs', 'Contact Us']?.map(item => (
                <li key={item}>
                  <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-[#A5D6A7]">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-white/60">
                <Icon name="MapPinIcon" size={14} className="text-[#66BB6A] mt-0.5 flex-shrink-0" />
                <span>12, Green Valley, Bengaluru, Karnataka 560001</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Icon name="PhoneIcon" size={14} className="text-[#66BB6A] flex-shrink-0" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Icon name="EnvelopeIcon" size={14} className="text-[#66BB6A] flex-shrink-0" />
                <span>support@monterra.in</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#66BB6A] animate-pulse"></span>
              <span className="text-xs text-[#A5D6A7] font-semibold">Open: 9 AM – 8 PM, Mon–Sat</span>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6">
          <p className="text-white/40 text-xs">© 2026 Monterra. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Sitemap</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Payments:</span>
            {['UPI', 'Card', 'COD', 'EMI']?.map(p => (
              <span key={p} className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-white/60">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

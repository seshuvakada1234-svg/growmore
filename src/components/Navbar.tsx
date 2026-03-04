'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Heart, Menu, X, MapPin } from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      {/* Top Bar */}
      <div className="w-full bg-[#1A2E1A]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-white font-extrabold text-lg sm:text-xl tracking-tight">
              🌿 Monterra
            </span>
          </Link>

          {/* Search Bar — center, grows */}
          <div className="flex-1 mx-2 sm:mx-6 max-w-2xl">
            <div className="flex items-center bg-white rounded-lg overflow-hidden h-9 sm:h-10">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plants, pots, seeds..."
                className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none min-w-0"
              />
              <button className="bg-[#388E3C] hover:bg-[#2E7D32] px-3 sm:px-4 h-full flex items-center justify-center transition-colors flex-shrink-0">
                <Search className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            <Link href="/wishlist" className="hidden sm:flex flex-col items-center text-white hover:text-[#A5D6A7] transition-colors">
              <Heart className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Wishlist</span>
            </Link>
            <Link href="/cart" className="flex flex-col items-center text-white hover:text-[#A5D6A7] transition-colors relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 hidden sm:block">Cart</span>
              <span className="absolute -top-1 -right-1 bg-[#FF6F00] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">0</span>
            </Link>
            <Link href="/login" className="hidden sm:flex flex-col items-center text-white hover:text-[#A5D6A7] transition-colors">
              <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-[10px]">👤</span>
              </div>
              <span className="text-[10px] mt-0.5">Account</span>
            </Link>
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden text-white p-1"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category Nav Bar — desktop */}
      <div className="hidden sm:block bg-[#2E7D32]">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {[
              { label: '☰ All Categories', href: '/plants' },
              { label: '🪴 Indoor', href: '/plants?cat=Indoor' },
              { label: '🌵 Succulents', href: '/plants?cat=Succulents' },
              { label: '🌳 Outdoor', href: '/plants?cat=Outdoor' },
              { label: '🌴 Tropical', href: '/plants?cat=Tropical' },
              { label: '💨 Air Purifying', href: '/plants?cat=Air Purifying' },
              { label: '🎁 Gift Plants', href: '/plants?cat=Gifting' },
              { label: '🌿 New Arrivals', href: '/plants' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-white/90 hover:text-white hover:bg-white/10 text-xs font-semibold px-3 py-2.5 whitespace-nowrap transition-colors rounded-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Delivery info bar */}
      <div className="hidden sm:flex bg-[#F1F8E9] border-b border-[#C8E6C9]">
        <div className="max-w-7xl mx-auto px-6 py-1 flex items-center gap-2">
          <MapPin className="h-3 w-3 text-[#388E3C]" />
          <span className="text-xs text-[#2E7D32] font-medium">Deliver to <strong>India</strong></span>
          <span className="text-gray-300 mx-2">|</span>
          <span className="text-xs text-[#388E3C]">🚚 Free delivery above ₹499</span>
          <span className="text-gray-300 mx-2">|</span>
          <span className="text-xs text-[#388E3C]">🌱 100% Live Plant Guarantee</span>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Link href="/login" className="flex items-center gap-2 text-sm font-semibold text-[#1A2E1A]" onClick={() => setMenuOpen(false)}>
                👤 Login / Sign Up
              </Link>
            </div>
          </div>
          <nav className="py-2">
            {[
              { label: '🏠 Home', href: '/' },
              { label: '🪴 Indoor Plants', href: '/plants?cat=Indoor' },
              { label: '🌵 Succulents & Cacti', href: '/plants?cat=Succulents' },
              { label: '🌳 Outdoor Plants', href: '/plants?cat=Outdoor' },
              { label: '🌴 Tropical Plants', href: '/plants?cat=Tropical' },
              { label: '💨 Air Purifying', href: '/plants?cat=Air Purifying' },
              { label: '🎁 Gift Plants', href: '/plants?cat=Gifting' },
              { label: '❤️ Wishlist', href: '/wishlist' },
              { label: '🛒 Cart', href: '/cart' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-[#F1F8E9] hover:text-[#388E3C] transition-colors border-b border-gray-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

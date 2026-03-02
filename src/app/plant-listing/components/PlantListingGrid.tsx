
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import FilterSidebar, { FilterState } from './FilterSidebar';
import { MOCK_PLANTS, Plant, formatPrice, SORT_OPTIONS } from '@/lib/store';

// ── Plant Card (Listing View) ──
function PlantCard({ plant, view }: { plant: Plant; view: 'grid' | 'list' }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const wl = JSON.parse(localStorage.getItem('plantshop_wishlist') || '[]');
    setWishlisted(wl.includes(plant.id));
  }, [plant.id]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wl: string[] = JSON.parse(localStorage.getItem('plantshop_wishlist') || '[]');
    const updated = wishlisted ? wl.filter(id => id !== plant.id) : [...wl, plant.id];
    localStorage.setItem('plantshop_wishlist', JSON.stringify(updated));
    setWishlisted(!wishlisted);
  };

  const addToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cart: { plantId: string; quantity: number }[] = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
    const existing = cart.find(i => i.plantId === plant.id);
    if (existing) { existing.quantity += 1; } else { cart.push({ plantId: plant.id, quantity: 1 }); }
    localStorage.setItem('plantshop_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const careLevelColor = { easy: 'care-easy', moderate: 'care-moderate', hard: 'care-hard' }[plant.careLevel];
  const careLevelLabel = { easy: '🟢 Easy', moderate: '🟡 Moderate', hard: '🔴 Hard' }[plant.careLevel];

  if (view === 'list') {
    return (
      <div
        className="product-card flex gap-4 p-3 cursor-pointer"
        onClick={() => router.push(`/plant-detail?id=${plant.id}`)}>
        {/* Image */}
        <div className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 130, height: 130 }}>
          <AppImage src={plant.images[0]} alt={`${plant.name} - buy online`} fill className="object-cover" />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {plant.discount && <span className="discount-badge">{plant.discount}% OFF</span>}
          </div>
          <button className={`wishlist-btn ${wishlisted ? 'active' : ''}`} onClick={toggleWishlist} aria-label="Wishlist">
            <Icon name="HeartIcon" size={12} className={wishlisted ? 'text-[#E91E63]' : 'text-[#7A9B77]'} variant={wishlisted ? 'solid' : 'outline'} />
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-[#1A2E1A] text-base leading-tight">{plant.name}</h3>
              <p className="text-xs text-[#7A9B77] mt-0.5">{plant.category}</p>
            </div>
            {plant.isBestseller && (
              <span className="text-[10px] bg-[#FF6F00] text-white font-bold px-2 py-0.5 rounded flex-shrink-0">BESTSELLER</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-0.5 bg-[#1B5E20] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              <span>{plant.rating}</span>
              <Icon name="StarIcon" size={8} variant="solid" />
            </div>
            <span className="text-[11px] text-[#7A9B77]">({plant.reviewCount.toLocaleString('en-IN')} reviews)</span>
          </div>

          <p className="text-xs text-[#4A6741] mt-2 line-clamp-2">{plant.description}</p>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1A2E1A] text-lg">{formatPrice(plant.price)}</span>
              {plant.originalPrice && (
                <span className="text-sm text-[#7A9B77] line-through">{formatPrice(plant.originalPrice)}</span>
              )}
            </div>
            <span className={`care-badge ${careLevelColor} text-[10px]`}>{careLevelLabel}</span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={addToCart}
              className={`btn-primary text-xs px-4 py-2 ${addedToCart ? 'opacity-80' : ''}`}
              style={{ borderRadius: 6 }}>
              {addedToCart ? '✓ Added' : '+ Add to Cart'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); router.push(`/plant-detail?id=${plant.id}`); }}
              className="btn-secondary text-xs px-4 py-2" style={{ borderRadius: 6 }}>
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      className="product-card cursor-pointer group"
      onClick={() => router.push(`/plant-detail?id=${plant.id}`)}>
      <div className="card-img relative" style={{ height: 210 }}>
        <AppImage src={plant.images[0]} alt={`${plant.name} - buy online at PlantShop`} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {plant.isBestseller && <span className="text-[10px] bg-[#FF6F00] text-white font-bold px-2 py-0.5 rounded-sm">BESTSELLER</span>}
          {plant.isNew && <span className="text-[10px] bg-[#1B5E20] text-white font-bold px-2 py-0.5 rounded-sm">NEW</span>}
          {plant.discount && <span className="discount-badge">{plant.discount}% OFF</span>}
        </div>
        <button className={`wishlist-btn ${wishlisted ? 'active' : ''}`} onClick={toggleWishlist} aria-label="Wishlist">
          <Icon name="HeartIcon" size={14} className={wishlisted ? 'text-[#E91E63]' : 'text-[#7A9B77]'} variant={wishlisted ? 'solid' : 'outline'} />
        </button>
        <div className="quick-add">
          <button onClick={addToCart}
            className={`w-full py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${addedToCart ? 'bg-[#1B5E20] text-white' : 'bg-white/95 text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white'}`}>
            {addedToCart ? '✓ Added to Cart' : '+ Add to Cart'}
          </button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-[#1A2E1A] text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">{plant.name}</h3>
        <p className="text-xs text-[#7A9B77] mb-2">{plant.category}</p>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center gap-0.5 bg-[#1B5E20] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            <span>{plant.rating}</span>
            <Icon name="StarIcon" size={9} variant="solid" />
          </div>
          <span className="text-[11px] text-[#7A9B77]">({plant.reviewCount.toLocaleString('en-IN')})</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-[#1A2E1A] text-base">{formatPrice(plant.price)}</span>
          {plant.originalPrice && (
            <>
              <span className="text-xs text-[#7A9B77] line-through">{formatPrice(plant.originalPrice)}</span>
              <span className="text-xs text-[#2E7D32] font-semibold">{plant.discount}% off</span>
            </>
          )}
        </div>
        <div className={`care-badge ${careLevelColor} text-[10px]`}>{careLevelLabel}</div>
        <p className="text-[11px] text-[#4A6741] mt-2 font-medium">
          {plant.price >= 499 ? '🚚 Free delivery' : '🚚 Delivery ₹49'}
        </p>
      </div>
    </div>
  );
}

// ── Active Filter Chip ──
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#E8F5E9] border border-[#A5D6A7] rounded-full px-3 py-1 text-xs font-semibold text-[#1B5E20]">
      {label}
      <button onClick={onRemove} className="hover:text-[#E53935] transition-colors">
        <Icon name="XMarkIcon" size={12} />
      </button>
    </div>
  );
}

const DEFAULT_FILTERS: FilterState = {
  categories: [],
  careLevel: [],
  sunlight: [],
  size: [],
  priceMin: 0,
  priceMax: 3000,
  potIncluded: null,
  inStock: false,
  tags: [],
};

export default function PlantListingGrid() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => {
    const cat = searchParams.get('category');
    return { ...DEFAULT_FILTERS, categories: cat ? [cat] : [] };
  });
  const [sort, setSort] = useState('relevance');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const ITEMS_PER_PAGE = 12;

  // Apply filters & sort
  const filtered = useCallback(() => {
    let result = [...MOCK_PLANTS];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q)) ||
        p.description.toLowerCase().includes(q)
      );
    }
    // Category
    if (filters.categories.length > 0) {
      result = result.filter(p => filters.categories.includes(p.category));
    }
    // Care
    if (filters.careLevel.length > 0) {
      result = result.filter(p => filters.careLevel.includes(p.careLevel));
    }
    // Sunlight
    if (filters.sunlight.length > 0) {
      result = result.filter(p => filters.sunlight.includes(p.sunlight));
    }
    // Size
    if (filters.size.length > 0) {
      result = result.filter(p => filters.size.includes(p.size));
    }
    // Price
    result = result.filter(p => p.price >= filters.priceMin && p.price <= filters.priceMax);
    // Pot
    if (filters.potIncluded === true) result = result.filter(p => p.potIncluded);
    // Stock
    if (filters.inStock) result = result.filter(p => p.stock > 0);

    // Sort
    switch (sort) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'newest': result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case 'discount': result.sort((a, b) => (b.discount || 0) - (a.discount || 0)); break;
    }

    return result;
  }, [filters, sort, search]);

  const allFiltered = filtered();
  const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE);
  const paginated = allFiltered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const activeCount = filters.categories.length + filters.careLevel.length + filters.sunlight.length + filters.size.length +
    (filters.potIncluded !== null ? 1 : 0) + (filters.inStock ? 1 : 0) + (filters.priceMax < 3000 ? 1 : 0);

  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setPage(1); };

  const removeFilterChip = (key: keyof FilterState, value?: string) => {
    if (value) {
      setFilters(f => ({ ...f, [key]: (f[key] as string[]).filter(v => v !== value) }));
    } else {
      setFilters(f => ({ ...f, [key]: key === 'potIncluded' ? null : false }));
    }
    setPage(1);
  };

  // Build chips
  const chips: { label: string; onRemove: () => void }[] = [
    ...filters.categories.map(v => ({ label: v, onRemove: () => removeFilterChip('categories', v) })),
    ...filters.careLevel.map(v => ({ label: `Care: ${v}`, onRemove: () => removeFilterChip('careLevel', v) })),
    ...filters.sunlight.map(v => ({ label: `Light: ${v}`, onRemove: () => removeFilterChip('sunlight', v) })),
    ...filters.size.map(v => ({ label: `Size: ${v}`, onRemove: () => removeFilterChip('size', v) })),
    ...(filters.priceMax < 3000 ? [{ label: `Up to ₹${filters.priceMax}`, onRemove: () => setFilters(f => ({ ...f, priceMax: 3000 })) }] : []),
    ...(filters.inStock ? [{ label: 'In Stock', onRemove: () => removeFilterChip('inStock') }] : []),
    ...(filters.potIncluded ? [{ label: 'Pot Included', onRemove: () => removeFilterChip('potIncluded') }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <a href="/homepage" className="text-[#7A9B77] hover:text-[#1B5E20]">Home</a>
        <Icon name="ChevronRightIcon" size={12} className="text-[#7A9B77]" />
        <span className="text-[#1A2E1A] font-medium">All Plants</span>
        {search && (
          <>
            <Icon name="ChevronRightIcon" size={12} className="text-[#7A9B77]" />
            <span className="text-[#1A2E1A] font-medium">"{search}"</span>
          </>
        )}
      </div>

      {/* Page Title */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A2E1A] font-display">
            {search ? `Results for "${search}"` : filters.categories.length === 1 ? filters.categories[0] : 'All Plants'}
          </h1>
          <p className="text-sm text-[#7A9B77] mt-0.5">{allFiltered.length} plants found</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 md:hidden">
        <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A9B77]" />
        <input
          className="search-input"
          placeholder="Search plants..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="flex gap-6">
        {/* Sidebar – Desktop */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <FilterSidebar filters={filters} onChange={f => { setFilters(f); setPage(1); }} onReset={resetFilters} activeCount={activeCount} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* Mobile Filter Btn */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-2 border border-[#D8EDD5] rounded-lg px-3 py-2 text-sm font-semibold text-[#4A6741] hover:bg-[#F1F8E9]">
              <Icon name="FunnelIcon" size={14} />
              Filters {activeCount > 0 && <span className="bg-[#1B5E20] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
            </button>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[#7A9B77] font-medium hidden sm:block">Sort:</span>
              <select
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1); }}
                className="border border-[#D8EDD5] rounded-lg px-3 py-2 text-sm font-semibold text-[#1A2E1A] bg-white outline-none focus:border-[#388E3C] cursor-pointer">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex border border-[#D8EDD5] rounded-lg overflow-hidden">
              {(['grid', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-2 transition-colors ${view === v ? 'bg-[#1B5E20] text-white' : 'bg-white text-[#4A6741] hover:bg-[#F1F8E9]'}`}>
                  <Icon name={v === 'grid' ? 'Squares2X2Icon' : 'ListBulletIcon'} size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {chips.map((chip, i) => (
                <FilterChip key={i} label={chip.label} onRemove={chip.onRemove} />
              ))}
              <button onClick={resetFilters} className="text-xs text-[#E53935] font-semibold hover:underline px-1">
                Clear All
              </button>
            </div>
          )}

          {/* Grid / List */}
          {paginated.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🌵</div>
              <h3 className="font-bold text-[#1A2E1A] text-xl mb-2">No plants found</h3>
              <p className="text-[#7A9B77] mb-4">Try adjusting your filters or search query</p>
              <button onClick={resetFilters} className="btn-primary">Clear Filters</button>
            </div>
          ) : (
            <div className={view === 'grid' ?'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4' :'flex flex-col gap-3'}>
              {paginated.map(plant => (
                <PlantCard key={plant.id} plant={plant} view={view} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="page-btn disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon name="ChevronLeftIcon" size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`page-btn ${page === p ? 'active' : ''}`}>
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && page < totalPages - 2 && <span className="text-[#7A9B77] text-sm">...</span>}
              {totalPages > 5 && page < totalPages - 1 && (
                <button onClick={() => setPage(totalPages)} className={`page-btn ${page === totalPages ? 'active' : ''}`}>
                  {totalPages}
                </button>
              )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="page-btn disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon name="ChevronRightIcon" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[140]" onClick={() => setMobileFilterOpen(false)}></div>
          <div className={`filter-drawer open z-[150]`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A2E1A] text-lg">Filters</h3>
              <button onClick={() => setMobileFilterOpen(false)}>
                <Icon name="XMarkIcon" size={22} className="text-[#4A6741]" />
              </button>
            </div>
            <FilterSidebar filters={filters} onChange={f => { setFilters(f); setPage(1); }} onReset={resetFilters} activeCount={activeCount} />
            <div className="mt-6 flex gap-3">
              <button onClick={resetFilters} className="btn-secondary flex-1 justify-center py-3">Clear All</button>
              <button onClick={() => setMobileFilterOpen(false)} className="btn-primary flex-1 justify-center py-3">
                View {allFiltered.length} Plants
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

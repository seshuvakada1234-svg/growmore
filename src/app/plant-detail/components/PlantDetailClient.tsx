
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { MOCK_PLANTS, Plant, formatPrice, getRelatedPlants } from '@/lib/mock-data';

// ── Toast ──
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] bg-[#1B5E20] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold animate-in fade-in slide-in-from-bottom-4">
      <Icon name="CheckCircleIcon" size={20} className="text-[#A5D6A7]" variant="solid" />
      {message}
    </div>
  );
}

// ── Image Gallery ──
function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Main Image */}
      <div
        className="relative rounded-2xl overflow-hidden bg-[#F1F8E9] cursor-zoom-in"
        style={{ aspectRatio: '1', maxHeight: 440 }}
        onClick={() => setZoomed(true)}>
        <AppImage
          src={images[active]}
          alt={`${name} - detailed view`}
          fill
          className="object-cover transition-all duration-500"
          priority
        />
        {/* Zoom icon */}
        <div className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Icon name="MagnifyingGlassPlusIcon" size={16} className="text-[#1B5E20]" />
        </div>
        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setActive(a => (a - 1 + images.length) % images.length); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm">
              <Icon name="ChevronLeftIcon" size={14} className="text-[#1B5E20]" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setActive(a => (a + 1) % images.length); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm">
              <Icon name="ChevronRightIcon" size={14} className="text-[#1B5E20]" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <div key={i} 
              className={`relative h-20 w-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${i === active ? 'border-[#1B5E20]' : 'border-transparent'}`} 
              onClick={() => setActive(i)}>
              <AppImage src={img} alt={`${name} view ${i + 1}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {zoomed && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <div className="relative w-full max-w-2xl aspect-square rounded-2xl overflow-hidden">
            <AppImage src={images[active]} alt={`${name} zoomed`} fill className="object-contain" />
          </div>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40">
            <Icon name="XMarkIcon" size={22} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Care Guide Tab ──
function CareGuide({ plant }: { plant: Plant }) {
  const items = [
    { icon: '💧', label: 'Watering', value: plant.watering, tip: 'Always check the soil before watering. Overwatering is the #1 cause of plant death.' },
    { icon: '☀️', label: 'Sunlight', value: { low: 'Low light (indirect)', medium: 'Medium indirect light', bright: 'Bright indirect light', 'full-sun': 'Full sun' }[plant.sunlight], tip: 'Place near a window but avoid harsh direct afternoon sun.' },
    { icon: '🌡️', label: 'Temperature', value: '18°C – 30°C', tip: 'Avoid placing near AC vents or cold drafts.' },
    { icon: '💨', label: 'Humidity', value: 'Moderate (40–60%)', tip: 'Mist leaves occasionally or use a pebble tray with water.' },
    { icon: '🪣', label: 'Pot & Soil', value: plant.potIncluded ? 'Pot included' : 'Well-draining mix', tip: 'Use a pot with drainage holes. Repot every 1–2 years.' },
    { icon: '🌱', label: 'Fertilizer', value: 'Once a month (growing season)', tip: 'Use balanced liquid fertilizer diluted to half-strength.' },
  ];

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-xl bg-[#F1F8E9] border border-[#D8EDD5] hover:border-[#A5D6A7] transition-colors">
          <span className="text-2xl flex-shrink-0">{item.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-[#1A2E1A]">{item.label}</span>
              <span className="text-sm text-[#4A6741]">– {item.value}</span>
            </div>
            <p className="text-xs text-[#7A9B77]">{item.tip}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Shipping Tab ──
function ShippingInfo({ plant }: { plant: Plant }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#E8F5E9] rounded-xl border border-[#C8E6C9]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🚚</span>
          <span className="font-bold text-[#1B5E20]">Delivery Information</span>
        </div>
        <ul className="space-y-1.5 text-sm text-[#4A6741]">
          <li>• Standard delivery: 2–5 business days</li>
          <li>• Express delivery: 1–2 business days (₹99 extra)</li>
          <li>• Free delivery on orders above ₹499</li>
          <li>• Delivered to 25+ cities across India</li>
        </ul>
      </div>
      <div className="p-4 bg-[#FFF8E1] rounded-xl border border-[#FFE082]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📦</span>
          <span className="font-bold text-[#F57F17]">Packaging Promise</span>
        </div>
        <ul className="space-y-1.5 text-sm text-[#795548]">
          <li>• Plants packed in eco-friendly corrugated boxes</li>
          <li>• Soil secured to prevent spillage</li>
          <li>• Care card included with every plant</li>
          <li>• 100% live delivery guarantee</li>
        </ul>
      </div>
      <div className="p-4 bg-[#FFEBEE] rounded-xl border border-[#FFCDD2]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔄</span>
          <span className="font-bold text-[#C62828]">Return Policy</span>
        </div>
        <p className="text-sm text-[#7A9B77]">
          If your plant arrives damaged or unhealthy, contact us within 48 hours with photos. 
          We'll send a replacement at no extra charge. Plants cannot be returned after 7 days.
        </p>
      </div>
      <div className="flex items-center gap-3 p-3 bg-white border border-[#D8EDD5] rounded-xl text-sm">
        <span className="text-xl">📦</span>
        <div>
          <span className="font-semibold text-[#1A2E1A]">Weight: </span>
          <span className="text-[#4A6741]">{plant.weight}</span>
          <span className="mx-2 text-[#D8EDD5]">|</span>
          <span className="font-semibold text-[#1A2E1A]">Height: </span>
          <span className="text-[#4A6741]">{plant.height}</span>
        </div>
      </div>
    </div>
  );
}

// ── Reviews Section ──
const MOCK_REVIEWS = [
  {
    id: 1, name: 'Meera Nair', avatar: 'M', rating: 5, date: '2 weeks ago',
    title: 'Absolutely love this plant!',
    body: 'Arrived in perfect condition, well-packaged. The plant was exactly as shown in photos. Already seeing new growth after just 2 weeks!',
    helpful: 24, verified: true,
  },
  {
    id: 2, name: 'Rahul Gupta', avatar: 'R', rating: 4, date: '1 month ago',
    title: 'Great quality, minor packaging issue',
    body: 'The plant itself is healthy and beautiful. One leaf had a small bruise from transit but it healed quickly. Would definitely order again.',
    helpful: 18, verified: true,
  }
];

function ReviewCard({ review }: { review: typeof MOCK_REVIEWS[0] }) {
  return (
    <div className="bg-white border border-[#D8EDD5] p-5 rounded-2xl shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#1B5E20] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
          {review.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-[#1A2E1A]">{review.name}</span>
            {review.verified && (
              <span className="flex items-center gap-1 text-[10px] text-[#1B5E20] font-semibold">
                <Icon name="CheckBadgeIcon" size={12} variant="solid" className="text-[#1B5E20]" />
                Verified Purchase
              </span>
            )}
            <span className="text-[11px] text-[#7A9B77] ml-auto">{review.date}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Icon key={i} name="StarIcon" size={12} variant={i < review.rating ? 'solid' : 'outline'} className={i < review.rating ? 'text-[#F9A825]' : 'text-[#D8EDD5]'} />
            ))}
          </div>
        </div>
      </div>
      <h4 className="font-semibold text-sm text-[#1A2E1A] mb-1">{review.title}</h4>
      <p className="text-sm text-[#4A6741] leading-relaxed">{review.body}</p>
      <div className="flex items-center gap-2 mt-3 text-xs text-[#7A9B77]">
        <button className="flex items-center gap-1 hover:text-[#1B5E20] transition-colors">
          <Icon name="HandThumbUpIcon" size={13} />
          Helpful ({review.helpful})
        </button>
      </div>
    </div>
  );
}

// ── Related Plants ──
function RelatedPlants({ plants }: { plants: Plant[] }) {
  const router = useRouter();

  const addToCart = (e: React.MouseEvent, plantId: string) => {
    e.stopPropagation();
    const cart: { plantId: string; quantity: number }[] = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
    const existing = cart.find(i => i.plantId === plantId);
    if (existing) { existing.quantity += 1; } else { cart.push({ plantId: plantId, quantity: 1 }); }
    localStorage.setItem('plantshop_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  return (
    <section className="py-10 border-t border-[#D8EDD5]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <h2 className="text-2xl font-bold text-[#1A2E1A] font-display mb-5">You May Also Like</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {plants.map(plant => (
            <div key={plant.id} className="bg-white rounded-2xl overflow-hidden border border-[#D8EDD5] shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push(`/plant-detail?id=${plant.id}`)}>
              <div className="relative h-[170px] overflow-hidden">
                <AppImage src={plant.images[0]} alt={`${plant.name} - related plant`} fill className="object-cover transition-transform group-hover:scale-110" />
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-[#1A2E1A] text-xs leading-tight line-clamp-2 mb-1">{plant.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#1A2E1A] text-sm">{formatPrice(plant.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main Component ──
export default function PlantDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plantId = searchParams.get('id') || '1';
  const plant = MOCK_PLANTS.find(p => p.id === plantId) || MOCK_PLANTS[0];
  const related = getRelatedPlants(plant, 4);

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'care' | 'shipping'>('description');
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wl = JSON.parse(localStorage.getItem('plantshop_wishlist') || '[]');
    setWishlisted(wl.includes(plant.id));
  }, [plant.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (actionRef.current) observer.observe(actionRef.current);
    return () => observer.disconnect();
  }, []);

  const addToCart = () => {
    const cart: { plantId: string; quantity: number }[] = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
    const existing = cart.find(i => i.plantId === plant.id);
    if (existing) { existing.quantity += quantity; } else { cart.push({ plantId: plant.id, quantity }); }
    localStorage.setItem('plantshop_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    setToast(`${plant.name} added to cart!`);
  };

  const buyNow = () => {
    addToCart();
    router.push('/cart');
  };

  const toggleWishlist = () => {
    const wl: string[] = JSON.parse(localStorage.getItem('plantshop_wishlist') || '[]');
    const updated = wishlisted ? wl.filter(id => id !== plant.id) : [...wl, plant.id];
    localStorage.setItem('plantshop_wishlist', JSON.stringify(updated));
    setWishlisted(!wishlisted);
    setToast(wishlisted ? 'Removed from wishlist' : 'Added to wishlist!');
  };

  const careLevelColor = { easy: 'bg-emerald-100 text-emerald-700', moderate: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' }[plant.careLevel];
  const careLevelLabel = { easy: '🟢 Easy Care', moderate: '🟡 Moderate Care', hard: '🔴 Expert Care' }[plant.careLevel];

  return (
    <div className="min-h-screen bg-[#FAFAF7] pt-4">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => router.push('/')} className="text-[#7A9B77] hover:text-[#1B5E20] transition-colors">Home</button>
          <Icon name="ChevronRightIcon" size={10} className="text-[#7A9B77]" />
          <button onClick={() => router.push('/plants')} className="text-[#7A9B77] hover:text-[#1B5E20] transition-colors">Plants</button>
          <Icon name="ChevronRightIcon" size={10} className="text-[#7A9B77]" />
          <span className="text-[#1A2E1A] font-medium truncate max-w-[120px]">{plant.name}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Gallery */}
          <div>
            <ImageGallery images={plant.images} name={plant.name} />
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col gap-4">
            {/* Badges Row */}
            <div className="flex flex-wrap gap-2">
              {plant.isBestseller && (
                <span className="text-[10px] bg-[#FF6F00] text-white font-bold px-3 py-1 rounded-full">🔥 BESTSELLER</span>
              )}
              {plant.isNew && (
                <span className="text-[10px] bg-[#1B5E20] text-white font-bold px-3 py-1 rounded-full">✨ NEW ARRIVAL</span>
              )}
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${careLevelColor}`}>{careLevelLabel}</span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1A2E1A] font-headline leading-tight mb-1">
                {plant.name}
              </h1>
              <p className="text-sm text-[#7A9B77]">{plant.category}</p>
            </div>

            {/* Price */}
            <div className="bg-[#F1F8E9] rounded-xl p-4 border border-[#D8EDD5]">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold text-[#1A2E1A]">{formatPrice(plant.price)}</span>
                {plant.oldPrice && (
                  <span className="text-lg text-[#7A9B77] line-through">{formatPrice(plant.oldPrice)}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[#1B5E20] font-semibold">
                <Icon name="TruckIcon" size={16} />
                {plant.price >= 499 ? 'FREE Delivery' : 'Delivery ₹49'}
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📏', label: 'Height', value: plant.height },
                { icon: '⚖️', label: 'Weight', value: plant.weight },
                { icon: '☀️', label: 'Sunlight', value: plant.sunlight },
                { icon: '🪣', label: 'Pot', value: plant.potIncluded ? 'Included' : 'None' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#D8EDD5]">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <div className="text-[10px] text-[#7A9B77] uppercase tracking-wider">{item.label}</div>
                    <div className="text-xs font-semibold text-[#1A2E1A]">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quantity + Actions */}
            <div ref={actionRef} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#1A2E1A]">Quantity:</span>
                <div className="flex items-center gap-2 border rounded-lg p-1">
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                  <span className="w-10 text-center font-bold">{quantity}</span>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded" onClick={() => setQuantity(q => Math.min(plant.stock, q + 1))}>+</button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={addToCart} className="flex-1 bg-white border-2 border-[#1B5E20] text-[#1B5E20] h-12 rounded-xl font-bold hover:bg-[#F1F8E9] transition-colors flex items-center justify-center gap-2">
                  <Icon name="ShoppingCartIcon" size={18} />
                  Add to Cart
                </button>
                <button onClick={buyNow} className="flex-1 bg-[#1B5E20] text-white h-12 rounded-xl font-bold hover:bg-[#2E7D32] transition-colors flex items-center justify-center gap-2">
                  <Icon name="BoltIcon" size={18} />
                  Buy Now
                </button>
                <button onClick={toggleWishlist} className="w-12 h-12 border border-[#D8EDD5] rounded-xl flex items-center justify-center hover:bg-[#F1F8E9] transition-colors">
                  <Icon name="HeartIcon" size={20} className={wishlisted ? 'text-red-500' : 'text-[#7A9B77]'} variant={wishlisted ? 'solid' : 'outline'} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-10 border border-[#D8EDD5] rounded-2xl overflow-hidden bg-white">
          <div className="flex border-b border-[#D8EDD5] bg-muted/30">
            {([
              { key: 'description', label: '📋 Description' },
              { key: 'care', label: '🌿 Care Guide' },
              { key: 'shipping', label: '🚚 Shipping' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab.key ? 'border-[#1B5E20] text-[#1B5E20] bg-white' : 'border-transparent text-[#7A9B77]'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="space-y-4">
                <p className="text-[#4A6741] leading-relaxed">{plant.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plant.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#4A6741]">
                      <Icon name="CheckCircleIcon" size={16} className="text-[#1B5E20]" variant="solid" />
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'care' && <CareGuide plant={plant} />}
            {activeTab === 'shipping' && <ShippingInfo plant={plant} />}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-[#1A2E1A] font-display mb-6">Verified Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_REVIEWS.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </div>

      {/* Related */}
      <RelatedPlants plants={related} />

      {/* Sticky Bar Mobile */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex items-center gap-3 z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{plant.name}</div>
            <div className="text-[#1B5E20] font-bold">{formatPrice(plant.price)}</div>
          </div>
          <button onClick={addToCart} className="bg-[#1B5E20] text-white px-6 py-2.5 rounded-xl font-bold text-sm">
            Add to Cart
          </button>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

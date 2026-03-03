'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { formatPrice, MOCK_PLANTS } from '@/lib/store';

// ── Types ──
interface CartItem { id: string; quantity: number; }
interface User { id: string; name: string; email: string; role: string; isAffiliate: boolean; avatar?: string; }

// ── Mock Auth State (localStorage-backed) ──
function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('plantshop_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const logout = () => {
    localStorage.removeItem('plantshop_user');
    setUser(null);
    window.location.href = '/homepage';
  };

  return { user, logout };
}

function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const loadCart = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      
      // Deduplicate items by ID to prevent key collisions and standardize keys
      const grouped = stored.reduce((acc: any, item: any) => {
        const id = item.id || item.productId || item.plantId;
        if (!id) return acc;
        if (acc[id]) {
          acc[id].quantity += (item.quantity || 1);
        } else {
          acc[id] = { id, quantity: item.quantity || 1 };
        }
        return acc;
      }, {});

      setCartItems(Object.values(grouped));
    } catch {
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    loadCart();
    window.addEventListener('cart-updated', loadCart);
    return () => window.removeEventListener('cart-updated', loadCart);
  }, [loadCart]);

  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const total = cartItems.reduce((s, i) => {
    // Try both mock data sets if necessary, prioritizing standard IDs
    const plant = MOCK_PLANTS.find(p => p.id === i.id);
    return s + (plant ? plant.price * i.quantity : 0);
  }, 0);

  return { cartItems, itemCount, total };
}

// ── Auth Modal ──
function AuthModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = () => {
    if (!phone && method === 'phone') return;
    setLoading(true);
    setTimeout(() => { setOtpSent(true); setLoading(false); }, 1000);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const mockUser = { id: 'user-g1', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'user', isAffiliate: false };
      localStorage.setItem('plantshop_user', JSON.stringify(mockUser));
      window.location.reload();
    }, 1200);
  };

  const handleLogin = () => {
    if (!otp && method === 'phone') return;
    setLoading(true);
    setTimeout(() => {
      // Check admin
      const isAdmin = email === 'seshuvakada1234@gmail.com';
      const mockUser = isAdmin
        ? { id: 'admin-1', name: 'Seshu Vakada', email, role: 'admin', isAffiliate: false }
        : { id: `user-${Date.now()}`, name: name || 'Plant Lover', email: email || `user${phone}@monterra.in`, role: 'user', isAffiliate: false };
      localStorage.setItem('plantshop_user', JSON.stringify(mockUser));
      window.location.reload();
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1A2E1A]">Welcome to Monterra</h2>
            <p className="text-sm text-[#7A9B77] mt-0.5">Sign in to shop, track orders & earn</p>
          </div>
          <button onClose={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D8EDD5] mb-6">
          {(['login', 'signup'] as const).map(t => (
            <button key={`auth-tab-${t}`} onClick={() => setTab(t)}
              className={`tab-btn capitalize ${tab === t ? 'active' : ''}`}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Google Login */}
        <button onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-[#D8EDD5] rounded-lg py-3 mb-4 hover:bg-gray-50 transition-colors font-medium text-sm text-[#1A2E1A]">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#D8EDD5]"></div>
          <span className="text-xs text-[#7A9B77] font-medium">OR</span>
          <div className="flex-1 h-px bg-[#D8EDD5]"></div>
        </div>

        {/* Method Toggle */}
        <div className="flex gap-2 mb-4">
          {(['phone', 'email'] as const).map(m => (
            <button key={`auth-method-${m}`} onClick={() => setMethod(m)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${method === m ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'border-[#D8EDD5] text-[#4A6741] hover:bg-[#F1F8E9]'}`}
              style={{ fontWeight: 600 }}>
              {m === 'phone' ? '📱 Mobile OTP' : '✉️ Email'}
            </button>
          ))}
        </div>

        {tab === 'signup' && (
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Full Name" className="w-full border border-[#D8EDD5] rounded-lg px-4 py-3 text-sm mb-3 outline-none focus:border-[#388E3C]" />
        )}

        {method === 'phone' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="border border-[#D8EDD5] rounded-lg px-3 py-3 text-sm text-[#4A6741] bg-[#F1F8E9] font-medium">+91</span>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Mobile Number" maxLength={10}
                className="flex-1 border border-[#D8EDD5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#388E3C]" />
            </div>
            {!otpSent ? (
              <button onClick={handleSendOtp} disabled={loading || phone.length < 10}
                className="btn-primary w-full justify-center py-3" style={{ borderRadius: 8 }}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            ) : (
              <>
                <input value={otp} onChange={e => setOtp(e.target.value)}
                  placeholder="Enter OTP (use: 123456)"
                  className="w-full border border-[#D8EDD5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#388E3C]" />
                <button onClick={handleLogin} disabled={loading}
                  className="btn-primary w-full justify-center py-3" style={{ borderRadius: 8 }}>
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" type="email"
              className="w-full border border-[#D8EDD5] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#388E3C]" />
            <button onClick={handleLogin} disabled={loading || !email}
              className="btn-primary w-full justify-center py-3" style={{ borderRadius: 8 }}>
              {loading ? 'Signing in...' : (tab === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        )}

        <p className="text-xs text-center text-[#7A9B77] mt-4">
          By continuing, you agree to our{' '}
          <span className="text-[#2E7D32] cursor-pointer hover:underline">Terms</span> &{' '}
          <span className="text-[#2E7D32] cursor-pointer hover:underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

// ── Cart Sidebar ──
function CartSidebar({ onClose }: { onClose: () => void }) {
  const { cartItems, total } = useCart();
  const router = useRouter();

  const removeItem = (id: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
      const updated = stored.filter((i: any) => (i.id || i.productId || i.plantId) !== id);
      localStorage.setItem('plantshop_cart', JSON.stringify(updated));
      window.dispatchEvent(new Event('cart-updated'));
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[200] flex" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl animate-slide-right" style={{ animation: 'slide-right 0.35s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <div className="flex items-center justify-between p-4 border-b border-[#D8EDD5]">
          <h3 className="font-bold text-[#1A2E1A] text-lg">Your Cart ({cartItems.length})</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-5xl mb-4">🛒</div>
              <p className="font-semibold text-[#1A2E1A] mb-1">Your cart is empty</p>
              <p className="text-sm text-[#7A9B77]">Add some plants to get started!</p>
              <button onClick={() => { onClose(); router.push('/plant-listing'); }}
                className="btn-primary mt-4">Browse Plants</button>
            </div>
          ) : (
            cartItems.map(item => {
              const plant = MOCK_PLANTS.find(p => p.id === item.id);
              if (!plant) return null;
              return (
                <div key={`sidebar-cart-${item.id}`} className="flex gap-3 p-3 border border-[#D8EDD5] rounded-lg">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img src={plant.images[0]} alt={plant.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1A2E1A] truncate">{plant.name}</p>
                    <p className="text-xs text-[#7A9B77] mt-0.5">{plant.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-[#1B5E20]">{formatPrice(plant.price)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#7A9B77]">Qty: {item.quantity}</span>
                        <button onClick={() => removeItem(item.id)} className="ml-2 text-red-400 hover:text-red-600">
                          <Icon name="TrashIcon" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-4 border-t border-[#D8EDD5] space-y-3">
            <div className="flex justify-between font-bold text-[#1A2E1A]">
              <span>Total</span>
              <span className="text-[#1B5E20]">{formatPrice(total)}</span>
            </div>
            <button onClick={() => { onClose(); router.push('/cart'); }}
              className="btn-primary w-full justify-center py-3 text-base" style={{ borderRadius: 10 }}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Header ──
export default function Header() {
  const [showAuth, setShowAuth] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCart = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('plantshop_cart') || '[]');
        const count = stored.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
        setCartCount(count);
      } catch { }
    };
    updateCart();
    window.addEventListener('cart-updated', updateCart);
    window.addEventListener('storage', updateCart);
    return () => { window.removeEventListener('cart-updated', updateCart); window.removeEventListener('storage', updateCart); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinks = [
    { href: '/homepage', label: 'Home' },
    { href: '/plant-listing', label: 'All Plants' },
  ];

  return (
    <>
      {/* Offer Strip */}
      <div className="offer-strip text-white text-center py-2 text-xs font-semibold tracking-wide">
        🌿 Free Delivery on orders above ₹499 &nbsp;|&nbsp; 🎁 Use code MONTERRA10 for 10% off &nbsp;|&nbsp; 🌱 New arrivals every week
      </div>

      {/* Main Nav */}
      <header className="nav-sticky" style={{ top: 32 }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4 h-16">
            {/* Logo */}
            <Link href="/homepage" className="flex-shrink-0">
              <AppLogo size={36} text="Monterra" onClick={() => router.push('/homepage')} />
            </Link>

            {/* Search Bar – Desktop */}
            <div className="flex-1 max-w-2xl mx-4 hidden md:block relative">
              <div className="relative">
                <Icon name="MagnifyingGlassIcon" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A9B77]" />
                <input
                  className="search-input"
                  placeholder="Search plants, e.g. 'monstera', 'air purifying'..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && searchQuery) router.push(`/plant-listing?q=${encodeURIComponent(searchQuery)}`); }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A9B77]">
                    <Icon name="XMarkIcon" size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 ml-auto md:ml-0">
              {/* Mobile Search */}
              <button onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F1F8E9] text-[#4A6741]">
                <Icon name="MagnifyingGlassIcon" size={20} />
              </button>

              {/* Nav Links – Desktop */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map(link => (
                  <Link key={`nav-link-${link.href}`} href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${pathname === link.href ? 'bg-[#F1F8E9] text-[#1B5E20]' : 'text-[#4A6741] hover:bg-[#F1F8E9] hover:text-[#1B5E20]'}`}>
                    {link.label}
                  </Link>
                ))}
                {user?.role === 'admin' && (
                  <Link href="/admin" className="px-3 py-2 rounded-lg text-sm font-semibold text-[#E53935] hover:bg-red-50">
                    Admin
                  </Link>
                )}
              </nav>

              {/* Home */}
              <Link href="/homepage"
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F1F8E9] text-[#4A6741] transition-colors">
                <Icon name="HomeIcon" size={22} />
              </Link>

              {/* Cart */}
              <button onClick={() => setShowCart(true)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F1F8E9] text-[#4A6741] transition-colors">
                <Icon name="ShoppingCartIcon" size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#1B5E20] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-badge-pop">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>

              {/* User */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F1F8E9] transition-colors">
                    <div className="w-7 h-7 rounded-full bg-[#1B5E20] text-white text-xs font-bold flex items-center justify-center overflow-hidden">
                      {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : user.name[0]}
                    </div>
                    <span className="hidden md:block text-sm font-semibold text-[#1A2E1A] max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
                    <Icon name="ChevronDownIcon" size={14} className="text-[#7A9B77]" />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#D8EDD5] py-2 z-50 animate-scale-in">
                      <div className="px-4 py-2 border-b border-[#D8EDD5]">
                        <p className="font-bold text-[#1A2E1A] text-sm truncate">{user.name}</p>
                        <p className="text-xs text-[#7A9B77] truncate">{user.email}</p>
                        {user.role === 'admin' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">ADMIN</span>}
                        {user.isAffiliate && <span className="text-[10px] bg-[#E8F5E9] text-[#1B5E20] px-2 py-0.5 rounded-full font-bold mt-1 inline-block">AFFILIATE</span>}
                      </div>
                      {[
                        { label: 'My Orders', icon: 'ShoppingBagIcon', href: '/orders' },
                        { label: 'My Profile', icon: 'UserIcon', href: '/profile' },
                        ...(user.isAffiliate ? [{ label: 'Partner Dashboard', icon: 'ChartBarIcon', href: '/affiliate' }] : []),
                        ...(!user.isAffiliate && user.role !== 'admin' ? [{ label: 'Join Affiliate', icon: 'GiftIcon', href: '/affiliate' }] : []),
                        ...(user.role === 'admin' ? [{ label: 'Admin Panel', icon: 'Cog6ToothIcon', href: '/admin' }] : []),
                      ].map(item => (
                        <Link key={`user-menu-${item.label}`} href={item.href}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F1F8E9] text-sm text-[#1A2E1A] transition-colors"
                          onClick={() => setShowUserMenu(false)}>
                          <Icon name={item.icon as any} size={16} className="text-[#4A6741]" />
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-[#D8EDD5] mt-1 pt-1">
                        <button onClick={logout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-sm text-red-500 transition-colors">
                          <Icon name="ArrowRightOnRectangleIcon" size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowAuth(true)}
                  className="btn-primary text-sm px-4 py-2" style={{ borderRadius: 8 }}>
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          {searchOpen && (
            <div className="md:hidden pb-3 relative">
              <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A9B77]" />
              <input
                autoFocus
                className="search-input"
                placeholder="Search plants..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQuery) { router.push(`/plant-listing?q=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); } }}
              />
            </div>
          )}
        </div>
      </header>

      {/* Spacer */}
      <div style={{ height: 32 + 64 }}></div>

      {/* Modals */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showCart && <CartSidebar onClose={() => setShowCart(false)} />}
    </>
  );
}

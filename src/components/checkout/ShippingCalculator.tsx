'use client';

import { useState, useEffect } from 'react';

interface CourierOption {
  name:  string;
  days:  number;
  price: number;
}

interface ShippingResult {
  price:   number;
  days:    number;
  courier: string;
  options: {
    fastest:  CourierOption;
    cheapest: CourierOption;
  };
}

interface ShippingCalculatorProps {
  baseOrderAmount: number;
  initialPincode?: string;
  onShippingSelect?: (option: CourierOption) => void;
}

export default function ShippingCalculator({
  baseOrderAmount,
  initialPincode = '',
  onShippingSelect,
}: ShippingCalculatorProps) {
  const [pincode,  setPincode]  = useState(initialPincode);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [result,   setResult]   = useState<ShippingResult | null>(null);
  const [selected, setSelected] = useState<'fastest' | 'cheapest'>('fastest');

  // Auto-check when pincode comes from selected address
  useEffect(() => {
    if (initialPincode && /^\d{6}$/.test(initialPincode)) {
      setPincode(initialPincode);
      runCheck(initialPincode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPincode]);

  const runCheck = async (pin: string) => {
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res  = await fetch(`/api/shipping?pincode=${pin}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not fetch shipping details.');
        return;
      }

      setResult(data);
      setSelected('fastest');
      onShippingSelect?.(data.options.fastest);

    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkShipping = async () => {
    if (!pincode) { setError('Please enter a pincode.'); return; }
    if (!/^\d{6}$/.test(pincode)) { setError('Please enter a valid 6-digit pincode.'); return; }
    await runCheck(pincode);
  };

  const handleSelect = (type: 'fastest' | 'cheapest') => {
    if (!result) return;
    setSelected(type);
    onShippingSelect?.(result.options[type]);
  };

  const active = result?.options[selected];
  const total  = baseOrderAmount + (active?.price ?? 0);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-lg flex-shrink-0">
          🚚
        </div>
        <div>
          <h3 className="text-white font-semibold text-base leading-tight">Delivery Options</h3>
          <p className="text-emerald-200 text-xs mt-0.5">
            {initialPincode ? `Checking for pincode ${initialPincode}` : 'Enter pincode to see options'}
          </p>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">

        {/* Input row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 text-sm">📍</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => {
                setError('');
                setPincode(e.target.value.replace(/\D/g, ''));
              }}
              onKeyDown={(e) => e.key === 'Enter' && checkShipping()}
              placeholder="Enter 6-digit pincode"
              className={`w-full h-11 pl-9 pr-3 rounded-xl border text-sm font-medium outline-none transition-all
                ${error
                  ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                }`}
            />
          </div>
          <button
            type="button"
            onClick={checkShipping}
            disabled={loading}
            className="h-11 px-5 bg-emerald-700 hover:bg-emerald-900 disabled:opacity-60
                       text-white text-sm font-semibold rounded-xl transition-all
                       active:scale-95 flex items-center gap-2 flex-shrink-0"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Check'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-[72px] bg-emerald-50 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-20 bg-emerald-50 rounded-xl" />
              <div className="h-20 bg-emerald-50 rounded-xl" />
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="flex flex-col gap-3">

            {/* Best option */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                  📦
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">{active?.name}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Delivery in {active?.days} day{active?.days === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-900">
                  {active?.price === 0
                    ? <span className="text-emerald-500">FREE</span>
                    : `₹${active?.price}`}
                </p>
                <p className="text-xs text-emerald-500">shipping</p>
              </div>
            </div>

            {/* Two options */}
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">All Options</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelect('fastest')}
                className={`text-left p-3 rounded-xl border-2 transition-all
                  ${selected === 'fastest'
                    ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                    : 'border-emerald-100 hover:border-emerald-300'
                  }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  ⚡ Fastest
                </span>
                <p className="text-xs font-semibold text-gray-800 mt-2 truncate">{result.options.fastest.name}</p>
                <p className="text-xs text-gray-500">{result.options.fastest.days} days</p>
                <p className="text-sm font-bold text-emerald-900 mt-1">
                  {result.options.fastest.price === 0 ? 'FREE' : `₹${result.options.fastest.price}`}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('cheapest')}
                className={`text-left p-3 rounded-xl border-2 transition-all
                  ${selected === 'cheapest'
                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                    : 'border-emerald-100 hover:border-amber-300'
                  }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  💰 Cheapest
                </span>
                <p className="text-xs font-semibold text-gray-800 mt-2 truncate">{result.options.cheapest.name}</p>
                <p className="text-xs text-gray-500">{result.options.cheapest.days} days</p>
                <p className="text-sm font-bold text-emerald-900 mt-1">
                  {result.options.cheapest.price === 0 ? 'FREE' : `₹${result.options.cheapest.price}`}
                </p>
              </button>
            </div>

            {/* Order total */}
            <div className="border-t border-emerald-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-500">Order Total</span>
              <span className="text-xl font-bold text-emerald-900">₹{total}</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAffiliate } from '@/context/affiliate-context';

const PERKS = [
  { icon: '💰', title: 'Up to 10% Commission', sub: 'Per successful order' },
  { icon: '📊', title: 'Real-time Dashboard', sub: 'Track earnings live' },
  { icon: '🏦', title: 'Direct Bank Payout', sub: 'Every 30 days' },
  { icon: '🔗', title: 'Custom Referral Link', sub: 'Share anywhere' },
];

export default function AffiliateBanner() {
  const router = useRouter();
  const { isApproved, loading, affiliateProfile } = useAffiliate();

  // Prevent flicker by returning null while loading
  if (loading) {
    return null;
  }

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        <div className="relative bg-primary rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[320px] flex items-center">
          <div className="relative z-10 p-6 md:p-12 w-full">
            <div className="flex flex-col lg:flex-row items-center gap-10 md:gap-12">

              {/* LEFT SIDE CONTENT */}
              <div className="flex-1 text-white text-center lg:text-left w-full">

                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-6">
                  <span className="text-[#A5D6A7] text-[10px] md:text-sm font-bold uppercase tracking-wider">
                    {isApproved
                      ? "✅ Official Monterra Partner"
                      : "💸 Earn While You Share"}
                  </span>
                </div>

                <h2 className="font-headline text-2xl md:text-5xl font-extrabold mb-4 leading-tight">
                  {isApproved ? (
                    <>
                      Welcome to Monterra<br />
                      <span className="text-[#A5D6A7]">Partner Program</span>
                    </>
                  ) : (
                    <>
                      Join Monterra Affiliate<br />
                      <span className="text-[#A5D6A7]">Program & Earn</span>
                    </>
                  )}
                </h2>

                <p className="text-white/75 text-sm md:text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
                  {isApproved
                    ? "Thank you for being part of the Monterra family. Access your links, track your performance, and manage your earnings in your dashboard."
                    : "Love plants? Share your referral link and earn up to 10% commission on every order. Payouts directly to your bank account every 30 days."
                  }
                </p>

                <div className="flex flex-col items-center lg:items-start gap-4">

                  <button
                    onClick={() => router.push('/affiliate')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-4 h-[48px] rounded-xl hover:bg-[#F1F8E9] transition-all hover:shadow-lg hover:-translate-y-0.5 text-base md:text-lg group"
                  >
                    {isApproved ? "Partner Dashboard" : "Join Affiliate Program"}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {!isApproved && affiliateProfile && (
                    <p className="text-white/60 text-[10px] md:text-xs font-medium italic">
                      Your affiliate application is under review. Approval usually takes 24–48 hours.
                    </p>
                  )}

                </div>
              </div>

              {/* RIGHT SIDE PERKS GRID */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 flex-shrink-0 w-full lg:w-auto">
                {PERKS.map((perk, i) => (
                  <div
                    key={i}
                    className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 md:p-5 text-white hover:bg-white/20 transition-all group"
                  >
                    <div className="text-2xl md:text-3xl mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                      {perk.icon}
                    </div>
                    <div className="font-bold text-[11px] md:text-base leading-tight">
                      {perk.title}
                    </div>
                    <div className="text-white/60 text-[9px] md:text-xs mt-1">
                      {perk.sub}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 pointer-events-none blur-3xl opacity-50"></div>

        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

const PERKS = [
  { icon: '💰', title: 'Up to 10% Commission', sub: 'Per successful order' },
  { icon: '📊', title: 'Real-time Dashboard', sub: 'Track earnings live' },
  { icon: '🏦', title: 'Direct Bank Payout', sub: 'Every 30 days' },
  { icon: '🔗', title: 'Custom Referral Link', sub: 'Share anywhere' },
];

export default function AffiliateBanner() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'affiliateProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: affiliateData, isLoading: isDocLoading } = useDoc(profileRef);

  if (isUserLoading || isDocLoading) return null;

  // Determine status based on the existence of the profile and the approved flag
  // Mapping "approved == true" to common status patterns
  const isApproved = !!affiliateData && (affiliateData.approved === true || affiliateData.status === 'approved');
  const isPending = !!affiliateData && (affiliateData.approved === false || affiliateData.status === 'pending');

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="relative bg-primary rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="relative z-10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Left */}
              <div className="flex-1 text-white text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-6">
                  <span className="text-[#A5D6A7] text-sm font-bold uppercase tracking-wider">💸 Earn While You Share</span>
                </div>

                {isApproved ? (
                  <>
                    <h2 className="font-headline text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
                      Welcome Back,<br />
                      <span className="text-[#A5D6A7]">Partner</span>
                    </h2>
                    <p className="text-white/75 text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
                      Your partner account is active! Visit your dashboard to track earnings, manage links, and monitor your growth.
                    </p>
                    <button
                      onClick={() => router.push('/affiliate')}
                      className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-2xl hover:bg-[#F1F8E9] transition-all hover:shadow-lg hover:-translate-y-0.5 text-lg group">
                      Go to Partner Dashboard
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="font-headline text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
                      Join Our Affiliate<br />
                      <span className="text-[#A5D6A7]">Program & Earn</span>
                    </h2>
                    <p className="text-white/75 text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
                      Love plants? Share your referral link, earn up to 10% commission on every order. 
                      Payouts directly to your bank account every 30 days.
                    </p>
                    <button
                      onClick={() => router.push('/affiliate')}
                      className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-2xl hover:bg-[#F1F8E9] transition-all hover:shadow-lg hover:-translate-y-0.5 text-lg group">
                      Join Affiliate Program
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    {isPending ? (
                      <p className="text-white/60 text-xs mt-4 font-medium italic">
                        Your affiliate application is under review. Approval usually takes 24–48 hours.
                      </p>
                    ) : (
                      <p className="text-white/50 text-xs mt-4 font-medium">Free to join · No minimum sales · Instant link generation</p>
                    )}
                  </>
                )}
              </div>

              {/* Right: Perks Grid */}
              <div className="grid grid-cols-2 gap-4 flex-shrink-0 w-full md:w-auto">
                {PERKS.map((perk, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 text-white hover:bg-white/20 transition-all group">
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{perk.icon}</div>
                    <div className="font-bold text-sm md:text-base leading-tight">{perk.title}</div>
                    <div className="text-white/60 text-xs mt-1">{perk.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 pointer-events-none blur-3xl opacity-50"></div>
        </div>
      </div>
    </section>
  );
}

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Truck, ShieldCheck, Flower2, Clock } from "lucide-react";
import AffiliateBanner from "@/app/homepage/components/AffiliateBanner";
import CategorySection from "@/app/homepage/components/CategorySection";
import HeroSection from "@/app/homepage/components/HeroSection";
import MarqueeStrip from "@/app/homepage/components/MarqueeStrip";
import OfferBanner from "@/app/homepage/components/OfferBanner";
import ProductGrid from "@/app/homepage/components/ProductGrid";
import StatsBar from "@/app/homepage/components/StatsBar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <HeroSection />

        {/* Marquee Benefits Strip */}
        <MarqueeStrip />

        {/* Real-time Stats Bar */}
        <StatsBar />

        {/* Categories Section */}
        <CategorySection />

        {/* Featured Plants / New Arrivals */}
        <ProductGrid 
          title="New Arrivals" 
          subtitle="Greenhouse Fresh" 
          filterKey="new" 
          limit={4} 
        />

        {/* Offers Section */}
        <OfferBanner />

        {/* Bestsellers Grid */}
        <ProductGrid 
          title="Crowd Favorites" 
          subtitle="Top Rated" 
          filterKey="bestseller" 
          limit={4} 
        />

        {/* Benefits Section */}
        <section className="py-20 bg-primary text-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Truck className="h-8 w-8" />
                </div>
                <h4 className="font-headline font-bold text-lg">Safe Delivery</h4>
                <p className="text-white/70 text-sm">We ensure your plants reach you in perfect condition.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h4 className="font-headline font-bold text-lg">Quality Guaranteed</h4>
                <p className="text-white/70 text-sm">Only the healthiest plants make it to your doorstep.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Flower2 className="h-8 w-8" />
                </div>
                <h4 className="font-headline font-bold text-lg">Free Care Guides</h4>
                <p className="text-white/70 text-sm">Expert advice included with every single plant.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Clock className="h-8 w-8" />
                </div>
                <h4 className="font-headline font-bold text-lg">24/7 Support</h4>
                <p className="text-white/70 text-sm">Got a question? Our plant experts are here to help.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Affiliate Section */}
        <AffiliateBanner />

      </main>

      <Footer />
    </div>
  );
}

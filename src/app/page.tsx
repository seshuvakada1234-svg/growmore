
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/lib/mock-data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight, Truck, ShieldCheck, Flower2, Clock } from "lucide-react";
import AffiliateBanner from "@/app/homepage/components/AffiliateBanner";
import CategorySection from "@/app/homepage/components/CategorySection";

export default function Home() {
  const featuredPlants = PRODUCTS.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative h-[500px] md:h-[600px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src={PlaceHolderImages.find(img => img.id === "hero-banner")?.imageUrl || ""}
              alt="Hero Banner"
              fill
              className="object-cover"
              priority
              data-ai-hint="lush greenhouse"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl text-white animate-fade-in">
              <span className="inline-block bg-primary/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold border border-primary/30 mb-6">
                🌱 Premium Nursery Collection
              </span>
              <h1 className="text-4xl md:text-6xl font-headline font-extrabold mb-6 leading-tight">
                Bring Nature Into <br />Your Living Space
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-lg">
                Discover our hand-picked selection of indoor and outdoor plants that purify air and uplift your mood.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/plants">
                  <Button size="lg" className="rounded-full px-8 text-lg font-bold">
                    Shop Collection
                  </Button>
                </Link>
                <Link href="/plants?cat=Indoor">
                  <Button size="lg" variant="outline" className="rounded-full px-8 text-lg font-bold bg-white/10 text-white border-white/40 hover:bg-white hover:text-primary">
                    Indoor Plants
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <CategorySection />

        {/* Featured Plants */}
        <section className="py-16 bg-neutral/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-headline font-extrabold text-primary">New Arrivals</h2>
                <p className="text-muted-foreground">The latest additions to our premium greenhouse collection.</p>
              </div>
              <Link href="/plants" className="text-primary font-bold flex items-center gap-1 hover:underline">
                Explore All Products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredPlants.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

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

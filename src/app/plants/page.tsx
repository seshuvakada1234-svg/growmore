
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PRODUCT_CATEGORIES, PRODUCTS, Category } from "@/lib/mock-data";
import { useState, useEffect, Suspense } from "react";
import { Filter, SlidersHorizontal, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSearchParams } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

function PlantsListingContent() {
  const searchParams = useSearchParams();
  const db = useFirestore();
  
  const categoryParam = searchParams.get("cat") as Category | null;
  const initialCats = categoryParam ? [categoryParam] : [];

  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedCats, setSelectedCats] = useState<string[]>(initialCats);

  // Fetch from Firestore
  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "products");
  }, [db]);

  const { data: dbProducts, isLoading } = useCollection(productsQuery);

  // Sync state with URL param
  useEffect(() => {
    if (categoryParam && !selectedCats.includes(categoryParam)) {
      setSelectedCats([categoryParam]);
    }
  }, [categoryParam]);

  const allProducts = [...PRODUCTS, ...(dbProducts || [])];

  const filteredProducts = allProducts.filter(p => {
    const withinPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchesCat = selectedCats.length === 0 || selectedCats.includes(p.category);
    return withinPrice && matchesCat;
  });

  const FilterSidebar = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-headline font-bold text-lg mb-4">Categories</h3>
        <div className="space-y-3">
          {PRODUCT_CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center space-x-2">
              <Checkbox 
                id={`cat-${cat.value}`} 
                checked={selectedCats.includes(cat.value)}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedCats([...selectedCats, cat.value]);
                  else setSelectedCats(selectedCats.filter(c => c !== cat.value));
                }}
              />
              <label htmlFor={`cat-${cat.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                {cat.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-headline font-bold text-lg mb-4">Price Range</h3>
        <div className="px-2">
          <Slider 
            defaultValue={[0, 5000]} 
            max={5000} 
            step={100} 
            value={priceRange}
            onValueChange={setPriceRange}
            className="mb-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>₹{priceRange[0]}</span>
            <span>₹{priceRange[1]}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-headline font-bold text-lg mb-4">Availability</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="instock" defaultChecked />
            <label htmlFor="instock" className="text-sm font-medium">In Stock</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="outstock" />
            <label htmlFor="outstock" className="text-sm font-medium">Coming Soon</label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <main className="flex-grow bg-neutral/30 pb-20">
      <div className="bg-primary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold mb-2">Shop Our Collection</h1>
          <p className="text-white/80">Explore our unique plants and gardening essentials.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar />
            </div>
          </aside>

          <div className="flex-grow">
            <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-border/50">
              <div className="flex items-center gap-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="md:hidden flex gap-2">
                      <Filter className="h-4 w-4" /> Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left">
                    <SheetHeader className="mb-6">
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <FilterSidebar />
                  </SheetContent>
                </Sheet>
                <span className="text-sm text-muted-foreground font-medium hidden sm:inline-block">
                  Showing {filteredProducts.length} results
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Sort by:</span>
                <Select defaultValue="popular">
                  <SelectTrigger className="w-[140px] md:w-[180px] rounded-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                {filteredProducts.map(p => (
                  <ProductCard key={p.id} product={p as any} />
                ))}
              </div>
            )}

            {!isLoading && filteredProducts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-muted-foreground/30">
                <SlidersHorizontal className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-headline font-bold text-muted-foreground">No plants found</h3>
                <p className="text-muted-foreground mt-2">Try adjusting your filters to find what you're looking for.</p>
                <Button variant="link" onClick={() => {setSelectedCats([]); setPriceRange([0, 5000]);}} className="mt-4">
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PlantsListingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
        <PlantsListingContent />
      </Suspense>
      <Footer />
    </div>
  );
}

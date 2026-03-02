
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
import { CATEGORIES, PRODUCTS } from "@/lib/mock-data";
import { useState } from "react";
import { Filter, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function PlantsListingPage() {
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const filteredProducts = PRODUCTS.filter(p => {
    const withinPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchesCat = selectedCats.length === 0 || selectedCats.includes(p.category);
    return withinPrice && matchesCat;
  });

  const FilterSidebar = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-headline font-bold text-lg mb-4">Categories</h3>
        <div className="space-y-3">
          {CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center space-x-2">
              <Checkbox 
                id={`cat-${cat}`} 
                checked={selectedCats.includes(cat)}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedCats([...selectedCats, cat]);
                  else setSelectedCats(selectedCats.filter(c => c !== cat));
                }}
              />
              <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {cat}
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
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-neutral/30 pb-20">
        <div className="bg-primary text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-headline font-extrabold mb-2">Shop Our Collection</h1>
            <p className="text-white/80">Explore {PRODUCTS.length} unique plants and gardening essentials.</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <FilterSidebar />
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow">
              {/* Toolbar */}
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

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-muted-foreground/30">
                  <SlidersHorizontal className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h3 className="text-xl font-headline font-bold text-muted-foreground">No plants found</h3>
                  <p className="text-muted-foreground mt-2">Try adjusting your filters to find what you're looking for.</p>
                  <Button variant="link" onClick={() => {setSelectedCats([]); setPriceRange([0, 5000]);}} className="mt-4">
                    Clear all filters
                  </Button>
                </div>
              )}

              {/* Pagination Mock */}
              <div className="mt-16 flex justify-center gap-2">
                <Button variant="outline" disabled className="rounded-full">Previous</Button>
                <Button variant="secondary" className="rounded-full bg-primary text-primary-foreground">1</Button>
                <Button variant="ghost" className="rounded-full">2</Button>
                <Button variant="ghost" className="rounded-full">3</Button>
                <Button variant="outline" className="rounded-full">Next</Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

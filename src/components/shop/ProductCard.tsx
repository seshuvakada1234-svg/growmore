
"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your shopping cart.`,
    });
  };

  return (
    <Link href={`/plants/${product.id}`}>
      <Card className="group overflow-hidden plant-card-hover bg-card border-none shadow-sm rounded-2xl h-full flex flex-col">
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            data-ai-hint="plant image"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-primary font-bold">
              {product.category}
            </Badge>
          </div>
          {product.oldPrice && (
            <div className="absolute top-3 right-3">
              <Badge variant="destructive" className="font-bold">
                {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4 flex-grow flex flex-col gap-2">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-xs font-semibold text-muted-foreground">{product.rating}</span>
          </div>
          <h3 className="font-headline font-bold text-lg leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2 mt-auto">
            <span className="text-primary font-extrabold text-xl">₹{product.price}</span>
            {product.oldPrice && (
              <span className="text-muted-foreground line-through text-sm">₹{product.oldPrice}</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full rounded-xl flex gap-2" 
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

import Link from "next/link";
import { Leaf, Instagram, Twitter, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Leaf className="h-6 w-6 fill-current" />
              <span className="font-headline font-bold text-xl tracking-tight">Monterra</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs">
              Bringing nature closer to your home with hand-picked premium plants and expert care guides.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-headline font-bold text-sm uppercase tracking-wider">Shop</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/plants?cat=Indoor" className="hover:text-primary transition-colors">Indoor Plants</Link>
              <Link href="/plants?cat=Outdoor" className="hover:text-primary transition-colors">Outdoor Plants</Link>
              <Link href="/plants?cat=Bonsai" className="hover:text-primary transition-colors">Bonsai Trees</Link>
              <Link href="/plants?cat=Seeds" className="hover:text-primary transition-colors">Plant Seeds</Link>
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-headline font-bold text-sm uppercase tracking-wider">Company</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
              <Link href="/affiliate" className="hover:text-primary transition-colors">Affiliate Program</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-headline font-bold text-sm uppercase tracking-wider">Newsletter</h4>
            <p className="text-sm text-muted-foreground">Get tips, plant care guides and exclusive offers from Monterra.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="border-t mt-12 pt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Monterra. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

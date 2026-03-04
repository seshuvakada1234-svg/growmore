import Link from "next/link";
import { Leaf, Instagram, Twitter, Facebook, MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted mt-auto overflow-hidden">
      <div className="container mx-auto px-4 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Leaf className="h-6 w-6 fill-current" />
              <span className="font-headline font-bold text-xl tracking-tight">Monterra</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              India's most loved online plant store. Bringing nature closer to your home since 2022 with hand-picked premium plants.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                <Instagram className="h-4 w-4" />
              </Link>
              <Link href="#" className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                <Twitter className="h-4 w-4" />
              </Link>
              <Link href="#" className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                <Facebook className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Shop */}
          <div className="col-span-1 flex flex-col gap-4">
            <h4 className="font-headline font-bold text-xs uppercase tracking-widest text-primary/60">Shop</h4>
            <nav className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="/plants?cat=Indoor" className="hover:text-primary transition-colors">Indoor Plants</Link>
              <Link href="/plants?cat=Outdoor" className="hover:text-primary transition-colors">Outdoor Plants</Link>
              <Link href="/plants?cat=Bonsai" className="hover:text-primary transition-colors">Bonsai Trees</Link>
              <Link href="/plants?cat=Seeds" className="hover:text-primary transition-colors">Plant Seeds</Link>
            </nav>
          </div>

          {/* Company */}
          <div className="col-span-1 flex flex-col gap-4">
            <h4 className="font-headline font-bold text-xs uppercase tracking-widest text-primary/60">Company</h4>
            <nav className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
              <Link href="/affiliate" className="hover:text-primary transition-colors">Affiliate Program</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <h4 className="font-headline font-bold text-xs uppercase tracking-widest text-primary/60">Contact Us</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>12, Green Valley, Bengaluru, Karnataka 560001</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <span>support@monterra.in</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] md:text-xs text-muted-foreground">
            © {new Date().getFullYear()} Monterra. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-50 mr-2">Secure Payments</span>
            {['UPI', 'Card', 'COD'].map(p => (
              <span key={p} className="text-[9px] font-mono bg-white px-2 py-0.5 rounded border border-primary/5 text-muted-foreground">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

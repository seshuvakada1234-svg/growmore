
"use client";

import Link from "next/link";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  Leaf,
  Menu,
  Award,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Leaf },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { name: "Affiliates", href: "/admin/affiliates", icon: Award },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 text-primary mb-10 px-2">
        <Leaf className="h-8 w-8 fill-current" />
        <span className="font-headline font-extrabold text-2xl tracking-tight">GreenScape</span>
      </div>
      
      <nav className="flex-grow space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-primary"
              )}>
                <item.icon className="h-5 w-5" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-primary font-bold transition-all">
          <Settings className="h-5 w-5" /> Settings
        </button>
        <Link href="/">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive font-bold transition-all">
            <LogOut className="h-5 w-5" /> Exit Admin
          </button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 bg-white border-r fixed h-full shadow-sm z-30">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow lg:ml-72 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h2 className="text-xl font-headline font-extrabold text-primary">
              {navItems.find(item => item.href === pathname)?.name || "Admin Panel"}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-white" />
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none">Admin User</p>
                <p className="text-xs text-muted-foreground">Manager</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary border-2 border-white shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

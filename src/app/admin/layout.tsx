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
  Bell,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // Fetch the role to ensure only admins can enter
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && user && !isProfileLoading && profile && profile.role !== 'admin') {
      // Redirect non-admins away
      router.push('/');
    }
  }, [user, isUserLoading, profile, isProfileLoading, router]);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Final catch for unauthorized access during redirect
  if (!user || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-headline font-extrabold text-primary">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have administrative privileges to view this page.</p>
        <Button onClick={() => router.push('/')} className="mt-6 rounded-full px-8">Return Home</Button>
      </div>
    );
  }

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
                <p className="text-sm font-bold leading-none">{profile?.firstName} {profile?.lastName || "Admin"}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-70">Administrator</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary border-2 border-white shadow-sm overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
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

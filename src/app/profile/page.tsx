
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, MapPin, Package, Heart, LogOut, Award, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear user-related local state
      localStorage.removeItem('plantshop_cart');
      localStorage.removeItem('plantshop_wishlist');
      localStorage.removeItem('plantshop_user');
      
      // Notify other components that cart/state has changed
      window.dispatchEvent(new Event('cart-updated'));
      window.dispatchEvent(new Event('storage'));
      
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-neutral/30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col md:flex-row gap-12">
            {/* Sidebar navigation */}
            <aside className="w-full md:w-64 space-y-2">
              <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 flex flex-col items-center text-center gap-4">
                <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center text-primary overflow-hidden border-2 border-white shadow-sm">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10" />
                  )}
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl truncate max-w-[200px]">
                    {user.displayName || "Plant Lover"}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Award className="h-3 w-3" /> Gold Member
                </div>
              </div>
              
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary text-white font-bold transition-all">
                  <User className="h-5 w-5" /> Profile Info
                </button>
                <Link href="/orders" className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-white text-muted-foreground hover:text-primary font-bold transition-all">
                  <Package className="h-5 w-5" /> My Orders
                </Link>
                <Link href="/plants" className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-white text-muted-foreground hover:text-primary font-bold transition-all">
                  <Heart className="h-5 w-5" /> Wishlist
                </Link>
                <Link href="/affiliate" className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-white text-muted-foreground hover:text-primary font-bold transition-all">
                  <Award className="h-5 w-5" /> Affiliate Program
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl hover:bg-white text-destructive font-bold transition-all mt-10"
                >
                  <LogOut className="h-5 w-5" /> Logout
                </button>
              </nav>
            </aside>

            {/* Content area */}
            <div className="flex-grow space-y-8">
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-headline font-bold text-primary">Personal Information</h2>
                    <Button variant="outline" className="rounded-full border-primary/20 text-primary">Edit Profile</Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Full Name</Label>
                      <div className="flex items-center gap-3 p-4 bg-accent rounded-2xl">
                        <User className="h-5 w-5 text-primary" />
                        <span className="font-bold">{user.displayName || "N/A"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Email Address</Label>
                      <div className="flex items-center gap-3 p-4 bg-accent rounded-2xl">
                        <Mail className="h-5 w-5 text-primary" />
                        <span className="font-bold">{user.email}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Phone Number</Label>
                      <div className="flex items-center gap-3 p-4 bg-accent rounded-2xl">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="font-bold">{user.phoneNumber || "Not provided"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Member Since</Label>
                      <div className="flex items-center gap-3 p-4 bg-accent rounded-2xl">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="font-bold">
                          {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-headline font-bold text-primary mb-6">Security</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-2 border-accent rounded-3xl">
                    <div className="space-y-1">
                      <h4 className="font-bold">Account Security</h4>
                      <p className="text-sm text-muted-foreground">Manage your authentication methods and security settings.</p>
                    </div>
                    <Button variant="secondary" className="rounded-full px-6">Manage</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, MapPin, Package, Heart, LogOut, Award, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    mobile1: "",
    mobile2: "",
    address1: "",
    address2: "",
    address3: ""
  });

  // Fetch role and extra profile data
  const userProfileRef = useMemoFirebase(() => (!db || !user?.uid) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Sync Firestore data to local state
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.displayName || "",
        mobile1: profile.mobile1 || profile.phone || "",
        mobile2: profile.mobile2 || "",
        address1: profile.address1 || "",
        address2: profile.address2 || "",
        address3: profile.address3 || ""
      });
    }
  }, [profile, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('plantshop_cart');
      localStorage.removeItem('plantshop_wishlist');
      localStorage.removeItem('plantshop_user');
      window.dispatchEvent(new Event('cart-updated'));
      window.dispatchEvent(new Event('storage'));
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !db) return;

    if (!formData.fullName.trim()) {
      toast({ title: "Name Required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }

    if (!formData.mobile1.trim()) {
      toast({ title: "Mobile Required", description: "Primary mobile number is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Profile Updated", description: "Your details have been saved successfully." });
    } catch (error) {
      console.error("Update profile error:", error);
      toast({ title: "Update Failed", description: "Could not save changes. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
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
                    {formData.fullName || "Plant Lover"}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {user.email}
                  </p>
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
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                        <Input 
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Your Name"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Email Address</Label>
                        <div className="flex items-center gap-3 p-3 h-12 bg-muted/50 rounded-2xl text-muted-foreground opacity-70">
                          <Mail className="h-4 w-4" />
                          <span className="font-medium text-sm">{user.email}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile1" className="text-muted-foreground">Mobile 1 (Required)</Label>
                        <Input 
                          id="mobile1"
                          required
                          value={formData.mobile1}
                          onChange={(e) => setFormData({ ...formData, mobile1: e.target.value })}
                          placeholder="+91 00000 00000"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile2" className="text-muted-foreground">Mobile 2 (Optional)</Label>
                        <Input 
                          id="mobile2"
                          value={formData.mobile2}
                          onChange={(e) => setFormData({ ...formData, mobile2: e.target.value })}
                          placeholder="+91 00000 00000"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-headline font-bold text-lg text-primary pt-4 border-t">Delivery Address</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="address1" className="text-muted-foreground">Address Line 1</Label>
                          <Input 
                            id="address1"
                            value={formData.address1}
                            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                            placeholder="House / Flat No, Building Name"
                            className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address2" className="text-muted-foreground">Address Line 2</Label>
                          <Input 
                            id="address2"
                            value={formData.address2}
                            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                            placeholder="Street Name, Landmark"
                            className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address3" className="text-muted-foreground">Address Line 3 (Optional)</Label>
                          <Input 
                            id="address3"
                            value={formData.address3}
                            onChange={(e) => setFormData({ ...formData, address3: e.target.value })}
                            placeholder="City, State, Pincode"
                            className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full sm:w-auto px-10 h-12 rounded-full font-bold text-lg gap-2 shadow-lg shadow-primary/20"
                      >
                        {isSaving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Save className="h-5 w-5" />
                        )}
                        Update Profile
                      </Button>
                    </div>
                  </form>
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

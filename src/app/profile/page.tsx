
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Package, Heart, LogOut, Award, Loader2, Save, MapPin, Trash2, Home, Briefcase } from "lucide-react";
import Link from "next/link";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, collection, addDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const INITIAL_FORM = {
  fullName: "",
  phone: "",
  altPhone: "",
  pincode: "",
  state: "",
  city: "",
  house: "",
  area: "",
  landmark: "",
  type: "Home"
};

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [addressForm, setAddressForm] = useState(INITIAL_FORM);

  // Fetch role and basic user data
  const userProfileRef = useMemoFirebase(() => (!db || !user?.uid) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // Fetch saved addresses
  const addressesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users', user.uid, 'addresses'), orderBy('createdAt', 'desc'));
  }, [db, user?.uid]);
  
  const { data: addresses, isLoading: isAddressesLoading } = useCollection(addressesQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

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

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !db) return;

    // Check limit
    if ((addresses?.length || 0) >= 3) {
      toast({ 
        title: "Limit Reached", 
        description: "You can save up to 3 addresses. Delete an existing one to add a new one.", 
        variant: "destructive" 
      });
      return;
    }

    // Required fields validation
    const requiredFields = ['fullName', 'phone', 'pincode', 'state', 'city', 'house', 'area'];
    for (const field of requiredFields) {
      if (!addressForm[field as keyof typeof addressForm]?.trim()) {
        toast({ title: "Required Field", description: "Please fill all required fields.", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);
    try {
      const colRef = collection(db, 'users', user.uid, 'addresses');
      await addDoc(colRef, {
        ...addressForm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Address Saved", description: "Your new delivery address has been added." });
      setAddressForm(INITIAL_FORM);
    } catch (error) {
      console.error("Save address error:", error);
      toast({ title: "Save Failed", description: "Could not save address. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.uid || !db) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'addresses', addressId));
      toast({ title: "Deleted", description: "Address removed from your profile." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete address.", variant: "destructive" });
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

  const isLimitReached = (addresses?.length || 0) >= 3;

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
                    {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : user.displayName || "Plant Lover"}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {user.email}
                  </p>
                </div>
              </div>
              
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary text-white font-bold transition-all text-left">
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
              {/* Existing Addresses List */}
              {addresses && addresses.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-headline font-bold text-primary px-4">Saved Addresses ({addresses.length}/3)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <Card key={addr.id} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden relative group">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {addr.type === 'Work' ? <Briefcase className="h-4 w-4 text-primary" /> : <Home className="h-4 w-4 text-primary" />}
                              <span className="text-[10px] uppercase font-bold tracking-widest text-primary/60">{addr.type}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-bold text-primary">{addr.fullName}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {addr.house}, {addr.area}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-sm font-medium mt-2 flex items-center gap-2">
                            <span className="text-muted-foreground font-normal">Contact:</span> {addr.phone}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Address Form */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-headline font-bold text-primary">Add New Address</h2>
                    {isLimitReached && (
                      <span className="text-xs font-bold text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                        Address Limit Reached
                      </span>
                    )}
                  </div>
                  
                  <form onSubmit={handleSaveAddress} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 1. Full Name */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="fullName" className="text-muted-foreground">Full Name (Required)</Label>
                        <Input 
                          id="fullName"
                          required
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                          placeholder="Receiver's Name"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 2. Phone Number */}
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-muted-foreground">Phone Number (Required)</Label>
                        <Input 
                          id="phone"
                          required
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="10-digit mobile number"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 3. Alternate Phone Number */}
                      <div className="space-y-2">
                        <Label htmlFor="altPhone" className="text-muted-foreground">Alternate Phone Number (Optional)</Label>
                        <Input 
                          id="altPhone"
                          value={addressForm.altPhone}
                          onChange={(e) => setAddressForm({ ...addressForm, altPhone: e.target.value })}
                          placeholder="Additional contact number"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 4. Pincode */}
                      <div className="space-y-2">
                        <Label htmlFor="pincode" className="text-muted-foreground">Pincode (Required)</Label>
                        <Input 
                          id="pincode"
                          required
                          value={addressForm.pincode}
                          onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                          placeholder="6-digit pincode"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 5. State */}
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-muted-foreground">State (Required)</Label>
                        <Input 
                          id="state"
                          required
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          placeholder="e.g. Karnataka"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 6. City */}
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-muted-foreground">City (Required)</Label>
                        <Input 
                          id="city"
                          required
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="e.g. Bengaluru"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 7. House / Building */}
                      <div className="space-y-2">
                        <Label htmlFor="house" className="text-muted-foreground">House / Building (Required)</Label>
                        <Input 
                          id="house"
                          required
                          value={addressForm.house}
                          onChange={(e) => setAddressForm({ ...addressForm, house: e.target.value })}
                          placeholder="Flat, House no., Building, Company"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 8. Area / Road */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="area" className="text-muted-foreground">Area / Road (Required)</Label>
                        <Input 
                          id="area"
                          required
                          value={addressForm.area}
                          onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                          placeholder="Area, Colony, Street, Sector, Village"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 9. Landmark */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="landmark" className="text-muted-foreground">Landmark (Optional)</Label>
                        <Input 
                          id="landmark"
                          value={addressForm.landmark}
                          onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                          placeholder="e.g. Near Apollo Hospital"
                          className="h-12 rounded-2xl border-none bg-accent focus-visible:ring-primary"
                        />
                      </div>

                      {/* 10. Address Type */}
                      <div className="space-y-4 md:col-span-2">
                        <Label className="text-muted-foreground">Address Type</Label>
                        <RadioGroup 
                          defaultValue="Home" 
                          onValueChange={(val) => setAddressForm({ ...addressForm, type: val })}
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center space-x-2 bg-accent px-6 py-3 rounded-2xl border-2 border-transparent data-[state=checked]:border-primary transition-all">
                            <RadioGroupItem value="Home" id="type-home" className="text-primary" />
                            <Label htmlFor="type-home" className="font-bold flex items-center gap-2 cursor-pointer">
                              <Home className="h-4 w-4" /> Home
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 bg-accent px-6 py-3 rounded-2xl border-2 border-transparent data-[state=checked]:border-primary transition-all">
                            <RadioGroupItem value="Work" id="type-work" className="text-primary" />
                            <Label htmlFor="type-work" className="font-bold flex items-center gap-2 cursor-pointer">
                              <Briefcase className="h-4 w-4" /> Work
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button 
                        type="submit" 
                        disabled={isSaving || isLimitReached}
                        className="w-full sm:w-auto px-10 h-12 rounded-full font-bold text-lg gap-2 shadow-lg shadow-primary/20"
                      >
                        {isSaving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Save className="h-5 w-5" />
                        )}
                        Save Address
                      </Button>
                      {isLimitReached && (
                        <p className="text-xs text-destructive mt-3 font-medium">
                          You have reached the maximum limit of 3 addresses.
                        </p>
                      )}
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

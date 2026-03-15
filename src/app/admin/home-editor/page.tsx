"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  useStorage 
} from "@/firebase";
import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Loader2, 
  Save, 
  Image as ImageIcon, 
  Upload, 
  LayoutDashboard, 
  Monitor, 
  ListTree,
  CheckCircle2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { PRODUCT_CATEGORIES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function HomeEditor() {
  const db = useFirestore();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  // --- HERO DATA ---
  const heroRef = useMemoFirebase(() => doc(db, "home_settings", "hero"), [db]);
  const { data: heroData, isLoading: heroLoading } = useDoc(heroRef);
  const [heroForm, setHeroForm] = useState<any>({});
  const [heroFile, setHeroFile] = useState<File | null>(null);

  useEffect(() => {
    if (heroData) setHeroForm(heroData);
  }, [heroData]);

  // --- CATEGORIES DATA ---
  const catsRef = useMemoFirebase(() => collection(db, "home_settings", "categories", "items"), [db]);
  const { data: catsData, isLoading: catsLoading } = useCollection(catsRef);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [catFile, setCatFile] = useState<File | null>(null);

  // --- SECTIONS DATA ---
  const sectionsRef = useMemoFirebase(() => doc(db, "home_settings", "sections"), [db]);
  const { data: sectionsData, isLoading: sectionsLoading } = useDoc(sectionsRef);
  const [sectionsForm, setSectionsForm] = useState<any>({});

  useEffect(() => {
    if (sectionsData) setSectionsForm(sectionsData);
    else setSectionsForm({
      topRated: { enabled: true, title: "Top Rated Plants" },
      crowdFavorites: { enabled: true, title: "Crowd Favorites" },
      topSales: { enabled: true, title: "Best Sellers" },
      newArrivals: { enabled: true, title: "New Arrivals" }
    });
  }, [sectionsData]);

  // --- HANDLERS ---

  const handleSaveHero = async () => {
    setIsSaving(true);
    try {
      let imageUrl = heroForm.imageUrl;
      if (heroFile) {
        const fileRef = ref(storage, `home/hero_${Date.now()}`);
        const result = await uploadBytes(fileRef, heroFile);
        imageUrl = await getDownloadURL(result.ref);
      }

      await setDoc(heroRef, {
        ...heroForm,
        imageUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({ title: "Hero Section Updated" });
      setHeroFile(null);
    } catch (e) {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCat = async (catId: string, formData: any, file: File | null) => {
    setIsSaving(true);
    try {
      let imageUrl = formData.imageUrl;
      if (file) {
        const fileRef = ref(storage, `home/categories/${catId}_${Date.now()}`);
        const result = await uploadBytes(fileRef, file);
        imageUrl = await getDownloadURL(result.ref);
      }

      await setDoc(doc(db, "home_settings", "categories", "items", catId), {
        ...formData,
        imageUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({ title: `${formData.label} Updated` });
      setSelectedCat(null);
      setCatFile(null);
    } catch (e) {
      toast({ title: "Update Failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSections = async () => {
    setIsSaving(true);
    try {
      await setDoc(sectionsRef, {
        ...sectionsForm,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Home Sections Updated" });
    } catch (e) {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (heroLoading || catsLoading || sectionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-headline font-extrabold text-primary">Home Page Editor</h1>
        <p className="text-muted-foreground text-sm">Manage dynamic content and branding for your main landing page.</p>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="bg-white border rounded-2xl h-14 p-1 gap-2 shadow-sm">
          <TabsTrigger value="hero" className="rounded-xl px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Monitor className="h-4 w-4 mr-2" /> Hero Banner
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <ListTree className="h-4 w-4 mr-2" /> Categories
          </TabsTrigger>
          <TabsTrigger value="sections" className="rounded-xl px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Sections
          </TabsTrigger>
        </TabsList>

        {/* --- HERO TAB --- */}
        <TabsContent value="hero">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-8">
              <CardTitle>Main Hero Banner</CardTitle>
              <CardDescription>The first thing users see when they land on your store.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Main Headline</Label>
                    <Input 
                      value={heroForm.headline || ""} 
                      onChange={e => setHeroForm({...heroForm, headline: e.target.value})}
                      placeholder="e.g. Bring Nature Home"
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Headline (Accent Text)</Label>
                    <Input 
                      value={heroForm.headlineAccent || ""} 
                      onChange={e => setHeroForm({...heroForm, headlineAccent: e.target.value})}
                      placeholder="e.g. Garden Fresh"
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description Text</Label>
                    <Input 
                      value={heroForm.description || ""} 
                      onChange={e => setHeroForm({...heroForm, description: e.target.value})}
                      placeholder="Enter a brief intro..."
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input 
                      value={heroForm.buttonText || ""} 
                      onChange={e => setHeroForm({...heroForm, buttonText: e.target.value})}
                      placeholder="Shop Now"
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Hero Background Image</Label>
                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-muted border-2 border-dashed border-primary/20 group">
                    {(heroFile || heroForm.imageUrl) ? (
                      <Image 
                        src={heroFile ? URL.createObjectURL(heroFile) : heroForm.imageUrl} 
                        alt="Hero Preview" 
                        fill 
                        className="object-cover" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <ImageIcon className="h-10 w-10 opacity-20" />
                        <span className="text-xs font-bold uppercase tracking-widest">No Image Selected</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <div className="bg-white text-primary px-4 py-2 rounded-full font-bold flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Change Image
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={e => setHeroFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center italic">Recommended size: 1920x1080px (PNG/JPG)</p>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button onClick={handleSaveHero} disabled={isSaving} className="rounded-full h-12 px-10 gap-2 font-bold shadow-xl shadow-primary/20">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Save Hero Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- CATEGORIES TAB --- */}
        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRODUCT_CATEGORIES.map(cat => {
                const dbCat = catsData?.find(c => c.id === cat.value);
                return (
                  <Card 
                    key={cat.value} 
                    className={cn(
                      "rounded-3xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden",
                      selectedCat?.id === cat.value && "ring-4 ring-primary ring-offset-2"
                    )}
                    onClick={() => {
                      setSelectedCat(dbCat || { id: cat.value, label: cat.label, count: "0+ plants" });
                      setCatFile(null);
                    }}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                        {dbCat?.imageUrl ? (
                          <Image src={dbCat.imageUrl} alt={cat.label} fill className="object-cover" />
                        ) : (
                          <ImageIcon className="h-6 w-6 m-auto text-muted-foreground opacity-20" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-primary">{dbCat?.label || cat.label}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{dbCat?.count || "0+ plants"}</p>
                      </div>
                      {dbCat && <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-6">
              {selectedCat ? (
                <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden sticky top-24">
                  <CardHeader className="bg-primary text-white p-8">
                    <CardTitle className="text-xl">Edit Category</CardTitle>
                    <CardDescription className="text-white/60">ID: {selectedCat.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input 
                        value={selectedCat.label} 
                        onChange={e => setSelectedCat({...selectedCat, label: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plant Count Text</Label>
                      <Input 
                        value={selectedCat.count} 
                        onChange={e => setSelectedCat({...selectedCat, count: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-4">
                      <Label>Background Image</Label>
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-muted border-2 border-dashed border-primary/20 group">
                        {(catFile || selectedCat.imageUrl) ? (
                          <Image 
                            src={catFile ? URL.createObjectURL(catFile) : selectedCat.imageUrl} 
                            alt="Category Preview" 
                            fill 
                            className="object-cover" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <Upload className="h-8 w-8 opacity-20" />
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Upload className="h-6 w-6 text-white" />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={e => setCatFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-14 rounded-full font-bold text-lg gap-2"
                      disabled={isSaving}
                      onClick={() => handleSaveCat(selectedCat.id, selectedCat, catFile)}
                    >
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      Update Category
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full min-h-[400px] rounded-[2.5rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-center p-10 bg-white/50">
                  <ListTree className="h-12 w-12 text-primary/20 mb-4" />
                  <h3 className="font-bold text-primary/40">Select a category to edit its appearance</h3>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* --- SECTIONS TAB --- */}
        <TabsContent value="sections">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-8">
              <CardTitle>Homepage Layout</CardTitle>
              <CardDescription>Control the visibility and naming of automated plant grids.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(sectionsForm).filter(e => e[0] !== 'updatedAt').map(([key, section]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-6 rounded-3xl bg-accent/20 border border-transparent hover:border-primary/10 transition-all">
                    <div className="space-y-4 flex-grow pr-8">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={section.enabled} 
                          onCheckedChange={checked => setSectionsForm({
                            ...sectionsForm,
                            [key]: { ...section, enabled: checked }
                          })}
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          {section.enabled ? "Visible" : "Hidden"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase font-black tracking-widest">Section Title</Label>
                        <Input 
                          value={section.title}
                          onChange={e => setSectionsForm({
                            ...sectionsForm,
                            [key]: { ...section, title: e.target.value }
                          })}
                          className="rounded-xl h-11 bg-white"
                        />
                      </div>
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                      <LayoutDashboard className="h-6 w-6 text-primary opacity-20" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t">
                <Button onClick={handleSaveSections} disabled={isSaving} className="rounded-full h-12 px-10 gap-2 font-bold shadow-xl shadow-primary/20">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Apply Layout Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

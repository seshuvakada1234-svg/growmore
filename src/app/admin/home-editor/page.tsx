"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, setDoc, collection, serverTimestamp, deleteField } from "firebase/firestore";
import {
  Loader2, Save, Image as ImageIcon, Upload, LayoutDashboard,
  Monitor, ListTree, CheckCircle2, Plus, Trash2, GripVertical
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { PRODUCT_CATEGORIES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

// ── Upload helper ─────────────────────────────────────────────────────────────
async function uploadImageToR2(
  file: File, folder: string, onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(10);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  onProgress?.(40);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  onProgress?.(90);
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Upload failed"); }
  const { url } = await res.json();
  onProgress?.(100);
  return url;
}

// ── Proxy helper ──────────────────────────────────────────────────────────────
function proxyUrl(url: string, w = 1200): string {
  if (!url) return "";
  if (url.includes("ik.imagekit.io")) {
    const parts = url.split("ik.imagekit.io/")[1]?.split("/") ?? [];
    const key = parts.slice(1).join("/");
    return `/api/image?file=${encodeURIComponent(key)}&w=${w}`;
  }
  return url;
}

// ── Default sections ──────────────────────────────────────────────────────────
const DEFAULT_SECTIONS: Record<string, any> = {
  topSales:       { enabled: true,  title: "Best Sellers",    imageUrl: "", order: 0 },
  crowdFavorites: { enabled: true,  title: "Crowd Favorites", imageUrl: "", order: 1 },
  topRated:       { enabled: true,  title: "Top Rated Plants",imageUrl: "", order: 2 },
  newArrivals:    { enabled: true,  title: "New Arrivals",    imageUrl: "", order: 3 },
};

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ isUploading, progress }: { isUploading: boolean; progress: number }) {
  if (!isUploading) return null;
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs font-bold text-primary">
        <span>Uploading image...</span><span>{progress}%</span>
      </div>
      <div className="w-full bg-primary/10 rounded-full h-2.5">
        <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ── Image Upload Box ──────────────────────────────────────────────────────────
function ImageUploadBox({
  preview, savedUrl, onFileChange, aspectRatio = "aspect-video", size = 1200
}: {
  preview: string; savedUrl: string; onFileChange: (f: File) => void;
  aspectRatio?: string; size?: number;
}) {
  const displaySrc = preview || (savedUrl ? proxyUrl(savedUrl, size) : "");
  return (
    <div className="space-y-2">
      {/* Image preview */}
      {displaySrc ? (
        <div className={cn("relative rounded-2xl overflow-hidden border border-primary/20 group", aspectRatio)}>
          <Image src={displaySrc} alt="Preview" fill className="object-cover" unoptimized />
          {/* Change overlay on hover */}
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <div className="bg-white text-primary px-4 py-2 rounded-full font-bold flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" /> Change Image
            </div>
            <input type="file" className="hidden" accept="image/*"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} />
          </label>
        </div>
      ) : null}

      {/* Always-visible upload button */}
      <label className={cn(
        "flex items-center justify-center gap-2 cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 bg-accent/30 hover:bg-accent/60 transition-all py-4 font-semibold text-sm text-primary",
        displaySrc ? "py-2.5" : "py-8"
      )}>
        <Upload className="h-4 w-4" />
        {displaySrc ? "Replace image" : "Click to upload image"}
        <input type="file" className="hidden" accept="image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} />
      </label>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomeEditor() {
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // ── Hero ──────────────────────────────────────────────────────────────────
  const heroRef = useMemoFirebase(() => doc(db, "home_settings", "hero"), [db]);
  const { data: heroData, isLoading: heroLoading } = useDoc(heroRef);
  const [heroForm, setHeroForm] = useState<any>({});
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState("");

  useEffect(() => { if (heroData) setHeroForm(heroData); }, [heroData]);

  // ── Categories ────────────────────────────────────────────────────────────
  const catsRef = useMemoFirebase(() => collection(db, "home_settings", "categories", "items"), [db]);
  const { data: catsData, isLoading: catsLoading } = useCollection(catsRef);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [catFile, setCatFile] = useState<File | null>(null);
  const [catPreview, setCatPreview] = useState("");

  // ── Products (for image picker) ─────────────────────────────────────────
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db]);
  const { data: products } = useCollection(productsRef);

  // ── Sections ──────────────────────────────────────────────────────────────
  const sectionsRef = useMemoFirebase(() => doc(db, "home_settings", "sections"), [db]);
  const { data: sectionsData, isLoading: sectionsLoading } = useDoc(sectionsRef);
  const [sectionsForm, setSectionsForm] = useState<Record<string, any>>(DEFAULT_SECTIONS);
  const [sectionFiles, setSectionFiles] = useState<Record<string, File>>({});
  const [sectionPreviews, setSectionPreviews] = useState<Record<string, string>>({});

  // Add section dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", category: "", imageUrl: "" });
  const [newSectionFile, setNewSectionFile] = useState<File | null>(null);
  const [newSectionPreview, setNewSectionPreview] = useState("");

  useEffect(() => {
    if (sectionsData) {
      const { updatedAt, ...rest } = sectionsData;
      setSectionsForm({ ...DEFAULT_SECTIONS, ...rest });
    }
  }, [sectionsData]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isBuiltIn = (key: string) => key in DEFAULT_SECTIONS;

  const sortedSections = Object.entries(sectionsForm)
    .sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99));

  // ── Save Hero ─────────────────────────────────────────────────────────────
  const handleSaveHero = async () => {
    setIsSaving(true);
    let imageUrl = heroForm.imageUrl;
    try {
      if (heroFile) {
        setIsUploading(true);
        imageUrl = await uploadImageToR2(heroFile, "hero", p => setUploadProgress(p));
        setIsUploading(false); setHeroFile(null); setHeroPreview("");
      }
      await setDoc(heroRef, { ...heroForm, imageUrl, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "✅ Hero Section Updated!" });
    } catch (e: any) {
      toast({ title: "Upload Failed", description: e.message, variant: "destructive" });
    } finally { setIsSaving(false); setUploadProgress(0); setIsUploading(false); }
  };

  // ── Save Category ─────────────────────────────────────────────────────────
  const handleSaveCat = async () => {
    if (!selectedCat) return;
    setIsSaving(true);
    let imageUrl = selectedCat.imageUrl;
    try {
      if (catFile) {
        setIsUploading(true);
        imageUrl = await uploadImageToR2(catFile, "categories", p => setUploadProgress(p));
        setIsUploading(false); setCatFile(null); setCatPreview("");
      }
      const catDocRef = doc(db, "home_settings", "categories", "items", selectedCat.id);
      await setDoc(catDocRef, { ...selectedCat, imageUrl, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: `✅ ${selectedCat.label} Updated!` });
      setSelectedCat(null);
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally { setIsSaving(false); setUploadProgress(0); setIsUploading(false); }
  };

  // ── Save All Sections ─────────────────────────────────────────────────────
  const handleSaveSections = async () => {
    setIsSaving(true);
    try {
      // Images are already URLs from product picker — just save directly
      await setDoc(sectionsRef, { ...sectionsForm, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "✅ Sections Updated!" });
    } catch (e: any) {
      toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  // ── Add New Section ───────────────────────────────────────────────────────
  const handleAddSection = async () => {
    if (!newSection.title.trim()) {
      toast({ title: "Title required", variant: "destructive" }); return;
    }
    setIsSaving(true);
    try {
      const key = `custom_${Date.now()}`;
      let imageUrl = "";
      if (newSectionFile) {
        setIsUploading(true);
        imageUrl = await uploadImageToR2(newSectionFile, `sections/${key}`, p => setUploadProgress(p));
        setIsUploading(false);
      }
      const newEntry = {
        title: newSection.title.trim(),
        enabled: true,
        imageUrl,
        category: newSection.category || "",
        isCustom: true,
        order: Object.keys(sectionsForm).length,
      };
      const updated = { ...sectionsForm, [key]: newEntry };
      setSectionsForm(updated);
      await setDoc(sectionsRef, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: `✅ "${newSection.title}" section added!` });
      setNewSection({ title: "", category: "", imageUrl: "" });
      setNewSectionFile(null); setNewSectionPreview("");
      setAddOpen(false);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setIsSaving(false); setUploadProgress(0); setIsUploading(false); }
  };

  // ── Delete Custom Section ─────────────────────────────────────────────────
  const handleDeleteSection = async (key: string, title: string) => {
    try {
      const updated = { ...sectionsForm };
      delete updated[key];
      setSectionsForm(updated);
      // Remove from Firestore using deleteField
      const { updateDoc } = await import("firebase/firestore");
      await updateDoc(sectionsRef, { [key]: deleteField() });
      toast({ title: `"${title}" removed` });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (heroLoading || catsLoading || sectionsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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

        {/* ── HERO TAB ── */}
        <TabsContent value="hero">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-8">
              <CardTitle>Main Hero Banner</CardTitle>
              <CardDescription>The first thing users see when they land on your store.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  {[
                    { label: "Main Headline", key: "headline", placeholder: "e.g. Bring Nature Home" },
                    { label: "Sub Headline (Accent Text)", key: "headlineAccent", placeholder: "e.g. Garden Fresh" },
                    { label: "Description Text", key: "description", placeholder: "Enter a brief intro..." },
                    { label: "Button Text", key: "buttonText", placeholder: "Shop Now" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input value={heroForm[key] || ""} onChange={e => setHeroForm({ ...heroForm, [key]: e.target.value })}
                        placeholder={placeholder} className="rounded-xl h-12" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <Label>Hero Background Image</Label>
                  <ImageUploadBox
                    preview={heroPreview} savedUrl={heroForm.imageUrl || ""}
                    onFileChange={f => { setHeroFile(f); setHeroPreview(URL.createObjectURL(f)); }}
                    aspectRatio="aspect-video" size={1200}
                  />
                  <p className="text-[10px] text-muted-foreground text-center italic">Recommended: 1920×1080px</p>
                </div>
              </div>
              <div className="pt-6 border-t space-y-4">
                <ProgressBar isUploading={isUploading} progress={uploadProgress} />
                <Button onClick={handleSaveHero} disabled={isSaving} className="rounded-full h-12 px-10 gap-2 font-bold">
                  {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" />{isUploading ? `Uploading ${uploadProgress}%` : "Saving..."}</> : <><Save className="h-5 w-5" />Save Hero Settings</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CATEGORIES TAB ── */}
        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRODUCT_CATEGORIES.map(cat => {
                const dbCat = catsData?.find((c: any) => c.id === cat.value);
                return (
                  <Card key={cat.value}
                    className={cn("rounded-3xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden",
                      selectedCat?.id === cat.value && "ring-4 ring-primary ring-offset-2")}
                    onClick={() => { setSelectedCat(dbCat || { id: cat.value, label: cat.label, count: "0+ plants" }); setCatFile(null); setCatPreview(""); }}>
                    <div className="flex items-center gap-4 p-4">
                      <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                        {dbCat?.imageUrl
                          ? <Image src={proxyUrl(dbCat.imageUrl, 200)} alt={cat.label} fill className="object-cover" unoptimized />
                          : <ImageIcon className="h-6 w-6 m-auto text-muted-foreground opacity-20" />}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-primary">{dbCat?.label || cat.label}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{dbCat?.count || "0+ plants"}</p>
                      </div>
                      {dbCat?.imageUrl && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
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
                      <Input value={selectedCat.label} onChange={e => setSelectedCat({ ...selectedCat, label: e.target.value })} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Plant Count Text</Label>
                      <Input value={selectedCat.count || ""} onChange={e => setSelectedCat({ ...selectedCat, count: e.target.value })} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Background Image</Label>
                      <ImageUploadBox
                        preview={catPreview} savedUrl={selectedCat.imageUrl || ""}
                        onFileChange={f => { setCatFile(f); setCatPreview(URL.createObjectURL(f)); }}
                        aspectRatio="aspect-[4/3]" size={400}
                      />
                    </div>
                    <ProgressBar isUploading={isUploading} progress={uploadProgress} />
                    <Button className="w-full h-14 rounded-full font-bold text-lg gap-2" disabled={isSaving} onClick={handleSaveCat}>
                      {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" />{isUploading ? `Uploading ${uploadProgress}%` : "Saving..."}</> : <><Save className="h-5 w-5" />Update Category</>}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full min-h-[400px] rounded-[2.5rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-center p-10 bg-white/50">
                  <ListTree className="h-12 w-12 text-primary/20 mb-4" />
                  <h3 className="font-bold text-primary/40">Select a category to edit</h3>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── SECTIONS TAB ── */}
        <TabsContent value="sections">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Homepage Sections</CardTitle>
                  <CardDescription>Control visibility, title and banner image for each section.</CardDescription>
                </div>
                <Button onClick={() => setAddOpen(true)} className="rounded-full gap-2 h-11 px-5">
                  <Plus className="h-4 w-4" /> Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">

              {sortedSections.map(([key, section]) => (
                <div key={key} className="rounded-3xl bg-accent/20 border border-transparent hover:border-primary/10 transition-all overflow-hidden">
                  <div className="p-6 space-y-5">
                    {/* Top row — toggle + title + delete */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      <Switch
                        checked={section.enabled ?? true}
                        onCheckedChange={checked => setSectionsForm({ ...sectionsForm, [key]: { ...section, enabled: checked } })}
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-14">
                        {section.enabled ? "Visible" : "Hidden"}
                      </span>
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          value={section.title || ""}
                          onChange={e => setSectionsForm({ ...sectionsForm, [key]: { ...section, title: e.target.value } })}
                          className="rounded-xl h-11 bg-white font-semibold"
                          placeholder="Section title"
                        />
                      </div>
                      {/* Category filter for custom sections */}
                      {section.isCustom && (
                        <div className="w-48">
                          <Select
                            value={section.category || ""}
                            onValueChange={val => setSectionsForm({ ...sectionsForm, [key]: { ...section, category: val } })}
                          >
                            <SelectTrigger className="rounded-xl h-11 bg-white text-xs">
                              <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All products</SelectItem>
                              {PRODUCT_CATEGORIES.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Delete only custom sections */}
                      {section.isCustom && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => handleDeleteSection(key, section.title)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* ── TWO SECTION BANNER IMAGES ── */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground uppercase font-black tracking-widest">
                        Section Banner Images <span className="font-normal normal-case">(pick up to 2 from your product images)</span>
                      </Label>

                      {/* Two image preview boxes side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Image 1 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Image 1</span>
                            {section.imageUrl && (
                              <button onClick={() => setSectionsForm({ ...sectionsForm, [key]: { ...section, imageUrl: "" } })}
                                className="text-[10px] text-destructive hover:underline">Remove</button>
                            )}
                          </div>
                          <div className={cn("relative rounded-xl overflow-hidden border-2 h-24",
                            section.imageUrl ? "border-primary" : "border-dashed border-primary/20 bg-accent/30")}>
                            {section.imageUrl ? (
                              <Image src={proxyUrl(section.imageUrl, 600)} alt="Banner 1" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">Click image below</div>
                            )}
                            {section.imageUrl && <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">✅ Set</div>}
                          </div>
                        </div>

                        {/* Image 2 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Image 2</span>
                            {section.imageUrl2 && (
                              <button onClick={() => setSectionsForm({ ...sectionsForm, [key]: { ...section, imageUrl2: "" } })}
                                className="text-[10px] text-destructive hover:underline">Remove</button>
                            )}
                          </div>
                          <div className={cn("relative rounded-xl overflow-hidden border-2 h-24",
                            section.imageUrl2 ? "border-primary" : "border-dashed border-primary/20 bg-accent/30")}>
                            {section.imageUrl2 ? (
                              <Image src={proxyUrl(section.imageUrl2, 600)} alt="Banner 2" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">Click image below</div>
                            )}
                            {section.imageUrl2 && <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">✅ Set</div>}
                          </div>
                        </div>
                      </div>

                      {/* Image grid — click fills image1 first, then image2 */}
                      <div className="grid grid-cols-5 gap-2">
                        {(products || []).flatMap((p: any) =>
                          (p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [])
                            .map((url: string) => ({ url, name: p.name }))
                        ).filter((item: any, idx: number, arr: any[]) =>
                          item.url && arr.findIndex((x: any) => x.url === item.url) === idx
                        ).map(({ url, name }: { url: string; name: string }) => {
                          const display = proxyUrl(url, 300);
                          const isImg1 = section.imageUrl === url;
                          const isImg2 = section.imageUrl2 === url;
                          const isSelected = isImg1 || isImg2;
                          return (
                            <button key={url} type="button"
                              onClick={() => {
                                if (isImg1) { setSectionsForm({ ...sectionsForm, [key]: { ...section, imageUrl: "" } }); return; }
                                if (isImg2) { setSectionsForm({ ...sectionsForm, [key]: { ...section, imageUrl2: "" } }); return; }
                                // Fill image1 first, then image2
                                if (!section.imageUrl) { setSectionsForm({ ...sectionsForm, [key]: { ...section, imageUrl: url } }); }
                                else if (!section.imageUrl2) { setSectionsForm({ ...sectionsForm, [key]: { ...section, imageUrl2: url } }); }
                              }}
                              className={cn("relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105",
                                isSelected ? "border-primary ring-2 ring-primary ring-offset-1" : "border-transparent hover:border-primary/50"
                              )}
                              title={name}
                            >
                              <Image src={display} alt={name} fill className="object-cover" unoptimized />
                              {isImg1 && <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1 rounded">1</div>}
                              {isImg2 && <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[8px] font-bold px-1 rounded">2</div>}
                              {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-white drop-shadow" /></div>}
                            </button>
                          );
                        })}
                        {(!products || products.length === 0) && (
                          <div className="col-span-5 text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                            No products uploaded yet. Add products with images first.
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Click once → sets Image 1 (blue). Click again different image → sets Image 2 (green). Click selected → removes it.</p>
                    </div>

                    {/* ── PICK UP TO 5 PRODUCTS ── */}
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase font-black tracking-widest">
                          Pick Products <span className="font-normal normal-case text-primary">({(section.productIds || []).length}/5 selected)</span>
                        </Label>
                        {(section.productIds || []).length > 0 && (
                          <Button variant="ghost" size="sm" className="text-destructive text-xs h-7 px-2"
                            onClick={() => setSectionsForm({ ...sectionsForm, [key]: { ...section, productIds: [] } })}>
                            Clear all
                          </Button>
                        )}
                      </div>

                      {/* Selected products row */}
                      {(section.productIds || []).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {(section.productIds || []).map((pid: string) => {
                            const p = (products || []).find((x: any) => x.id === pid);
                            if (!p) return null;
                            const img = proxyUrl(p.images?.[0] || p.imageUrl || '', 100);
                            return (
                              <div key={pid} className="relative group flex flex-col items-center">
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-primary shadow-sm">
                                  <Image src={img} alt={p.name} fill className="object-cover" unoptimized />
                                </div>
                                <button onClick={() => setSectionsForm({ ...sectionsForm, [key]: { ...section, productIds: (section.productIds || []).filter((id: string) => id !== pid) } })}
                                  className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">×</button>
                                <p className="text-[8px] text-center mt-0.5 text-muted-foreground w-14 truncate">{p.name}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Product picker grid */}
                      <div className="grid grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
                        {(products || []).map((p: any) => {
                          const img = proxyUrl(p.images?.[0] || p.imageUrl || '', 200);
                          const isSelected = (section.productIds || []).includes(p.id);
                          const maxReached = (section.productIds || []).length >= 5;
                          return (
                            <button key={p.id} type="button"
                              disabled={!isSelected && maxReached}
                              onClick={() => {
                                const current = section.productIds || [];
                                const updated = isSelected ? current.filter((id: string) => id !== p.id) : maxReached ? current : [...current, p.id];
                                setSectionsForm({ ...sectionsForm, [key]: { ...section, productIds: updated } });
                              }}
                              className={cn("relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                                isSelected ? "border-primary ring-2 ring-primary ring-offset-1" : "border-transparent hover:border-primary/50",
                                !isSelected && maxReached && "opacity-30 cursor-not-allowed"
                              )}
                              title={p.name}
                            >
                              {img ? <Image src={img} alt={p.name} fill className="object-cover" unoptimized /> : <div className="absolute inset-0 bg-muted flex items-center justify-center text-lg">🌿</div>}
                              {isSelected && <div className="absolute inset-0 bg-primary/30 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-white" /></div>}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[7px] font-bold px-1 py-0.5 truncate">{p.name}</div>
                            </button>
                          );
                        })}
                        {(!products || products.length === 0) && (
                          <div className="col-span-5 text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-xl">No products yet.</div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Select up to 5 plants. Leave empty to auto-show based on filter.</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t space-y-4">
                <ProgressBar isUploading={isUploading} progress={uploadProgress} />
                <Button onClick={handleSaveSections} disabled={isSaving} className="rounded-full h-12 px-10 gap-2 font-bold shadow-xl shadow-primary/20">
                  {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" />{isUploading ? `Uploading ${uploadProgress}%` : "Saving..."}</> : <><Save className="h-5 w-5" />Save All Sections</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add Section Dialog ── */}
      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setNewSection({ title: "", category: "", imageUrl: "" }); setNewSectionFile(null); setNewSectionPreview(""); } }}>
        <DialogContent className="max-w-lg rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-extrabold text-primary">Add New Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label>Section Title</Label>
              <Input value={newSection.title} onChange={e => setNewSection({ ...newSection, title: e.target.value })}
                placeholder="e.g. Summer Special Plants" className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label>Filter by Category <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Select value={newSection.category} onValueChange={val => setNewSection({ ...newSection, category: val })}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Show all products or filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {PRODUCT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Banner Image <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <ImageUploadBox
                preview={newSectionPreview} savedUrl=""
                onFileChange={f => { setNewSectionFile(f); setNewSectionPreview(URL.createObjectURL(f)); }}
                aspectRatio="aspect-[16/5]" size={1200}
              />
            </div>
            <ProgressBar isUploading={isUploading} progress={uploadProgress} />
            <Button onClick={handleAddSection} disabled={isSaving} className="w-full h-12 rounded-full font-bold gap-2">
              {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" />{isUploading ? `Uploading ${uploadProgress}%` : "Creating..."}</> : <><Plus className="h-5 w-5" />Create Section</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
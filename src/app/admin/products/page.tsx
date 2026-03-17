"use client";

import { useState } from "react";
import { Category, PRODUCT_CATEGORIES, PRODUCTS as MOCK_PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Plus, Search, Edit2, Trash2, Image as ImageIcon, Zap,
  Loader2, Package, X, Upload, Database, CheckCircle2
} from "lucide-react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { adminAIProductDescription } from "@/ai/flows/admin-ai-product-description";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, setDoc, deleteDoc, doc, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const MAX_IMAGES = 5;

// ── Generate slug from name ──────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Ensure slug is unique in Firestore ───────────────────────────────────────
async function getUniqueSlug(db: any, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let count = 1;
  while (true) {
    const snap = await getDoc(doc(db, "products", slug));
    if (!snap.exists() || snap.id === excludeId) return slug;
    slug = `${baseSlug}-${count++}`;
  }
}

// ── Upload helper ────────────────────────────────────────────────────────────
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
  if (!res.ok) { const { error } = await res.json(); throw new Error(error || "Upload failed"); }
  const { url } = await res.json();
  onProgress?.(100);
  return url;
}

// ── Proxy helper ─────────────────────────────────────────────────────────────
function getProxiedUrl(url: string, w = 100): string {
  if (!url) return "";
  if (url.includes("ik.imagekit.io")) {
    const parts = url.split("ik.imagekit.io/")[1]?.split("/") ?? [];
    const key = parts.slice(1).join("/");
    if (key) return `/api/image?file=${encodeURIComponent(key)}&w=${w}`;
  }
  return url;
}

// ── Empty form state ──────────────────────────────────────────────────────────
const emptyForm = () => ({
  name: "",
  category: "indoor" as Category,
  price: "",
  oldPrice: "",
  description: "",
  affiliateCommission: "10",
  stock: "50",
});

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const db = useFirestore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState(emptyForm());

  const [imageSlots, setImageSlots] = useState<
    { file: File | null; preview: string; existing: string | null }[]
  >([]);

  const productsQuery = useMemoFirebase(() => collection(db, "products"), [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = (products || []).filter((p: any) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Image handlers ──────────────────────────────────────────────────────────
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const remaining = MAX_IMAGES - imageSlots.length;
    if (remaining <= 0) {
      toast({ title: "Limit reached", description: `Maximum ${MAX_IMAGES} images.`, variant: "destructive" });
      e.target.value = ""; return;
    }
    const accepted = incoming.slice(0, remaining);
    const newSlots = accepted.map((file) => ({ file, preview: URL.createObjectURL(file), existing: null }));
    setImageSlots((prev) => [...prev, ...newSlots]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImageSlots((prev) => {
      const updated = [...prev];
      if (updated[index].file) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  // ── Reset form ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm());
    imageSlots.forEach((s) => { if (s.file) URL.revokeObjectURL(s.preview); });
    setImageSlots([]);
    setUploadProgress(0);
    setEditingProduct(null);
  };

  // ── Open edit dialog ────────────────────────────────────────────────────────
  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      category: product.category || "indoor",
      price: String(product.price || ""),
      oldPrice: String(product.oldPrice || ""),
      description: product.description || "",
      affiliateCommission: String(product.affiliateCommission || "10"),
      stock: String(product.stock || "50"),
    });
    // Load existing images as slots
    const existingSlots = (product.images || []).map((url: string) => ({
      file: null,
      preview: getProxiedUrl(url, 200) || url,
      existing: url,
    }));
    setImageSlots(existingSlots);
    setOpen(true);
  };

  // ── AI description ──────────────────────────────────────────────────────────
  const handleAI = async () => {
    if (!form.name) {
      toast({ title: "Name required", description: "Please enter a plant name first.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const catLabel = PRODUCT_CATEGORIES.find(c => c.value === form.category)?.label || form.category;
      const result = await adminAIProductDescription({ plantName: form.name, category: catLabel });
      setForm({ ...form, description: result.description });
      toast({ title: "AI Generated!", description: "Description created successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to generate AI description.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save (add or edit) ──────────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Plant name cannot be empty.", variant: "destructive" }); return;
    }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid price.", variant: "destructive" }); return;
    }
    const stockNum = parseInt(form.stock);
    if (isNaN(stockNum) || stockNum < 0) {
      toast({ title: "Validation Error", description: "Please enter a valid stock quantity.", variant: "destructive" }); return;
    }
    if (imageSlots.length === 0) {
      toast({ title: "Validation Error", description: "Please upload at least one image.", variant: "destructive" }); return;
    }

    setIsSaving(true);
    setUploadProgress(0);

    try {
      // ── Generate slug-based document ID ─────────────────────────────────
      const baseSlug = generateSlug(form.name);
      const productId = editingProduct
        ? editingProduct.id  // keep existing ID when editing
        : await getUniqueSlug(db, baseSlug);

      const productRef = doc(db, "products", productId);

      // ── Upload new images, keep existing ones ────────────────────────────
      const imageUrls: string[] = [];
      for (let i = 0; i < imageSlots.length; i++) {
        const slot = imageSlots[i];
        if (!slot.file) {
          // existing image — keep as-is
          imageUrls.push(slot.existing!);
          continue;
        }
        const url = await uploadImageToR2(
          slot.file,
          `products/${productId}`,
          (pct) => {
            const overall = Math.round(((i + pct / 100) / imageSlots.length) * 100);
            setUploadProgress(overall);
          }
        );
        imageUrls.push(url);
      }

      const oldPriceNum = form.oldPrice ? parseFloat(form.oldPrice) : null;

      const productData: any = {
        id: productId,
        slug: productId,           // slug = document ID
        name: form.name.trim(),
        category: form.category,
        description: form.description,
        price: priceNum,
        ...(oldPriceNum ? { oldPrice: oldPriceNum } : {}),
        stock: stockNum,
        affiliateCommission: parseFloat(form.affiliateCommission) || 10,
        images: imageUrls,
        imageUrl: imageUrls[0] || "",  // for backwards compatibility
        updatedAt: serverTimestamp(),
      };

      if (!editingProduct) {
        productData.createdAt = serverTimestamp();
        productData.rating = 4.5;
        productData.reviewsCount = 0;
      }

      await setDoc(productRef, productData, { merge: true });

      toast({
        title: editingProduct ? "Updated! ✅" : "Added! ✅",
        description: `${form.name} has been ${editingProduct ? "updated" : "added"} successfully.`,
      });

      resetForm();
      setOpen(false);
    } catch (error: any) {
      console.error("Save error", error);
      toast({ title: "Failed", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteProduct = (id: string, name: string) => {
    deleteDoc(doc(db, "products", id))
      .then(() => toast({ title: "Deleted", description: `${name} has been removed.` }))
      .catch(() => errorEmitter.emit("permission-error",
        new FirestorePermissionError({ path: `products/${id}`, operation: "delete" })));
  };

  // ── Seed mock products into Firestore ───────────────────────────────────────
  const handleSeedMockProducts = async () => {
    setIsSeeding(true);
    try {
      let seeded = 0;
      for (const p of MOCK_PRODUCTS) {
        const slug = p.slug || generateSlug(p.name);
        const productRef = doc(db, "products", slug);
        const snap = await getDoc(productRef);
        if (snap.exists()) continue; // skip if already exists

        await setDoc(productRef, {
          id: slug,
          slug,
          name: p.name,
          category: p.category,
          description: p.description,
          careGuide: p.careGuide || "",
          price: p.price,
          oldPrice: p.oldPrice || null,
          stock: p.stock,
          rating: p.rating,
          reviewsCount: p.reviewsCount || 0,
          affiliateCommission: p.affiliateCommission || 10,
          isBestseller: p.isBestseller || false,
          isNew: p.isNew || false,
          isFeatured: p.isFeatured || false,
          careLevel: p.careLevel || "easy",
          watering: p.watering || "",
          sunlight: p.sunlight || "medium",
          benefits: p.benefits || [],
          potIncluded: p.potIncluded || true,
          // Keep imageUrl from mock data (picsum/placeholder)
          images: p.images?.filter(Boolean) || (p.imageUrl ? [p.imageUrl] : []),
          imageUrl: p.imageUrl || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        seeded++;
      }
      toast({
        title: seeded > 0 ? `Seeded ${seeded} products! ✅` : "Already up to date ✅",
        description: seeded > 0
          ? `${seeded} mock products added to Firestore with slug IDs.`
          : "All mock products already exist in Firestore.",
      });
    } catch (error: any) {
      toast({ title: "Seed Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Manage Plants</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Total Plants: <span className="font-bold text-primary">{products?.length || 0}</span></span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plants..."
              className="pl-10 rounded-xl h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Seed mock products button */}
          <Button
            variant="outline"
            className="rounded-xl h-11 px-4 gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={handleSeedMockProducts}
            disabled={isSeeding}
          >
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {isSeeding ? "Seeding..." : "Seed Mock Products"}
          </Button>

          {/* Add New Plant */}
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 px-6 gap-2 w-full sm:w-auto">
                <Plus className="h-5 w-5" /> Add New Plant
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl rounded-[2rem] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-extrabold text-primary">
                  {editingProduct ? `Edit: ${editingProduct.name}` : "Add New Plant"}
                </DialogTitle>
                {/* Show slug preview */}
                {form.name && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    URL: /plants/<span className="text-primary font-semibold">{generateSlug(form.name)}</span>
                    {editingProduct && <span className="ml-2 text-amber-600">(ID locked — won't change on edit)</span>}
                  </p>
                )}
              </DialogHeader>

              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plant Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Snake Plant"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(val: any) => setForm({ ...form, category: val })}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Description</Label>
                    <Button variant="outline" size="sm" className="h-8 rounded-full border-primary/20 text-primary gap-1" onClick={handleAI} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Tell the story of this plant..."
                    className="min-h-[100px] rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Price (₹)</Label>
                      <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="999" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Old Price (₹) <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
                      <Input type="number" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} placeholder="1299" className="rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Stock</Label>
                      <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="50" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Commission %</Label>
                      <Input type="number" min="0" max="100" value={form.affiliateCommission} onChange={(e) => setForm({ ...form, affiliateCommission: e.target.value })} placeholder="10" className="rounded-xl" />
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Images <span className="text-muted-foreground font-normal text-xs ml-1">({imageSlots.length}/{MAX_IMAGES})</span></Label>
                    {imageSlots.length > 0 && imageSlots.length < MAX_IMAGES && (
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          <Plus className="h-3 w-3" /> Add more
                        </span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={onFileChange} />
                      </label>
                    )}
                  </div>

                  {imageSlots.length === 0 && (
                    <label className="border-2 border-dashed rounded-xl h-24 flex flex-col items-center justify-center text-muted-foreground gap-2 cursor-pointer hover:bg-accent transition-all">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs font-medium">Click to select images</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={onFileChange} />
                    </label>
                  )}

                  {imageSlots.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {imageSlots.map((slot, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl border bg-muted overflow-hidden">
                          <Image src={slot.preview || slot.existing!} alt={`preview-${i}`} fill className="object-cover" unoptimized />
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Main</span>
                          )}
                          {!slot.file && slot.existing && (
                            <span className="absolute top-1 left-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <CheckCircle2 className="h-2 w-2" /> Saved
                            </span>
                          )}
                          <button type="button" onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive z-10">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isSaving && uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-primary">
                        <span>Uploading images...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-primary/10 rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-12 rounded-full font-bold text-lg mt-2">
                  {isSaving
                    ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />{uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Saving..."}</>
                    : editingProduct ? "Update Product" : "Save Product"
                  }
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Products table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-muted bg-muted/30">
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Slug / URL</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Stock</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      {searchQuery ? "No plants match your search." : 'No plants found. Click "Add New Plant" or "Seed Mock Products" to start.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p: any) => (
                    <tr key={p.id} className="group hover:bg-accent/30 transition-all">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl overflow-hidden relative border shadow-sm bg-muted flex-shrink-0">
                            {p.images?.[0] ? (
                              <Image src={getProxiedUrl(p.images[0], 100)} alt={p.name} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div>
                            <p className="font-headline font-bold text-primary">{p.name}</p>
                            <p className="text-xs text-muted-foreground">Commission: {p.affiliateCommission || 10}%</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="font-mono text-xs text-primary bg-primary/5 px-2 py-1 rounded-lg">
                          /plants/{p.id}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="bg-accent text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {PRODUCT_CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                        </span>
                      </td>
                      <td className="p-6">
                        <div>
                          <span className="font-bold text-primary">₹{p.price}</span>
                          {p.oldPrice && <span className="text-xs text-muted-foreground line-through ml-2">₹{p.oldPrice}</span>}
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`font-medium text-sm ${(p.stock || 0) < 10 ? "text-red-500" : "text-green-600"}`}>
                          {p.stock || 0} in stock
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost" size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border"
                            onClick={() => handleEdit(p)}
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            variant="ghost" size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
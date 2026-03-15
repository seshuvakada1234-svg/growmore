
"use client";

import { useState } from "react";
import { Category, PRODUCT_CATEGORIES } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Zap,
  Loader2,
  Package,
  X,
  Upload
} from "lucide-react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { adminAIProductDescription } from "@/ai/flows/admin-ai-product-description";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase, useStorage } from "@/firebase";
import { collection, setDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const MAX_IMAGES = 5;

export default function AdminProducts() {
  const db = useFirestore();
  const storage = useStorage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "indoor" as Category,
    price: "",
    description: "",
    affiliateCommission: "10",
    stock: "50"
  });

  // Each entry: { file: File | null, preview: string, existing: string | null }
  const [imageSlots, setImageSlots] = useState<
    { file: File | null; preview: string; existing: string | null }[]
  >([]);

  // Fetch products from Firestore
  const productsQuery = useMemoFirebase(() => collection(db, "products"), [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const remaining = MAX_IMAGES - imageSlots.length;
    if (remaining <= 0) {
      toast({ title: "Limit reached", description: `You can upload a maximum of ${MAX_IMAGES} images.`, variant: "destructive" });
      e.target.value = "";
      return;
    }
    const accepted = incoming.slice(0, remaining);
    const newSlots = accepted.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      existing: null
    }));
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

  const resetForm = () => {
    setNewProduct({
      name: "",
      category: "indoor",
      price: "",
      description: "",
      affiliateCommission: "10",
      stock: "50"
    });
    imageSlots.forEach((s) => { if (s.file) URL.revokeObjectURL(s.preview); });
    setImageSlots([]);
  };

  const handleAI = async () => {
    if (!newProduct.name) {
      toast({ title: "Name required", description: "Please enter a plant name first.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const catLabel = PRODUCT_CATEGORIES.find(c => c.value === newProduct.category)?.label || newProduct.category;
      const result = await adminAIProductDescription({
        plantName: newProduct.name,
        category: catLabel
      });
      setNewProduct({ ...newProduct, description: result.description });
      toast({ title: "AI Generated!", description: "Description created successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to generate AI description.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name.trim()) {
      toast({ title: "Validation Error", description: "Plant name cannot be empty.", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(newProduct.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }
    const stockNum = parseInt(newProduct.stock);
    if (isNaN(stockNum) || stockNum <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid stock quantity.", variant: "destructive" });
      return;
    }
    if (imageSlots.length === 0) {
      toast({ title: "Validation Error", description: "Please upload at least one image.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const productRef = doc(collection(db, "products"));
    const productId = productRef.id;

    const productData = {
      id: productId,
      name: newProduct.name,
      category: newProduct.category,
      description: newProduct.description,
      price: priceNum,
      stock: stockNum,
      affiliateCommission: parseFloat(newProduct.affiliateCommission),
      images: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    setDoc(productRef, productData).catch(() => {
      const permissionError = new FirestorePermissionError({ path: `products/${productId}`, operation: "create", requestResourceData: productData });
      errorEmitter.emit("permission-error", permissionError);
    });

    try {
      const uploadPromises = imageSlots.map(async (slot) => {
        if (slot.existing) return slot.existing;
        const fileRef = ref(storage, `products/${productId}/images/${Date.now()}_${slot.file!.name}`);
        const result = await uploadBytes(fileRef, slot.file!);
        return await getDownloadURL(result.ref);
      });

      const imageUrls = await Promise.all(uploadPromises);

      updateDoc(productRef, { images: imageUrls, updatedAt: serverTimestamp() })
        .then(() => {
          toast({ title: "Success!", description: `${newProduct.name} has been added.` });
          resetForm();
          setOpen(false);
        })
        .catch(() => {
          const permissionError = new FirestorePermissionError({ path: `products/${productId}`, operation: "update", requestResourceData: { images: imageUrls } });
          errorEmitter.emit("permission-error", permissionError);
        });
    } catch (error) {
      console.error("Upload error", error);
      toast({ title: "Upload Failed", description: "Failed to upload images.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    const docRef = doc(db, "products", id);
    deleteDoc(docRef)
      .then(() => { toast({ title: "Deleted", description: `${name} has been removed.` }); })
      .catch(() => {
        const permissionError = new FirestorePermissionError({ path: `products/${id}`, operation: "delete" });
        errorEmitter.emit("permission-error", permissionError);
      });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Manage Plants</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Total Plants: <span className="font-bold text-primary">{products?.length || 0}</span></span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search plants..." className="pl-10 rounded-xl h-11" />
          </div>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 px-6 gap-2 w-full sm:w-auto">
                <Plus className="h-5 w-5" /> Add New Plant
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-extrabold text-primary">
                  Add New Plant
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plant Name</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="e.g. Ficus Lyrata"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newProduct.category}
                      onValueChange={(val: any) => setNewProduct({ ...newProduct, category: val })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
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
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Tell the story of this plant..."
                    className="min-h-[120px] rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price (₹)</Label>
                      <Input type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="999" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock</Label>
                      <Input type="number" min="1" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="50" className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Affiliate Commission (%)</Label>
                    <Input type="number" min="0" max="100" value={newProduct.affiliateCommission} onChange={(e) => setNewProduct({ ...newProduct, affiliateCommission: e.target.value })} placeholder="10" className="rounded-xl" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Upload Images <span className="text-muted-foreground font-normal text-xs ml-1">({imageSlots.length}/{MAX_IMAGES})</span></Label>
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
                          <Image src={slot.preview || slot.existing!} alt={`preview-${i}`} fill className="object-cover" />
                          <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive z-10">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-12 rounded-full font-bold text-lg mt-4">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Stock</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {products?.map((p) => (
                  <tr key={p.id} className="group hover:bg-accent/30 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl overflow-hidden relative border shadow-sm bg-muted">
                          {p.images?.[0] ? <Image src={p.images[0]} alt={p.name} fill className="object-cover" /> : <ImageIcon className="h-4 w-4 m-auto text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-headline font-bold text-primary">{p.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {p.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="bg-accent text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {PRODUCT_CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                      </span>
                    </td>
                    <td className="p-6 font-bold text-primary">₹{p.price}</td>
                    <td className="p-6">
                      <span className="font-medium text-sm">{p.stock || 0} in stock</span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border">
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button onClick={() => handleDeleteProduct(p.id, p.name)} variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Category, CATEGORIES } from "@/lib/mock-data";
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
  Package
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

export default function AdminProducts() {
  const db = useFirestore();
  const storage = useStorage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Indoor" as Category,
    price: "",
    description: "",
    affiliateCommission: "10",
    stock: "50"
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Fetch products from Firestore
  const productsQuery = useMemoFirebase(() => collection(db, 'products'), [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      const urls = files.map(file => URL.createObjectURL(file));
      setPreviews(urls);
    }
  };

  const handleAI = async () => {
    if (!newProduct.name) {
      toast({ title: "Name required", description: "Please enter a plant name first.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await adminAIProductDescription({
        plantName: newProduct.name,
        category: newProduct.category
      });
      setNewProduct({ ...newProduct, description: result.description });
      toast({ title: "AI Generated!", description: "Description created successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate AI description.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProduct = async () => {
    // Validation
    if (!newProduct.name.trim()) {
      toast({ title: "Validation Error", description: "Plant name cannot be empty.", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(newProduct.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid price greater than 0.", variant: "destructive" });
      return;
    }
    const stockNum = parseInt(newProduct.stock);
    if (isNaN(stockNum) || stockNum <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid stock quantity greater than 0.", variant: "destructive" });
      return;
    }
    const commissionNum = parseFloat(newProduct.affiliateCommission);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 10) {
      toast({ title: "Validation Error", description: "Affiliate commission must be between 0% and 10%.", variant: "destructive" });
      return;
    }
    if (selectedFiles.length === 0) {
      toast({ title: "Validation Error", description: "Please upload at least one image.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    
    // Create doc ref first to get the ID
    const productRef = doc(collection(db, 'products'));
    const productId = productRef.id;

    const productData = {
      id: productId,
      name: newProduct.name,
      category: newProduct.category,
      description: newProduct.description,
      price: priceNum,
      stock: stockNum,
      affiliateCommission: commissionNum,
      images: [], // Initially empty, will update after upload
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 1. Initial write (non-blocking)
    setDoc(productRef, productData)
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `products/${productId}`,
          operation: 'create',
          requestResourceData: productData
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    // 2. Upload images in parallel
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const fileRef = ref(storage, `products/${productId}/images/${Date.now()}_${file.name}`);
        const result = await uploadBytes(fileRef, file);
        return await getDownloadURL(result.ref);
      });

      const imageUrls = await Promise.all(uploadPromises);

      // 3. Update doc with real URLs (non-blocking)
      updateDoc(productRef, {
        images: imageUrls,
        updatedAt: serverTimestamp()
      })
      .then(() => {
        toast({ title: "Success!", description: `${newProduct.name} has been added.` });
        setNewProduct({
          name: "",
          category: "Indoor",
          price: "",
          description: "",
          affiliateCommission: "10",
          stock: "50"
        });
        setSelectedFiles([]);
        setPreviews([]);
        setOpen(false);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `products/${productId}`,
          operation: 'update',
          requestResourceData: { images: imageUrls }
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    } catch (error) {
      console.error("Upload error", error);
      toast({ title: "Upload Failed", description: "Failed to upload images. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    const docRef = doc(db, 'products', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Deleted", description: `${name} has been removed.` });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `products/${id}`,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
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
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 px-6 gap-2 w-full sm:w-auto">
                <Plus className="h-5 w-5" /> Add New Plant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-extrabold text-primary">Add New Plant</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plant Name</Label>
                    <Input 
                      value={newProduct.name} 
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="e.g. Ficus Lyrata" 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={newProduct.category}
                      onValueChange={(val: any) => setNewProduct({...newProduct, category: val})}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Description</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-full border-primary/20 text-primary gap-1"
                      onClick={handleAI}
                      disabled={isGenerating}
                    >
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea 
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Tell the story of this plant..." 
                    className="min-h-[120px] rounded-xl" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price (₹)</Label>
                      <Input 
                        type="number" 
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        placeholder="999" 
                        className="rounded-xl" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock</Label>
                      <Input 
                        type="number" 
                        min="1"
                        value={newProduct.stock}
                        onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                        placeholder="50" 
                        className="rounded-xl" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Affiliate Commission (%)</Label>
                    <Input 
                      type="number" 
                      min="0"
                      max="10"
                      value={newProduct.affiliateCommission}
                      onChange={e => setNewProduct({...newProduct, affiliateCommission: e.target.value})}
                      placeholder="10" 
                      className="rounded-xl" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload Images</Label>
                  <label className="border-2 border-dashed rounded-xl h-11 flex items-center justify-center text-muted-foreground gap-2 cursor-pointer hover:bg-accent transition-all overflow-hidden relative">
                    <ImageIcon className="h-4 w-4" /> 
                    <span className="text-xs">
                      {selectedFiles.length > 0 ? `${selectedFiles.length} images selected` : "Select Images"}
                    </span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={onFileChange}
                    />
                  </label>
                  {previews.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                      {previews.map((url, i) => (
                        <div key={i} className="h-12 w-12 rounded-lg border relative flex-shrink-0 bg-muted">
                          <Image src={url} alt="preview" fill className="object-cover rounded-lg" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSaveProduct}
                  disabled={isSaving}
                  className="w-full h-12 rounded-full font-bold text-lg mt-4"
                >
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
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Affiliate %</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Stock</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {products?.map((p) => (
                  <tr key={p.id} className="group hover:bg-accent/30 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl overflow-hidden relative border shadow-sm flex-shrink-0 bg-muted">
                          {p.images?.[0] ? (
                            <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                        </div>
                        <div>
                          <p className="font-headline font-bold text-primary">{p.name}</p>
                          <p className="text-xs text-muted-foreground">ID: GS-{p.id.substring(0, 6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="bg-accent text-primary px-3 py-1 rounded-full text-xs font-bold">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-6 font-bold text-primary">₹{p.price}</td>
                    <td className="p-6">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs">
                        {p.affiliateCommission || 10}%
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${(p.stock || 0) > 10 ? 'bg-emerald-500' : 'bg-destructive'}`} />
                        <span className="font-medium text-sm">{p.stock || 0} in stock</span>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border">
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-muted-foreground">
                      No plants found. Click "Add New Plant" to start your catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

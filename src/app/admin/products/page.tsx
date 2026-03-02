
"use client";

import { useState } from "react";
import { PRODUCTS, Category, CATEGORIES } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2
} from "lucide-react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { adminAIProductDescription } from "@/ai/flows/admin-ai-product-description";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminProducts() {
  const [products, setProducts] = useState(PRODUCTS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Indoor" as Category,
    price: "",
    description: ""
  });

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-10 rounded-xl" />
        </div>
        
        <Dialog>
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
                  className="min-h-[150px] rounded-xl" 
                />
              </div>

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
                  <Label>Upload Image</Label>
                  <div className="border-2 border-dashed rounded-xl h-11 flex items-center justify-center text-muted-foreground gap-2 cursor-pointer hover:bg-accent transition-all">
                    <ImageIcon className="h-4 w-4" /> <span className="text-sm">Click to upload</span>
                  </div>
                </div>
              </div>

              <Button className="w-full h-12 rounded-full font-bold text-lg mt-4">Save Product</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-muted bg-muted/30">
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Stock</th>
                  <th className="p-6 font-bold text-sm text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {products.map((p) => (
                  <tr key={p.id} className="group hover:bg-accent/30 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl overflow-hidden relative border shadow-sm flex-shrink-0">
                          <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-headline font-bold text-primary">{p.name}</p>
                          <p className="text-xs text-muted-foreground">ID: GS-{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="bg-accent text-primary px-3 py-1 rounded-full text-xs font-bold">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-6 font-bold">₹{p.price}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${p.stock > 10 ? 'bg-emerald-500' : 'bg-destructive'}`} />
                        <span className="font-medium text-sm">{p.stock} in stock</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border">
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-border hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

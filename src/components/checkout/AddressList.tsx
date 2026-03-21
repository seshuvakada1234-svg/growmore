"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, writeBatch,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, BookUser } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AddressCard, type SavedAddress } from "./AddressCard";
// ✅ Default import — works regardless of named/default export in AddressForm
import AddressForm from "./AddressForm";
import type { AddressFormData } from "./AddressForm";

interface AddressListProps {
  db: any;
  userId: string;
  selectedAddressId: string | null;
  onSelect: (address: SavedAddress) => void;
}

export function AddressList({ db, userId, selectedAddressId, onSelect }: AddressListProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const colRef = useCallback(
    () => collection(db, "users", userId, "addresses"),
    [db, userId]
  );

  // ── Load addresses from Firestore ────────────────────────────────────────
  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(colRef(), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items: SavedAddress[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<SavedAddress, "id">),
      }));
      setAddresses(items);

      // Auto-select default (or first) address
      const defaultAddr = items.find(a => a.isDefault) || items[0];
      if (defaultAddr && !selectedAddressId) {
        onSelect(defaultAddr);
      }
    } catch (err) {
      console.error("Failed to load addresses", err);
    } finally {
      setLoading(false);
    }
  }, [colRef, selectedAddressId, onSelect]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  // ── Save (add or edit) ───────────────────────────────────────────────────
  const handleSave = async (data: AddressFormData) => {
    setIsSaving(true);
    try {
      if (editingAddress) {
        // Edit existing
        const ref = doc(db, "users", userId, "addresses", editingAddress.id);
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });

        // If setting as default — clear others
        if (data.isDefault) await clearOtherDefaults(editingAddress.id);

        toast({ title: "✅ Address updated" });
      } else {
        // Add new
        const docRef = await addDoc(colRef(), { ...data, createdAt: serverTimestamp() });

        // If setting as default — clear others first
        if (data.isDefault) await clearOtherDefaults(docRef.id);

        toast({ title: "✅ Address added" });
      }

      setFormOpen(false);
      setEditingAddress(null);
      await loadAddresses();
    } catch (err) {
      console.error("Save address error", err);
      toast({ title: "Failed to save address", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "users", userId, "addresses", id));
      toast({ title: "🗑 Address removed" });
      await loadAddresses();
    } catch {
      toast({ title: "Failed to delete address", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Set Default ──────────────────────────────────────────────────────────
  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await clearOtherDefaults(id);
      await updateDoc(doc(db, "users", userId, "addresses", id), { isDefault: true });
      toast({ title: "⭐ Default address updated" });
      await loadAddresses();
    } catch {
      toast({ title: "Failed to set default", variant: "destructive" });
    } finally {
      setSettingDefaultId(null);
    }
  };

  // ── Helper: clear isDefault from all other addresses ────────────────────
  const clearOtherDefaults = async (exceptId: string) => {
    const batch = writeBatch(db);
    addresses.forEach(addr => {
      if (addr.id !== exceptId && addr.isDefault) {
        batch.update(doc(db, "users", userId, "addresses", addr.id), { isDefault: false });
      }
    });
    await batch.commit();
  };

  const openAdd = () => { setEditingAddress(null); setFormOpen(true); };
  const openEdit = (addr: SavedAddress) => { setEditingAddress(addr); setFormOpen(true); };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
          <BookUser className="h-5 w-5 text-primary" /> Saved Addresses
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openAdd}
          className="rounded-2xl border-[#388E3C] text-[#388E3C] hover:bg-[#F1F8E9] font-semibold text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add New
        </Button>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl border border-[#E8E8E8] p-4 animate-pulse space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* ── Address grid (shown when addresses exist) ── */}
      {!loading && addresses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addresses.map(addr => (
            <AddressCard
              key={addr.id}
              address={addr}
              isSelected={selectedAddressId === addr.id}
              onSelect={() => onSelect(addr)}
              onEdit={() => openEdit(addr)}
              onDelete={() => handleDelete(addr.id)}
              onSetDefault={() => handleSetDefault(addr.id)}
              isDeleting={deletingId === addr.id}
              isSettingDefault={settingDefaultId === addr.id}
            />
          ))}

          {/* ── Inline "Add New Address" card ── */}
          <button
            type="button"
            onClick={openAdd}
            className="rounded-2xl border-2 border-dashed border-[#D8EDD5] hover:border-[#388E3C] hover:bg-[#FAFFF9] transition-all p-4 flex flex-col items-center justify-center gap-2 min-h-[120px] group"
          >
            <div className="w-9 h-9 rounded-full bg-[#E8F5E9] flex items-center justify-center group-hover:bg-[#D0EDCF] transition-colors">
              <Plus className="h-5 w-5 text-[#388E3C]" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-[#388E3C] transition-colors">
              Add New Address
            </span>
          </button>
        </div>
      )}

      {/* ── Inline form (replaces modal) ── */}
      <AddressForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingAddress(null); }}
        onSave={handleSave}
        initialData={editingAddress || undefined}
        title={editingAddress ? "Edit Address" : "Add New Address"}
        isSaving={isSaving}
      />

    </div>
  );
}

export default AddressList;
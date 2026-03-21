"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";

const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
].sort();

export type AddressLabel = "Home" | "Work" | "Other";

export interface AddressFormData {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  label: AddressLabel;
  isDefault: boolean;
}

interface PostOffice {
  Name: string;
  District: string;
  State: string;
  Block: string;
}

interface AddressFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddressFormData) => Promise<void>;
  initialData?: Partial<AddressFormData>;
  title?: string;
  isSaving?: boolean;
}

const EMPTY_FORM: AddressFormData = {
  fullName: "", phone: "", address: "", city: "",
  state: "", pincode: "", label: "Home", isDefault: false,
};

export function AddressForm({
  open,
  onClose,
  onSave,
  initialData,
  title = "Shipping Information",
  isSaving = false,
}: AddressFormProps) {
  const [form, setForm] = useState<AddressFormData>({ ...EMPTY_FORM, ...initialData });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [postOffices, setPostOffices] = useState<PostOffice[]>([]);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  // ── Sync initialData when form opens ─────────────────────────────────────
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initialData });
      setPostOffices([]);
      setShowAreaPicker(false);
      setErrors({});
    }
  }, [open, initialData]);

  // ── Smart pincode detection ───────────────────────────────────────────────
  useEffect(() => {
    const pin = form.pincode;
    if (pin.length !== 6) {
      setPostOffices([]);
      setShowAreaPicker(false);
      return;
    }
    const timer = setTimeout(async () => {
      setPincodeLoading(true);
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0]?.Status === "Success") {
          const offices: PostOffice[] = data[0].PostOffice || [];
          if (offices.length === 1) {
            setForm(prev => ({ ...prev, city: offices[0].District, state: offices[0].State }));
            setPostOffices([]);
            setShowAreaPicker(false);
          } else if (offices.length > 1) {
            setPostOffices(offices);
            setShowAreaPicker(true);
          }
        }
      } catch { /* fail silently */ }
      finally { setPincodeLoading(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.pincode]);

  const selectArea = (po: PostOffice) => {
    setForm(prev => ({ ...prev, city: po.District, state: po.State }));
    setShowAreaPicker(false);
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.fullName.trim())             newErrors.fullName = "Required";
    if (!/^[0-9]{10}$/.test(form.phone))   newErrors.phone    = "Enter valid 10-digit number";
    if (!form.address.trim())              newErrors.address  = "Required";
    if (!form.city.trim())                 newErrors.city     = "Required";
    if (!form.state)                       newErrors.state    = "Required";
    if (!/^[0-9]{6}$/.test(form.pincode))  newErrors.pincode  = "Enter valid 6-digit pincode";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── No e.preventDefault — not a <form> tag ────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave(form);
  };

  const set = (key: keyof AddressFormData, val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // ── Hide entirely when closed ─────────────────────────────────────────────
  if (!open) return null;

  return (
    <div className="rounded-2xl border border-[#E8E8E8] bg-white overflow-hidden mt-4">

      {/* ── Header ── */}
      <div className="px-6 py-5 border-b border-[#F5F5F5]">
        <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" /> {title}
        </h2>
      </div>

      {/* ── Body — <div> not <form> to avoid nested form hydration error ── */}
      <div className="px-6 py-5 space-y-5">

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Full Name</Label>
          <Input
            value={form.fullName}
            onChange={e => set("fullName", e.target.value)}
            placeholder="Ravi Kumar"
            className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.fullName ? "border-red-400" : ""}`}
          />
          {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Phone Number</Label>
            <Input
              type="tel"
              maxLength={10}
              value={form.phone}
              onChange={e => set("phone", e.target.value.replace(/\D/g, ""))}
              placeholder="98765 43210"
              className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.phone ? "border-red-400" : ""}`}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          {/* Alternate Phone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Alternate Phone{" "}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Input
              type="tel"
              maxLength={10}
              placeholder="91234 56789"
              className="rounded-2xl border-[#E8E8E8] h-12"
            />
          </div>

          {/* Pincode */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Pincode</Label>
            <div className="relative">
              <Input
                maxLength={6}
                value={form.pincode}
                onChange={e => set("pincode", e.target.value.replace(/\D/g, ""))}
                placeholder="560001"
                className={`rounded-2xl border-[#E8E8E8] h-12 pr-10 ${errors.pincode ? "border-red-400" : ""}`}
              />
              {pincodeLoading && (
                <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}

            {/* Area picker */}
            {showAreaPicker && postOffices.length > 0 && (
              <div className="mt-1 border border-[#D8EDD5] rounded-2xl overflow-hidden shadow-lg bg-white z-10">
                <p className="px-3 py-2 text-xs font-bold text-[#388E3C] bg-[#F1F8E9] border-b border-[#D8EDD5]">
                  📍 Select your area
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {postOffices.map((po, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => selectArea(po)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F1F8E9] transition-colors border-b border-[#F5F5F5] last:border-0"
                    >
                      <span className="font-medium text-[#1A2E1A]">{po.Name}</span>
                      <span className="text-muted-foreground text-xs ml-1">({po.Block})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* House / Street / Area */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">House / Street / Area</Label>
          <Input
            value={form.address}
            onChange={e => set("address", e.target.value)}
            placeholder="Flat 4B, Green Valley Apartments, MG Road"
            className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.address ? "border-red-400" : ""}`}
          />
          {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* City */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1">
              City
              {pincodeLoading && (
                <span className="text-[10px] text-muted-foreground font-normal">Detecting...</span>
              )}
            </Label>
            <Input
              value={form.city}
              onChange={e => set("city", e.target.value)}
              placeholder="Bengaluru"
              className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.city ? "border-red-400" : ""}`}
            />
            {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1">
              State
              {pincodeLoading && (
                <span className="text-[10px] text-muted-foreground font-normal">Detecting...</span>
              )}
            </Label>
            <Select value={form.state} onValueChange={v => set("state", v)}>
              <SelectTrigger className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.state ? "border-red-400" : ""}`}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px]">
                {INDIAN_STATES_AND_UTS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
          </div>

        </div>

        {/* Default toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => set("isDefault", !form.isDefault)}
            className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5
              ${form.isDefault ? "bg-[#388E3C]" : "bg-gray-200"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform
              ${form.isDefault ? "translate-x-5" : "translate-x-0"}`}
            />
          </div>
          <span className="text-sm font-medium text-[#1A2E1A]">Set as default address</span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-[#F5F5F5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-none px-6 h-12 rounded-2xl border-[#E8E8E8] font-semibold text-sm"
          >
            Cancel
          </Button>
          {/* type="button" — prevents bubbling to parent <form> in CheckoutPage */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 h-12 rounded-2xl font-semibold text-sm"
          >
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
              : <><MapPin className="h-4 w-4 mr-2" /> Save Address</>
            }
          </Button>
        </div>

      </div>
    </div>
  );
}

// Both named + default export to prevent any import mismatch
export default AddressForm;
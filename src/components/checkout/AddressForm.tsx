"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin, AlertCircle } from "lucide-react";

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
  phone2: string; // Added for alternate phone validation
  address: string;
  city: string;
  district: string;
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
  fullName: "", phone: "", phone2: "", address: "", city: "",
  district: "", state: "", pincode: "", label: "Home", isDefault: false,
};

/**
 * Sanitizes input to a clean 10-digit numeric string.
 * Handles +91 prefixes and non-numeric junk.
 */
export const sanitizePhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  return cleaned.slice(0, 10);
};

/**
 * Validates if a string is a valid 10-digit Indian mobile number.
 */
export const isValidIndianMobile = (phone: string): boolean => {
  return /^[6-9]\d{9}$/.test(phone);
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

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initialData });
      setPostOffices([]);
      setShowAreaPicker(false);
      setErrors({});
    }
  }, [open, initialData]);

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
            setForm(prev => ({
              ...prev,
              city:     offices[0].Block    || offices[0].Name,
              district: offices[0].District || "",
              state:    offices[0].State,
            }));
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
    setForm(prev => ({
      ...prev,
      city:     po.Block    || po.Name,
      district: po.District || "",
      state:    po.State,
    }));
    setShowAreaPicker(false);
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Required";
    
    if (!form.phone) {
      newErrors.phone = "Required";
    } else if (!isValidIndianMobile(form.phone)) {
      newErrors.phone = "Enter valid Indian mobile number";
    }

    if (form.phone2 && !isValidIndianMobile(form.phone2)) {
      newErrors.phone2 = "Enter valid Indian mobile number";
    }

    if (!form.address.trim())             newErrors.address  = "Required";
    if (!form.city.trim())                newErrors.city     = "Required";
    if (!form.state)                      newErrors.state    = "Required";
    if (!/^[0-9]{6}$/.test(form.pincode)) newErrors.pincode  = "Enter valid 6-digit pincode";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave(form);
  };

  const set = (key: keyof AddressFormData, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
    // Clear error for this field when user types
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handlePhoneChange = (key: "phone" | "phone2", value: string) => {
    const sanitized = sanitizePhone(value);
    set(key, sanitized);
  };

  if (!open) return null;

  return (
    <div className="rounded-2xl border border-[#E8E8E8] bg-white overflow-hidden mt-4">
      <div className="px-6 py-5 border-b border-[#F5F5F5]">
        <h2 className="text-xl font-bold font-headline text-[#1A2E1A] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" /> {title}
        </h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Full Name</Label>
          <Input
            value={form.fullName}
            onChange={e => set("fullName", e.target.value)}
            placeholder="Ravi Kumar"
            className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.fullName ? "border-red-400" : ""}`}
          />
          {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Phone Number</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">+91</span>
              <Input
                type="tel"
                maxLength={10}
                value={form.phone}
                onChange={e => handlePhoneChange("phone", e.target.value)}
                placeholder="98765 43210"
                className={`rounded-2xl border-[#E8E8E8] h-12 pl-12 ${errors.phone ? "border-red-400" : ""}`}
              />
            </div>
            {errors.phone && (
              <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {errors.phone}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Alternate Phone <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">+91</span>
              <Input
                type="tel"
                maxLength={10}
                value={form.phone2}
                onChange={e => handlePhoneChange("phone2", e.target.value)}
                placeholder="91234 56789"
                className={`rounded-2xl border-[#E8E8E8] h-12 pl-12 ${errors.phone2 ? "border-red-400" : ""}`}
              />
            </div>
            {errors.phone2 && (
              <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {errors.phone2}
              </p>
            )}
          </div>

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
            {errors.pincode && <p className="text-xs text-red-500 font-medium">{errors.pincode}</p>}

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

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">House / Street / Area</Label>
          <Input
            value={form.address}
            onChange={e => set("address", e.target.value)}
            placeholder="Flat 4B, Green Valley Apartments, MG Road"
            className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.address ? "border-red-400" : ""}`}
          />
          {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1">City / Town</Label>
            <Input
              value={form.city}
              onChange={e => set("city", e.target.value)}
              placeholder="City name"
              className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.city ? "border-red-400" : ""}`}
            />
            {errors.city && <p className="text-xs text-red-500 font-medium">{errors.city}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">District</Label>
            <Input
              value={form.district}
              readOnly
              tabIndex={-1}
              placeholder="District"
              className="rounded-2xl border-[#E8E8E8] h-12 bg-[#F9F9F9] text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-sm font-medium">State</Label>
            <Select value={form.state} onValueChange={v => set("state", v)}>
              <SelectTrigger className={`rounded-2xl border-[#E8E8E8] h-12 ${errors.state ? "border-red-400" : ""}`}>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px]">
                {INDIAN_STATES_AND_UTS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-xs text-red-500 font-medium">{errors.state}</p>}
          </div>
        </div>

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

        <div className="flex gap-3 pt-2 border-t border-[#F5F5F5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-none px-6 h-12 rounded-2xl border-[#E8E8E8] font-semibold text-sm"
          >
            Cancel
          </Button>
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

export default AddressForm;
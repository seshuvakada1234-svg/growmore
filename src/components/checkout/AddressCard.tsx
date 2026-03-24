"use client";

import { Home, Briefcase, MoreHorizontal, Star, Edit2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import type { AddressFormData } from "./AddressForm";
import { isValidIndianMobile } from "./AddressForm";

export interface SavedAddress extends AddressFormData {
  id: string;
  createdAt?: any;
}

interface AddressCardProps {
  address: SavedAddress;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isDeleting?: boolean;
  isSettingDefault?: boolean;
}

const LABEL_STYLES: Record<string, { icon: React.ReactNode; cls: string }> = {
  Home:  { icon: <Home className="h-3 w-3" />,        cls: "bg-emerald-100 text-emerald-700" },
  Work:  { icon: <Briefcase className="h-3 w-3" />,   cls: "bg-blue-100 text-blue-700" },
  Other: { icon: <MoreHorizontal className="h-3 w-3" />, cls: "bg-amber-100 text-amber-700" },
};

export function AddressCard({
  address, isSelected, onSelect, onEdit, onDelete, onSetDefault,
  isDeleting = false, isSettingDefault = false,
}: AddressCardProps) {
  const labelStyle = LABEL_STYLES[address.label] || LABEL_STYLES.Other;
  
  const isPhoneValid = isValidIndianMobile(address.phone);
  const isPhone2Valid = !address.phone2 || isValidIndianMobile(address.phone2);
  const isInvalid = !isPhoneValid || !isPhone2Valid;

  return (
    <div
      onClick={() => !isInvalid && onSelect()}
      className={`relative rounded-2xl border-2 p-4 transition-all duration-200 group
        ${isInvalid ? "border-red-100 bg-red-50/30 cursor-not-allowed opacity-80" : "cursor-pointer"}
        ${isSelected && !isInvalid
          ? "border-[#388E3C] bg-[#F1F8E9] shadow-md shadow-emerald-100"
          : !isInvalid ? "border-[#E8E8E8] bg-white hover:border-[#C8E6C9] hover:shadow-sm" : ""
        }`}
    >
      {/* Selected indicator */}
      {isSelected && !isInvalid && (
        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-[#388E3C]" />
      )}

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-2.5 pr-6">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${labelStyle.cls}`}>
          {labelStyle.icon} {address.label}
        </span>
        {address.isDefault && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Default
          </span>
        )}
        {isInvalid && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
            <AlertCircle className="h-2.5 w-2.5" /> Invalid details
          </span>
        )}
      </div>

      {/* Name + Phone */}
      <p className="font-bold text-sm text-[#1A2E1A]">{address.fullName}</p>
      <div className="flex flex-col gap-0.5 mt-1">
        <p className={`text-xs font-semibold ${!isPhoneValid ? "text-red-600" : "text-muted-foreground"}`}>
          +91 {address.phone} {!isPhoneValid && " (Invalid number)"}
        </p>
        {address.phone2 && (
          <p className={`text-[11px] font-medium ${!isPhone2Valid ? "text-red-600" : "text-muted-foreground/70"}`}>
            Alt: +91 {address.phone2} {!isPhone2Valid && " (Invalid)"}
          </p>
        )}
      </div>

      {/* Address */}
      <p className="text-xs text-[#444] mt-2 leading-relaxed line-clamp-2">
        {address.address}, {address.city}, {address.state} – {address.pincode}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[#F0F0F0]" onClick={e => e.stopPropagation()}>
        <ActionBtn icon={<Edit2 className="h-3.5 w-3.5" />} label="Edit" onClick={onEdit} />
        <ActionBtn
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label={isDeleting ? "Deleting…" : "Delete"}
          onClick={onDelete}
          danger
          disabled={isDeleting}
        />
        {!address.isDefault && !isInvalid && (
          <ActionBtn
            icon={<Star className="h-3.5 w-3.5" />}
            label={isSettingDefault ? "Setting…" : "Set Default"}
            onClick={onSetDefault}
            disabled={isSettingDefault}
            accent
          />
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, danger, accent, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50
        ${danger  ? "text-red-600 hover:bg-red-50"
        : accent  ? "text-amber-600 hover:bg-amber-50"
        :            "text-[#388E3C] hover:bg-[#E8F5E9]"}`}
    >
      {icon} {label}
    </button>
  );
}

'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface FilterState {
  categories: string[];
  careLevel: string[];
  sunlight: string[];
  size: string[];
  priceMin: number;
  priceMax: number;
  potIncluded: boolean | null;
  inStock: boolean;
  tags: string[];
}

const FILTER_SECTIONS = [
  {
    key: 'categories',
    label: 'Category',
    options: [
      { value: 'Indoor Plants', label: 'Indoor Plants' },
      { value: 'Outdoor Plants', label: 'Outdoor Plants' },
      { value: 'Succulents', label: 'Succulents & Cacti' },
      { value: 'Tropical Plants', label: 'Tropical Plants' },
    ],
  },
  {
    key: 'careLevel',
    label: 'Care Level',
    options: [
      { value: 'easy', label: '🟢 Easy' },
      { value: 'moderate', label: '🟡 Moderate' },
      { value: 'hard', label: '🔴 Hard' },
    ],
  },
  {
    key: 'sunlight',
    label: 'Sunlight',
    options: [
      { value: 'low', label: '🌑 Low Light' },
      { value: 'medium', label: '🌤 Medium Light' },
      { value: 'bright', label: '☀️ Bright Indirect' },
      { value: 'full-sun', label: '🌞 Full Sun' },
    ],
  },
  {
    key: 'size',
    label: 'Plant Size',
    options: [
      { value: 'small', label: 'Small (< 30 cm)' },
      { value: 'medium', label: 'Medium (30–70 cm)' },
      { value: 'large', label: 'Large (> 70 cm)' },
    ],
  },
];

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onReset: () => void;
  activeCount: number;
}

export default function FilterSidebar({ filters, onChange, onReset, activeCount }: FilterSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  const toggleMulti = (key: keyof FilterState, value: string) => {
    const arr = filters[key] as string[];
    const updated = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: updated });
  };

  const isChecked = (key: keyof FilterState, value: string) => (filters[key] as string[]).includes(value);

  return (
    <aside className="filter-sidebar sticky top-24 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon name="FunnelIcon" size={18} className="text-[#1B5E20]" />
          <h3 className="font-bold text-[#1A2E1A] text-base">Filters</h3>
          {activeCount > 0 && (
            <span className="w-5 h-5 bg-[#1B5E20] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-xs text-[#E53935] font-semibold hover:underline">
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-5 pb-5 border-b border-[#D8EDD5]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-sm text-[#1A2E1A]">Price Range</span>
          <span className="text-xs text-[#4A6741] font-mono-custom">
            ₹{filters.priceMin} – ₹{filters.priceMax}
          </span>
        </div>
        <input
          type="range" min={0} max={3000} step={50}
          value={filters.priceMax}
          onChange={e => onChange({ ...filters, priceMax: Number(e.target.value) })}
          className="w-full accent-[#1B5E20]"
        />
        <div className="flex justify-between text-[11px] text-[#7A9B77] mt-1 font-mono-custom">
          <span>₹0</span>
          <span>₹3,000</span>
        </div>
      </div>

      {/* Dynamic Filter Sections */}
      {FILTER_SECTIONS.map(section => (
        <div key={section.key} className="mb-4 pb-4 border-b border-[#D8EDD5] last:border-0">
          <button
            className="flex items-center justify-between w-full mb-3"
            onClick={() => toggleSection(section.key)}>
            <span className="font-semibold text-sm text-[#1A2E1A]">{section.label}</span>
            <Icon
              name={collapsed[section.key] ? 'ChevronDownIcon' : 'ChevronUpIcon'}
              size={14} className="text-[#7A9B77]" />
          </button>
          {!collapsed[section.key] && (
            <div className="space-y-2">
              {section.options.map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    className={`custom-checkbox ${isChecked(section.key as keyof FilterState, opt.value) ? 'checked' : ''}`}
                    onClick={() => toggleMulti(section.key as keyof FilterState, opt.value)}>
                    {isChecked(section.key as keyof FilterState, opt.value) && (
                      <Icon name="CheckIcon" size={10} className="text-white" />
                    )}
                  </div>
                  <span className="text-sm text-[#4A6741] group-hover:text-[#1A2E1A] transition-colors">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Extras */}
      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            className={`custom-checkbox ${filters.inStock ? 'checked' : ''}`}
            onClick={() => onChange({ ...filters, inStock: !filters.inStock })}>
            {filters.inStock && <Icon name="CheckIcon" size={10} className="text-white" />}
          </div>
          <span className="text-sm text-[#4A6741] group-hover:text-[#1A2E1A] transition-colors">In Stock Only</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            className={`custom-checkbox ${filters.potIncluded === true ? 'checked' : ''}`}
            onClick={() => onChange({ ...filters, potIncluded: filters.potIncluded === true ? null : true })}>
            {filters.potIncluded === true && <Icon name="CheckIcon" size={10} className="text-white" />}
          </div>
          <span className="text-sm text-[#4A6741] group-hover:text-[#1A2E1A] transition-colors">Pot Included</span>
        </label>
      </div>
    </aside>
  );
}

'use client';

import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  placeholder = 'Todos',
}: SelectFilterProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{placeholder}</option>
          {(options ?? []).map((option) => (
            <option key={option?.value} value={option?.value}>
              {option?.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

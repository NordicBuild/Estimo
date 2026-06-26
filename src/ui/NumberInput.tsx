import React from 'react';

export interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  unit?: string;
}

export function NumberInput({ className = '', unit, ...props }: NumberInputProps) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input 
        className={`w-full border border-[var(--color-outline-variant)] rounded px-2 py-1.5 text-sm focus:border-[var(--color-primary)] outline-none bg-white transition-colors num ${unit ? 'pr-8' : ''}`}
        {...props} 
      />
      {unit && (
        <span className="absolute right-2 text-xs text-gray-500 pointer-events-none">{unit}</span>
      )}
    </div>
  );
}

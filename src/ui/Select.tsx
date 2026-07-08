import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select 
      className={`border border-[var(--color-outline-variant)] rounded px-2 py-1.5 text-sm focus:border-[var(--color-primary)] outline-none bg-white transition-colors ${className}`} 
      {...props}
    >
      {children}
    </select>
  );
}

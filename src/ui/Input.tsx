import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input 
      className={`border border-[var(--color-outline-variant)] rounded px-2 py-1.5 text-sm focus:border-[var(--color-primary)] outline-none bg-white transition-colors ${className}`} 
      {...props} 
    />
  );
}

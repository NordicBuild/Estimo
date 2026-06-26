import React from 'react';

export interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className = '' }: ToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 p-2 bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)] ${className}`}>
      {children}
    </div>
  );
}

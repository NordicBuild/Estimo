import React from 'react';

export function Table({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`overflow-x-auto custom-scrollbar bg-white rounded-md border border-[var(--color-outline-variant)] shadow-sm ${className}`}>
      <table className="w-full text-left text-sm whitespace-nowrap">
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[var(--color-surface-container-low)] sticky top-0 z-10 shadow-[0_1px_0_var(--color-outline-variant)]">
      {children}
    </thead>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-[var(--color-outline-variant)]">
      {children}
    </tbody>
  );
}

export function Tr({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`h-8 hover:bg-[var(--color-surface-container-lowest)] transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function Th({ children, className = '', numeric = false, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th className={`px-3 py-1 font-semibold text-xs tracking-wider text-[var(--color-outline)] uppercase ${numeric ? 'num' : ''} ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', numeric = false, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td className={`px-3 py-1 ${numeric ? 'num' : ''} ${className}`} {...props}>
      {children}
    </td>
  );
}

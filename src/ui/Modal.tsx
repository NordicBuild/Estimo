import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className = 'max-w-md' }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full flex flex-col max-h-[90vh] ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] rounded-t-xl">
          <h2 className="font-semibold text-lg text-[var(--color-on-surface)]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/5 text-[var(--color-outline)] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

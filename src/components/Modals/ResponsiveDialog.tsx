import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ResponsiveDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ResponsiveDialog({ open, onClose, title, children }: ResponsiveDialogProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [render, setRender] = useState(open);

  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setRender(true);
      setIsAnimatingOut(false);
      document.body.style.overflow = 'hidden';
    } else if (render) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setRender(false);
        setIsAnimatingOut(false);
        document.body.style.overflow = 'unset';
      }, 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Clean up overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      {/* Overlay */}
      <div 
        className={`
          absolute inset-0 bg-black/50 transition-opacity duration-300
          ${isAnimatingOut ? 'opacity-0' : 'opacity-100'}
        `}
        onClick={handleClose}
      />
      
      {/* Content Container */}
      <div 
        className={`
          relative bg-surface flex flex-col shadow-2xl overflow-hidden
          transition-all duration-300 ease-out
          ${isMobile 
            ? `w-full h-[90vh] mt-auto rounded-t-2xl ${isAnimatingOut ? 'translate-y-full' : 'translate-y-0'}` 
            : isTablet
              ? `w-11/12 max-w-md max-h-[90vh] rounded-xl ${isAnimatingOut ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`
              : `w-full max-w-2xl max-h-[90vh] rounded-xl ${isAnimatingOut ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`
          }
        `}
      >
        {/* Mobile drag handle indicator */}
        {isMobile && (
          <div 
            className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onClick={handleClose}
          >
            <div className="w-12 h-1.5 bg-outline-variant rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 ${isMobile ? 'pt-2 pb-4' : 'py-4'} border-b border-outline-variant`}>
          <h2 className="text-lg font-bold text-on-surface">{title}</h2>
          <button 
            onClick={handleClose}
            className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface">
          {children}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';

export function useDialog() {
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'prompt' | 'confirm';
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm: (val: string | true) => void;
    onCancel: () => void;
  }>({ isOpen: false, type: 'prompt', title: '', message: '', onConfirm: () => {}, onCancel: () => {} });

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => { onConfirm(); setDialogConfig(prev => ({ ...prev, isOpen: false })); },
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const promptAction = (title: string, message: string, defaultValue: string, onConfirm: (val: string) => void) => {
    setDialogConfig({
      isOpen: true,
      type: 'prompt',
      title,
      message,
      defaultValue,
      onConfirm: (val) => { onConfirm(val as string); setDialogConfig(prev => ({ ...prev, isOpen: false })); },
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  return {
    dialogConfig,
    confirmAction,
    promptAction
  };
}

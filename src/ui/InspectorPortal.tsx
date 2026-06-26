import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const InspectorPortal = ({ children }: { children: React.ReactNode }) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('inspector-portal-target'));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
};

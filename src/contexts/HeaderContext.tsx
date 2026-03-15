import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderContextType {
  backAction: (() => void) | null;
  setBackAction: (action: (() => void) | null) => void;
  customTitle: string | null;
  setCustomTitle: (title: string | null) => void;
  customIcon: React.ElementType | null;
  setCustomIcon: (icon: React.ElementType | null) => void;
  rightAction: React.ReactNode | null;
  setRightAction: (action: React.ReactNode | null) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [backAction, setBackAction] = useState<(() => void) | null>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [customIcon, setCustomIcon] = useState<React.ElementType | null>(null);
  const [rightAction, setRightAction] = useState<React.ReactNode | null>(null);
  const location = useLocation();


  return (
    <HeaderContext.Provider value={{ 
      backAction, setBackAction, 
      customTitle, setCustomTitle,
      customIcon, setCustomIcon,
      rightAction, setRightAction 
    }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
}

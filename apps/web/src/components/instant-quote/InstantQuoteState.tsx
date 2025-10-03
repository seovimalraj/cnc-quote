"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type IQActiveTab = 'viewer' | 'dfm';

interface InstantQuoteStateCtx {
  selectedPartId?: string;
  setSelectedPartId: (id?: string) => void;
  activeTab: IQActiveTab;
  setActiveTab: (t: IQActiveTab) => void;
  selectAndFocus: (id: string) => void;
}

const Ctx = createContext<InstantQuoteStateCtx | undefined>(undefined);

export function InstantQuoteStateProvider({ children }: { children: ReactNode }) {
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<IQActiveTab>('viewer');

  const selectAndFocus = useCallback((id: string) => {
    setSelectedPartId(id);
    // keep current tab; maybe future logic to switch to viewer automatically
  }, []);

  return (
    <Ctx.Provider value={{ selectedPartId, setSelectedPartId, activeTab, setActiveTab, selectAndFocus }}>
      {children}
    </Ctx.Provider>
  );
}

export function useInstantQuoteState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInstantQuoteState must be used within InstantQuoteStateProvider');
  return v;
}

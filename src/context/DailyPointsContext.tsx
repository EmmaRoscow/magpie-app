import React, { createContext, useContext } from 'react';
import { useDailyPoints, UseDailyPointsReturn } from '../hooks/useDailyPoints';

const DailyPointsContext = createContext<UseDailyPointsReturn | null>(null);

export function DailyPointsProvider({ children }: { children: React.ReactNode }) {
  const value = useDailyPoints();
  return (
    <DailyPointsContext.Provider value={value}>
      {children}
    </DailyPointsContext.Provider>
  );
}

export function useDailyPointsContext(): UseDailyPointsReturn {
  const ctx = useContext(DailyPointsContext);
  if (!ctx) {
    throw new Error('useDailyPointsContext must be used within a DailyPointsProvider');
  }
  return ctx;
}

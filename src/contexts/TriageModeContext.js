import React, { createContext, useContext, useState } from 'react';

export const TriageModeContext = createContext({ triageMode: false, setTriageMode: () => {} });
export const useTriageMode = () => useContext(TriageModeContext);

export function TriageModeProvider({ children }) {
  const [triageMode, setTriageMode] = useState(false);
  return (
    <TriageModeContext.Provider value={{ triageMode, setTriageMode }}>
      {children}
    </TriageModeContext.Provider>
  );
}

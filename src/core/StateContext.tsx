import React, { createContext, useContext, useState } from 'react';

// This perfectly mirrors your PWA's state.js
const initialState = {
  currentUser: null,
  userDisplayName: 'ERS',
  userNickname: '',
  currentUserRole: 'user',
  
  currentDeskId: null,
  currentSessionId: null,
  currentDeskName: '',
  currentOpeningCash: 0,
  currentOpeningInv: {},
  
  globalCatalog: {},
  globalInventoryGroups: [],
  transactions: [],
  
  isMfs: false,
};

const StateContext = createContext<any>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState(initialState);

  // Helper function to update one or more variables easily
  const updateAppState = (newValues: Partial<typeof initialState>) => {
    setAppState((prevState) => ({ ...prevState, ...newValues }));
  };

  return (
    <StateContext.Provider value={{ appState, updateAppState }}>
      {children}
    </StateContext.Provider>
  );
}

// Custom hook to use this anywhere in the app!
export const useAppState = () => useContext(StateContext);
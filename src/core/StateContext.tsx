import React, { createContext, ReactNode, useContext, useState } from 'react';

// 1. Define the exact shape of our native state based on your legacy variables
interface AppState {
  currentUser: any | null;
  userDisplayName: string;
  userNickname: string;
  currentUserRole: string;
  
  currentDeskId: string | null;
  currentSessionId: string | null;
  currentDeskName: string;
  currentOpeningCash: number;
  currentOpeningInv: Record<string, number>;
  
  globalCatalog: Record<string, any>;
  globalInventoryGroups: string[];
  
  transactions: any[];
  trashTransactions: any[];
  
  devNotesQueue: any[];
  isMfs: boolean;
}

// 2. Define the context structure including our update function
interface AppContextType extends AppState {
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  updateAppState: (updates: Partial<AppState>) => void;
}

// 3. Set the default values from your web app
const initialState: AppState = {
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
  trashTransactions: [],
  devNotesQueue: [],
  isMfs: false,
};

const AppStateContext = createContext<AppContextType | undefined>(undefined);

// 4. Create the Provider that will wrap the app
export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(initialState);

  // Helper to easily update just one or two variables at a time
  const updateAppState = (updates: Partial<AppState>) => {
    setAppState((prevState) => ({ ...prevState, ...updates }));
  };

  return (
    <AppStateContext.Provider value={{ ...appState, setAppState, updateAppState }}>
      {children}
    </AppStateContext.Provider>
  );
};

// 5. Create the Custom Hook for your screens to use
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
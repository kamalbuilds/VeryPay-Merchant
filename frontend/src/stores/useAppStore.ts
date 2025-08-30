import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, User, Merchant } from '@/types';

interface AppStore extends AppState {
  // Actions
  setUser: (user: User | null) => void;
  setMerchant: (merchant: Merchant | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  
  // Computed
  isAuthenticated: boolean;
  userTier: string | null;
}

const initialState: AppState = {
  user: null,
  merchant: null,
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Computed properties
        get isAuthenticated() {
          return !!get().user;
        },
        
        get userTier() {
          return get().user?.tier || null;
        },
        
        // Actions
        setUser: (user) => set({ user }),
        
        setMerchant: (merchant) => set({ merchant }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error }),
        
        clearError: () => set({ error: null }),
        
        reset: () => set(initialState),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          user: state.user,
          merchant: state.merchant,
        }),
      }
    ),
    { name: 'AppStore' }
  )
);
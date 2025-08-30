import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TransactionState, Transaction } from '@/types';

interface TransactionStore extends TransactionState {
  // Actions
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addPendingTransaction: (transaction: Transaction) => void;
  movePendingToConfirmed: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  
  // Computed
  totalVolume: number;
  todayTransactions: Transaction[];
  weekTransactions: Transaction[];
  monthTransactions: Transaction[];
  confirmedTransactions: Transaction[];
  failedTransactions: Transaction[];
}

const initialState: TransactionState = {
  transactions: [],
  pendingTransactions: [],
  isLoading: false,
  error: null,
};

export const useTransactionStore = create<TransactionStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Computed properties
      get totalVolume() {
        return get().transactions.reduce((sum, tx) => sum + tx.usdValue, 0);
      },
      
      get todayTransactions() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return get().transactions.filter(tx => tx.timestamp >= today);
      },
      
      get weekTransactions() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return get().transactions.filter(tx => tx.timestamp >= weekAgo);
      },
      
      get monthTransactions() {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return get().transactions.filter(tx => tx.timestamp >= monthAgo);
      },
      
      get confirmedTransactions() {
        return get().transactions.filter(tx => tx.status === 'confirmed');
      },
      
      get failedTransactions() {
        return get().transactions.filter(tx => tx.status === 'failed');
      },
      
      // Actions
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        })),
      
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        })),
      
      removeTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        })),
      
      setTransactions: (transactions) => set({ transactions }),
      
      addPendingTransaction: (transaction) =>
        set((state) => ({
          pendingTransactions: [transaction, ...state.pendingTransactions],
        })),
      
      movePendingToConfirmed: (id) =>
        set((state) => {
          const pendingTx = state.pendingTransactions.find((tx) => tx.id === id);
          if (!pendingTx) return state;
          
          return {
            pendingTransactions: state.pendingTransactions.filter((tx) => tx.id !== id),
            transactions: [{ ...pendingTx, status: 'confirmed' as const }, ...state.transactions],
          };
        }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    { name: 'TransactionStore' }
  )
);
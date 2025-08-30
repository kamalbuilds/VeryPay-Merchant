# VeryPay Frontend Architecture

## 1. Architecture Overview

The VeryPay frontend is built as a modern, responsive Single Page Application (SPA) using React 18, TypeScript, and cutting-edge Web3 technologies. The architecture emphasizes performance, maintainability, and excellent user experience while providing seamless blockchain integration.

## 2. Technology Stack

### 2.1 Core Technologies
- **React 18**: UI library with concurrent features and Suspense
- **TypeScript**: Type-safe development environment
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework
- **React Router v6**: Client-side routing

### 2.2 Web3 Integration
- **Wagmi**: React hooks for Ethereum interactions
- **Viem**: TypeScript-first Ethereum library
- **ConnectKit**: Wallet connection interface
- **RainbowKit**: Beautiful wallet connection modal

### 2.3 State Management
- **Zustand**: Lightweight state management
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management
- **Zod**: Schema validation

### 2.4 UI/UX Libraries
- **Radix UI**: Unstyled, accessible components
- **Framer Motion**: Animation library
- **React Hot Toast**: Notifications
- **Recharts**: Data visualization

## 3. Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components (Button, Input, etc.)
│   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   ├── forms/           # Form components
│   └── web3/            # Web3-specific components
├── pages/               # Page components
│   ├── dashboard/       # Merchant dashboard pages
│   ├── payments/        # Payment-related pages
│   ├── profile/         # Profile management pages
│   └── onboarding/      # User onboarding flow
├── hooks/               # Custom React hooks
│   ├── web3/            # Web3-related hooks
│   ├── api/             # API interaction hooks
│   └── utils/           # Utility hooks
├── services/            # Service layer
│   ├── api/             # API clients
│   ├── web3/            # Smart contract interactions
│   └── storage/         # Local storage utilities
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── config/              # Configuration files
└── assets/              # Static assets
```

## 4. Component Architecture

### 4.1 Component Categories

#### Base UI Components
```typescript
// Button component example
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="mr-2" />}
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
```

#### Layout Components
```typescript
// Dashboard layout
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isConnected } = useAccount();
  
  if (!isConnected) {
    return <Navigate to="/connect" />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
```

### 4.2 Web3 Components

#### Wallet Connection
```typescript
import { ConnectKitButton } from 'connectkit';

export const WalletConnect: React.FC = () => {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, truncatedAddress, ensName }) => {
        return (
          <Button onClick={show}>
            {isConnected ? (ensName ?? truncatedAddress) : 'Connect Wallet'}
          </Button>
        );
      }}
    </ConnectKitButton.Custom>
  );
};
```

#### Payment Component
```typescript
interface PaymentFormProps {
  merchantId: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: Error) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  merchantId,
  onSuccess,
  onError
}) => {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const processPayment = useProcessPayment();
  
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: '',
      token: 'USDC',
      orderId: generateOrderId()
    }
  });
  
  const onSubmit = async (data: PaymentFormData) => {
    try {
      const paymentId = await processPayment.mutateAsync({
        ...data,
        merchantId,
        customerAddress: address!
      });
      onSuccess(paymentId);
    } catch (error) {
      onError(error as Error);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <TokenSelector
          value={form.watch('token')}
          onChange={(token) => form.setValue('token', token)}
        />
        
        <Button
          type="submit"
          loading={processPayment.isPending}
          className="w-full"
        >
          Process Payment
        </Button>
      </form>
    </Form>
  );
};
```

## 5. State Management Architecture

### 5.1 Zustand Stores

#### Auth Store
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false })
}));
```

#### Merchant Store
```typescript
interface MerchantState {
  profile: MerchantProfile | null;
  payments: Payment[];
  analytics: MerchantAnalytics | null;
  
  setProfile: (profile: MerchantProfile) => void;
  addPayment: (payment: Payment) => void;
  updateAnalytics: (analytics: MerchantAnalytics) => void;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  profile: null,
  payments: [],
  analytics: null,
  
  setProfile: (profile) => set({ profile }),
  addPayment: (payment) => set((state) => ({ 
    payments: [payment, ...state.payments]
  })),
  updateAnalytics: (analytics) => set({ analytics })
}));
```

### 5.2 TanStack Query Setup

```typescript
// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        return failureCount < 3;
      }
    }
  }
});

// Query keys factory
export const queryKeys = {
  merchant: {
    all: ['merchants'] as const,
    profile: (id: string) => [...queryKeys.merchant.all, 'profile', id] as const,
    payments: (id: string) => [...queryKeys.merchant.all, 'payments', id] as const,
    analytics: (id: string) => [...queryKeys.merchant.all, 'analytics', id] as const
  },
  payments: {
    all: ['payments'] as const,
    detail: (id: string) => [...queryKeys.payments.all, 'detail', id] as const
  }
};
```

## 6. Custom Hooks Architecture

### 6.1 Web3 Hooks

#### Contract Interaction Hook
```typescript
export const useVeryPayContract = () => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const contract = useMemo(() => {
    if (!publicClient) return null;
    
    return getContract({
      address: VERYPAY_CONTRACT_ADDRESS,
      abi: VeryPayABI,
      publicClient,
      walletClient
    });
  }, [publicClient, walletClient]);
  
  return contract;
};

// Payment processing hook
export const useProcessPayment = () => {
  const contract = useVeryPayContract();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: ProcessPaymentParams) => {
      if (!contract) throw new Error('Contract not available');
      
      const hash = await contract.write.processPayment([
        params.merchantId,
        params.token,
        parseUnits(params.amount, 18),
        params.orderId,
        params.signature
      ]);
      
      // Wait for transaction confirmation
      const receipt = await waitForTransaction({ hash });
      
      // Extract payment ID from events
      const paymentId = extractPaymentId(receipt.logs);
      
      return paymentId;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.merchant.all });
    }
  });
};
```

### 6.2 API Hooks

```typescript
// Merchant profile hook
export const useMerchantProfile = (merchantId: string) => {
  return useQuery({
    queryKey: queryKeys.merchant.profile(merchantId),
    queryFn: () => apiClient.merchants.getProfile(merchantId),
    enabled: !!merchantId
  });
};

// Payments hook with pagination
export const useMerchantPayments = (merchantId: string, page: number = 1) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.merchant.payments(merchantId), page],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.payments.getMerchantPayments(merchantId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!merchantId
  });
};
```

## 7. Service Layer Architecture

### 7.1 API Client
```typescript
class ApiClient {
  private baseURL: string;
  private axiosInstance: AxiosInstance;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Request interceptor for auth
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Handle auth error
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }
    );
  }
  
  // Merchant API methods
  merchants = {
    getProfile: (id: string): Promise<MerchantProfile> =>
      this.axiosInstance.get(`/merchants/${id}`),
    
    updateProfile: (id: string, data: Partial<MerchantProfile>) =>
      this.axiosInstance.put(`/merchants/${id}`, data),
    
    register: (data: MerchantRegistration) =>
      this.axiosInstance.post('/merchants/register', data)
  };
  
  // Payments API methods
  payments = {
    getMerchantPayments: (merchantId: string, page: number) =>
      this.axiosInstance.get(`/payments/merchant/${merchantId}?page=${page}`),
    
    getPaymentDetails: (paymentId: string) =>
      this.axiosInstance.get(`/payments/${paymentId}`)
  };
}

export const apiClient = new ApiClient(process.env.VITE_API_BASE_URL!);
```

### 7.2 Web3 Service
```typescript
class Web3Service {
  private contract: Contract | null = null;
  
  async initializeContract(walletClient: WalletClient, publicClient: PublicClient) {
    this.contract = getContract({
      address: VERYPAY_CONTRACT_ADDRESS,
      abi: VeryPayABI,
      publicClient,
      walletClient
    });
  }
  
  async processPayment(params: ProcessPaymentParams): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const { request } = await this.contract.simulate.processPayment([
      params.merchantId,
      params.token,
      parseUnits(params.amount, 18),
      params.orderId,
      params.signature
    ]);
    
    const hash = await this.contract.write.processPayment(request.args);
    
    const receipt = await waitForTransaction({ hash });
    return extractPaymentId(receipt.logs);
  }
  
  async getMerchantProfile(merchantId: string): Promise<MerchantProfile> {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const profile = await this.contract.read.getMerchantProfile([merchantId]);
    return formatMerchantProfile(profile);
  }
}

export const web3Service = new Web3Service();
```

## 8. Routing Architecture

### 8.1 Route Configuration
```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />
      },
      {
        path: 'connect',
        element: <WalletConnect />
      },
      {
        path: 'onboarding',
        element: <OnboardingFlow />,
        children: [
          {
            path: 'merchant-registration',
            element: <MerchantRegistration />
          }
        ]
      },
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardOverview />
          },
          {
            path: 'payments',
            element: <PaymentsPage />
          },
          {
            path: 'profile',
            element: <ProfilePage />
          },
          {
            path: 'analytics',
            element: <AnalyticsPage />
          }
        ]
      }
    ]
  }
]);
```

### 8.2 Protected Routes
```typescript
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected } = useAccount();
  const { isAuthenticated } = useAuthStore();
  
  if (!isConnected) {
    return <Navigate to="/connect" />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/onboarding" />;
  }
  
  return <>{children}</>;
};
```

## 9. Performance Optimizations

### 9.1 Code Splitting
```typescript
// Lazy load heavy components
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const PaymentsPage = lazy(() => import('../pages/PaymentsPage'));

// Route-based code splitting
const router = createBrowserRouter([
  {
    path: '/analytics',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AnalyticsPage />
      </Suspense>
    )
  }
]);
```

### 9.2 Memoization
```typescript
// Expensive calculations
const MerchantAnalytics: React.FC<{ data: Payment[] }> = ({ data }) => {
  const analytics = useMemo(() => {
    return calculateAnalytics(data);
  }, [data]);
  
  return <AnalyticsChart data={analytics} />;
};

// Prevent unnecessary re-renders
const PaymentItem = React.memo<PaymentItemProps>(({ payment }) => {
  return (
    <div className="payment-item">
      {/* Payment details */}
    </div>
  );
});
```

### 9.3 Virtual Scrolling
```typescript
import { VariableSizeList as List } from 'react-window';

const PaymentsList: React.FC<{ payments: Payment[] }> = ({ payments }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <PaymentItem payment={payments[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={payments.length}
      itemSize={() => 120}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## 10. Error Handling & Loading States

### 10.1 Error Boundary
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

### 10.2 Loading States
```typescript
const PaymentsList: React.FC = () => {
  const { data: payments, isLoading, error } = useMerchantPayments();
  
  if (isLoading) return <PaymentsListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!payments?.length) return <EmptyState />;
  
  return (
    <div className="payments-list">
      {payments.map((payment) => (
        <PaymentItem key={payment.id} payment={payment} />
      ))}
    </div>
  );
};
```

## 11. Testing Strategy

### 11.1 Component Testing
```typescript
// Component test example
describe('PaymentForm', () => {
  it('should process payment successfully', async () => {
    const mockProcessPayment = jest.fn().mockResolvedValue('payment-id');
    
    render(
      <PaymentForm
        merchantId="merchant-123"
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );
    
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '100' }
    });
    
    fireEvent.click(screen.getByText('Process Payment'));
    
    await waitFor(() => {
      expect(mockProcessPayment).toHaveBeenCalledWith({
        amount: '100',
        merchantId: 'merchant-123'
      });
    });
  });
});
```

### 11.2 Hook Testing
```typescript
// Hook test example
describe('useProcessPayment', () => {
  it('should process payment and invalidate queries', async () => {
    const { result } = renderHook(() => useProcessPayment(), {
      wrapper: createWrapper()
    });
    
    act(() => {
      result.current.mutate({
        merchantId: 'merchant-123',
        amount: '100',
        token: 'USDC'
      });
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## 12. Progressive Web App Features

### 12.1 Service Worker
```typescript
// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
```

### 12.2 Offline Support
```typescript
// Offline detection
export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOffline;
};
```

This frontend architecture provides a solid foundation for building a modern, performant, and user-friendly Web3 application.
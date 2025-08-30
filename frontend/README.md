# VeryPay Merchant Frontend

A comprehensive Next.js 14 frontend application for VeryPay Merchant - a Web3 payment solution with $VERY token rewards and loyalty programs.

## 🚀 Features

### Merchant Dashboard
- **Real-time Transaction Monitoring**: Live view of all $VERY payments with Server Components
- **Sales Analytics**: Interactive charts showing revenue, volume, and customer insights
- **Customer Management**: Detailed customer profiles with loyalty tiers and reward tracking
- **QR Code Generator**: Dynamic payment QR codes with expiration and usage limits
- **Revenue Reports**: Comprehensive financial reporting with export capabilities

### Payment Interface
- **Mobile-Optimized**: Responsive design perfect for mobile point-of-sale
- **QR Code Scanner**: Integrated scanner for processing customer payments
- **Real-time Conversion**: Live USD to $VERY token conversion rates
- **Transaction Confirmation**: Instant blockchain confirmation with receipt generation
- **Offline Support**: PWA capabilities for offline payment processing

### Customer Portal
- **Rewards Balance**: Real-time $VERY token balance and transaction history
- **Walking Rewards**: GPS-based walking tracker with automatic reward distribution
- **Tier Progress**: Visual loyalty tier progression with benefits breakdown
- **Social Features**: Community challenges and reward sharing
- **Transaction History**: Complete payment history with filtering and search

## 🛠 Tech Stack

### Core Framework
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **shadcn/ui** component library

### Web3 Integration
- **wagmi v2** for Web3 interactions
- **viem** for Ethereum utilities
- **RainbowKit** for wallet connections
- **WalletConnect v2** protocol support

### State & Data
- **Zustand** for client state management
- **TanStack Query** for server state
- **Next.js API Routes** for backend services
- **Server Components** for optimal performance

### Mobile & PWA
- **next-pwa** for Progressive Web App features
- **Sharp** for image optimization
- **Service Worker** for offline support
- **Push Notifications** for transaction alerts

### Additional Features
- **next-intl** for internationalization
- **Framer Motion** for animations
- **recharts** for data visualization
- **react-hot-toast** for notifications
- **react-hook-form** with Zod validation

## 📁 Project Structure

```
frontend/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API routes
│   │   ├── transactions/         # Transaction management
│   │   └── payments/            # Payment processing
│   ├── dashboard/               # Merchant dashboard
│   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   ├── page.tsx             # Main dashboard view
│   │   ├── transactions/        # Transaction management
│   │   ├── customers/           # Customer insights
│   │   ├── analytics/           # Sales analytics
│   │   ├── qr-codes/           # QR code management
│   │   └── settings/           # Merchant settings
│   ├── payment/                 # Payment interface
│   │   └── page.tsx             # QR code generation & payment flow
│   ├── customer/                # Customer portal
│   │   └── page.tsx             # Rewards tracking & wallet
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Landing page
│   ├── globals.css              # Global styles
│   └── providers.tsx            # Context providers
├── components/                  # Reusable components
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   ├── wallet/                  # Web3 wallet components
│   ├── qr/                      # QR code components
│   ├── rewards/                 # Rewards system components
│   └── notifications/           # Notification components
├── lib/                         # Utility libraries
│   ├── utils.ts                 # Common utilities
│   ├── web3.ts                  # Web3 configuration
│   └── constants.ts             # App constants
├── hooks/                       # Custom React hooks
├── types/                       # TypeScript type definitions
├── styles/                      # Global styles and themes
├── public/                      # Static assets
│   ├── manifest.json            # PWA manifest
│   ├── icon.svg                 # App icon
│   └── favicon.ico              # Favicon
├── middleware.ts                # Next.js middleware
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # TailwindCSS configuration
└── tsconfig.json                # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or bun package manager
- WalletConnect Project ID (for Web3 features)

### Installation

1. **Clone and install dependencies**
```bash
cd frontend
npm install
# or
yarn install
# or
bun install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_APP_NAME="VeryPay Merchant"
DATABASE_URL=your_database_url
```

3. **Development Server**
```bash
npm run dev
# or
yarn dev
# or
bun dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## 📱 PWA Features

### Installation
- Installable on mobile devices and desktops
- Offline support for core functionality
- Background sync for pending transactions

### Push Notifications
- Real-time payment confirmations
- Reward distribution alerts
- Walking challenge notifications

### Offline Capabilities
- Cache payment data for offline viewing
- Queue transactions for online sync
- Offline QR code generation

## 🌐 Web3 Features

### Supported Networks
- Ethereum Mainnet
- Polygon
- Arbitrum
- Optimism

### Wallet Support
- MetaMask
- WalletConnect (200+ wallets)
- Coinbase Wallet
- Rainbow Wallet
- Trust Wallet

### Smart Contract Integration
- $VERY token payments
- Automatic reward distribution
- Multi-signature security
- Gas optimization

## 📊 Analytics & Monitoring

### Merchant Analytics
- Real-time transaction volume
- Customer behavior insights
- Revenue trend analysis
- Geographic payment distribution

### Performance Monitoring
- Core Web Vitals tracking
- Bundle size analysis
- API response time monitoring
- User interaction tracking

## 🔧 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint code checking
npm run typecheck    # TypeScript type checking
npm run format       # Prettier code formatting
npm run analyze      # Bundle size analysis
```

### Code Quality
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Husky** for git hooks (optional)

### Testing
- **Jest** for unit testing
- **React Testing Library** for component testing
- **Cypress** for e2e testing (optional)

## 🌍 Internationalization

Support for multiple languages using next-intl:
- English (default)
- Spanish
- French
- German
- Japanese
- Korean

## 🔒 Security

### Authentication
- Wallet-based authentication
- Session management with JWT
- Multi-factor authentication support

### Security Headers
- Content Security Policy (CSP)
- XSS protection
- CSRF protection
- Secure cookie handling

## 📦 Deployment

### Vercel (Recommended)
```bash
vercel --prod
```

### Docker
```bash
docker build -t verypay-frontend .
docker run -p 3000:3000 verypay-frontend
```

### Environment Variables
Set these in your deployment platform:
- `NEXT_PUBLIC_PROJECT_ID` - WalletConnect Project ID
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Authentication callback URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Documentation: [docs.verypay.io](https://docs.verypay.io)
- Discord: [discord.gg/verypay](https://discord.gg/verypay)
- Email: support@verypay.io

---

Built with ❤️ for the Web3 community by the VeryPay team.
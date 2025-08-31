import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import config from '@/lib/config'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    template: '%s | VeryPay Merchant',
    default: 'VeryPay Merchant - Web3 Payment Solution',
  },
  description: 'Web3 payment solution for merchants with $VERY token rewards and loyalty programs',
  keywords: ['web3', 'payments', 'crypto', 'rewards', 'loyalty', 'very', 'merchant'],
  authors: [{ name: 'VeryPay Team' }],
  creator: 'VeryPay',
  publisher: 'VeryPay',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(config.baseUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: config.baseUrl,
    title: 'VeryPay Merchant',
    description: 'Web3 payment solution for merchants',
    siteName: 'VeryPay Merchant',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VeryPay Merchant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VeryPay Merchant',
    description: 'Web3 payment solution for merchants',
    images: ['/og-image.png'],
    creator: '@verypay',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'VeryPay Merchant',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0ea5e9',
    'theme-color': '#0ea5e9',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0c4a6e' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="min-h-screen bg-background">
            {children}
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
// Configuration helper to properly handle URLs in different environments

function getBaseUrl() {
  // For server-side rendering
  if (typeof window === 'undefined') {
    // Vercel deployment
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    // Local development
    return 'http://localhost:3000'
  }
  
  // For client-side
  // Use the current window location
  return window.location.origin
}

export const config = {
  baseUrl: getBaseUrl(),
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || `${getBaseUrl()}/api`,
  },
  walletConnect: {
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'demo-project-id',
  },
  app: {
    name: 'VeryPay Merchant',
    description: 'Web3 Payment Solution for Merchants',
  },
} as const

export default config
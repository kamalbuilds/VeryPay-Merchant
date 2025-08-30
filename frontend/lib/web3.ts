import { createConfig, http } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// Web3 configuration for wagmi v2
export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'VeryPay Merchant',
      appLogoUrl: '/logo.png',
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      metadata: {
        name: 'VeryPay Merchant',
        description: 'Web3 Payment Solution for Merchants',
        url: process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000',
        icons: ['/logo.png'],
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
})

// Contract addresses (placeholder - replace with actual addresses)
export const CONTRACTS = {
  VERY_TOKEN: {
    [mainnet.id]: '0x0000000000000000000000000000000000000000',
    [polygon.id]: '0x0000000000000000000000000000000000000000',
    [arbitrum.id]: '0x0000000000000000000000000000000000000000',
    [optimism.id]: '0x0000000000000000000000000000000000000000',
  },
} as const

export function formatEther(value: bigint, decimals = 4): string {
  const ether = Number(value) / 1e18
  return ether.toFixed(decimals)
}

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
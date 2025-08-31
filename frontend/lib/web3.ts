import { createConfig, http } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'
import appConfig from './config'

// Web3 configuration for wagmi v2
export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: appConfig.app.name,
      appLogoUrl: '/logo.png',
    }),
    walletConnect({
      projectId: appConfig.walletConnect.projectId,
      metadata: {
        name: appConfig.app.name,
        description: appConfig.app.description,
        url: appConfig.baseUrl,
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
import { http, createConfig } from 'wagmi';
import { mainnet, polygon, arbitrum, base } from 'wagmi/chains';
import { injected, walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'your-project-id';

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, base],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'VeryPay Merchant',
        description: 'Web3 Payment Solutions',
        url: 'https://verypay.app',
        icons: ['https://verypay.app/icon.png']
      }
    }),
    metaMask(),
    coinbaseWallet({
      appName: 'VeryPay Merchant',
      appLogoUrl: 'https://verypay.app/icon.png'
    })
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
});
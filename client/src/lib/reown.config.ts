import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, celo, polygon, arbitrum, optimism, base } from '@wagmi/core/chains'

// Get projectId from environment or use the provided one
export const projectId = '126d93e6740defb2bed36da3e24a5114'

if (!projectId) {
  throw new Error('Reown Project ID is not configured')
}

// Define metadata
const metadata = {
  name: 'MaxFlow',
  description: 'Sybil-resistant trust scoring system',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://maxflow.app',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '']
}

// Support multiple networks since we only use off-chain EIP-712 signatures
// Users can stay on any network they prefer
const supportedNetworks = [mainnet, celo, polygon, arbitrum, optimism, base]

// Create wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  networks: supportedNetworks,
  projectId,
  ssr: false
})

// Create AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet, celo, polygon, arbitrum, optimism, base],
  defaultNetwork: mainnet, // Default to Ethereum mainnet (most common)
  projectId,
  metadata,
  features: {
    email: true,
    socials: ['google', 'x', 'github', 'discord'],
    emailShowWallets: true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3b82f6', // primary blue from theme
  }
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { celo } from '@wagmi/core/chains'

// Get projectId from environment or use the provided one
export const projectId = '126d93e6740defb2bed36da3e24a5114'

if (!projectId) {
  throw new Error('Reown Project ID is not configured')
}

// Define metadata
const metadata = {
  name: 'TrustFlow',
  description: 'Sybil-resistant trust scoring system',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://trustflow.app',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '']
}

// Create wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  networks: [celo],
  projectId,
  ssr: false
})

// Create AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [celo],
  defaultNetwork: celo,
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

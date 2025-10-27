import { createConfig, http } from 'wagmi';
import { base, baseSepolia, mainnet, celo } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base, baseSepolia, mainnet, celo],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'TrustFlow' }),
    walletConnect({ 
      projectId: '0000000000000000000000000000000',
      metadata: {
        name: 'TrustFlow',
        description: 'Sybil-resistant trust network using max-flow/min-cut algorithms',
        url: 'https://trustflow.replit.app',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    [celo.id]: http(),
  },
});

import { createConfig, http } from 'wagmi';
import { base, baseSepolia, mainnet, celo } from 'wagmi/chains';

export const config = createConfig({
  chains: [base, baseSepolia, mainnet, celo],
  connectors: [],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    [celo.id]: http(),
  },
});

import { createConfig, http } from 'wagmi';
import { base, baseSepolia, mainnet, celo } from 'wagmi/chains';
import WaaPConnector from './waap.connector';
import { waapConfig } from './waap.config';

export const config = createConfig({
  chains: [base, baseSepolia, mainnet, celo],
  connectors: [
    WaaPConnector(waapConfig),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    [celo.id]: http(),
  },
});

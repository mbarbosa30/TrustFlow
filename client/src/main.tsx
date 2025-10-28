import { createRoot } from "react-dom/client";
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi';
import { queryClient } from './lib/queryClient';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </WagmiProvider>
);

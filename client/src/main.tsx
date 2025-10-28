import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { WaaPProvider } from './components/WaaPProvider';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <WaaPProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </WaaPProvider>
);

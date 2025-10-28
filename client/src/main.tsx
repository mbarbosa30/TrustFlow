import { createRoot } from "react-dom/client";
import { WaaPProvider } from "./waap";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <WaaPProvider>
    <App />
  </WaaPProvider>
);

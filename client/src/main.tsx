import { createRoot } from "react-dom/client";
import { ReownProvider } from './components/ReownProvider';
import App from "./App";
import "./index.css";
import "katex/dist/katex.min.css";

createRoot(document.getElementById("root")!).render(
  <ReownProvider>
    <App />
  </ReownProvider>
);

import { useEffect, useState, type PropsWithChildren } from "react";
import { initWaaP } from "@human.tech/waap-sdk";
import { waapConfig } from "@/lib/waap.config";

declare global {
  interface Window {
    waap?: any;
    __waapInited?: boolean;
  }
}

export function WaaPProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initializeWaaP = async () => {
      if (window.__waapInited) {
        setReady(true);
        return;
      }

      try {
        await initWaaP(waapConfig);
        window.__waapInited = true;
        console.log("WaaP initialized successfully");
        setReady(true);
      } catch (error) {
        console.error("Failed to initialize WaaP:", error);
        setReady(true);
      }
    };

    initializeWaaP();
  }, []);

  return <>{ready ? children : null}</>;
}

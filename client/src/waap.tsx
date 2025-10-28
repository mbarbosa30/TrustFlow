import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { initWaaP } from '@human.tech/waap-sdk';

type WaaPContextType = {
  ready: boolean;
  address: string | null;
  login: () => Promise<string | null>;
  logout: () => Promise<void>;
};

const WaaPContext = createContext<WaaPContextType>({
  ready: false,
  address: null,
  login: async () => null,
  logout: async () => {},
});

declare global {
  interface Window {
    waap?: any;
  }
}

export function WaaPProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      try {
        await initWaaP({
          config: {
            authenticationMethods: ['email', 'phone', 'social', 'wallet'],
            allowedSocials: ['google', 'twitter', 'discord', 'github'],
            styles: { darkMode: true },
            showSecured: true,
          },
          project: {
            entryTitle: 'TrustFlow - Join the Trust Network',
          },
          useStaging: false,
        });

        try {
          const accounts = await window.waap.request({ method: 'eth_requestAccounts' });
          const addr = accounts?.[0];
          const finalAddr = addr && addr !== '' ? addr : null;
          setAddress(finalAddr);
        } catch (error) {
          // No session to restore
        }
        
        window.waap.on('accountsChanged', (accounts: string[]) => {
          const addr = accounts?.[0];
          const finalAddr = addr && addr !== '' ? addr : null;
          setAddress(finalAddr);
        });
        if (!cancelled) {
          setReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize WaaP:', error);
        if (!cancelled) {
          setReady(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const api = useMemo<WaaPContextType>(
    () => ({
      ready,
      address,
      login: async () => {
        if (!window.waap) {
          throw new Error('WaaP not initialized');
        }
        const loginResult = await window.waap.login();
        if (!loginResult) {
          throw new Error('Login cancelled');
        }
        const accounts = await window.waap.request({ method: 'eth_requestAccounts' });
        const addr = accounts?.[0];
        const newAddress = addr && addr !== '' ? addr : null;
        setAddress(newAddress);
        return newAddress;
      },
      logout: async () => {
        if (!window.waap) {
          setAddress(null);
          return;
        }
        try {
          await window.waap.logout();
        } finally {
          Object.keys(localStorage)
            .filter((k) => k.startsWith('wc@2:'))
            .forEach((k) => localStorage.removeItem(k));
          setAddress(null);
        }
      },
    }),
    [ready, address]
  );

  return <WaaPContext.Provider value={api}>{children}</WaaPContext.Provider>;
}

export const useWaaP = () => useContext(WaaPContext);

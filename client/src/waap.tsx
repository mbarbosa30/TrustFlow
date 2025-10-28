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
  const inited = useRef(false);
  
  console.log('WaaPProvider render:', { ready, address, initedCurrent: inited.current });

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;

    (async () => {
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
          console.log('WaaP: Session restore result:', accounts);
          setAddress(accounts?.[0] ?? null);
        } catch (error) {
          console.log('WaaP: No existing session to restore');
        }
        
        window.waap.on('accountsChanged', (accounts: string[]) => {
          console.log('WaaP: accountsChanged event:', accounts);
          setAddress(accounts?.[0] ?? null);
        });
        
        console.log('WaaP: About to set ready=true');
        setReady(true);
        console.log('WaaP: setReady(true) called');
      } catch (error) {
        console.error('Failed to initialize WaaP:', error);
        setReady(false);
      }
    })();
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
        const newAddress = accounts?.[0] ?? null;
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

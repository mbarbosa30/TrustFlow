import { createContext, useContext, useEffect, useState } from 'react';
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

// Flag to ensure we only clear localStorage once per app lifecycle
let hasCleared = false;

export function WaaPProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    // Force clear ALL old wallet sessions on first load
    if (!hasCleared) {
      console.log('[WaaP] Clearing all localStorage to remove old sessions...');
      const keysToRemove = Object.keys(localStorage).filter(
        k => k.includes('wagmi') || k.includes('wc@2') || k.includes('wallet')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
      hasCleared = true;
    }

    // Initialize WaaP
    (async () => {
      try {
        console.log('[WaaP] Initializing...');
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
        
        console.log('[WaaP] Initialized successfully');

        // Try to restore session (will be empty after localStorage clear)
        try {
          const accounts = await window.waap.request({ method: 'eth_requestAccounts' });
          const addr = accounts?.[0];
          // Filter out empty strings
          if (addr && addr.length > 10) {
            console.log('[WaaP] Session restored:', addr);
            setAddress(addr);
          } else {
            console.log('[WaaP] No valid session to restore');
          }
        } catch (e) {
          console.log('[WaaP] No existing session');
        }

        // Listen for account changes
        window.waap.on('accountsChanged', (accounts: string[]) => {
          const addr = accounts?.[0];
          setAddress(addr && addr.length > 10 ? addr : null);
        });

        setReady(true);
        console.log('[WaaP] Ready');
      } catch (error) {
        console.error('[WaaP] Initialization failed:', error);
        setReady(false);
      }
    })();
  }, []); // Only run once

  const login = async (): Promise<string | null> => {
    if (!window.waap) {
      throw new Error('WaaP not initialized');
    }
    
    const loginResult = await window.waap.login();
    if (!loginResult) {
      throw new Error('Login cancelled');
    }
    
    const accounts = await window.waap.request({ method: 'eth_requestAccounts' });
    const addr = accounts?.[0];
    const newAddress = addr && addr.length > 10 ? addr : null;
    setAddress(newAddress);
    return newAddress;
  };

  const logout = async (): Promise<void> => {
    if (window.waap) {
      await window.waap.logout();
    }
    // Clear WalletConnect localStorage
    Object.keys(localStorage)
      .filter(k => k.startsWith('wc@2:'))
      .forEach(k => localStorage.removeItem(k));
    setAddress(null);
  };

  return (
    <WaaPContext.Provider value={{ ready, address, login, logout }}>
      {children}
    </WaaPContext.Provider>
  );
}

export const useWaaP = () => useContext(WaaPContext);

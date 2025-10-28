import { useState, useEffect } from 'react';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.waap) return;

      try {
        // Use eth_accounts (silent, no modal) instead of eth_requestAccounts
        const accounts = await window.waap.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        // Not connected
        setAddress(null);
        setIsConnected(false);
      }
    };

    // Retry checking until WaaP is ready
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(() => {
      if (window.waap || attempts >= maxAttempts) {
        clearInterval(checkInterval);
        checkConnection();
      }
      attempts++;
    }, 300);

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setIsConnected(false);
      } else {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    };

    const handleDisconnect = () => {
      setAddress(null);
      setIsConnected(false);
    };

    // Set up event listeners once WaaP is available
    const setupListeners = setInterval(() => {
      if (window.waap) {
        clearInterval(setupListeners);
        window.waap.on('accountsChanged', handleAccountsChanged);
        window.waap.on('disconnect', handleDisconnect);
      }
    }, 300);

    return () => {
      clearInterval(checkInterval);
      clearInterval(setupListeners);
      if (window.waap) {
        window.waap.removeListener('accountsChanged', handleAccountsChanged);
        window.waap.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  return { address, isConnected };
}

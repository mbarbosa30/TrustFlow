import { PropsWithChildren, useEffect } from 'react';
import { initWaaP } from '@human.tech/waap-sdk';
import { waapInitConfig } from '@/lib/waap.config';

export function WaaPProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    try {
      // @ts-ignore - WaaP SDK type mismatch with readonly arrays
      initWaaP(waapInitConfig);
      console.log('WaaP initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WaaP:', error);
    }
  }, []);

  // Render children immediately - WaaP init is async but non-blocking
  return <>{children}</>;
}

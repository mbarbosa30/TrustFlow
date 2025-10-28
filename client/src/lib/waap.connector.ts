import { ChainNotConfiguredError, createConnector, type Connector } from "wagmi";
import { getAddress, SwitchChainError, UserRejectedRequestError } from "viem";

import {
  type CredentialType,
  type WaaPEthereumProviderInterface,
  WAAP_METHOD,
  initWaaP,
  type InitWaaPOptions,
} from "@human.tech/waap-sdk";

export type LoginResponse = 'waap' | 'human' | 'injected' | 'walletconnect' | null;

export interface WaaPConnector extends Connector {
  isWaaP: boolean;
  connected: boolean;
  
  login(customProvider?: unknown): Promise<LoginResponse>;
  logout(): Promise<unknown>;
  getLoginMethod(): LoginResponse;
  
  requestEmail(): Promise<unknown>;
  requestSBT(type: CredentialType): Promise<unknown>;
  
  toggleDarkMode(): Promise<void>;
}

export function isWaaPConnector(connector: Connector | undefined): connector is WaaPConnector {
  return connector?.id === 'waap';
}

export default function WaaPConnector(options?: InitWaaPOptions) {
  let WaaPProvider: WaaPEthereumProviderInterface | null = null;
  let isInitializing = false;

  return createConnector<WaaPEthereumProviderInterface>((config) => {
    return {
      id: "waap",
      name: "WaaP",
      type: "WaaP",
      chains: config.chains,
      supportsSimulation: false,

      async connect({ chainId, withCapabilities = false }: { chainId?: number; withCapabilities?: boolean } = {}) {
        try {
          config.emitter.emit("message", {
            type: "connecting",
          });
          const provider = await this.getProvider() as WaaPEthereumProviderInterface;

          provider.on("accountsChanged", this.onAccountsChanged);
          provider.on("chainChanged", this.onChainChanged);
          provider.on("disconnect", this.onDisconnect);

          if (!provider.connected) {
            try {
              await provider.login();
            } catch (error) {
              console.warn("Unable to login", error);
              throw new UserRejectedRequestError(
                "User rejected login or login failed" as unknown as Error
              );
            }
          }

          let currentChainId = await this.getChainId();
          if (chainId && currentChainId !== chainId) {
            const chain = await this.switchChain!({ chainId }).catch(
              (error) => {
                if (error.code === UserRejectedRequestError.code) throw error;
                return { id: currentChainId };
              }
            );
            currentChainId = chain?.id ?? currentChainId;
          }

          const accounts = await this.getAccounts();

          if (!accounts || accounts.length === 0) {
            throw new UserRejectedRequestError(
              "No valid accounts found" as unknown as Error
            );
          }

          return { 
            accounts: withCapabilities 
              ? accounts.map(account => ({ address: account, capabilities: {} })) as any
              : accounts as any, 
            chainId: currentChainId 
          };
        } catch (error) {
          console.error("Error while connecting", error);
          this.onDisconnect();
          throw error;
        }
      },

      async getAccounts() {
        try {
          const provider = await this.getProvider();
          if (!provider) return [];
          const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
          return accounts
            .filter((x) => x && x.trim() !== '')
            .map((x) => getAddress(x));
        } catch (error) {
          console.error("Error getting accounts:", error);
          return [];
        }
      },

      async getChainId() {
        const provider = await this.getProvider();
        const hexChainId = (await provider.request({ method: "eth_chainId" })) as string;
        return Number(hexChainId);
      },

      async getProvider() {
        if (WaaPProvider) return WaaPProvider;
        if (isInitializing) {
          // Wait for initialization to complete
          while (isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          return WaaPProvider!;
        }
        isInitializing = true;
        WaaPProvider = await initWaaP(options);
        isInitializing = false;
        return WaaPProvider;
      },

      async isAuthorized() {
        // Disable auto-reconnect - force explicit connection
        return false;
      },

      async switchChain({ chainId }) {
        const provider = await this.getProvider();
        const chain = config.chains.find((x) => x.id === chainId);
        if (!chain) throw new ChainNotConfiguredError();

        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          });
          return chain;
        } catch (error) {
          throw new SwitchChainError(error as Error);
        }
      },

      async disconnect() {
        const provider = await this.getProvider() as WaaPEthereumProviderInterface;
        await provider.logout();
        provider.removeListener("accountsChanged", this.onAccountsChanged);
        provider.removeListener("chainChanged", this.onChainChanged);
        provider.removeListener("disconnect", this.onDisconnect);
      },

      async login(): Promise<LoginResponse> {
        const provider = await this.getProvider() as WaaPEthereumProviderInterface;
        return provider.login() as Promise<LoginResponse>;
      },

      async logout(): Promise<unknown> {
        const provider = await this.getProvider() as WaaPEthereumProviderInterface;
        return provider.logout();
      },

      getLoginMethod(): LoginResponse {
        if (!WaaPProvider) return null;
        return (WaaPProvider as unknown as { getLoginMethod: () => LoginResponse }).getLoginMethod();
      },

      async toggleDarkMode(): Promise<void> {
        const provider = await this.getProvider() as WaaPEthereumProviderInterface;
        try {
          await provider.request({ method: 'waap_toggleDarkMode' as any });
        } catch (error) {
          console.warn('Toggle dark mode not supported', error);
        }
      },

      async requestEmail(): Promise<unknown> {
        const provider = await this.getProvider() as WaaPEthereumProviderInterface;
        return provider.requestEmail();
      },

      async requestSBT(type: CredentialType): Promise<unknown> {
        const provider = await this.getProvider() as WaaPEthereumProviderInterface;
        return (provider as unknown as { requestSBT: (type: CredentialType) => Promise<unknown> }).requestSBT(type);
      },

      onAccountsChanged(accounts) {
        if (accounts.length === 0) {
          config.emitter.emit("disconnect");
        } else {
          const validAccounts = accounts
            .filter((x: string) => x && x.trim() !== '')
            .map((x: string) => {
              try {
                return getAddress(x);
              } catch (error) {
                console.warn('Invalid address in accounts changed:', x, error);
                return null;
              }
            })
            .filter((x) => x !== null);
          
          if (validAccounts.length > 0) {
            config.emitter.emit("change", {
              accounts: validAccounts,
            });
          } else {
            config.emitter.emit("disconnect");
          }
        }
      },

      onChainChanged(chain) {
        const chainId = Number(chain);
        config.emitter.emit("change", { chainId });
      },

      onDisconnect(): void {
        config.emitter.emit("disconnect");
      },
    };
  });
}

type RequestArguments = {
  method: string;
  params?: unknown[] | object;
};

export type InjectedEthereumProvider = {
  request: (args: RequestArguments) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  providers?: InjectedEthereumProvider[];
};

export type WalletProviderOption = {
  id: string;
  name: string;
  provider: InjectedEthereumProvider;
};

const STORAGE_KEY = "wifiproof.selectedProvider";

function getProviderName(provider: InjectedEthereumProvider) {
  if (provider.isRabby) return "Rabby";
  if (provider.isCoinbaseWallet) return "Base App / Coinbase";
  if (provider.isMetaMask) return "MetaMask";
  return "Browser Wallet";
}

function dedupeProviders(providers: InjectedEthereumProvider[]) {
  const seen = new Set<InjectedEthereumProvider>();
  const unique: InjectedEthereumProvider[] = [];
  for (const provider of providers) {
    if (!provider || seen.has(provider)) continue;
    seen.add(provider);
    unique.push(provider);
  }
  return unique;
}

export function getAvailableWalletProviders(): WalletProviderOption[] {
  if (typeof window === "undefined" || !window.ethereum) {
    return [];
  }

  const rootProvider = window.ethereum as InjectedEthereumProvider;
  const candidates = Array.isArray(rootProvider.providers)
    ? dedupeProviders(rootProvider.providers)
    : [rootProvider];

  return candidates.map((provider, index) => ({
    id: `${getProviderName(provider).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    name: getProviderName(provider),
    provider,
  }));
}

export function getSelectedWalletProviderId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setSelectedWalletProviderId(providerId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, providerId);
}

export function getInjectedEthereum(): InjectedEthereumProvider | undefined {
  const providers = getAvailableWalletProviders();
  if (providers.length === 0) return undefined;

  const selectedProviderId = getSelectedWalletProviderId();
  const selected = selectedProviderId
    ? providers.find((provider) => provider.id === selectedProviderId)
    : undefined;

  return (selected ?? providers[0]).provider;
}

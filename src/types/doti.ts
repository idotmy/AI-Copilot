export interface ChainConfig {
  chainId: number;
  name: string;
  shortName: string;
  isAuthority: boolean;
  ccipSelector: string;
  contractAddress: string;
  escrowAddress: string;
  routerAddress: string;
  rpcUrl: string;
  explorerUrl: string;
  explorerTxUrl: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
}

export interface DomainRecord {
  domainHash: string;
  canonicalName: string;
  owner: string;
  activeTokenId: string;
  currentChainId: number;
  currentSelector: string;
  state: 'ACTIVE' | 'BRIDGING' | 'INACTIVE';
  authorityState?: number;
  profileVersion?: number;
  isPrimary?: boolean;
}

export interface VerificationResult {
  verified: boolean;
  userAddress: string;
  domains: DomainRecord[];
  primaryDomain?: string;
  checkedChains: {
    chainId: number;
    name: string;
    domainCount: number;
    domainNames?: string[];
    status: 'success' | 'failed';
    error?: string;
  }[];
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolInvocations?: {
    toolName: string;
    params?: any;
    result?: any;
    status: 'invoked' | 'success' | 'error';
  }[];
  actionCard?: {
    id?: string;
    type:
      | 'REGISTER'
      | 'SET_PRIMARY'
      | 'UPDATE_PROFILE'
      | 'TRANSFER'
      | 'BRIDGE'
      | 'MARKETPLACE_BUY'
      | 'MARKETPLACE_LIST'
      | 'MARKETPLACE_MAKE_OFFER'
      | 'MARKETPLACE_ACCEPT_OFFER'
      | 'MARKETPLACE_CANCEL_LISTING'
      | 'MARKETPLACE_CANCEL_OFFER'
      | 'WRAP_ETH'
      | 'UNWRAP_WETH'
      | 'CLAIM_ESCROW_REFUND';

    title: string;
    description: string;
    domainName?: string;
    targetChainId?: number;
    priceEth?: string;
    params: Record<string, any>;
  };
}

export interface ProtocolStats {
  totalDomains: number;
  activeListings: number;
  supportedChainsCount: number;
  crossChainProtocol: string;
}

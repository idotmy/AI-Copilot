import { JsonRpcProvider, Contract, getAddress, formatEther } from 'ethers';

function getTimeoutSignal(ms: number) {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(ms);
    }
  } catch {
    // fallback
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// Official Arbitrum One Registry Contract & RPC
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const ARBITRUM_REGISTRY = '0xf853F8243F10a57CF5e43A49F156F132c05C21a6';
const SECONDARY_REGISTRY = '0x2F156d7239560def8Fad75e9b8319A73d062Bb97';
const OFFICIAL_DOTI_MCP_URL = 'https://doti.my/api/ai/mcp';

let arbProvider: JsonRpcProvider | null = null;

function getArbProvider(): JsonRpcProvider {
  if (!arbProvider) {
    arbProvider = new JsonRpcProvider(ARBITRUM_RPC, {
      chainId: 42161,
      name: 'Arbitrum One',
    });
  }
  return arbProvider;
}

const MINIMAL_ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function primaryDomains(address owner) view returns (bytes32)',
  'function registry(bytes32 domainHash) view returns (bytes32 domainHash, string canonicalName, address owner, uint64 activeChainSelector, uint256 activeTokenId, uint8 state)',
];

// Helper for strict timeouts so external RPC/MCP never hangs requests
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

const MULTI_CHAIN_RPCS = [
  { chainId: 42161, name: 'Arbitrum One', rpcs: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.public-rpc.com'], contract: ARBITRUM_REGISTRY },
  { chainId: 10, name: 'OP Mainnet', rpcs: ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'], contract: ARBITRUM_REGISTRY },
  { chainId: 1, name: 'Ethereum Mainnet', rpcs: ['https://ethereum.publicnode.com', 'https://eth.llamarpc.com'], contract: ARBITRUM_REGISTRY },
  { chainId: 4663, name: 'Robinhood Chain', rpcs: ['https://rpc.mainnet.chain.robinhood.com'], contract: ARBITRUM_REGISTRY },
];

/**
 * Verifies on-chain if a given EVM wallet address owns at least one .i domain
 * across Arbitrum One or any of the supported mirror chains (OP, Ethereum, Robinhood).
 */
export async function verifyOnChainOwnership(walletAddress: string): Promise<{
  isOwner: boolean;
  domainCount: number;
  primaryDomain?: string;
  source: 'RPC' | 'MCP' | 'NONE';
}> {
  if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    return { isOwner: false, domainCount: 0, source: 'NONE' };
  }

  let normalizedAddress: string;
  try {
    normalizedAddress = getAddress(walletAddress);
  } catch {
    normalizedAddress = walletAddress.toLowerCase();
  }

  // 1. Check RPCs across the 4 chains concurrently
  try {
    const scanAllChains = async () => {
      let totalCount = 0;
      let primaryDomain: string | undefined;

      await Promise.all(
        MULTI_CHAIN_RPCS.map(async (c) => {
          for (const rpc of c.rpcs) {
            try {
              const provider = new JsonRpcProvider(rpc, { chainId: c.chainId, name: c.name });
              const contract = new Contract(c.contract, MINIMAL_ERC721_ABI, provider);
              const bal: bigint = await contract.balanceOf(normalizedAddress);
              const count = Number(bal);
              if (count > 0) {
                totalCount += count;
                if (c.chainId === 42161 && !primaryDomain) {
                  try {
                    const pHash: string = await contract.primaryDomains(normalizedAddress);
                    if (pHash && pHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                      const reg = await contract.registry(pHash);
                      if (reg && reg.canonicalName) {
                        primaryDomain = reg.canonicalName;
                      }
                    }
                  } catch {}
                }
              }
              break;
            } catch {}
          }
        })
      );

      if (totalCount > 0) {
        return {
          isOwner: true,
          domainCount: totalCount,
          primaryDomain,
          source: 'RPC' as const,
        };
      }
      return null;
    };

    const rpcResult = await withTimeout(scanAllChains(), 3500, null);
    if (rpcResult) return rpcResult;
  } catch (rpcErr: any) {
    console.warn('Direct multi-chain RPC check warning:', rpcErr?.message);
  }

  // 2. Query Official Doti MCP Server reverse resolution with 3s strict timeout
  try {
    const mcpCheck = async () => {
      const mcpRes = await fetch(OFFICIAL_DOTI_MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: getTimeoutSignal(3000),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'resolve_domain_identity',
            arguments: { identifier: normalizedAddress.toLowerCase() },
          },
        }),
      });

      if (mcpRes.ok) {
        const data = await mcpRes.json();
        const text = data?.result?.content?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed?.owner && parsed.owner.toLowerCase() === normalizedAddress.toLowerCase()) {
            return {
              isOwner: true,
              domainCount: 1,
              primaryDomain: parsed.primaryDomain || parsed.canonicalName || parsed.domainName,
              source: 'MCP' as const,
            };
          }
        }
      }
      return null;
    };

    const mcpResult = await withTimeout(mcpCheck(), 3200, null);
    if (mcpResult) return mcpResult;
  } catch (mcpErr: any) {
    console.warn('Doti MCP identity resolution check warning:', mcpErr?.message);
  }

  return { isOwner: false, domainCount: 0, source: 'NONE' };
}

/**
 * Checks if a domain is available or already registered on-chain using genuine on-chain identity resolution.
 */
export async function isDomainAvailableOnChain(domainName: string): Promise<{ available: boolean; owner?: string; activeTokenId?: string }> {
  const normDom = domainName.toLowerCase().endsWith('.i') ? domainName.toLowerCase() : `${domainName.toLowerCase()}.i`;

  try {
    const check = async () => {
      const mcpRes = await fetch(OFFICIAL_DOTI_MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: getTimeoutSignal(3500),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'resolve_domain_identity',
            arguments: { identifier: normDom },
          },
        }),
      });

      if (mcpRes.ok) {
        const data = await mcpRes.json();
        const text = data?.result?.content?.[0]?.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            // If explicitly marked not registered on-chain
            if (parsed?.registered === false || (typeof parsed?.message === 'string' && parsed.message.includes('not registered'))) {
              return { available: true };
            }
            // If has active registered owner on-chain
            if (parsed?.owner && parsed.owner !== '0x0000000000000000000000000000000000000000' && parsed.owner !== '0x0') {
              return {
                available: false,
                owner: parsed.owner,
                activeTokenId: parsed.activeTokenId,
              };
            }
          } catch {}
        }
      }

      return { available: true };
    };

    return await withTimeout(check(), 3500, { available: true });
  } catch (err: any) {
    console.warn('isDomainAvailableOnChain check error:', err?.message);
    return { available: true };
  }
}

/**
 * Verifies if a specific domain is owned by the specified wallet address.
 */
export async function verifySpecificDomainOwnership(domainName: string, walletAddress: string): Promise<boolean> {
  const normDom = domainName.toLowerCase().endsWith('.i') ? domainName.toLowerCase() : `${domainName.toLowerCase()}.i`;
  const normAddr = walletAddress.toLowerCase();

  try {
    const check = async () => {
      const mcpRes = await fetch(OFFICIAL_DOTI_MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: getTimeoutSignal(3000),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'resolve_domain_identity',
            arguments: { identifier: normDom },
          },
        }),
      });

      if (mcpRes.ok) {
        const data = await mcpRes.json();
        const text = data?.result?.content?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed?.owner && parsed.owner.toLowerCase() === normAddr) {
            return true;
          }
        }
      }
      return false;
    };

    return await withTimeout(check(), 3200, false);
  } catch (err: any) {
    console.warn('verifySpecificDomainOwnership error:', err?.message);
  }

  return false;
}

const WETH_ARBITRUM_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const MINIMAL_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/**
 * Checks native ETH balance for a wallet address on Arbitrum One
 */
export async function getNativeEthBalanceOnArbitrum(walletAddress: string): Promise<{ balanceWei: bigint; balanceEth: string }> {
  if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    return { balanceWei: 0n, balanceEth: '0' };
  }

  try {
    const provider = getArbProvider();
    const bal: bigint = await provider.getBalance(walletAddress);
    const ethStr = formatEther(bal);
    return { balanceWei: bal, balanceEth: ethStr };
  } catch (err: any) {
    console.warn('Error reading ETH balance from Arbitrum One:', err?.message);
    return { balanceWei: 0n, balanceEth: '0' };
  }
}

/**
 * Checks WETH balance for a wallet address on Arbitrum One
 */
export async function getWethBalanceOnArbitrum(walletAddress: string): Promise<{ balanceWei: bigint; balanceEth: string }> {
  if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    return { balanceWei: 0n, balanceEth: '0' };
  }

  try {
    const provider = getArbProvider();
    const contract = new Contract(WETH_ARBITRUM_ADDRESS, MINIMAL_ERC20_ABI, provider);
    const bal: bigint = await contract.balanceOf(walletAddress);
    const ethStr = formatEther(bal);
    return { balanceWei: bal, balanceEth: ethStr };
  } catch (err: any) {
    console.warn('Error reading WETH balance from Arbitrum One:', err?.message);
    return { balanceWei: 0n, balanceEth: '0' };
  }
}

/**
 * Fetches real marketplace listing information for a domain
 */
export async function getDomainMarketplaceListing(domainName: string): Promise<{
  isListed: boolean;
  priceEth?: string;
  seller?: string;
  tokenId?: string;
  domainHash?: string;
  offers?: any[];
  error?: string;
}> {
  const normDom = domainName.toLowerCase().endsWith('.i') ? domainName.toLowerCase() : `${domainName.toLowerCase()}.i`;
  const cleanLabel = normDom.replace(/\.i$/i, '');

  try {
    // 1. Authoritative check via official marketplace items API
    const itemsRes = await fetch('https://doti.my/api/marketplace/items', {
      signal: getTimeoutSignal(4000),
    });
    if (itemsRes.ok) {
      const data = await itemsRes.json();
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
      const match = items.find((it: any) =>
        (it.canonicalName && it.canonicalName.toLowerCase() === normDom) ||
        (it.domainName && it.domainName.toLowerCase() === normDom) ||
        (it.listing?.domainName && it.listing.domainName.toLowerCase() === normDom) ||
        (it.canonicalName && it.canonicalName.toLowerCase().replace(/\.i$/i, '') === cleanLabel)
      );

      if (match) {
        const isListed = Boolean(match.isListed || (match.listing && match.listing.status === 'ACTIVE'));
        const priceEth = match.listing?.priceEth || match.priceEth || match.price;
        const seller = match.listing?.seller || match.seller || match.owner;
        const tokenId = match.tokenId || match.listing?.tokenId;
        const domainHash = match.domainHash || match.listing?.domainHash;
        const offers = match.offers || [];

        if (isListed) {
          return {
            isListed: true,
            priceEth: priceEth ? String(priceEth) : undefined,
            seller,
            tokenId: tokenId ? String(tokenId) : undefined,
            domainHash,
            offers,
          };
        }
      }
    }

    // 2. Try MCP tool marketplace_get_domain_details
    const mcpRes = await fetch(OFFICIAL_DOTI_MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: getTimeoutSignal(4000),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'marketplace_get_domain_details',
          arguments: { domainName: normDom },
        },
      }),
    });

    if (mcpRes.ok) {
      const data = await mcpRes.json();
      const text = data?.result?.content?.[0]?.text;
      if (text) {
        try {
          const parsed = typeof text === 'string' ? JSON.parse(text) : text;
          const isListed = Boolean(parsed.isListed || parsed.listed || parsed.priceEth || parsed.priceInEth || parsed.activeListing || (parsed.listing && parsed.listing.priceEth));
          const priceEth = parsed.priceEth || parsed.priceInEth || parsed.price || parsed.activeListing?.priceEth || parsed.listing?.priceEth;
          const seller = parsed.seller || parsed.sellerAddress || parsed.activeListing?.seller || parsed.listing?.seller;
          const offers = parsed.offers || parsed.bids || [];
          if (isListed) {
            return {
              isListed: true,
              priceEth: priceEth ? String(priceEth) : undefined,
              seller,
              tokenId: parsed.tokenId ? String(parsed.tokenId) : undefined,
              domainHash: parsed.domainHash,
              offers,
            };
          }
        } catch {}
      }
    }

    // 3. Direct Marketplace API fallback
    const directRes = await fetch(`https://doti.my/api/marketplace/domain/${encodeURIComponent(cleanLabel)}`, {
      signal: getTimeoutSignal(3500),
    });
    if (directRes.ok) {
      const parsed = await directRes.json();
      const isListed = Boolean(parsed.isListed || parsed.listed || parsed.priceEth || parsed.activeListing);
      const priceEth = parsed.priceEth || parsed.price || parsed.activeListing?.priceEth;
      const seller = parsed.seller || parsed.activeListing?.seller;
      return {
        isListed,
        priceEth: priceEth ? String(priceEth) : undefined,
        seller,
        tokenId: parsed.tokenId ? String(parsed.tokenId) : undefined,
        domainHash: parsed.domainHash,
        offers: parsed.offers || [],
      };
    }
  } catch (err: any) {
    console.warn('getDomainMarketplaceListing query warning:', err?.message);
  }

  return { isListed: false };
}

/**
 * Fetches available offers on a domain
 */
export async function getDomainOffers(domainName: string): Promise<any[]> {
  const details = await getDomainMarketplaceListing(domainName);
  return details.offers || [];
}



import { JsonRpcProvider, Contract, keccak256, toUtf8Bytes } from 'ethers';
import { SUPPORTED_CHAINS, SECONDARY_CONTRACT_ADDRESS } from '../config/chains';
import { DOT_I_ERC721_ABI } from '../config/contracts';
import { DomainRecord, VerificationResult } from '../types/doti';

const CHAIN_RPCS: Record<number, string[]> = {
  42161: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.public-rpc.com'],
  10: ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'],
  1: ['https://ethereum.publicnode.com', 'https://eth.llamarpc.com', 'https://eth.drpc.org'],
  4663: ['https://rpc.mainnet.chain.robinhood.com'],
};

export function generateAuthChallengeMessage(address: string): { message: string; nonce: string; timestamp: number } {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const message = [
    '=== DOTI PROTOCOL (.i) AUTHENTICATION CHALLENGE ===',
    'Sign this message to authenticate sovereign access to the .i Dashboard.',
    '',
    `Wallet Address: ${address}`,
    `Authority Anchor: Arbitrum One (42161)`,
    `Multi-Chain Mirrors: OP Mainnet (10), Ethereum (1), Robinhood Chain (4663)`,
    `Timestamp: ${new Date(timestamp).toISOString()}`,
    `Nonce: ${nonce}`,
    '',
    'No gas fees or token approvals are requested.',
  ].join('\n');

  return { message, nonce, timestamp };
}

async function scanChainForDomains(
  chainId: number,
  userAddress: string
): Promise<{ balance: number; domains: DomainRecord[]; domainNames: string[] }> {
  const chain = SUPPORTED_CHAINS[chainId];
  const rpcList = CHAIN_RPCS[chainId] || [chain.rpcUrl];
  const normAddress = userAddress.toLowerCase();

  for (const rpc of rpcList) {
    try {
      const provider = new JsonRpcProvider(rpc, {
        chainId: chain.chainId,
        name: chain.name,
      });

      const contract = new Contract(chain.contractAddress, DOT_I_ERC721_ABI, provider);
      const rawBalance = await contract.balanceOf(normAddress);
      const balance = Number(rawBalance);

      if (balance === 0) {
        return { balance: 0, domains: [], domainNames: [] };
      }

      const discovered: DomainRecord[] = [];
      const domainNames: string[] = [];

      // 1. Check primary domain if available on chain (Arbitrum)
      try {
        const pHash = await contract.primaryDomains(normAddress);
        if (pHash && pHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          const reg = await contract.registry(pHash);
          if (reg && reg.canonicalName) {
            const cName = reg.canonicalName.endsWith('.i') ? reg.canonicalName : `${reg.canonicalName}.i`;
            discovered.push({
              domainHash: pHash,
              canonicalName: cName,
              owner: normAddress,
              activeTokenId: reg.activeTokenId?.toString() || '1',
              currentChainId: chainId,
              currentSelector: chain.ccipSelector,
              state: 'ACTIVE',
              isPrimary: true,
            });
            domainNames.push(cName);
          }
        }
      } catch {
        // primaryDomains not supported or not set on satellite chain
      }

      // 2. Probe token IDs (1..25) to identify owned tokens & decode tokenURI metadata
      for (let tid = 1; tid <= 25 && discovered.length < balance; tid++) {
        try {
          const owner = await contract.ownerOf(tid);
          if (owner && owner.toLowerCase() === normAddress) {
            let domainName = `Token #${tid}`;
            try {
              const uri = await contract.tokenURI(tid);
              if (uri && uri.startsWith('data:application/json;base64,')) {
                const base64Data = uri.replace('data:application/json;base64,', '');
                const jsonStr =
                  typeof atob === 'function'
                    ? atob(base64Data)
                    : Buffer.from(base64Data, 'base64').toString('utf-8');
                const parsed = JSON.parse(jsonStr);
                if (parsed?.name) {
                  domainName = parsed.name.endsWith('.i') ? parsed.name : `${parsed.name}.i`;
                }
              }
            } catch {
              // tokenURI parse fallback
            }

            if (!discovered.some((d) => d.canonicalName.toLowerCase() === domainName.toLowerCase())) {
              discovered.push({
                domainHash: keccak256(toUtf8Bytes(domainName)),
                canonicalName: domainName,
                owner: normAddress,
                activeTokenId: tid.toString(),
                currentChainId: chainId,
                currentSelector: chain.ccipSelector,
                state: 'ACTIVE',
                isPrimary: false,
              });
              domainNames.push(domainName);
            }
          }
        } catch {
          // Token not found / query error, continue probing
        }
      }

      return { balance, domains: discovered, domainNames };
    } catch {
      // Try next fallback RPC
    }
  }

  return { balance: 0, domains: [], domainNames: [] };
}

export async function verifyDomainOwnershipAcrossChains(
  userAddress: string,
  onProgress?: (
    chainName: string,
    status: 'checking' | 'found' | 'none' | 'error',
    count?: number,
    domainNames?: string[]
  ) => void
): Promise<VerificationResult> {
  const normAddress = userAddress.toLowerCase();
  const chainIds = [42161, 10, 1, 4663];
  const checkedChains: VerificationResult['checkedChains'] = [];
  const foundDomains: DomainRecord[] = [];
  let primaryDomainName: string | undefined = undefined;

  // 1. Check MCP reverse resolution for instant primary domain resolution
  try {
    const mcpRes = await fetch('/api/doti/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'resolve_domain_identity',
          arguments: { identifier: normAddress },
        },
      }),
    });
    if (mcpRes.ok) {
      const data = await mcpRes.json();
      const text = data?.result?.content?.[0]?.text;
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.primaryDomain) {
            primaryDomainName = parsed.primaryDomain;
          }
          if (parsed?.canonicalName || parsed?.domainName) {
            const canonical = parsed.canonicalName || parsed.domainName;
            primaryDomainName = primaryDomainName || canonical;
            foundDomains.push({
              domainHash: parsed.domainHash || '0x',
              canonicalName: canonical,
              owner: normAddress,
              activeTokenId: parsed.activeTokenId || '1',
              currentChainId: parsed.currentChain?.chainId || 42161,
              currentSelector: parsed.currentChain?.ccipSelector || SUPPORTED_CHAINS[42161].ccipSelector,
              state: 'ACTIVE',
              isPrimary: true,
            });
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  } catch (err) {
    console.warn('MCP reverse resolution warning:', err);
  }

  // 2. Concurrently query all 4 networks directly using RPC calls
  await Promise.all(
    chainIds.map(async (chainId) => {
      const chain = SUPPORTED_CHAINS[chainId];
      onProgress?.(chain.name, 'checking');

      try {
        const { balance, domains, domainNames } = await scanChainForDomains(chainId, normAddress);

        for (const d of domains) {
          if (!foundDomains.some((existing) => existing.canonicalName.toLowerCase() === d.canonicalName.toLowerCase())) {
            foundDomains.push(d);
          }
          if (chainId === 42161 && (d.isPrimary || !primaryDomainName)) {
            primaryDomainName = d.canonicalName;
          }
        }

        checkedChains.push({
          chainId,
          name: chain.name,
          domainCount: balance,
          domainNames,
          status: 'success',
        });

        onProgress?.(
          chain.name,
          balance > 0 ? 'found' : 'none',
          balance,
          domainNames
        );
      } catch (error: any) {
        checkedChains.push({
          chainId,
          name: chain.name,
          domainCount: 0,
          domainNames: [],
          status: 'failed',
          error: error?.message || 'RPC Query timeout',
        });
        onProgress?.(chain.name, 'error');
      }
    })
  );

  // If no primary domain yet, pick the first found domain
  if (!primaryDomainName && foundDomains.length > 0) {
    primaryDomainName = foundDomains[0].canonicalName;
  }

  const totalDiscovered = checkedChains.reduce((sum, c) => sum + c.domainCount, 0) + foundDomains.length;
  const verified = totalDiscovered > 0;

  return {
    verified,
    userAddress: normAddress,
    domains: foundDomains,
    primaryDomain: primaryDomainName,
    checkedChains,
    timestamp: Date.now(),
  };
}

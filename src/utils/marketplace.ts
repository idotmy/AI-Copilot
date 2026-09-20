import { PublicClient, parseAbi, parseEther, keccak256, stringToBytes } from 'viem';
import { MARKETPLACE_CONTRACT_ARBITRUM, SUPPORTED_CHAINS } from '../config/chains';
import { MARKETPLACE_ABI, DOT_I_ERC721_ABI } from '../config/contracts';

export const MARKETPLACE_DOMAIN = {
  name: '.i Marketplace',
  version: '1',
  chainId: 42161,
  verifyingContract: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
} as const;

export const MARKETPLACE_TYPES = {
  Listing: [
    { name: 'domainName', type: 'string' },
    { name: 'domainHash', type: 'bytes32' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'seller', type: 'address' },
    { name: 'priceWei', type: 'uint256' },
    { name: 'paymentToken', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'listingTime', type: 'uint256' },
    { name: 'expirationTime', type: 'uint256' },
  ],
  Offer: [
    { name: 'domainName', type: 'string' },
    { name: 'domainHash', type: 'bytes32' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'priceWei', type: 'uint256' },
    { name: 'paymentToken', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'offerTime', type: 'uint256' },
    { name: 'expirationTime', type: 'uint256' },
  ],
  CancelListing: [
    { name: 'domainName', type: 'string' },
    { name: 'domainHash', type: 'bytes32' },
    { name: 'seller', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'cancelTime', type: 'uint256' },
  ],
  CancelOffer: [
    { name: 'domainName', type: 'string' },
    { name: 'domainHash', type: 'bytes32' },
    { name: 'buyer', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'cancelTime', type: 'uint256' },
  ],
} as const;

/**
 * Checks whether the user has approved the marketplace operator on Arbitrum Doti Registry
 */
export async function checkMarketplaceApproval(
  publicClient: PublicClient,
  userAddress: `0x${string}`
): Promise<boolean> {
  try {
    const registryAddress = SUPPORTED_CHAINS[42161].contractAddress as `0x${string}`;
    const isApproved = await publicClient.readContract({
      address: registryAddress,
      abi: parseAbi([
        'function isApprovedForAll(address owner, address operator) view returns (bool)',
      ]),
      functionName: 'isApprovedForAll',
      args: [userAddress, MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`],
    });
    return Boolean(isApproved);
  } catch (err) {
    console.warn('Marketplace operator approval check error:', err);
    return false;
  }
}

/**
 * Builds the EIP-712 Listing payload
 */
export function buildListingTypedData(params: {
  domainName: string;
  seller: `0x${string}`;
  priceEth: string;
  durationDays?: number;
  tokenId?: bigint | string;
}) {
  const clean = params.domainName.trim().toLowerCase();
  const fullDomain = clean.endsWith('.i') ? clean : `${clean}.i`;
  const domainHash = keccak256(stringToBytes(fullDomain));
  const priceWei = parseEther(params.priceEth || '0.01');
  const now = Math.floor(Date.now() / 1000);
  const expirationTime = now + (params.durationDays || 30) * 86400;
  const nonce = BigInt(now);
  const tokenId = params.tokenId ? BigInt(params.tokenId) : 1n;

  const value = {
    domainName: fullDomain,
    domainHash,
    tokenId,
    seller: params.seller,
    priceWei,
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    nonce,
    listingTime: BigInt(now),
    expirationTime: BigInt(expirationTime),
  };

  return {
    domain: MARKETPLACE_DOMAIN,
    types: {
      Listing: MARKETPLACE_TYPES.Listing,
    },
    primaryType: 'Listing' as const,
    message: value,
    rawPayload: {
      domainName: fullDomain,
      domainHash,
      tokenId: tokenId.toString(),
      seller: params.seller,
      priceEth: params.priceEth || '0.01',
      priceWei: priceWei.toString(),
      durationDays: params.durationDays || 30,
      paymentToken: '0x0000000000000000000000000000000000000000',
      nonce: Number(nonce),
      listingTime: now,
      expirationTime,
    },
  };
}

/**
 * Builds the EIP-712 CancelListing payload
 */
export function buildCancelListingTypedData(params: {
  domainName: string;
  seller: `0x${string}`;
}) {
  const clean = params.domainName.trim().toLowerCase();
  const fullDomain = clean.endsWith('.i') ? clean : `${clean}.i`;
  const domainHash = keccak256(stringToBytes(fullDomain));
  const now = Math.floor(Date.now() / 1000);
  const nonce = BigInt(now);

  const value = {
    domainName: fullDomain,
    domainHash,
    seller: params.seller,
    nonce,
    cancelTime: BigInt(now),
  };

  return {
    domain: MARKETPLACE_DOMAIN,
    types: {
      CancelListing: MARKETPLACE_TYPES.CancelListing,
    },
    primaryType: 'CancelListing' as const,
    message: value,
    rawPayload: {
      domainName: fullDomain,
      domainHash,
      seller: params.seller,
      nonce: Number(nonce),
      cancelTime: now,
    },
  };
}


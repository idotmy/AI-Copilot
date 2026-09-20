export const DOT_I_ERC721_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'primaryDomains',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'registry',
    stateMutability: 'view',
    inputs: [{ name: 'domainHash', type: 'bytes32' }],
    outputs: [
      { name: 'domainHash', type: 'bytes32' },
      { name: 'canonicalName', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'activeChainSelector', type: 'uint64' },
      { name: 'activeTokenId', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'profileVersion', type: 'uint64' },
      { name: 'ownershipVersion', type: 'uint64' },
      { name: 'bridgeNonce', type: 'uint64' },
      { name: 'bridgeValidUntil', type: 'uint64' },
    ],
  },
  {
    type: 'function',
    name: 'register',
    stateMutability: 'payable',
    inputs: [
      { name: 'label', type: 'string' },
      { name: 'targetChainSelector', type: 'uint64' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'setPrimaryDomain',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'domainHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateProfile',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'domainHash', type: 'bytes32' },
      {
        name: 'newProfile',
        type: 'tuple',
        components: [
          { name: 'imageMode', type: 'string' },
          { name: 'avatarCid', type: 'string' },
          { name: 'socialsJson', type: 'string' },
          { name: 'customLinksJson', type: 'string' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'bridgeDomain',
    stateMutability: 'payable',
    inputs: [
      { name: 'domainHash', type: 'bytes32' },
      { name: 'destinationChainSelector', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export const MARKETPLACE_ABI = [
  {
    type: 'function',
    name: 'buy',
    stateMutability: 'payable',
    inputs: [{ name: 'domainHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'createListing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'domainHash', type: 'bytes32' },
      { name: 'priceWei', type: 'uint256' },
      { name: 'durationSeconds', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelListing',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'domainHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'makeOffer',
    stateMutability: 'payable',
    inputs: [
      { name: 'domainHash', type: 'bytes32' },
      { name: 'durationSeconds', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'acceptOffer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'domainHash', type: 'bytes32' },
      { name: 'buyer', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelOffer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'domainHash', type: 'bytes32' }],
    outputs: [],
  },
] as const;

export const ESCROW_ABI = [
  {
    type: 'function',
    name: 'claimRefund',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [],
  },
] as const;

export const CCIP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'ccipSend',
    stateMutability: 'payable',
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      {
        name: 'message',
        type: 'tuple',
        components: [
          { name: 'receiver', type: 'bytes' },
          { name: 'data', type: 'bytes' },
          {
            name: 'tokenAmounts',
            type: 'tuple[]',
            components: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
          },
          { name: 'feeToken', type: 'address' },
          { name: 'extraArgs', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const;

export const WETH_ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
  },
] as const;


import { Type } from '@google/genai';

/**
 * Full declarations for all 19 Doti Protocol MCP tools
 */
export const ALL_19_DOTI_TOOLS = [
  {
    functionDeclarations: [
      // 1. check_domain_availability
      {
        name: 'check_domain_availability',
        description: 'Check if a .i sovereign domain name is available for registration across all 4 chains (Arbitrum One, Optimism, Ethereum, Robinhood).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name or label (e.g. "alex" or "alex.i")',
            },
          },
          required: ['domainName'],
        },
      },
      // 2. resolve_domain_identity
      {
        name: 'resolve_domain_identity',
        description: 'Resolve a .i web3 domain name or 0x Ethereum wallet address to its sovereign identity, owner, metadata, social links, and current chain location.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            identifier: {
              type: Type.STRING,
              description: 'The .i domain name (e.g. "genesis.i") or EVM wallet address (0x...)',
            },
            chainId: {
              type: Type.NUMBER,
              description: 'Optional filter for target network (42161: Arbitrum One, 10: Optimism, 1: Ethereum, 4663: Robinhood)',
            },
          },
          required: ['identifier'],
        },
      },
      // 3. get_supported_chains
      {
        name: 'get_supported_chains',
        description: 'Retrieve technical network specifications, Chainlink CCIP selectors, router contracts, and registry addresses for all 4 supported chains.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      // 4. estimate_registration
      {
        name: 'estimate_registration',
        description: 'Calculate registration fee, escrow payment requirements, and cross-chain CCIP bridging costs on any of the 4 supported networks.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to estimate',
            },
            targetChainId: {
              type: Type.NUMBER,
              description: 'Target payment network: 42161 (Arbitrum), 10 (Optimism), 1 (Ethereum), or 4663 (Robinhood). Defaults to 42161.',
            },
          },
          required: ['domainName'],
        },
      },
      // 5. get_protocol_stats
      {
        name: 'get_protocol_stats',
        description: 'Fetch live protocol metrics including total registered domains, active secondary marketplace listings, and cross-chain CCIP bridge health.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      // 6. register_domain
      {
        name: 'register_domain',
        description: 'Register a permanent .i sovereign domain or generate on-chain transaction payload for contract execution across the 4 networks.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to register (e.g. "mybot.i")',
            },
            recipientAddress: {
              type: Type.STRING,
              description: 'The 0x EVM wallet address that will own the domain',
            },
            targetChainId: {
              type: Type.NUMBER,
              description: 'Network where deposit is made: 42161 (Arbitrum), 10 (Optimism), 1 (Ethereum), 4663 (Robinhood). Defaults to 42161.',
            },
          },
          required: ['domainName', 'recipientAddress'],
        },
      },
      // 7. set_primary_domain
      {
        name: 'set_primary_domain',
        description: 'Set or update the primary reverse resolution domain identity for a given wallet address.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name (e.g. "agent.i")',
            },
            ownerAddress: {
              type: Type.STRING,
              description: 'The 0x EVM owner address',
            },
          },
          required: ['domainName', 'ownerAddress'],
        },
      },
      // 8. update_domain_profile
      {
        name: 'update_domain_profile',
        description: 'Update decentralized identity profile metadata, social links (Twitter, Discord, Telegram, GitHub, LinkedIn, Farcaster), website URL, custom links, and avatar image (IPFS CID or direct image URL).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name',
            },
            ownerAddress: {
              type: Type.STRING,
              description: 'Owner wallet address',
            },
            websiteUrl: {
              type: Type.STRING,
              description: 'Decentralized or Web2 website URL',
            },
            profileImageCid: {
              type: Type.STRING,
              description: 'IPFS CID hash or direct image URL (e.g. Qm..., bafy..., or https://.../image.png) for avatar image',
            },
            socialLinks: {
              type: Type.OBJECT,
              description: 'Social links object containing twitter, discord, telegram, github, linkedin, farcaster',
              properties: {
                twitter: { type: Type.STRING, description: 'X / Twitter profile URL' },
                discord: { type: Type.STRING, description: 'Discord URL' },
                telegram: { type: Type.STRING, description: 'Telegram URL' },
                github: { type: Type.STRING, description: 'GitHub profile URL' },
                linkedin: { type: Type.STRING, description: 'LinkedIn profile URL' },
                farcaster: { type: Type.STRING, description: 'Farcaster profile URL' },
              },
            },
            customLinks: {
              type: Type.ARRAY,
              description: 'Array of custom link objects with label and url',
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'Link title/label' },
                  url: { type: Type.STRING, description: 'Link destination URL' },
                },
              },
            },
            imageMode: {
              type: Type.STRING,
              description: 'Avatar style: DEFAULT, GENERATED_MATRIX, or CUSTOM_IPFS',
            },
          },
          required: ['domainName', 'ownerAddress'],
        },
      },
      // 9. transfer_domain
      {
        name: 'transfer_domain',
        description: 'Transfer sovereign ownership of a .i domain directly to another 0x EVM wallet address.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to transfer',
            },
            currentOwner: {
              type: Type.STRING,
              description: 'The 0x address of the current domain owner',
            },
            newOwner: {
              type: Type.STRING,
              description: 'The 0x recipient address to receive domain ownership',
            },
          },
          required: ['domainName', 'currentOwner', 'newOwner'],
        },
      },
      // 10. bridge_domain
      {
        name: 'bridge_domain',
        description: 'Initiate cross-chain teleportation/bridging of a .i domain to another supported EVM chain via Chainlink CCIP.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to bridge',
            },
            ownerAddress: {
              type: Type.STRING,
              description: 'The 0x owner address initiating the bridge',
            },
            destinationChainId: {
              type: Type.NUMBER,
              description: 'Target EVM chain ID: 42161 (Arbitrum One), 10 (OP Mainnet), 1 (Ethereum), 4663 (Robinhood)',
            },
          },
          required: ['domainName', 'ownerAddress', 'destinationChainId'],
        },
      },
      // 11. marketplace_browse_listings
      {
        name: 'marketplace_browse_listings',
        description: 'Browse active .i domains listed on the decentralized secondary marketplace across Arbitrum One and satellite networks.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            limit: {
              type: Type.NUMBER,
              description: 'Max number of listings to return (default 20)',
            },
          },
        },
      },
      // 12. marketplace_get_domain_details
      {
        name: 'marketplace_get_domain_details',
        description: 'Inspect full marketplace status for any .i domain: active listing, price history, highest offer, and bids.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name (e.g. "ai.i")',
            },
          },
          required: ['domainName'],
        },
      },
      // 13. marketplace_list_domain
      {
        name: 'marketplace_list_domain',
        description: 'List an owned .i domain for sale on the decentralized secondary marketplace at a fixed price in ETH.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to list for sale',
            },
            sellerAddress: {
              type: Type.STRING,
              description: 'The 0x seller address (must be current domain owner)',
            },
            priceInEth: {
              type: Type.STRING,
              description: 'Listing price in ETH (e.g. "0.05")',
            },
            durationDays: {
              type: Type.NUMBER,
              description: 'Duration of listing in days (defaults to 30)',
            },
          },
          required: ['domainName', 'sellerAddress', 'priceInEth'],
        },
      },
      // 14. marketplace_buy_domain
      {
        name: 'marketplace_buy_domain',
        description: 'Instantly purchase an actively listed .i domain from the secondary marketplace using ETH.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to purchase',
            },
            buyerAddress: {
              type: Type.STRING,
              description: 'The 0x buyer address purchasing the domain',
            },
            priceInEth: {
              type: Type.STRING,
              description: 'Optional expected purchase price in ETH for verification',
            },
          },
          required: ['domainName', 'buyerAddress'],
        },
      },
      // 15. marketplace_make_offer
      {
        name: 'marketplace_make_offer',
        description: 'Submit an offer in WETH (ERC20: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1) to purchase any registered .i domain. Requires WETH balance and approval. Funds remain in the buyer wallet until accepted.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to make an offer on',
            },
            buyerAddress: {
              type: Type.STRING,
              description: 'The 0x buyer address making the offer',
            },
            offerPriceInEth: {
              type: Type.STRING,
              description: 'Offer amount in WETH (e.g. "0.02")',
            },
            durationDays: {
              type: Type.NUMBER,
              description: 'Validity duration of the offer in days: 1, 3, 7, or 30 (defaults to 7)',
            },
          },
          required: ['domainName', 'buyerAddress', 'offerPriceInEth'],
        },
      },
      // 16. marketplace_get_offers
      {
        name: 'marketplace_get_offers',
        description: 'Inspect active WETH bids and offers placed on a specific .i domain name or by a buyer.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to query offers for',
            },
          },
          required: ['domainName'],
        },
      },
      // 17. marketplace_accept_offer
      {
        name: 'marketplace_accept_offer',
        description: 'Accept an incoming buyer offer on your owned .i domain, transferring ownership to the buyer in exchange for the offered WETH.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name being sold',
            },
            sellerAddress: {
              type: Type.STRING,
              description: 'The 0x seller address (current owner)',
            },
            buyerAddress: {
              type: Type.STRING,
              description: 'The 0x buyer address whose offer is being accepted',
            },
          },
          required: ['domainName', 'sellerAddress', 'buyerAddress'],
        },
      },
      // 18. marketplace_cancel_listing
      {
        name: 'marketplace_cancel_listing',
        description: 'Cancel an active marketplace listing for an owned .i domain.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name to delist',
            },
            sellerAddress: {
              type: Type.STRING,
              description: 'The 0x seller address who created the listing',
            },
          },
          required: ['domainName', 'sellerAddress'],
        },
      },
      // 19. marketplace_cancel_offer
      {
        name: 'marketplace_cancel_offer',
        description: 'Cancel an active marketplace offer and release non-custodial or escrowed funds.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            domainName: {
              type: Type.STRING,
              description: 'The .i domain name',
            },
            buyerAddress: {
              type: Type.STRING,
              description: 'The 0x buyer address who submitted the offer',
            },
          },
          required: ['domainName', 'buyerAddress'],
        },
      },
      // 20. wrap_eth
      {
        name: 'wrap_eth',
        description: 'Deposit native ETH into the canonical WETH contract (0x82aF49447D8a07e3bd95BD0d56f35241523fBab1) on Arbitrum One to get WETH for marketplace offers.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            amountEth: {
              type: Type.STRING,
              description: 'The amount of ETH to convert to WETH (e.g. "0.05")',
            },
            userAddress: {
              type: Type.STRING,
              description: 'The 0x address of the user',
            },
          },
          required: ['amountEth'],
        },
      },
      // 21. unwrap_weth
      {
        name: 'unwrap_weth',
        description: 'Withdraw WETH back into native ETH on Arbitrum One via the canonical WETH contract (0x82aF49447D8a07e3bd95BD0d56f35241523fBab1).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            amountWeth: {
              type: Type.STRING,
              description: 'The amount of WETH to withdraw to ETH (e.g. "0.05")',
            },
            userAddress: {
              type: Type.STRING,
              description: 'The 0x address of the user',
            },
          },
          required: ['amountWeth'],
        },
      },
      // 22. claim_escrow_refund
      {
        name: 'claim_escrow_refund',
        description: 'Claim a refund for an escrow deposit (e.g. from registration race collisions or expired bridging operations) from the Doti Escrow contract.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            escrowId: {
              type: Type.STRING,
              description: 'The escrow deposit ID or domain hash to refund',
            },
            claimantAddress: {
              type: Type.STRING,
              description: 'The 0x address eligible for the escrow refund',
            },
          },
          required: ['escrowId', 'claimantAddress'],
        },
      },
    ],
  },
];


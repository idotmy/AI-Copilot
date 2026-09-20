/**
 * Maps tool invocations and user intent into executable on-chain Action Cards.
 */
export function buildActionCard(toolName: string, args: any, toolResultText?: string): any {
  if (!args) return null;

  let parsedRes: any = null;
  try {
    if (toolResultText) parsedRes = JSON.parse(toolResultText);
  } catch {
    // Non-JSON output
  }

  const rawDomain = args.domainName || args.domain || args.name || args.identifier || '';
  const cleanLabel = (rawDomain || '').trim().toLowerCase().replace(/\.i$/i, '');
  const domainName = cleanLabel ? `${cleanLabel}.i` : '';

  // For domain-specific operations, validate alphanumeric and hyphen characters
  const DOMAIN_SPECIFIC_TOOLS = [
    'register_domain',
    'check_domain_availability',
    'estimate_registration',
    'set_primary_domain',
    'update_domain_profile',
    'transfer_domain',
    'bridge_domain',
    'marketplace_list_domain',
    'marketplace_buy_domain',
    'marketplace_make_offer',
    'marketplace_accept_offer',
    'marketplace_cancel_listing',
    'marketplace_cancel_offer',
    'marketplace_get_domain_details',
    'marketplace_get_offers',
  ];

  if (DOMAIN_SPECIFIC_TOOLS.includes(toolName)) {
    if (!cleanLabel || !/^[a-z0-9-]+$/.test(cleanLabel)) {
      return null;
    }
  }

  switch (toolName) {
    case 'register_domain':
    case 'check_domain_availability':
    case 'estimate_registration': {
      if (!domainName) return null;
      return {
        type: 'REGISTER',
        title: `Register ${domainName}`,
        description: `Permanent sovereign .i identity on Arbitrum One. Fixed fee: 0.001 ETH, no renewal fees.`,
        domainName,
        priceEth: '0.001',
        targetChainId: args.targetChainId || 42161,
        params: {
          domainName,
          targetChainId: args.targetChainId || 42161,
          recipientAddress: args.recipientAddress || args.recipient || args.ownerAddress || '',
        },
      };
    }

    case 'set_primary_domain': {
      if (!domainName) return null;
      return {
        type: 'SET_PRIMARY',
        title: `Set Primary Identity: ${domainName}`,
        description: `Bind ${domainName} as your primary reverse resolution address on Arbitrum One.`,
        domainName,
        params: {
          domainName,
          ownerAddress: args.ownerAddress,
        },
      };
    }

    case 'update_domain_profile': {
      if (!domainName) return null;
      const socials = args.socialLinks || {};
      if (args.twitter && !socials.twitter) socials.twitter = args.twitter;
      if (args.discord && !socials.discord) socials.discord = args.discord;
      if (args.linkedin && !socials.linkedin) socials.linkedin = args.linkedin;
      if (args.github && !socials.github) socials.github = args.github;
      if (args.farcaster && !socials.farcaster) socials.farcaster = args.farcaster;
      if (args.telegram && !socials.telegram) socials.telegram = args.telegram;

      let formattedCustomLinks: Array<{ title: string; url: string }> = [];
      try {
        const rawLinks = typeof args.customLinks === 'string' ? JSON.parse(args.customLinks) : (args.customLinks || []);
        if (Array.isArray(rawLinks)) {
          formattedCustomLinks = rawLinks.map((l: any) => ({
            title: String(l.title || l.label || l.name || '').trim(),
            url: String(l.url || l.link || '').trim(),
          })).filter((l: any) => l.url.length > 0);
        }
      } catch {
        formattedCustomLinks = [];
      }

      return {
        type: 'UPDATE_PROFILE',
        title: `Update Profile for ${domainName}`,
        description: `Commit profile metadata, website, avatar CID/URL, and social pointers on Arbitrum One.`,
        domainName,
        params: {
          domainName,
          ownerAddress: args.ownerAddress,
          websiteUrl: args.websiteUrl || args.website || '',
          profileImageCid: args.profileImageCid || args.avatarCid || args.avatar || '',
          socialLinks: socials,
          customLinks: formattedCustomLinks,
          imageMode: args.imageMode || 'DEFAULT',
        },
      };
    }

    case 'transfer_domain': {
      if (!domainName || !args.newOwner) return null;
      return {
        type: 'TRANSFER',
        title: `Transfer ${domainName}`,
        description: `Transfer permanent ownership of ${domainName} to ${args.newOwner}.`,
        domainName,
        params: {
          domainName,
          currentOwner: args.currentOwner,
          newOwner: args.newOwner,
          domainHash: parsedRes?.domainHash,
          activeTokenId: parsedRes?.activeTokenId || (typeof parsedRes?.tokenId === 'string' ? parsedRes.tokenId : undefined),
        },
      };
    }

    case 'bridge_domain': {
      if (!domainName || !args.destinationChainId) return null;
      const destId = Number(args.destinationChainId);
      const chainNames: Record<number, string> = {
        10: 'OP Mainnet',
        1: 'Ethereum Mainnet',
        4663: 'Robinhood Chain',
        42161: 'Arbitrum One',
      };
      return {
        type: 'BRIDGE',
        title: `Teleport ${domainName} to ${chainNames[destId] || `Chain ${destId}`}`,
        description: `Bridge sovereign identity via Chainlink CCIP v1.5 with cross-chain single-active verification.`,
        domainName,
        targetChainId: destId,
        params: {
          domainName,
          ownerAddress: args.ownerAddress,
          destinationChainId: destId,
          domainHash: parsedRes?.domainHash,
        },
      };
    }

    case 'marketplace_list_domain': {
      const price = args.priceInEth || args.priceEth || args.price || '0.05';
      if (!domainName) return null;
      const isUpdate = Boolean(args.isPriceUpdate || args.currentPriceEth);
      const curPrice = args.currentPriceEth ? ` (Current: ${args.currentPriceEth} ETH)` : '';
      return {
        type: 'MARKETPLACE_LIST',
        title: isUpdate ? `Update Price for ${domainName}${curPrice}` : `List ${domainName} on Secondary Market`,
        description: isUpdate
          ? `Update listing price of ${domainName} to ${price} ETH on Arbitrum One.`
          : `Offer ${domainName} for public purchase at ${price} ETH on Arbitrum One.`,
        domainName,
        priceEth: price,
        params: {
          domainName,
          seller: args.sellerAddress || args.seller || '',
          sellerAddress: args.sellerAddress || args.seller || '',
          priceEth: price,
          priceInEth: price,
          durationDays: args.durationDays || 30,
          domainHash: parsedRes?.domainHash || args.domainHash,
          isPriceUpdate: isUpdate,
          currentPriceEth: args.currentPriceEth,
        },
      };
    }

    case 'marketplace_buy_domain': {
      if (!domainName) return null;
      return {
        type: 'MARKETPLACE_BUY',
        title: `Purchase ${domainName}`,
        description: `Instantly execute atomic escrow swap for ${domainName} on Arbitrum One.`,
        domainName,
        priceEth: args.priceInEth || parsedRes?.priceEth || '0.01',
        params: {
          domainName,
          buyerAddress: args.buyerAddress,
          priceInEth: args.priceInEth,
          domainHash: parsedRes?.domainHash,
        },
      };
    }

    case 'marketplace_make_offer': {
      if (!domainName || !args.offerPriceInEth) return null;
      const dur = [1, 3, 7, 30].includes(Number(args.durationDays)) ? Number(args.durationDays) : 7;
      return {
        type: 'MARKETPLACE_MAKE_OFFER',
        title: `Make Offer on ${domainName} (${dur} Days)`,
        description: `Submit a bid of ${args.offerPriceInEth} WETH for ${domainName}. Requires WETH approval; funds remain in your wallet until accepted.`,
        domainName,
        priceEth: args.offerPriceInEth,
        params: {
          domainName,
          buyerAddress: args.buyerAddress,
          offerPriceInEth: args.offerPriceInEth,
          durationDays: dur,
          domainHash: parsedRes?.domainHash,
        },
      };
    }

    case 'wrap_eth': {
      const amount = args.amountEth || args.amount || '0.01';
      return {
        type: 'WRAP_ETH',
        title: `Wrap ${amount} ETH to WETH`,
        description: `Convert native ETH to Wrapped Ether (WETH) on Arbitrum One for secondary market bids.`,
        priceEth: amount,
        params: {
          amountEth: amount,
          userAddress: args.userAddress,
        },
      };
    }

    case 'unwrap_weth': {
      const amount = args.amountWeth || args.amount || '0.01';
      return {
        type: 'UNWRAP_WETH',
        title: `Unwrap ${amount} WETH to ETH`,
        description: `Convert Wrapped Ether (WETH) back to native ETH on Arbitrum One.`,
        priceEth: amount,
        params: {
          amountWeth: amount,
          userAddress: args.userAddress,
        },
      };
    }

    case 'marketplace_accept_offer': {
      if (!domainName || !args.buyerAddress) return null;
      return {
        type: 'MARKETPLACE_ACCEPT_OFFER',
        title: `Accept Offer for ${domainName}`,
        description: `Accept offer from ${args.buyerAddress} and receive the WETH payment.`,
        domainName,
        params: {
          domainName,
          sellerAddress: args.sellerAddress,
          buyerAddress: args.buyerAddress,
          domainHash: parsedRes?.domainHash,
        },
      };
    }

    case 'marketplace_cancel_listing': {
      if (!domainName) return null;
      return {
        type: 'MARKETPLACE_CANCEL_LISTING',
        title: `Cancel Listing for ${domainName}`,
        description: `Delist ${domainName} from the secondary marketplace on Arbitrum One.`,
        domainName,
        params: {
          domainName,
          sellerAddress: args.sellerAddress,
          domainHash: parsedRes?.domainHash,
        },
      };
    }

    case 'marketplace_cancel_offer': {
      if (!domainName) return null;
      return {
        type: 'MARKETPLACE_CANCEL_OFFER',
        title: `Cancel Offer on ${domainName}`,
        description: `Withdraw escrowed ETH offer for ${domainName}.`,
        domainName,
        params: {
          domainName,
          buyerAddress: args.buyerAddress,
          domainHash: parsedRes?.domainHash,
        },
      };
    }

    case 'claim_escrow_refund': {
      const eId = args.escrowId || (cleanLabel ? `${cleanLabel}.i` : 'Escrow Deposit');
      return {
        type: 'CLAIM_ESCROW_REFUND',
        title: `Claim Escrow Refund`,
        description: `Reclaim refund for escrow deposit ${eId} from the Doti Escrow contract on Arbitrum One.`,
        params: {
          escrowId: eId,
          claimantAddress: args.claimantAddress,
        },
      };
    }

    default:
      return null;
  }
}

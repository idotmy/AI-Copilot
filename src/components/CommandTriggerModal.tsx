import React, { useState, useEffect } from 'react';
import {
  Globe,
  ArrowRightLeft,
  UserCheck,
  Send,
  ShoppingBag,
  HandCoins,
  ShieldCheck,
  RotateCcw,
  Edit3,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
} from 'lucide-react';
import { useBalance, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { SUPPORTED_CHAINS } from '../config/chains';

export type OnChainCommandType =
  | 'REGISTER'
  | 'BRIDGE'
  | 'SET_PRIMARY'
  | 'UPDATE_PROFILE'
  | 'TRANSFER'
  | 'MARKETPLACE_LIST'
  | 'MARKETPLACE_UPDATE_LISTING'
  | 'MARKETPLACE_CANCEL_LISTING'
  | 'MARKETPLACE_BUY'
  | 'MARKETPLACE_OFFER'
  | 'MARKETPLACE_ACCEPT_OFFER'
  | 'CHECK_OFFERS'
  | 'WRAP_ETH'
  | 'UNWRAP_WETH'
  | 'CLAIM_REFUND';

interface CommandTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  commandType: OnChainCommandType;
  onSubmitCommand: (naturalLanguagePrompt: string) => void;
  userAddress: string;
  defaultDomain?: string;
}

const WETH_ARBITRUM_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as `0x${string}`;

interface OfferItem {
  buyer: string;
  buyerAddress?: string;
  priceEth?: string;
  priceInEth?: string;
  priceWei?: string;
  expirationTime?: string | number;
}

export const CommandTriggerModal: React.FC<CommandTriggerModalProps> = ({
  isOpen,
  onClose,
  commandType,
  onSubmitCommand,
  userAddress,
  defaultDomain = '',
}) => {
  const { address: connectedAddress } = useAccount();
  const activeAddress = (userAddress || connectedAddress || '') as `0x${string}`;
  const isValidAddress = Boolean(activeAddress && activeAddress.startsWith('0x') && activeAddress.length === 42);

  const [domainName, setDomainName] = useState(defaultDomain);
  const [targetChainId, setTargetChainId] = useState<number>(10);
  const [recipient, setRecipient] = useState('');
  const [priceEth, setPriceEth] = useState(commandType === 'WRAP_ETH' || commandType === 'UNWRAP_WETH' ? '0' : '0.05');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [escrowId, setEscrowId] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [avatarValue, setAvatarValue] = useState('');
  const [avatarMode, setAvatarMode] = useState<'CID' | 'URL' | 'FILE'>('URL');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialDiscord, setSocialDiscord] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialGithub, setSocialGithub] = useState('');
  const [socialFarcaster, setSocialFarcaster] = useState('');
  const [socialTelegram, setSocialTelegram] = useState('');
  const [customLinks, setCustomLinks] = useState<Array<{ title: string; url: string }>>([]);

  // Offers state for ACCEPT_OFFER
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState<number | null>(null);

  // Active listing state for MARKETPLACE_UPDATE_LISTING, MARKETPLACE_BUY, MARKETPLACE_LIST
  const [currentListing, setCurrentListing] = useState<{ isListed: boolean; priceEth?: string; seller?: string } | null>(null);
  const [isLoadingListing, setIsLoadingListing] = useState(false);

  // Wagmi balances for Arbitrum One
  const { data: ethBalanceData } = useBalance({
    address: isValidAddress ? activeAddress : undefined,
    chainId: 42161,
  });

  const { data: wethBalanceData } = useBalance({
    address: isValidAddress ? activeAddress : undefined,
    token: WETH_ARBITRUM_ADDRESS,
    chainId: 42161,
  });

  const cleanDomain = domainName.trim().toLowerCase().replace(/\.i$/i, '');
  const isDomainRequired = !['CLAIM_REFUND', 'WRAP_ETH', 'UNWRAP_WETH'].includes(commandType);
  const isDomainInvalid = isDomainRequired && cleanDomain.length > 0 && !/^[a-z0-9-]+$/.test(cleanDomain);

  // Real-time balance calculations
  const availableEth = ethBalanceData ? Number(formatEther(ethBalanceData.value)) : 0;
  const availableWeth = wethBalanceData ? Number(formatEther(wethBalanceData.value)) : 0;

  // Auto-tune default amount on modal opening for Wrap/Unwrap
  useEffect(() => {
    if (isOpen) {
      if (commandType === 'WRAP_ETH') {
        if (availableEth > 0) {
          const suggested = Math.min(0.01, Math.max(0.001, availableEth * 0.5));
          setPriceEth(Number(suggested.toFixed(4)).toString());
        } else {
          setPriceEth('0');
        }
      } else if (commandType === 'UNWRAP_WETH') {
        if (availableWeth > 0) {
          const suggested = Math.min(0.01, availableWeth);
          setPriceEth(Number(suggested.toFixed(4)).toString());
        } else {
          setPriceEth('0');
        }
      }
    }
  }, [isOpen, commandType, availableEth, availableWeth]);

  // Fetch active offers when in MARKETPLACE_ACCEPT_OFFER mode
  useEffect(() => {
    if (isOpen && commandType === 'MARKETPLACE_ACCEPT_OFFER' && cleanDomain && !isDomainInvalid) {
      let isMounted = true;
      setIsLoadingOffers(true);
      fetch(`/api/marketplace/domain/${cleanDomain}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          const foundOffers: OfferItem[] = data.offers || [];
          setOffers(foundOffers);
          if (foundOffers.length > 0) {
            setSelectedOfferIndex(0);
            const firstBuyer = foundOffers[0].buyer || foundOffers[0].buyerAddress || '';
            setRecipient(firstBuyer);
          } else {
            setSelectedOfferIndex(null);
            setRecipient('');
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setOffers([]);
          setSelectedOfferIndex(null);
        })
        .finally(() => {
          if (isMounted) setIsLoadingOffers(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, commandType, cleanDomain, isDomainInvalid]);

  // Fetch current listing info for MARKETPLACE_UPDATE_LISTING, MARKETPLACE_LIST, MARKETPLACE_BUY
  useEffect(() => {
    if (isOpen && cleanDomain && !isDomainInvalid && (commandType === 'MARKETPLACE_UPDATE_LISTING' || commandType === 'MARKETPLACE_LIST' || commandType === 'MARKETPLACE_BUY')) {
      let isMounted = true;
      setIsLoadingListing(true);
      fetch('/api/marketplace/items')
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
          const norm = `${cleanDomain}.i`.toLowerCase();
          const match = items.find((it: any) =>
            (it.canonicalName && it.canonicalName.toLowerCase() === norm) ||
            (it.domainName && it.domainName.toLowerCase() === norm) ||
            (it.listing?.domainName && it.listing.domainName.toLowerCase() === norm)
          );
          if (match && (match.isListed || (match.listing && match.listing.status === 'ACTIVE'))) {
            const p = match.listing?.priceEth || match.priceEth || match.price;
            setCurrentListing({
              isListed: true,
              priceEth: p ? String(p) : undefined,
              seller: match.listing?.seller || match.seller,
            });
            if (commandType === 'MARKETPLACE_BUY' && p) {
              setPriceEth(String(p));
            }
          } else {
            setCurrentListing(null);
          }
        })
        .catch(() => {
          if (isMounted) setCurrentListing(null);
        })
        .finally(() => {
          if (isMounted) setIsLoadingListing(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (!isOpen) {
      setCurrentListing(null);
    }
  }, [isOpen, commandType, cleanDomain, isDomainInvalid]);

  if (!isOpen) return null;

  const enteredAmount = parseFloat(priceEth) || 0;
  const isWrapOverBalance = commandType === 'WRAP_ETH' && (enteredAmount > availableEth || (availableEth === 0 && enteredAmount > 0));
  const isUnwrapOverBalance = commandType === 'UNWRAP_WETH' && (enteredAmount > availableWeth || (availableWeth === 0 && enteredAmount > 0));
  const isBalanceExceeded = isWrapOverBalance || isUnwrapOverBalance;
  const isAmountInvalid = (commandType === 'WRAP_ETH' || commandType === 'UNWRAP_WETH' || commandType === 'MARKETPLACE_LIST' || commandType === 'MARKETPLACE_UPDATE_LISTING' || commandType === 'MARKETPLACE_OFFER') && (isNaN(enteredAmount) || enteredAmount <= 0);

  const isAcceptOfferDisabled = commandType === 'MARKETPLACE_ACCEPT_OFFER' && (!recipient.trim() || offers.length === 0);

  const handleMaxClick = () => {
    if (commandType === 'WRAP_ETH') {
      if (availableEth > 0) {
        // Reserve Arbitrum One transaction gas fee (~0.00003 - 0.00005 ETH)
        const gasBuffer = availableEth > 0.0005 ? 0.00005 : Math.min(0.00003, availableEth * 0.15);
        const safeMax = Math.max(0, availableEth - gasBuffer);
        const formatted = Number(safeMax.toFixed(5)).toString();
        setPriceEth(formatted !== '0' ? formatted : '0');
      } else {
        setPriceEth('0');
      }
    } else if (commandType === 'UNWRAP_WETH') {
      if (availableWeth > 0) {
        // Unwrap uses ETH for gas, 100% of WETH can be unwrapped
        const formatted = Number(availableWeth.toFixed(6)).toString();
        setPriceEth(formatted !== '0' ? formatted : '0');
      } else {
        setPriceEth('0');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarValue(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomLink = () => {
    if (customLinks.length < 10) {
      setCustomLinks([...customLinks, { title: '', url: '' }]);
    }
  };

  const handleRemoveCustomLink = (idx: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== idx));
  };

  const handleCustomLinkChange = (idx: number, field: 'title' | 'url', val: string) => {
    const next = [...customLinks];
    next[idx][field] = val;
    setCustomLinks(next);
  };

  const handleSelectOffer = (offer: OfferItem, index: number) => {
    setSelectedOfferIndex(index);
    const buyer = offer.buyer || offer.buyerAddress || '';
    setRecipient(buyer);
    const price = offer.priceEth || offer.priceInEth || offer.priceWei || '';
    if (price) setPriceEth(price);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDomainInvalid || isBalanceExceeded || isAcceptOfferDisabled) return;
    let prompt = '';

    const fullDomain = cleanDomain ? `${cleanDomain}.i` : '';

    switch (commandType) {
      case 'REGISTER':
        prompt = `Register domain ${fullDomain} on Arbitrum One for recipient ${userAddress}`;
        break;
      case 'BRIDGE': {
        const chainName = SUPPORTED_CHAINS[targetChainId]?.name || 'Optimism';
        prompt = `Bridge domain ${fullDomain} to ${chainName} (Chain ID: ${targetChainId}) via Chainlink CCIP`;
        break;
      }
      case 'SET_PRIMARY':
        prompt = `Set ${fullDomain} as my primary domain identity on Arbitrum One`;
        break;
      case 'UPDATE_PROFILE': {
        const details: string[] = [];
        if (websiteUrl.trim()) details.push(`website: ${websiteUrl.trim()}`);
        if (avatarValue.trim()) details.push(`avatar: ${avatarValue.trim()}`);
        if (socialTwitter.trim()) details.push(`twitter: ${socialTwitter.trim()}`);
        if (socialDiscord.trim()) details.push(`discord: ${socialDiscord.trim()}`);
        if (socialLinkedin.trim()) details.push(`linkedin: ${socialLinkedin.trim()}`);
        if (socialGithub.trim()) details.push(`github: ${socialGithub.trim()}`);
        if (socialFarcaster.trim()) details.push(`farcaster: ${socialFarcaster.trim()}`);
        if (socialTelegram.trim()) details.push(`telegram: ${socialTelegram.trim()}`);
        const validCustom = customLinks.filter((l) => l.url.trim());
        if (validCustom.length > 0) {
          details.push(`custom links: ${JSON.stringify(validCustom)}`);
        }
        const detailsStr = details.length > 0 ? ` with ${details.join(', ')}` : '';
        prompt = `Update profile metadata for domain ${fullDomain}${detailsStr} on Arbitrum One`;
        break;
      }
      case 'TRANSFER':
        prompt = `Transfer domain ${fullDomain} to new owner ${recipient.trim()}`;
        break;
      case 'MARKETPLACE_LIST':
        prompt = `List domain ${fullDomain} for sale on marketplace for ${priceEth.trim()} ETH with duration ${durationDays} days`;
        break;
      case 'MARKETPLACE_UPDATE_LISTING':
        prompt = `Update listing price of domain ${fullDomain} to ${priceEth.trim()} ETH with duration ${durationDays} days on marketplace`;
        break;
      case 'MARKETPLACE_CANCEL_LISTING':
        prompt = `Cancel listing for domain ${fullDomain} on marketplace`;
        break;
      case 'MARKETPLACE_BUY':
        prompt = `Buy domain ${fullDomain} on marketplace with price ${priceEth.trim()} ETH`;
        break;
      case 'MARKETPLACE_OFFER':
        prompt = `Make an offer on domain ${fullDomain} for ${priceEth.trim()} WETH with duration ${durationDays} days`;
        break;
      case 'MARKETPLACE_ACCEPT_OFFER':
        prompt = `Accept buyer offer for domain ${fullDomain} from buyer ${recipient.trim()}`;
        break;
      case 'CHECK_OFFERS':
        prompt = `Check available offers for domain ${fullDomain}`;
        break;
      case 'WRAP_ETH':
        prompt = `Wrap ${priceEth.trim()} ETH to WETH on Arbitrum One`;
        break;
      case 'UNWRAP_WETH':
        prompt = `Unwrap ${priceEth.trim()} WETH to ETH on Arbitrum One`;
        break;
      case 'CLAIM_REFUND':
        prompt = `Claim escrow refund for ${escrowId.trim() || fullDomain}`;
        break;
    }

    if (prompt) {
      onSubmitCommand(prompt);
      onClose();
    }
  };

  const getModalMeta = () => {
    switch (commandType) {
      case 'REGISTER':
        return {
          title: 'Register Sovereign .i Domain',
          desc: 'Trigger permanent on-chain minting on Arbitrum One (0.001 ETH, no renewal fees).',
          icon: <Globe className="w-5 h-5 text-sky-500 dark:text-cyan-400" />,
          actionLabel: 'Execute Registration via Copilot',
        };
      case 'BRIDGE':
        return {
          title: 'Bridge .i via Chainlink CCIP',
          desc: 'Select destination network and prepare non-custodial cross-chain CCIP message.',
          icon: <ArrowRightLeft className="w-5 h-5 text-purple-500 dark:text-purple-400" />,
          actionLabel: 'Execute CCIP Bridge via Copilot',
        };
      case 'SET_PRIMARY':
        return {
          title: 'Set Primary Sovereign Identity',
          desc: 'Bind domain to reverse resolution for your connected wallet address.',
          icon: <UserCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          actionLabel: 'Execute Set Primary via Copilot',
        };
      case 'UPDATE_PROFILE':
        return {
          title: 'Update Profile Metadata',
          desc: 'Update on-chain IPFS avatar, website URL, and social handles for your .i identity.',
          icon: <Edit3 className="w-5 h-5 text-teal-500 dark:text-teal-400" />,
          actionLabel: 'Execute Profile Update via Copilot',
        };
      case 'TRANSFER':
        return {
          title: 'Transfer .i Domain Ownership',
          desc: 'Transfer non-custodial ERC-721 token directly to another EVM address.',
          icon: <Send className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
          actionLabel: 'Execute Transfer via Copilot',
        };
      case 'MARKETPLACE_LIST':
        return {
          title: 'List Domain on Marketplace',
          desc: 'Set fixed price and listing duration for sale on the Sovereign Marketplace.',
          icon: <ShoppingBag className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
          actionLabel: 'Execute Listing via Copilot',
        };
      case 'MARKETPLACE_UPDATE_LISTING':
        return {
          title: currentListing?.priceEth ? `Update Listing Price (Current: ${currentListing.priceEth} ETH)` : 'Update Listing Price',
          desc: 'Adjust your current marketplace fixed price or duration.',
          icon: <Edit3 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
          actionLabel: 'Update Listing via Copilot',
        };
      case 'MARKETPLACE_CANCEL_LISTING':
        return {
          title: 'Cancel Marketplace Listing',
          desc: 'Withdraw your domain listing from the marketplace contract.',
          icon: <RotateCcw className="w-5 h-5 text-rose-500 dark:text-rose-400" />,
          actionLabel: 'Cancel Listing via Copilot',
        };
      case 'MARKETPLACE_BUY':
        return {
          title: 'Buy Listed Domain',
          desc: 'Purchase listed .i identity domain through on-chain marketplace with verified pricing.',
          icon: <ShoppingBag className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          actionLabel: 'Execute Purchase via Copilot',
        };
      case 'MARKETPLACE_OFFER':
        return {
          title: 'Make Marketplace Offer (WETH)',
          desc: 'Submit non-custodial WETH bid for target sovereign domain. Funds remain in your wallet.',
          icon: <HandCoins className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
          actionLabel: 'Execute Offer via Copilot',
        };
      case 'MARKETPLACE_ACCEPT_OFFER':
        return {
          title: 'Accept Buyer Offer',
          desc: 'Select an active buyer offer on your domain to accept and receive WETH.',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          actionLabel: 'Accept Offer via Copilot',
        };
      case 'CHECK_OFFERS':
        return {
          title: 'Query Active Domain Offers',
          desc: 'Inspect all active WETH bids submitted by buyers on a domain.',
          icon: <HandCoins className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
          actionLabel: 'Inspect Offers via Copilot',
        };
      case 'WRAP_ETH':
        return {
          title: 'Wrap ETH to WETH',
          desc: 'Convert native ETH to Wrapped Ether (WETH) on Arbitrum One.',
          icon: <ArrowRightLeft className="w-5 h-5 text-sky-500 dark:text-cyan-400" />,
          actionLabel: 'Wrap ETH via Copilot',
        };
      case 'UNWRAP_WETH':
        return {
          title: 'Unwrap WETH to ETH',
          desc: 'Convert Wrapped Ether back to native ETH on Arbitrum One.',
          icon: <RotateCcw className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />,
          actionLabel: 'Unwrap WETH via Copilot',
        };
      case 'CLAIM_REFUND':
        return {
          title: 'Claim Escrow Refund',
          desc: 'Withdraw refunded funds or canceled deposits from the Doti Escrow contract on Arbitrum One.',
          icon: <RotateCcw className="w-5 h-5 text-rose-500 dark:text-rose-400" />,
          actionLabel: 'Execute Refund via Copilot',
        };
    }
  };

  const meta = getModalMeta();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] flex items-center justify-center">
              {meta.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {meta.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-0.5">
                {meta.desc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#21262D]"
          >
            ✕
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isDomainRequired && (
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E] mb-1.5">
                Target Domain (.i)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="e.g. genesis or myname.i"
                  className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 dark:text-[#6E7681]">
                  .i
                </span>
              </div>
              {isDomainInvalid && (
                <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  ⚠️ English letters (a-z), numbers (0-9), and hyphens (-) only.
                </p>
              )}
              {commandType === 'MARKETPLACE_UPDATE_LISTING' && (
                <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-300">
                    {isLoadingListing ? 'Checking listing status...' : 'Current Marketplace Price:'}
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {isLoadingListing ? '...' : (currentListing?.priceEth ? `${currentListing.priceEth} ETH` : 'Not listed')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE OFFERS SELECTION FOR MARKETPLACE_ACCEPT_OFFER */}
          {commandType === 'MARKETPLACE_ACCEPT_OFFER' && (
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E]">
                Select Buyer Offer to Accept
              </label>

              {isLoadingOffers ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                  <span>Fetching active offers for {cleanDomain || 'domain'}.i...</span>
                </div>
              ) : offers.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {offers.map((offer, idx) => {
                    const buyerAddr = offer.buyer || offer.buyerAddress || '';
                    const price = offer.priceEth || offer.priceInEth || offer.priceWei || '0.01';
                    const isSelected = selectedOfferIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOffer(offer, idx)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected
                          ? 'bg-sky-50 dark:bg-cyan-950/30 border-sky-500 dark:border-cyan-500 ring-1 ring-sky-500/20'
                          : 'bg-slate-50 dark:bg-[#0D1117] border-slate-200 dark:border-[#30363D] hover:border-slate-300 dark:hover:border-[#484F58]'
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {price} WETH
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#21262D] text-slate-600 dark:text-[#8B949E] font-mono">
                              Offer #{idx + 1}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-[#8B949E]">
                            Buyer: {buyerAddr.slice(0, 8)}...{buyerAddr.slice(-6)}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-sky-500 dark:text-cyan-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">No Active Offers Found</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      There are currently no active WETH offers for {cleanDomain || 'this domain'}. Bids made by buyers will appear here automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {commandType === 'CLAIM_REFUND' && (
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E] mb-1.5">
                Escrow ID or Domain Name
              </label>
              <input
                type="text"
                required
                value={escrowId}
                onChange={(e) => setEscrowId(e.target.value)}
                placeholder="0x... escrow ID or domain name"
                className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none transition-colors"
              />
            </div>
          )}

          {commandType === 'TRANSFER' && (
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E] mb-1.5">
                Recipient EVM Address (0x...)
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x1234567890abcdef1234567890abcdef12345678"
                className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* PRICE & WRAP/UNWRAP WITH BALANCE AND MAX BUTTON */}
          {(commandType === 'MARKETPLACE_LIST' ||
            commandType === 'MARKETPLACE_UPDATE_LISTING' ||
            commandType === 'MARKETPLACE_BUY' ||
            commandType === 'MARKETPLACE_OFFER' ||
            commandType === 'WRAP_ETH' ||
            commandType === 'UNWRAP_WETH') && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E]">
                      {commandType === 'MARKETPLACE_OFFER'
                        ? 'Offer Amount (WETH)'
                        : commandType === 'WRAP_ETH'
                          ? 'Amount to Wrap (ETH)'
                          : commandType === 'UNWRAP_WETH'
                            ? 'Amount to Unwrap (WETH)'
                            : commandType === 'MARKETPLACE_UPDATE_LISTING'
                              ? 'New Price (ETH)'
                              : 'Price (ETH)'}
                    </label>
                    {commandType === 'MARKETPLACE_UPDATE_LISTING' && currentListing?.priceEth && (
                      <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
                        Current: {currentListing.priceEth} ETH
                      </span>
                    )}
                    {(commandType === 'WRAP_ETH' || commandType === 'UNWRAP_WETH') && (
                      <button
                        type="button"
                        onClick={handleMaxClick}
                        className="text-[11px] font-mono font-bold text-sky-600 dark:text-cyan-400 hover:text-sky-700 dark:hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-1 bg-sky-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-sky-200 dark:border-cyan-800/50 transition-all active:scale-95"
                      >
                        <span className="opacity-80">MAX:</span>
                        <span className="font-semibold">
                          {commandType === 'WRAP_ETH'
                            ? `${availableEth > 0 ? Number(availableEth.toFixed(4)) : '0.0000'} ETH`
                            : `${availableWeth > 0 ? Number(availableWeth.toFixed(4)) : '0.0000'} WETH`}
                        </span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={priceEth}
                    onChange={(e) => setPriceEth(e.target.value)}
                    placeholder="0.01"
                    className={`w-full bg-slate-50 dark:bg-[#0D1117] border rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none transition-colors ${isBalanceExceeded
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500'
                      }`}
                  />
                  {isBalanceExceeded && (
                    <p className="mt-1.5 text-[11px] text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Exceeds balance ({commandType === 'WRAP_ETH' ? Number(availableEth.toFixed(4)) + ' ETH' : Number(availableWeth.toFixed(4)) + ' WETH'})
                      </span>
                    </p>
                  )}
                </div>

                {(commandType === 'MARKETPLACE_LIST' || commandType === 'MARKETPLACE_UPDATE_LISTING' || commandType === 'MARKETPLACE_OFFER') && (
                  <div>
                    <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E] mb-1.5">
                      {commandType === 'MARKETPLACE_OFFER' ? 'Offer Validity Duration' : 'Listing Duration'}
                    </label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none transition-colors"
                    >
                      <option value={1}>1 Day</option>
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days (1 Week)</option>
                      <option value={30}>30 Days (1 Month)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

          {commandType === 'BRIDGE' && (
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E] mb-1.5">
                Destination Chain (Chainlink CCIP)
              </label>
              <select
                value={targetChainId}
                onChange={(e) => setTargetChainId(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors"
              >
                <option value={10}>OP Mainnet (Optimism) - Chain ID: 10</option>
                <option value={1}>Ethereum Mainnet - Chain ID: 1</option>
                <option value={4663}>Robinhood Chain - Chain ID: 4663</option>
              </select>
            </div>
          )}

          {commandType === 'UPDATE_PROFILE' && (
            <div className="space-y-4">
              {/* Avatar / Generative NFT Vector Section */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold tracking-wider text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                    Avatar & Generative NFT Vector
                  </span>
                  {avatarValue && (
                    <button
                      type="button"
                      onClick={() => setAvatarValue('')}
                      className="text-[10px] font-mono text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 underline cursor-pointer"
                    >
                      RESET TO SVG
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  {/* Live Avatar Preview */}
                  <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-[#30363D] bg-slate-100 dark:bg-[#161B22] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {avatarValue ? (
                      <img
                        src={
                          avatarValue.startsWith('ipfs://')
                            ? `https://ipfs.io/ipfs/${avatarValue.replace('ipfs://', '')}`
                            : avatarValue.startsWith('Qm') || avatarValue.startsWith('bafy')
                            ? `https://ipfs.io/ipfs/${avatarValue}`
                            : avatarValue
                        }
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-cyan-400">
                        {cleanDomain ? `.${cleanDomain.slice(0, 3)}` : '.i'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex bg-slate-200/60 dark:bg-[#21262D] p-0.5 rounded-lg text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => setAvatarMode('URL')}
                          className={`px-2 py-0.5 rounded-md transition-all ${
                            avatarMode === 'URL'
                              ? 'bg-white dark:bg-[#0D1117] text-sky-600 dark:text-cyan-400 font-bold shadow-xs'
                              : 'text-slate-600 dark:text-[#8B949E]'
                          }`}
                        >
                          Image URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarMode('CID')}
                          className={`px-2 py-0.5 rounded-md transition-all ${
                            avatarMode === 'CID'
                              ? 'bg-white dark:bg-[#0D1117] text-sky-600 dark:text-cyan-400 font-bold shadow-xs'
                              : 'text-slate-600 dark:text-[#8B949E]'
                          }`}
                        >
                          IPFS CID
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarMode('FILE')}
                          className={`px-2 py-0.5 rounded-md transition-all ${
                            avatarMode === 'FILE'
                              ? 'bg-white dark:bg-[#0D1117] text-sky-600 dark:text-cyan-400 font-bold shadow-xs'
                              : 'text-slate-600 dark:text-[#8B949E]'
                          }`}
                        >
                          Upload File
                        </button>
                      </div>
                    </div>

                    {avatarMode === 'FILE' ? (
                      <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 dark:border-[#30363D] hover:border-sky-500 dark:hover:border-cyan-500 rounded-xl cursor-pointer text-xs text-slate-600 dark:text-[#8B949E] transition-colors">
                        <Upload className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                        <span>Select image from computer (PNG, JPG, SVG, WEBP)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <input
                        type="text"
                        value={avatarValue}
                        onChange={(e) => setAvatarValue(e.target.value)}
                        placeholder={
                          avatarMode === 'CID'
                            ? 'bafybe... or ipfs://Qm...'
                            : 'https://example.com/avatar.png'
                        }
                        className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none transition-colors"
                      />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#8B949E] leading-relaxed">
                  Uploads are pinned before the profile transaction. You can paste a CID that is already on IPFS or a direct image URL (PNG, JPG, SVG, WEBP).
                </p>
              </div>

              {/* Social Channels Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold tracking-wider text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                  Social Links & Web Presence
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      value={socialLinkedin}
                      onChange={(e) => setSocialLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      X / Twitter
                    </label>
                    <input
                      type="text"
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      GitHub
                    </label>
                    <input
                      type="text"
                      value={socialGithub}
                      onChange={(e) => setSocialGithub(e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      Farcaster
                    </label>
                    <input
                      type="text"
                      value={socialFarcaster}
                      onChange={(e) => setSocialFarcaster(e.target.value)}
                      placeholder="https://warpcast.com/username"
                      className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      Discord
                    </label>
                    <input
                      type="text"
                      value={socialDiscord}
                      onChange={(e) => setSocialDiscord(e.target.value)}
                      placeholder="username#0000"
                      className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      Telegram
                    </label>
                    <input
                      type="text"
                      value={socialTelegram}
                      onChange={(e) => setSocialTelegram(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                    Personal Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://mysite.xyz"
                    className="w-full bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Custom Links (Max 10) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold tracking-wider text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                    Custom Links ({customLinks.length}/10)
                  </span>
                  {customLinks.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddCustomLink}
                      className="text-[11px] font-mono text-sky-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Plus className="w-3 h-3" /> ADD LINK
                    </button>
                  )}
                </div>

                {customLinks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 dark:text-[#6E7681] italic py-1">
                    No custom links added. Click "+ ADD LINK" to add projects, portfolios, or mirror links.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {customLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => handleCustomLinkChange(idx, 'title', e.target.value)}
                          placeholder="Title (e.g. Portfolio)"
                          className="w-1/3 bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleCustomLinkChange(idx, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-slate-50 dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomLink(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#30363D] text-xs font-medium text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDomainInvalid || isBalanceExceeded || isAmountInvalid || isAcceptOfferDisabled}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-[#080B10] text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{meta.actionLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useSignTypedData } from 'wagmi';
import { parseEther, formatEther, parseAbi, keccak256, stringToBytes } from 'viem';
import {
  Tag,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Plus,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
  ArrowRight,
  Edit3,
  XCircle,
} from 'lucide-react';
import { MARKETPLACE_CONTRACT_ARBITRUM, SUPPORTED_CHAINS } from '../config/chains';
import { MARKETPLACE_ABI } from '../config/contracts';
import { checkMarketplaceApproval, buildListingTypedData, buildCancelListingTypedData } from '../utils/marketplace';

export const MarketplaceView: React.FC = () => {
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const publicClient = usePublicClient();

  const [listings, setListings] = useState<any[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my_listings'>('browse');

  // List Modal state
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listDomainName, setListDomainName] = useState('');
  const [listPriceEth, setListPriceEth] = useState('0.05');
  const [listDurationDays, setListDurationDays] = useState('30');
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isListingSubmitting, setIsListingSubmitting] = useState(false);
  const [cancellingDomain, setCancellingDomain] = useState<string | null>(null);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  // Buy state
  const [buyingDomain, setBuyingDomain] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const fetchListings = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Query items from our backend proxy endpoint
      const res = await fetch('/api/marketplace/items');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setListings(data.items);
        } else if (Array.isArray(data)) {
          setListings(data);
        } else {
          setListings([]);
        }
      }

      if (userAddress) {
        const userRes = await fetch(`/api/marketplace/user/${userAddress}`);
        if (userRes.ok) {
          const uData = await userRes.json();
          setUserActivity(uData.userActivities || []);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to fetch marketplace listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [userAddress]);

  // Check approval when opening modal
  useEffect(() => {
    if (isListModalOpen && userAddress && publicClient) {
      setIsCheckingApproval(true);
      checkMarketplaceApproval(publicClient, userAddress as `0x${string}`)
        .then((appr) => {
          setIsApproved(appr);
        })
        .catch(() => setIsApproved(false))
        .finally(() => setIsCheckingApproval(false));
    }
  }, [isListModalOpen, userAddress, publicClient]);

  const handleApproveOperator = async () => {
    if (!userAddress) return;
    setErrorMsg(null);
    try {
      setIsListingSubmitting(true);
      const arb = SUPPORTED_CHAINS[42161];
      const hash = await writeContractAsync({
        address: arb.contractAddress as `0x${string}`,
        abi: parseAbi(['function setApprovalForAll(address operator, bool approved)']),
        functionName: 'setApprovalForAll',
        args: [MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`, true],
      });
      setTxHash(hash);
      setIsApproved(true);
    } catch (err: any) {
      console.error('Approval failed:', err);
      setErrorMsg(err?.message || 'Marketplace operator approval rejected.');
    } finally {
      setIsListingSubmitting(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress || !publicClient) return;

    setErrorMsg(null);
    setModalSuccessMsg(null);
    setIsListingSubmitting(true);

    try {
      const cleanName = listDomainName.trim().toLowerCase().replace(/\.i$/i, '');
      const fullDomain = `${cleanName}.i`;

      // 1. Check approval if not yet verified
      if (!isApproved) {
        const approved = await checkMarketplaceApproval(publicClient, userAddress as `0x${string}`);
        if (!approved) {
          await handleApproveOperator();
          return;
        }
      }

      // 2. Build EIP-712 Listing Typed Data
      const typedData = buildListingTypedData({
        domainName: fullDomain,
        seller: userAddress as `0x${string}`,
        priceEth: listPriceEth,
        durationDays: parseInt(listDurationDays, 10) || 30,
        tokenId: 1n,
      });

      // 3. Request User EIP-712 Signature
      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      // 4. POST to Marketplace Backend API
      const res = await fetch('/api/marketplace/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...typedData.rawPayload,
          signature,
          signatureType: 'EIP712',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to submit marketplace listing order');
      }

      setModalSuccessMsg(`Domain ${fullDomain} is now listed for ${listPriceEth} ETH!`);
      setTimeout(() => {
        setIsListModalOpen(false);
        setModalSuccessMsg(null);
        fetchListings();
      }, 2000);
    } catch (err: any) {
      console.error('Listing error:', err);
      setErrorMsg(err?.message || 'Listing signature rejected or failed.');
    } finally {
      setIsListingSubmitting(false);
    }
  };

  const handleCancelListing = async (item: any) => {
    const rawName = item.canonicalName || item.domainName || '';
    const clean = rawName.trim().toLowerCase().replace(/\.i$/i, '');
    const fullDomain = clean ? `${clean}.i` : '';
    if (!fullDomain || !userAddress) return;

    setCancellingDomain(fullDomain);
    setErrorMsg(null);

    try {
      const cancelTyped = buildCancelListingTypedData({
        domainName: fullDomain,
        seller: userAddress as `0x${string}`,
      });

      const signature = await signTypedDataAsync({
        domain: cancelTyped.domain,
        types: cancelTyped.types,
        primaryType: cancelTyped.primaryType,
        message: cancelTyped.message,
      });

      const res = await fetch('/api/marketplace/cancel-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cancelTyped.rawPayload,
          signature,
          signatureType: 'EIP712',
        }),
      });

      if (!res.ok) {
        const dHash = (item.domainHash || keccak256(stringToBytes(fullDomain))) as `0x${string}`;
        const hash = await writeContractAsync({
          address: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: 'cancelListing',
          args: [dHash],
        });
        setTxHash(hash);
      } else {
        await fetchListings();
      }
    } catch (err: any) {
      console.error('Cancel listing error:', err);
      setErrorMsg(err?.message || 'Cancel listing failed.');
    } finally {
      setCancellingDomain(null);
    }
  };

  const handleUpdateListing = (item: any) => {
    const rawName = item.canonicalName || item.domainName || '';
    const clean = rawName.trim().toLowerCase().replace(/\.i$/i, '');
    setListDomainName(clean);
    const existingPrice = item.listing?.priceEth || item.priceInEth || item.price || '0.05';
    setListPriceEth(existingPrice.toString());
    setIsListModalOpen(true);
  };

  const handleBuy = async (item: any) => {
    setBuyingDomain(item.domainName || item.canonicalName);
    setErrorMsg(null);
    setTxHash(undefined);

    try {
      const dHash = (item.domainHash || '0x') as `0x${string}`;
      const priceEth = item.priceInEth || item.price || item.listing?.priceEth || '0.01';

      const hash = await writeContractAsync({
        address: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'buy',
        args: [dHash],
        value: parseEther(priceEth.toString()),
      });
      setTxHash(hash);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Purchase transaction rejected.');
      setBuyingDomain(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#161B22] border border-[#30363D] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Decentralized Secondary Marketplace</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              Arbitrum One
            </span>
          </h2>
          <p className="text-xs text-[#8B949E] mt-1 max-w-lg leading-relaxed">
            Trade sovereign .i domain identities with instant atomic settlement in native ETH. Non-custodial contracts with a 2% protocol marketplace fee.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsListModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#080B10] text-xs font-semibold font-mono transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>List My Domain</span>
          </button>

          <button
            onClick={fetchListings}
            className="py-2 px-3.5 rounded-xl border border-[#30363D] hover:bg-[#21262D] text-xs text-[#E6EDF3] font-mono transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#30363D] pb-3">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            activeTab === 'browse'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-[#8B949E] hover:text-white'
          }`}
        >
          Active Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('my_listings')}
          className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            activeTab === 'my_listings'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-[#8B949E] hover:text-white'
          }`}
        >
          My History & Activities ({userActivity.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'browse' ? (
        isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-[#8B949E] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Fetching live marketplace orders from Arbitrum One...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#161B22] border border-[#30363D]">
            <Tag className="w-8 h-8 text-[#484F58] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">No Active Listings Currently</h3>
            <p className="text-xs text-[#8B949E] max-w-xs mx-auto mb-4">
              All registered .i domains are presently held by their sovereign owners.
            </p>
            <button
              onClick={() => setIsListModalOpen(true)}
              className="py-2 px-4 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs font-mono transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Be the first to list a domain
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((item, idx) => {
              const name = item.canonicalName || item.domainName || `domain-${idx}.i`;
              const price = item.listing?.priceEth || item.priceInEth || item.price || '0.01';
              const seller = item.owner || item.seller || '0x...';
              const isMine = userAddress && seller.toLowerCase() === userAddress.toLowerCase();

              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#161B22] border border-[#30363D] hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20">
                        {item.isListed ? 'LISTED' : 'UNLISTED RECORD'}
                      </span>
                      <span className="text-xs font-mono text-[#8B949E]">
                        {isMine ? 'You (Owner)' : `Seller: ${seller.slice(0, 6)}...${seller.slice(-4)}`}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white font-mono tracking-tight mb-4">
                      {name}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-[#21262D] flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] text-[#8B949E] font-mono uppercase">Price</div>
                      <div className="text-sm font-bold text-white font-mono">{price} ETH</div>
                    </div>

                    {isMine ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateListing(item)}
                          disabled={cancellingDomain === name}
                          className="py-1.5 px-2.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-cyan-400 text-xs font-mono transition-colors flex items-center gap-1 border border-cyan-500/20"
                          title="Update Listing Price"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Update</span>
                        </button>

                        <button
                          onClick={() => handleCancelListing(item)}
                          disabled={cancellingDomain === name}
                          className="py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-mono transition-colors flex items-center gap-1 border border-red-500/20"
                          title="Cancel Listing"
                        >
                          {cancellingDomain === name ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={buyingDomain === name && (isTxConfirming || !!txHash)}
                        className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#080B10] text-xs font-semibold font-mono transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Buy with ETH</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Activities tab */
        <div className="space-y-3">
          {userActivity.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#161B22] border border-[#30363D] text-xs text-[#8B949E] font-mono">
              No recent marketplace activities found for your address.
            </div>
          ) : (
            userActivity.map((act, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {act.eventType}
                  </span>
                  <span className="text-white font-semibold">{act.domainName}</span>
                  {act.priceEth && (
                    <span className="text-[#8B949E]">{act.priceEth} ETH</span>
                  )}
                </div>
                <div className="text-[#8B949E] text-[11px]">
                  {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transaction status */}
      {txHash && (
        <div className="p-4 rounded-xl bg-[#0D1117] border border-cyan-500/30 flex items-center justify-between text-xs font-mono">
          <span className="text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isTxSuccess ? 'Transaction Confirmed on Arbitrum!' : 'Transaction Submitted'}
          </span>
          <a
            href={`https://arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            Arbiscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* List Domain Modal */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span>List Sovereign Domain for Sale</span>
              </h3>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="text-[#8B949E] hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            {/* Approval Info Alert */}
            <div className="p-3 rounded-xl bg-[#0D1117] border border-[#30363D] text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#8B949E]">Marketplace Approval Status:</span>
                {isCheckingApproval ? (
                  <span className="text-[#8B949E] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                  </span>
                ) : isApproved ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approved
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> 1-Click Approval Required
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8B949E] leading-relaxed">
                Listings are signed via gasless EIP-712 orders. Operator approval allows the marketplace to atomically settle domain ownership when a buyer sends ETH.
              </p>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#8B949E] mb-1">Domain Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={listDomainName}
                    onChange={(e) => setListDomainName(e.target.value)}
                    placeholder="e.g. i"
                    required
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-mono text-[#8B949E]">.i</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#8B949E] mb-1">Listing Price (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={listPriceEth}
                    onChange={(e) => setListPriceEth(e.target.value)}
                    placeholder="0.05"
                    required
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#8B949E] mb-1">Duration (Days)</label>
                  <select
                    value={listDurationDays}
                    onChange={(e) => setListDurationDays(e.target.value)}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>
              </div>

              {modalSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#30363D] text-xs font-mono text-[#8B949E] hover:text-white"
                >
                  Cancel
                </button>

                {!isApproved ? (
                  <button
                    type="button"
                    onClick={handleApproveOperator}
                    disabled={isListingSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5"
                  >
                    {isListingSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>1. Approve Operator</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isListingSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#080B10] text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    {isListingSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                    <span>Sign Gasless Listing</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from 'wagmi';
import { keccak256, toHex } from 'viem';
import {
  ShieldCheck,
  Globe,
  Star,
  Edit3,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  ArrowRightLeft,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
} from 'lucide-react';
import { VerificationResult, DomainRecord } from '../types/doti';
import { SUPPORTED_CHAINS } from '../config/chains';
import { DOT_I_ERC721_ABI } from '../config/contracts';

interface MyIdentityViewProps {
  userAddress: string;
  verification: VerificationResult;
  onRefresh: () => void;
  onNavigateToRegister?: () => void;
}

export const MyIdentityView: React.FC<MyIdentityViewProps> = ({
  userAddress,
  verification,
  onRefresh,
  onNavigateToRegister,
}) => {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { address: connectedAddress } = useAccount();
  const activeAddress = (userAddress || connectedAddress || '') as `0x${string}`;

  const [filterChain, setFilterChain] = useState<'ALL' | 'ARBITRUM' | 'EXTERNAL'>('ALL');
  const [selectedDomain, setSelectedDomain] = useState<string>(
    verification.primaryDomain || verification.domains[0]?.canonicalName || ''
  );
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const arbDomains = verification.domains.filter((d) => d.currentChainId === 42161);
  const externalDomains = verification.domains.filter((d) => d.currentChainId !== 42161);

  const displayedDomains = verification.domains.filter((d) => {
    if (filterChain === 'ARBITRUM') return d.currentChainId === 42161;
    if (filterChain === 'EXTERNAL') return d.currentChainId !== 42161;
    return true;
  });

  const selectedDomainRecord = verification.domains.find(
    (d) => d.canonicalName.toLowerCase() === selectedDomain.toLowerCase()
  );
  const isSelectedDomainOnArbitrum = selectedDomainRecord ? selectedDomainRecord.currentChainId === 42161 : true;
  const selectedDomainChain = selectedDomainRecord
    ? SUPPORTED_CHAINS[selectedDomainRecord.currentChainId] || SUPPORTED_CHAINS[42161]
    : SUPPORTED_CHAINS[42161];

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

  const handleSetPrimary = async (domainName: string) => {
    setIsUpdating(true);
    setStatusMsg(null);
    try {
      const arb = SUPPORTED_CHAINS[42161];
      const dHash = keccak256(toHex(domainName.endsWith('.i') ? domainName : domainName + '.i'));

      let gasLimit = 150000n;
      if (publicClient && activeAddress) {
        try {
          const est = await publicClient.estimateContractGas({
            address: arb.contractAddress as `0x${string}`,
            abi: DOT_I_ERC721_ABI,
            functionName: 'setPrimaryDomain',
            args: [dHash],
            account: activeAddress,
          });
          gasLimit = (est * 125n) / 100n;
        } catch {
          gasLimit = 160000n;
        }
      }

      const hash = await writeContractAsync({
        address: arb.contractAddress as `0x${string}`,
        abi: DOT_I_ERC721_ABI,
        functionName: 'setPrimaryDomain',
        args: [dHash],
        gas: gasLimit,
      });
      setTxHash(hash);
      setStatusMsg(`Setting ${domainName} as primary identity on Arbitrum One...`);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(err?.message || 'Transaction rejected.');
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain || !isSelectedDomainOnArbitrum) return;
    setIsUpdating(true);
    setStatusMsg(null);

    try {
      const arb = SUPPORTED_CHAINS[42161];
      const dHash = keccak256(toHex(selectedDomain.endsWith('.i') ? selectedDomain : selectedDomain + '.i'));
      
      // Clean avatar CID: strip ipfs:// prefix and fallback to default IPFS CID if empty
      let cleanAvatar = (avatarValue || '').trim().replace(/^ipfs:\/\//i, '');
      if (!cleanAvatar) {
        cleanAvatar = 'bafkreibjapnr3drrk4bjkudfj7hudvd3ca6ugwgdudoiutdbh6qgozztma';
      }

      const socialsJson = JSON.stringify({
        website: websiteUrl || '',
        linkedin: socialLinkedin || '',
        twitter: socialTwitter || '',
        github: socialGithub || '',
        farcaster: socialFarcaster || '',
        discord: socialDiscord || '',
        telegram: socialTelegram || '',
      });
      const validCustom = customLinks
        .map((l) => ({ title: l.title.trim(), url: l.url.trim() }))
        .filter((l) => l.url.length > 0);
      const customLinksJson = JSON.stringify(validCustom);

      const profilePayload = {
        imageMode: 'CUSTOM_IPFS',
        avatarCid: cleanAvatar,
        socialsJson,
        customLinksJson,
      };

      let gasLimit = 220000n;
      if (publicClient && activeAddress) {
        try {
          const est = await publicClient.estimateContractGas({
            address: arb.contractAddress as `0x${string}`,
            abi: DOT_I_ERC721_ABI,
            functionName: 'updateProfile',
            args: [dHash, profilePayload],
            account: activeAddress,
          });
          gasLimit = (est * 125n) / 100n;
        } catch (estErr) {
          console.warn('Safe gas estimation fallback for updateProfile:', estErr);
          gasLimit = 250000n;
        }
      }

      const hash = await writeContractAsync({
        address: arb.contractAddress as `0x${string}`,
        abi: DOT_I_ERC721_ABI,
        functionName: 'updateProfile',
        args: [dHash, profilePayload],
        gas: gasLimit,
      });
      setTxHash(hash);
      setStatusMsg(`Updating profile for ${selectedDomain} on Arbitrum One...`);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(err?.message || 'Profile update failed.');
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner if user has only external domains */}
      {arbDomains.length === 0 && externalDomains.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Cross-Chain Identities Detected ({externalDomains.length})
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-400/90 mt-0.5 leading-relaxed">
                You own .i domain(s) on external networks (
                {externalDomains.map((d) => d.canonicalName).join(', ')}), but currently have no active domain on
                Arbitrum One. To manage or use them here, teleport them to Arbitrum One using the official Doti Bridge.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://doti.my/?view=bridge"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>Bridge on Doti.my</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {onNavigateToRegister && (
              <button
                onClick={onNavigateToRegister}
                className="py-2 px-3.5 rounded-xl bg-white dark:bg-[#161B22] border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
              >
                Register on Arbitrum
              </button>
            )}
          </div>
        </div>
      )}

      {/* Identity Overview Hero */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-gradient-to-br dark:from-cyan-500/20 dark:to-blue-500/10 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center text-sky-600 dark:text-cyan-400 font-mono text-2xl font-black">
            .i
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {verification.primaryDomain || verification.domains[0]?.canonicalName || 'Sovereign Identity'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-mono flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3" /> VERIFIED
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-[#8B949E] mt-1">{userAddress}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500 dark:text-[#8B949E]">
              <span className="text-sky-600 dark:text-cyan-400 font-semibold">
                Arbitrum: {arbDomains.length} Active
              </span>
              <span>•</span>
              <span className="text-slate-600 dark:text-slate-300">
                Other Networks: {externalDomains.length} Mirrored
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="py-2 px-3.5 rounded-xl border border-slate-300 dark:border-[#30363D] hover:bg-slate-100 dark:hover:bg-[#21262D] text-xs text-slate-700 dark:text-[#E6EDF3] font-mono transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-scan Networks
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Owned Domains List with Multi-Chain Filters */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#21262D]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              Owned .i Identities
            </h3>
            <span className="text-xs font-mono text-slate-500 dark:text-[#8B949E]">
              {verification.domains.length} Total
            </span>
          </div>

          {/* Network Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0D1117] rounded-xl border border-slate-200 dark:border-[#21262D] text-xs font-mono">
            <button
              onClick={() => setFilterChain('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                filterChain === 'ALL'
                  ? 'bg-white dark:bg-[#161B22] text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({verification.domains.length})
            </button>
            <button
              onClick={() => setFilterChain('ARBITRUM')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                filterChain === 'ARBITRUM'
                  ? 'bg-white dark:bg-[#161B22] text-sky-600 dark:text-cyan-400 font-bold shadow-xs'
                  : 'text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Arbitrum ({arbDomains.length})
            </button>
            <button
              onClick={() => setFilterChain('EXTERNAL')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                filterChain === 'EXTERNAL'
                  ? 'bg-white dark:bg-[#161B22] text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                  : 'text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Satellites ({externalDomains.length})
            </button>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {displayedDomains.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400 dark:text-[#6E7681]">
                No domains in this filter
              </div>
            ) : (
              displayedDomains.map((dom, idx) => {
                const chain = SUPPORTED_CHAINS[dom.currentChainId] || SUPPORTED_CHAINS[42161];
                const isPrimary = dom.canonicalName === verification.primaryDomain;
                const isSelected = dom.canonicalName.toLowerCase() === selectedDomain.toLowerCase();
                const isArb = dom.currentChainId === 42161;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDomain(dom.canonicalName)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-cyan-500/10 border-sky-300 dark:border-cyan-500/40 text-slate-900 dark:text-white ring-1 ring-sky-300 dark:ring-cyan-500/40'
                        : 'bg-slate-50 dark:bg-[#0D1117] border-slate-200 dark:border-[#21262D] hover:border-slate-300 dark:hover:border-[#30363D] text-slate-700 dark:text-[#C9D1D9]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm tracking-wide font-mono">{dom.canonicalName}</span>
                      {isPrimary ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 font-mono flex items-center gap-1 font-semibold">
                          <Star className="w-3 h-3 fill-sky-600 dark:fill-cyan-300" /> PRIMARY
                        </span>
                      ) : isArb ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(dom.canonicalName);
                          }}
                          disabled={isUpdating}
                          className="text-[10px] px-2 py-0.5 rounded border border-slate-300 dark:border-[#30363D] hover:bg-sky-500 hover:text-white dark:hover:bg-cyan-500 dark:hover:text-black font-mono text-slate-500 dark:text-[#8B949E] transition-colors"
                        >
                          Set Primary
                        </button>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-mono border border-amber-200 dark:border-amber-800/40 font-medium">
                          On {chain.shortName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-500 dark:text-[#8B949E]">
                      <span>Token #{dom.activeTokenId}</span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chain.color }} />
                        <span className={isArb ? 'text-sky-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'}>
                          {chain.name}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Profile & Metadata Management OR External Domain Notice */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#21262D]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              Sovereign Identity Management // {selectedDomain || 'Select Domain'}
            </h3>
            <span
              className={`text-xs font-mono font-medium ${
                isSelectedDomainOnArbitrum ? 'text-sky-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isSelectedDomainOnArbitrum ? 'Active on Arbitrum One' : `Held on ${selectedDomainChain.name}`}
            </span>
          </div>

          {isSelectedDomainOnArbitrum ? (
            /* Active Arbitrum Domain Profile Form */
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-cyan-500/5 border border-sky-200 dark:border-cyan-500/20 text-xs font-mono text-sky-800 dark:text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0" />
                <span>
                  Editing metadata for <strong>{selectedDomain}</strong> on Arbitrum One. Changes sync across all chains via CCIP.
                </span>
              </div>

              {/* Avatar & Generative NFT Vector Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] space-y-3">
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
                  <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-[#30363D] bg-slate-100 dark:bg-[#161B22] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
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
                        {selectedDomain ? `.${selectedDomain.slice(0, 3)}` : '.i'}
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
                        className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none transition-colors"
                      />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#8B949E] leading-relaxed">
                  Uploads are pinned globally before the profile transaction. You can also paste a CID that is already pinned on IPFS, or enter a direct image URL (PNG, JPG, SVG, WEBP). Your NFT on OpenSea reads this URI directly from the smart contract.
                </p>
              </div>

              {/* Social Channels Section */}
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-bold tracking-wider text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                  Social Links & Web Presence
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      value={socialLinkedin}
                      onChange={(e) => setSocialLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      Twitter / X Handle
                    </label>
                    <input
                      type="text"
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      GitHub
                    </label>
                    <input
                      type="text"
                      value={socialGithub}
                      onChange={(e) => setSocialGithub(e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      Farcaster
                    </label>
                    <input
                      type="text"
                      value={socialFarcaster}
                      onChange={(e) => setSocialFarcaster(e.target.value)}
                      placeholder="https://warpcast.com/username"
                      className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      Discord
                    </label>
                    <input
                      type="text"
                      value={socialDiscord}
                      onChange={(e) => setSocialDiscord(e.target.value)}
                      placeholder="username#0000"
                      className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                      Telegram
                    </label>
                    <input
                      type="text"
                      value={socialTelegram}
                      onChange={(e) => setSocialTelegram(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#8B949E] mb-1">
                    Personal Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://mysite.xyz"
                    className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
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
                      className="text-xs font-mono text-sky-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Plus className="w-3 h-3" /> ADD LINK
                    </button>
                  )}
                </div>

                {customLinks.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-[#6E7681] italic py-1">
                    No custom links added. Click "+ ADD LINK" to add projects, portfolios, or mirror links.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {customLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => handleCustomLinkChange(idx, 'title', e.target.value)}
                          placeholder="Title (e.g. Portfolio)"
                          className="w-1/3 bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleCustomLinkChange(idx, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
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

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 dark:text-[#8B949E]">
                  Writes to Arbitrum One authority contract and broadcasts to satellites via CCIP.
                </p>
                <button
                  type="submit"
                  disabled={isUpdating || isTxConfirming}
                  className="py-2.5 px-5 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-50 text-white dark:text-[#080B10] font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-sm self-start sm:self-auto"
                >
                  {isUpdating || isTxConfirming ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Save to Blockchain</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* External Satellite Domain Informational Notice & Bridge Call to Action */
            <div className="py-6 px-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-center flex flex-col items-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ArrowRightLeft className="w-7 h-7" />
              </div>

              <div className="max-w-md">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Domain Resides on {selectedDomainChain.name}
                </h4>
                <p className="text-xs text-slate-600 dark:text-[#8B949E] mt-1.5 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white font-mono">{selectedDomain}</strong> is currently held on{' '}
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{selectedDomainChain.name}</span>.
                  Because this application and its smart contracts operate exclusively on{' '}
                  <span className="text-sky-600 dark:text-cyan-400 font-semibold">Arbitrum One</span>, you cannot update
                  metadata, transfer, list, or set this domain as primary from here.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#161B22] border border-amber-200 dark:border-amber-800/50 text-xs font-mono text-amber-900 dark:text-amber-300 max-w-md text-left">
                <strong>How to use this domain here:</strong>
                <ol className="list-decimal list-inside mt-1.5 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Visit the main Doti Protocol bridge on <code>doti.my</code>.</li>
                  <li>Connect to <strong>{selectedDomainChain.name}</strong> and initiate the CCIP teleport to <strong>Arbitrum One</strong>.</li>
                  <li>Once received on Arbitrum, return here to manage it with full sovereignty!</li>
                </ol>
              </div>

              <a
                href="https://doti.my/?view=bridge"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-md shadow-amber-600/20"
              >
                <span>Bridge {selectedDomain} to Arbitrum One on Doti.my</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#21262D] text-xs font-mono text-sky-700 dark:text-cyan-300">
              {statusMsg}
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0D1117] border border-sky-300 dark:border-cyan-500/30 flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isTxSuccess ? 'Transaction Confirmed' : 'Broadcasted to Arbitrum One'}
              </span>
              <a
                href={`https://arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                Arbiscan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


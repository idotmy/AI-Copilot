import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Search, Sparkles, CheckCircle2, XCircle, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { SUPPORTED_CHAINS, REGISTRATION_PRICE_ETH } from '../config/chains';
import { DOT_I_ERC721_ABI } from '../config/contracts';
import { callMcpTool } from '../lib/mcpClient';

export const RegistrationView: React.FC = () => {
  const { writeContractAsync } = useWriteContract();

  const [searchLabel, setSearchLabel] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [txError, setTxError] = useState<string | null>(null);

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const cleanSearchInput = searchLabel.trim().toLowerCase().replace(/\.i$/i, '');
  const isInputNonEnglish = cleanSearchInput.length > 0 && !/^[a-z0-9-]+$/.test(cleanSearchInput);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchLabel.trim() || isInputNonEnglish) return;
    setIsSearching(true);
    setAvailabilityResult(null);
    setTxError(null);

    try {
      const cleanName = searchLabel.trim().toLowerCase().replace(/\.i$/i, '');
      const res = await callMcpTool('check_domain_availability', { domainName: cleanName });
      setAvailabilityResult(res);
    } catch (err: any) {
      console.error(err);
      setTxError(err?.message || 'Availability query failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = async () => {
    if (!availabilityResult) return;
    setIsRegistering(true);
    setTxError(null);
    setTxHash(undefined);

    const arb = SUPPORTED_CHAINS[42161];
    const cleanLabel = (availabilityResult.domainName || searchLabel).replace('.i', '').toLowerCase();

    try {
      const hash = await writeContractAsync({
        address: arb.contractAddress as `0x${string}`,
        abi: DOT_I_ERC721_ABI,
        functionName: 'register',
        args: [cleanLabel, BigInt(arb.ccipSelector)],
        value: parseEther(REGISTRATION_PRICE_ETH),
      });
      setTxHash(hash);
    } catch (err: any) {
      console.error('Registration error:', err);
      setTxError(err?.message || 'Transaction rejected.');
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Registration Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Permanent .i Registration</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 font-mono font-semibold">
              0.001 ETH
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-1 max-w-lg leading-relaxed">
            Acquire lifetime decentralized Web3 identity anchored on Arbitrum One. Zero recurring annual renewal fees, fully non-custodial ERC-721 token.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-[#8B949E] bg-slate-50 dark:bg-[#0D1117] p-3 rounded-xl border border-slate-200 dark:border-[#21262D]">
          <div>
            <div className="text-slate-900 dark:text-white font-semibold">4 Networks</div>
            <div className="text-[10px] text-sky-600 dark:text-cyan-400">CCIP Mirrored</div>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-[#30363D]" />
          <div>
            <div className="text-slate-900 dark:text-white font-semibold">100% On-Chain</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">SVG Generative</div>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchLabel}
              onChange={(e) => setSearchLabel(e.target.value.toLowerCase())}
              placeholder="Search your sovereign name (e.g. Satoshi, Genesis, Alpha)..."
              className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl pl-4 pr-12 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none font-mono"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-sky-600 dark:text-cyan-400 font-bold">
              .i
            </span>
          </div>

          <button
            type="submit"
            disabled={!searchLabel.trim() || isSearching || isInputNonEnglish}
            className="py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-50 text-white dark:text-[#080B10] font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-sky-500/10 dark:shadow-cyan-500/20"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking 4 Chains...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Check Availability</span>
              </>
            )}
          </button>
        </form>

        {isInputNonEnglish && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <XCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>English characters only:</strong> Domain names can only contain English letters (a-z), numbers (0-9), and hyphens (-). Arabic or special characters cannot be registered on-chain.
            </span>
          </div>
        )}

        {/* Availability Result Card */}
        {availabilityResult && (
          <div className="mt-6 p-6 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#21262D]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#21262D]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                    {availabilityResult.domainName || `${searchLabel}.i`}
                  </span>
                  {availabilityResult.available !== false ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-mono font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> AVAILABLE
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-mono font-semibold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> TAKEN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-1">
                  Registration fee: <span className="text-slate-900 dark:text-white font-semibold">0.001 ETH</span> (Direct Arbitrum One settlement)
                </p>
              </div>

              {availabilityResult.available !== false && (
                <button
                  onClick={handleRegister}
                  disabled={isRegistering || isTxConfirming}
                  className="py-2.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-50 text-white dark:text-[#080B10] font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 dark:shadow-cyan-500/20"
                >
                  {isRegistering || isTxConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Minting on Arbitrum...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Register on Arbitrum One (0.001 ETH)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {txHash && (
              <div className="mt-4 p-3 rounded-lg bg-white dark:bg-[#161B22] border border-sky-300 dark:border-cyan-500/30 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {isTxSuccess ? 'Domain Registered Successfully!' : 'Transaction Submitted'}
                </span>
                <a
                  href={`https://arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  View on Arbiscan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {txError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono">
                {txError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

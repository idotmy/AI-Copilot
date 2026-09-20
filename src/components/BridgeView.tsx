import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther, keccak256, toHex } from 'viem';
import { arbitrum } from 'viem/chains';
import { ArrowRightLeft, ShieldCheck, Zap, Globe, RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, Wallet, Sparkles } from 'lucide-react';
import { SUPPORTED_CHAINS } from '../config/chains';
import { DOT_I_ERC721_ABI } from '../config/contracts';
import { callMcpTool } from '../lib/mcpClient';
import { calculateExactBridgeFeeAndGas, BridgeQuoteResult } from '../utils/bridgeFee';
import { VerificationResult } from '../types/doti';

interface BridgeViewProps {
  verification?: VerificationResult;
}

export const BridgeView: React.FC<BridgeViewProps> = ({ verification }) => {
  const { writeContractAsync } = useWriteContract();
  const { address: userAddress } = useAccount();
  const { data: userBal } = useBalance({
    address: userAddress,
    chainId: arbitrum.id,
  });
  const publicClient = usePublicClient();
  const [sourceChainId, setSourceChainId] = useState<number>(42161);
  const [targetChainId, setTargetChainId] = useState<number>(10);
  const [domainName, setDomainName] = useState(
    verification?.domains.find((d) => d.currentChainId === 42161)?.canonicalName || ''
  );
  const [bridgeQuote, setBridgeQuote] = useState<any>(null);
  const [calculatedQuote, setCalculatedQuote] = useState<BridgeQuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isBridging, setIsBridging] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [bridgeSuccess, setBridgeSuccess] = useState(false);

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const arbDomains = verification?.domains.filter((d) => d.currentChainId === 42161) || [];
  const externalDomains = verification?.domains.filter((d) => d.currentChainId !== 42161) || [];

  const handleEstimateBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim() || !publicClient || !userAddress) return;
    setIsQuoting(true);
    setQuoteError(null);
    setBridgeQuote(null);
    setCalculatedQuote(null);
    setTxHash(undefined);
    setBridgeSuccess(false);

    try {
      const cleanLabel = domainName.trim().toLowerCase().replace(/\.i$/i, '');
      const quote = await calculateExactBridgeFeeAndGas(
        publicClient,
        userAddress,
        cleanLabel,
        targetChainId,
        sourceChainId
      );

      setCalculatedQuote(quote);

      const mcpRes = await callMcpTool('estimate_registration', {
        domainName: domainName.trim(),
        targetChainId,
      });

      setBridgeQuote({
        ...mcpRes,
        exactFeeWei: quote.value.toString(),
        exactFeeEth: quote.valueEth,
        gasLimit: quote.gasLimit.toString(),
      });
    } catch (err: any) {
      console.error(err);
      setQuoteError(err?.shortMessage || err?.message || 'Bridge estimation failed.');
    } finally {
      setIsQuoting(false);
    }
  };

  const handleExecuteBridge = async () => {
    if (!domainName.trim() || !userAddress || !publicClient) return;
    setIsBridging(true);
    setQuoteError(null);
    try {
      const arb = SUPPORTED_CHAINS[42161];
      const targetChain = SUPPORTED_CHAINS[targetChainId] || SUPPORTED_CHAINS[10];
      const cleanLabel = domainName.trim().toLowerCase().replace(/\.i$/i, '');
      const dHash = keccak256(toHex(`${cleanLabel}.i`));

      const quote = calculatedQuote || (await calculateExactBridgeFeeAndGas(
        publicClient,
        userAddress,
        cleanLabel,
        targetChainId,
        sourceChainId
      ));

      const hash = await writeContractAsync({
        address: arb.contractAddress as `0x${string}`,
        abi: DOT_I_ERC721_ABI,
        functionName: 'bridgeDomain',
        args: [dHash, BigInt(targetChain.ccipSelector)],
        value: quote.value,
        gas: quote.gasLimit,
      });
      setTxHash(hash);
      setBridgeSuccess(true);
    } catch (err: any) {
      console.error('Bridge error:', err);
      setQuoteError(err?.shortMessage || err?.message || 'Bridge transaction rejected.');
    } finally {
      setIsBridging(false);
    }
  };

  const sourceChain = SUPPORTED_CHAINS[sourceChainId];
  const targetChain = SUPPORTED_CHAINS[targetChainId];
  const isBalanceSufficient = userBal && calculatedQuote ? userBal.value >= calculatedQuote.value : true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Chainlink CCIP Cross-Chain Bridge</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 font-mono font-semibold">
              CCIP v1.5
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-1 max-w-lg leading-relaxed">
            Teleport sovereign .i domain identities between Arbitrum One and verified satellite networks with instant on-chain routing.
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-1 text-xs font-mono">
          <div className="text-sky-600 dark:text-cyan-400 bg-slate-50 dark:bg-[#0D1117] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#21262D] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-cyan-400 animate-pulse" />
            <span>Authority Anchor: Arbitrum One (42161)</span>
          </div>
          {userBal && (
            <div className="text-slate-500 dark:text-[#8B949E] flex items-center gap-1.5 px-1">
              <Wallet className="w-3 h-3 text-slate-400" />
              <span>Wallet Balance: <strong className="text-slate-800 dark:text-slate-200">{Number(userBal.formatted).toFixed(6)} ETH</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Cross-chain Inbound Bridge Guide (For domains on other chains) */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Inbound Teleport (To Arbitrum One)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono">
                Satellite → Arbitrum
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-0.5 leading-relaxed">
              Have a domain on OP Mainnet, Ethereum, or Robinhood? Inbound bridge transactions must be signed from the source network on the official Doti Protocol portal.
            </p>
          </div>
        </div>

        <a
          href="https://doti.my/?view=bridge"
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 shadow-xs"
        >
          <span>Bridge to Arbitrum on Doti.my</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Outbound Bridge Interaction Matrix */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#21262D]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
            Outbound Teleport from Arbitrum One
          </h3>
          <span className="text-xs font-mono text-sky-600 dark:text-cyan-400">Source: Arbitrum (42161)</span>
        </div>

        <form onSubmit={handleEstimateBridge} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Chain */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#21262D]">
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E] mb-2">SOURCE NETWORK</label>
              <div className="w-full bg-white dark:bg-[#161B22] border border-slate-300 dark:border-[#30363D] rounded-lg p-2.5 text-sm text-slate-900 dark:text-white font-medium flex items-center justify-between">
                <span>Arbitrum One (Authority Anchor)</span>
                <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-cyan-400" />
              </div>
              <div className="mt-3 text-[11px] font-mono text-slate-500 dark:text-[#8B949E] flex items-center justify-between">
                <span>CCIP Selector:</span>
                <span className="text-slate-900 dark:text-white font-medium">{sourceChain?.ccipSelector}</span>
              </div>
            </div>

            {/* Target Chain */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#21262D]">
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E] mb-2">DESTINATION NETWORK</label>
              <select
                value={targetChainId}
                onChange={(e) => setTargetChainId(Number(e.target.value))}
                className="w-full bg-white dark:bg-[#161B22] border border-slate-300 dark:border-[#30363D] rounded-lg p-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none"
              >
                {Object.values(SUPPORTED_CHAINS)
                  .filter((c) => c.chainId !== 42161)
                  .map((c) => (
                    <option key={c.chainId} value={c.chainId}>
                      {c.name} {c.chainId === 10 ? '✨ (Active Production Satellite)' : '(Satellite)'}
                    </option>
                  ))}
              </select>
              <div className="mt-3 text-[11px] font-mono text-slate-500 dark:text-[#8B949E] flex items-center justify-between">
                <span>CCIP Selector:</span>
                <span className="text-slate-900 dark:text-white font-medium">{targetChain?.ccipSelector}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-slate-600 dark:text-[#8B949E]">.i DOMAIN TO TELEPORT</label>
              {arbDomains.length > 0 && (
                <span className="text-[11px] font-mono text-sky-600 dark:text-cyan-400">
                  {arbDomains.length} Owned on Arbitrum
                </span>
              )}
            </div>

            {/* Owned Arbitrum domains quick selection chips */}
            {arbDomains.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {arbDomains.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setDomainName(d.canonicalName)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      domainName.toLowerCase() === d.canonicalName.toLowerCase()
                        ? 'bg-sky-500 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-[#0D1117] hover:bg-slate-200 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#30363D]'
                    }`}
                  >
                    {d.canonicalName}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="e.g. satoshi.i"
              className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!domainName.trim() || isQuoting}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-50 text-white dark:text-[#080B10] font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-sky-500/10 dark:shadow-cyan-500/20"
          >
            {isQuoting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Querying On-Chain CCIP Router...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Calculate On-Chain CCIP Bridge Fee</span>
              </>
            )}
          </button>
        </form>

        {bridgeQuote && (
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-sky-300 dark:border-cyan-500/40 text-xs font-mono space-y-4">
            <div className="text-slate-900 dark:text-white font-semibold text-sm flex items-center justify-between">
              <span>Route: {sourceChain.shortName} → {targetChain.shortName}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Router Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#21262D]">
              <div>
                <span className="text-slate-500 dark:text-[#8B949E] block">CCIP Bridge Fee:</span>
                <span className="text-sm font-bold text-sky-600 dark:text-cyan-400">
                  {bridgeQuote.exactFeeEth} ETH
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-[#8B949E] block">Your Arbitrum Balance:</span>
                <span className={`text-sm font-bold ${isBalanceSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {userBal ? `${Number(userBal.formatted).toFixed(6)} ETH` : 'Checking...'}
                </span>
              </div>
            </div>

            {!isBalanceSufficient && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <strong className="font-semibold block">Insufficient Wallet Balance</strong>
                  Bridging to Ethereum L1 requires ~{bridgeQuote.exactFeeEth} ETH to cover the L1 execution fee charged by Chainlink CCIP. Your current balance on Arbitrum One is {Number(userBal?.formatted).toFixed(6)} ETH. Please top up your wallet or bridge to OP Mainnet (only ~0.000041 ETH).
                </div>
              </div>
            )}

            {targetChainId === 4663 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <strong className="font-semibold block">Satellite Lane Status</strong>
                  The Robinhood Chain satellite receiver contract is currently unassigned on Arbitrum registry mainnet. Active live destination: <strong>OP Mainnet (Chain ID 10)</strong>.
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleExecuteBridge}
              disabled={isBridging || isTxConfirming || !isBalanceSufficient}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-[#080B10] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {isBridging || isTxConfirming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Broadcasting Bridge Transaction...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Sign & Teleport {domainName} to {targetChain.shortName}</span>
                </>
              )}
            </button>
          </div>
        )}

        {txHash && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-sky-300 dark:border-cyan-500/30 flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {isTxSuccess ? 'CCIP Bridge Confirmed on Arbitrum One' : 'Bridge Broadcasted to Network'}
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

        {quoteError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono">
            {quoteError}
          </div>
        )}
      </div>
    </div>
  );
};

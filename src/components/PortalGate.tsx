import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useSignMessage, useSwitchChain, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, KeyRound, Globe, ExternalLink, Sparkles, LogOut, Cable, Mouse, Twitter, Github, Linkedin } from 'lucide-react';
import { generateAuthChallengeMessage, verifyDomainOwnershipAcrossChains } from '../lib/onChainAuth';
import { VerificationResult } from '../types/doti';
import { SUPPORTED_CHAINS } from '../config/chains';
import { ThemeToggle } from './ThemeToggle';

interface PortalGateProps {
  onAuthenticated: (result: VerificationResult) => void;
}

export const PortalGate: React.FC<PortalGateProps> = ({ onAuthenticated }) => {
  const { address, isConnected, chainId, status, connector, isReconnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { switchChain } = useSwitchChain();

  const [authStep, setAuthStep] = useState<'IDLE' | 'SIGNING' | 'SCANNING' | 'VERIFIED' | 'DENIED'>('IDLE');
  const [scanStatus, setScanStatus] = useState<
    Record<string, { status: string; count?: number; domainNames?: string[] }>
  >({});
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const hasAttemptedAutoAuth = useRef(false);

  // Safe signing wrapper that protects against wagmi connector dehydration / getChainId errors
  const safeSignChallenge = async (challengeMessage: string, userAddr: string): Promise<string> => {
    // Attempt 1: If connector is hydrated with getChainId, pass connector explicitly
    if (connector && typeof (connector as any).getChainId === 'function') {
      try {
        return await signMessageAsync({ message: challengeMessage, connector });
      } catch (err: any) {
        if (err?.code === 4001 || err?.name === 'UserRejectedRequestError' || err?.message?.toLowerCase().includes('reject')) {
          throw new Error('Signature request was rejected in your wallet.');
        }
        console.warn('Wagmi signMessageAsync with connector failed, trying fallback:', err);
      }
    } else {
      try {
        return await signMessageAsync({ message: challengeMessage });
      } catch (err: any) {
        if (err?.code === 4001 || err?.name === 'UserRejectedRequestError' || err?.message?.toLowerCase().includes('reject')) {
          throw new Error('Signature request was rejected in your wallet.');
        }
        console.warn('Standard signMessageAsync failed, trying fallback:', err);
      }
    }

    // Attempt 2: Use connector.getProvider() if available
    if (connector && typeof (connector as any).getProvider === 'function') {
      try {
        const provider: any = await (connector as any).getProvider();
        if (provider && typeof provider.request === 'function') {
          const sig = await provider.request({
            method: 'personal_sign',
            params: [challengeMessage, userAddr],
          });
          if (sig) return sig;
        }
      } catch (providerErr: any) {
        if (providerErr?.code === 4001 || providerErr?.name === 'UserRejectedRequestError' || providerErr?.message?.toLowerCase().includes('reject')) {
          throw new Error('Signature request was rejected in your wallet.');
        }
        console.warn('Provider personal_sign failed, trying window.ethereum:', providerErr);
      }
    }

    // Attempt 3: Direct window.ethereum fallback for injected wallets
    if (typeof window !== 'undefined' && (window as any).ethereum?.request) {
      try {
        const sig = await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [challengeMessage, userAddr],
        });
        if (sig) return sig;
      } catch (ethErr: any) {
        if (ethErr?.code === 4001 || ethErr?.name === 'UserRejectedRequestError' || ethErr?.message?.toLowerCase().includes('reject')) {
          throw new Error('Signature request was rejected in your wallet.');
        }
        console.warn('window.ethereum personal_sign failed:', ethErr);
      }
    }

    throw new Error('Could not request signature from wallet. Please make sure your wallet is unlocked and connected.');
  };

  // Trigger auth workflow when wallet connects and is fully hydrated
  useEffect(() => {
    if (
      isConnected &&
      !isReconnecting &&
      status === 'connected' &&
      address &&
      authStep === 'IDLE' &&
      !errorMessage &&
      !hasAttemptedAutoAuth.current
    ) {
      // Ensure connector methods are present before auto-triggering
      if (connector && typeof (connector as any).getChainId === 'function') {
        hasAttemptedAutoAuth.current = true;
        startAuthentication();
      }
    }
  }, [isConnected, isReconnecting, status, address, authStep, connector, errorMessage]);

  const startAuthentication = async () => {
    if (!address) return;
    setErrorMessage(null);
    setAuthStep('SIGNING');

    try {
      // 1. Prompt cryptographic signature message
      const challenge = generateAuthChallengeMessage(address);
      const sig = await safeSignChallenge(challenge.message, address);
      setSignature(sig);

      // 2. Scan across the 4 networks
      setAuthStep('SCANNING');
      const result = await verifyDomainOwnershipAcrossChains(address, (chainName, status, count, domainNames) => {
        setScanStatus((prev) => ({
          ...prev,
          [chainName]: { status, count, domainNames },
        }));
      });

      setVerificationResult(result);

      if (result.verified) {
        setAuthStep('VERIFIED');
        // If already on Arbitrum One, proceed immediately; else wait for switch to Arbitrum
        if (chainId === 42161) {
          onAuthenticated(result);
        }
      } else {
        setAuthStep('DENIED');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const userFriendlyMsg =
        err?.message?.includes('getChainId')
          ? 'Wallet connection initializing. Click "Sign Authentication Challenge" to proceed.'
          : err?.message || 'Authentication was rejected or timed out.';
      setErrorMessage(userFriendlyMsg);
      setAuthStep('IDLE');
    }
  };

  const handleSwitchToArbitrum = async () => {
    try {
      await switchChain({ chainId: 42161 });
      if (verificationResult?.verified) {
        onAuthenticated(verificationResult);
      }
    } catch (err: any) {
      setErrorMessage('Could not switch to Arbitrum One. Please switch network in your wallet.');
    }
  };

  // If not connected, display the iconic minimalist ".i" logo portal
  if (!isConnected) {
    return (
      <div className="relative min-h-screen w-full bg-slate-50 dark:bg-[#080B10] text-slate-800 dark:text-[#E6EDF3] flex flex-col items-center justify-center overflow-hidden select-none px-6 transition-colors">
        {/* Top Floating Theme Toggle */}
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-50 flex items-center gap-3">
          <ThemeToggle showLabel={true} />
        </div>

        {/* Ambient background depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.08),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(40,160,240,0.08),transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/20 dark:via-cyan-500/20 to-transparent" />

        {/* Minimalist central logo trigger */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center text-center cursor-pointer group"
          onClick={() => openConnectModal?.()}
        >
          {/* Logo container */}
          <div className="relative rounded-full transition-all duration-500 group-hover:scale-105 animate-pulse">
            <div className="absolute inset-0 rounded-full bg-sky-500/10 dark:bg-cyan-500/5 blur-2xl 
            group-hover:bg-sky-500/20 dark:group-hover:bg-cyan-500/15 transition-all duration-500" />
            <div className="relative group">
              <div
                className="text-7xl text-slate-600 dark:text-slate-400 font-black tracking-tighter border border-10 border-slate-600 rounded-full p-8 cursor-pointer"
              >
                .i
              </div>

              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2
                   hidden group-hover:block
                   bg-slate-600 text-white text-sm font-normal
                   px-3 py-2 rounded-md whitespace-nowrap">
                Connect
              </span>
            </div>
          </div>
        </motion.div>

        {/* Discreet bottom specifications */}
        <div className="absolute bottom-8 inset-x-0 flex flex-wrap items-center justify-center gap-12 text-[11px] font-mono text-slate-600 dark:text-slate-400">
          <span className="text-slate-600 dark:text-slate-400">
            <span className="text-[10px] mr-1">doti</span>
            © {new Date().getFullYear()}
          </span>
          <a href="https://doti.my/" target="_blank" rel="noopener noreferrer">
            register
          </a>
          <a href="https://mcp.doti.my/" target="_blank" rel="noopener noreferrer">
            tester
          </a>
          <div className="items-center justify-center absolute bottom-8 inset-x-0 flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <a href="https://x.com/idotmy" target="_blank" rel="noopener noreferrer">
              <Twitter className="w-3.5 h-3.5" />
            </a>
            <a href="https://www.linkedin.com/company/idotmy/" target="_blank" rel="noopener noreferrer">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
            <a href="https://github.com/idotmy/AI-Copilot" target="_blank" rel="noopener noreferrer">
              <Github className="w-3.5 h-3.5" />
            </a>
          </div>


        </div>
      </div>
    );
  }

  // When wallet is connected: show authentication challenge & multi-chain verification
  return (
    <div className="relative min-h-screen w-full bg-slate-100 dark:bg-[#080B10] text-slate-800 dark:text-[#E6EDF3] flex flex-col items-center justify-center p-6 select-none transition-colors">
      {/* Top Floating Theme Toggle */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-50 flex items-center gap-3">
        <ThemeToggle showLabel={true} />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(14,165,233,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_40%,rgba(40,160,240,0.06),transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#0D1117]/90 border border-slate-200 dark:border-[#30363D] rounded-2xl p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl"
      >
        {/* Top Logo badge */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-[#21262D]">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">.i</span>
            <div className="h-4 w-px bg-slate-200 dark:bg-[#30363D]" />
            <span className="text-xs font-mono uppercase tracking-widest text-sky-600 dark:text-cyan-400 font-semibold">
              Authentication Gate
            </span>
          </div>
          <div className="text-xs font-mono text-slate-600 dark:text-[#8B949E] px-3 py-1 rounded-md bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D]">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
          </div>
        </div>

        {/* Step: RECONNECTING */}
        {isReconnecting && (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center mb-4 text-sky-600 dark:text-cyan-400">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Connecting Web3 Provider</h3>
            <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-1">
              Restoring secure wallet session...
            </p>
          </div>
        )}

        {/* Step: IDLE (Connected and ready for signature challenge) */}
        {!isReconnecting && authStep === 'IDLE' && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center mb-4 text-sky-600 dark:text-cyan-400">
              <KeyRound className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5">
              Authenticate Sovereign Access
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8B949E] mb-6 max-w-sm leading-relaxed">
              Verify cryptographic ownership of your .i domain anchored on Arbitrum One and mirrored across OP, Ethereum, and Robinhood.
            </p>

            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={startAuthentication}
                className="w-full py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-[#080B10] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 dark:shadow-cyan-500/20 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Sign Authentication Challenge</span>
              </button>
              <button
                onClick={() => disconnect()}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#30363D] hover:bg-slate-100 dark:hover:bg-[#161B22] text-xs font-mono text-slate-600 dark:text-[#8B949E] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Switch or Disconnect Wallet
              </button>
            </div>
          </div>
        )}

        {/* Step: SIGNING */}
        {!isReconnecting && authStep === 'SIGNING' && (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center mb-5 text-sky-600 dark:text-cyan-400">
              <KeyRound className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Signature Request</h2>
            <p className="text-sm text-slate-500 dark:text-[#8B949E] mb-6 max-w-xs leading-relaxed">
              Please sign the sovereign authentication challenge in your wallet to verify identity ownership.
            </p>
            <button
              onClick={startAuthentication}
              className="w-full py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-[#080B10] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 dark:shadow-cyan-500/20 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              Sign Authentication Challenge
            </button>
          </div>
        )}

        {/* Step: SCANNING */}
        {!isReconnecting && authStep === 'SCANNING' && (
          <div className="py-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-5 h-5 text-sky-600 dark:text-cyan-400 animate-spin" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Verifying Multi-Chain Domain Ownership</h3>
                <p className="text-xs text-slate-500 dark:text-[#8B949E]">Scanning live smart contracts across the 4 networks...</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.values(SUPPORTED_CHAINS).map((chain) => {
                const state = scanStatus[chain.name];
                return (
                  <div
                    key={chain.chainId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-[#21262D] text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chain.color }} />
                      <span className="text-slate-800 dark:text-white font-medium">{chain.name}</span>
                      {chain.isAuthority && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/20 font-semibold">
                          ANCHOR
                        </span>
                      )}
                    </div>
                    <div>
                      {state?.status === 'checking' && (
                        <span className="text-slate-500 dark:text-[#8B949E] flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Scanning...
                        </span>
                      )}
                      {state?.status === 'found' && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {state.domainNames && state.domainNames.length > 0
                            ? state.domainNames.join(', ')
                            : `${state.count} .i Domain${state.count === 1 ? '' : 's'}`}
                        </span>
                      )}
                      {state?.status === 'none' && (
                        <span className="text-slate-400 dark:text-[#6E7681]">0 Domains</span>
                      )}
                      {state?.status === 'error' && (
                        <span className="text-amber-500">Checked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: VERIFIED */}
        {!isReconnecting && authStep === 'VERIFIED' && verificationResult && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Identity Verified</h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-sm mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{verificationResult.primaryDomain || 'Sovereign .i Domain Owner'}</span>
            </div>

            {/* List of discovered domains across networks */}
            {verificationResult.domains.length > 0 && (
              <div className="w-full mb-4 p-3 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#21262D] text-left">
                <div className="text-[11px] font-mono text-slate-500 dark:text-[#8B949E] mb-2 font-semibold">
                  Discovered Cross-Chain Identities ({verificationResult.domains.length}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {verificationResult.domains.map((dom, idx) => {
                    const ch = SUPPORTED_CHAINS[dom.currentChainId] || SUPPORTED_CHAINS[42161];
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-xs font-mono text-slate-800 dark:text-white font-medium"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
                        <span>{dom.canonicalName}</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#6E7681]">({ch.shortName})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-[#8B949E] mb-6 max-w-sm leading-relaxed">
              Ownership confirmed across the Doti Protocol contracts.
              The dashboard operates exclusively on <span className="text-sky-600 dark:text-cyan-400 font-semibold">Arbitrum One</span>.
            </p>

            {chainId !== 42161 ? (
              <button
                onClick={handleSwitchToArbitrum}
                className="w-full py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-[#080B10] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 dark:shadow-cyan-500/20"
              >
                <Globe className="w-4 h-4" />
                Switch to Arbitrum One & Enter
              </button>
            ) : (
              <button
                onClick={() => onAuthenticated(verificationResult)}
                className="w-full py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#080B10] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Enter Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Step: DENIED */}
        {!isReconnecting && authStep === 'DENIED' && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No .i Domains Found</h2>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-mono mb-3">
              Scanned Arbitrum One, OP Mainnet, Ethereum, and Robinhood Chain.
            </p>
            <p className="text-xs text-slate-600 dark:text-[#8B949E] mb-6 max-w-sm leading-relaxed">
              Your wallet is connected, but does not currently own a sovereign <span className="font-semibold text-slate-900 dark:text-white">.i domain</span> on any supported network. Access to the AI Copilot is strictly reserved for verified domain owners.
            </p>

            <div className="w-full flex flex-col gap-2.5">
              <a
                href="https://doti.my/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-[#080B10] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 dark:shadow-cyan-500/20 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Mint .i Domain on Doti.my</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={startAuthentication}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-[#30363D] hover:bg-slate-100 dark:hover:bg-[#161B22] text-xs font-mono text-slate-700 dark:text-[#E6EDF3] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                </button>

                <button
                  onClick={() => {
                    disconnect();
                    setAuthStep('IDLE');
                    setVerificationResult(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-mono text-rose-600 dark:text-rose-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-600 dark:text-rose-300 font-mono text-center">
            {errorMessage}
          </div>
        )}
      </motion.div>
    </div>
  );
};

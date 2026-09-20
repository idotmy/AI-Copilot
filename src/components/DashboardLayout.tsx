import React, { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBalance } from 'wagmi';
import { formatEther } from 'viem';
import {
  Bot,
  PlusCircle,
  ArrowRightLeft,
  Shield,
  Send,
  Tag,
  Edit3,
  XCircle,
  ShoppingBag,
  HandCoins,
  RotateCcw,
  LogOut,
  Menu,
  X,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  Wallet,
  Globe,
  UserCheck,
} from 'lucide-react';
import { VerificationResult, DomainRecord } from '../types/doti';
import { SUPPORTED_CHAINS } from '../config/chains';
import { AiCopilot } from './AiCopilot';
import { ThemeToggle } from './ThemeToggle';
import { CommandTriggerModal, OnChainCommandType } from './CommandTriggerModal';

interface DashboardLayoutProps {
  userAddress: string;
  verification: VerificationResult;
  onDisconnect: () => void;
  onRefreshIdentity: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  userAddress,
  verification,
  onDisconnect,
  onRefreshIdentity,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCopilotPrompt, setPendingCopilotPrompt] = useState<string>('');
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active selected domain for copilot operations
  const [selectedDomain, setSelectedDomain] = useState<string>(() => {
    return verification.primaryDomain || verification.domains[0]?.canonicalName || '';
  });

  // Keep selected domain in sync when verification changes
  useEffect(() => {
    if (verification.primaryDomain) {
      setSelectedDomain(verification.primaryDomain);
    } else if (verification.domains.length > 0 && !selectedDomain) {
      setSelectedDomain(verification.domains[0].canonicalName);
    }
  }, [verification]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDomainDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch connected wallet ETH balance on Arbitrum One
  const { data: balanceData } = useBalance({
    address: userAddress as `0x${string}`,
    chainId: 42161,
  });

  // Command modal state for quick direct on-chain triggers
  const [modalCommandType, setModalCommandType] = useState<OnChainCommandType | null>(null);

  // All 11 on-chain transaction actions listed in the sidebar
  const onChainActions: {
    id: OnChainCommandType;
    label: string;
    icon: React.ReactNode;
    colorClass: string;
    badge?: string;
  }[] = [
      {
        id: 'REGISTER',
        label: 'Register .i Domain',
        icon: <PlusCircle className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />,
        colorClass: 'border-sky-500/20 hover:border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-cyan-300',
        badge: '0.001 ETH',
      },
      {
        id: 'BRIDGE',
        label: 'Cross-Chain Bridge',
        icon: <ArrowRightLeft className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />,
        colorClass: 'border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300',
        badge: 'CCIP',
      },
      {
        id: 'SET_PRIMARY',
        label: 'Set Primary Identity',
        icon: <Shield className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
        colorClass: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      },
      {
        id: 'UPDATE_PROFILE',
        label: 'Update Profile',
        icon: <Edit3 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />,
        colorClass: 'border-teal-500/20 hover:border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300',
      },
      {
        id: 'TRANSFER',
        label: 'Transfer Domain',
        icon: <Send className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
        colorClass: 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300',
      },
      {
        id: 'MARKETPLACE_LIST',
        label: 'List on Marketplace',
        icon: <Tag className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />,
        colorClass: 'border-slate-200 dark:border-[#30363D] hover:border-sky-500/40 text-slate-700 dark:text-[#E6EDF3] hover:bg-slate-100 dark:hover:bg-[#161B22]',
      },
      {
        id: 'MARKETPLACE_UPDATE_LISTING',
        label: 'Update Listing Price',
        icon: <Edit3 className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />,
        colorClass: 'border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
      },
      {
        id: 'MARKETPLACE_CANCEL_LISTING',
        label: 'Cancel Listing',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />,
        colorClass: 'border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300',
      },
      {
        id: 'MARKETPLACE_BUY',
        label: 'Buy Listed Domain',
        icon: <ShoppingBag className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />,
        colorClass: 'border-slate-200 dark:border-[#30363D] hover:border-teal-500/40 text-slate-700 dark:text-[#E6EDF3] hover:bg-slate-100 dark:hover:bg-[#161B22]',
      },
      {
        id: 'MARKETPLACE_OFFER',
        label: 'Make Offer (WETH)',
        icon: <HandCoins className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />,
        colorClass: 'border-slate-200 dark:border-[#30363D] hover:border-indigo-500/40 text-slate-700 dark:text-[#E6EDF3] hover:bg-slate-100 dark:hover:bg-[#161B22]',
      },
      {
        id: 'MARKETPLACE_ACCEPT_OFFER',
        label: 'Accept Offer',
        icon: <Shield className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
        colorClass: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      },
      {
        id: 'CHECK_OFFERS',
        label: 'Check Offers',
        icon: <HandCoins className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
        colorClass: 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300',
      },
      {
        id: 'WRAP_ETH',
        label: 'Wrap ETH to WETH',
        icon: <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />,
        colorClass: 'border-sky-500/20 hover:border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-cyan-300',
      },
      {
        id: 'UNWRAP_WETH',
        label: 'Unwrap WETH to ETH',
        icon: <RotateCcw className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />,
        colorClass: 'border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
      },
      {
        id: 'CLAIM_REFUND',
        label: 'Claim Escrow Refund',
        icon: <RotateCcw className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />,
        colorClass: 'border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300',
      },

    ];

  const handleActionClick = (type: OnChainCommandType) => {
    setModalCommandType(type);
    setMobileMenuOpen(false);
  };

  const handleModalSubmit = (prompt: string) => {
    setPendingCopilotPrompt(prompt);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-[#080B10] text-slate-800 dark:text-[#E6EDF3] flex flex-col md:flex-row transition-colors">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#0D1117] border-b border-slate-200 dark:border-[#21262D]">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-slate-900 dark:text-white">.i</span>
          <span className="text-xs font-mono text-sky-600 dark:text-cyan-400 font-semibold">Doti Sovereign</span>
        </div>
        <div className="flex items-center gap-2">
          {balanceData && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-[11px] font-mono font-semibold">
              <Wallet className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
              <span>{Number(formatEther(balanceData.value)).toFixed(3)} ETH</span>
            </div>
          )}
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-slate-700 dark:text-[#E6EDF3]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${mobileMenuOpen ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-72 bg-slate-50 dark:bg-[#0D1117] border-r border-slate-200 dark:border-[#21262D] p-4 justify-between flex-shrink-0 z-30 transition-colors h-screen overflow-y-auto`}
      >
        <div className="space-y-3.5">
          {/* Logo & Protocol Title */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-cyan-500/10 border border-sky-500/30 dark:border-cyan-500/30 flex items-center justify-center text-sky-600 dark:text-cyan-400 font-mono text-base font-black shadow-xs">
              .i
            </div>
            <div>
              <h1 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight leading-none">Doti Protocol</h1>
              <p className="text-[10px] font-mono text-sky-600 dark:text-cyan-400 mt-0.5">Sovereign Web3 Identity</p>
            </div>
          </div>

          {/* User Identity Pill with Dropdown Selector for all owned domains */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
              className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] hover:border-sky-500/50 dark:hover:border-cyan-500/50 shadow-xs transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-[#8B949E]">
                  Verified Sovereign
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {domainDropdownOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                  )}
                </div>
              </div>

              <div className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-sky-600 dark:text-cyan-400 flex-shrink-0" />
                <span className="truncate">
                  {selectedDomain || verification.primaryDomain || `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`}
                </span>
              </div>

              <div className="text-[9px] font-mono text-sky-600 dark:text-cyan-400 flex items-center justify-between">
                <span>Anchor: Arbitrum (42161)</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {verification.domains.length} Domain{verification.domains.length !== 1 ? 's' : ''} ▾
                </span>
              </div>
            </button>

            {/* Dropdown Menu listing all user domains across all chains */}
            {domainDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] rounded-xl shadow-xl p-2 space-y-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="px-1.5 py-1 text-[9px] font-mono uppercase text-slate-400 dark:text-[#6E7681] border-b border-slate-100 dark:border-[#21262D] flex items-center justify-between">
                  <span>My Domains ({verification.domains.length})</span>
                  <span>Network</span>
                </div>

                {verification.domains.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500 dark:text-[#8B949E] font-mono">
                    <p>No domains found.</p>
                    <button
                      onClick={() => {
                        setDomainDropdownOpen(false);
                        handleActionClick('REGISTER');
                      }}
                      className="mt-1.5 text-[10px] text-sky-600 dark:text-cyan-400 underline hover:no-underline font-semibold"
                    >
                      + Register on Arbitrum
                    </button>
                  </div>
                ) : (
                  verification.domains.map((dom: DomainRecord, idx: number) => {
                    const isArb = dom.currentChainId === 42161;
                    const chainMeta = SUPPORTED_CHAINS[dom.currentChainId];
                    const isSelected = (selectedDomain || verification.primaryDomain) === dom.canonicalName;

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-xs transition-colors flex items-center justify-between gap-2 ${isSelected
                          ? 'bg-sky-50 dark:bg-cyan-500/10 border-sky-300 dark:border-cyan-500/30'
                          : 'bg-slate-50/50 dark:bg-[#0D1117] border-slate-200 dark:border-[#21262D] hover:bg-slate-100 dark:hover:bg-[#21262D]'
                          }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                            <span className="truncate">{dom.canonicalName}</span>
                            {dom.isPrimary && (
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 dark:text-[#8B949E] flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chainMeta?.color || '#38bdf8' }} />
                            <span>{chainMeta?.shortName || chainMeta?.name || `Chain ${dom.currentChainId}`}</span>
                          </div>
                        </div>

                        {/* Action on each domain */}
                        {isArb ? (
                          <button
                            onClick={() => {
                              setSelectedDomain(dom.canonicalName);
                              setDomainDropdownOpen(false);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${isSelected
                              ? 'bg-sky-500 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-[#21262D] hover:bg-sky-500 hover:text-white text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                            <span>{isSelected ? 'Active' : 'Select'}</span>
                          </button>
                        ) : (
                          <a
                            href="https://doti.my/?view=bridge"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="This application supports Arbitrum One only. Bridge your domain to Arbitrum One to use it here."
                            className="px-2 py-1 rounded text-[10px] font-mono font-semibold bg-purple-100 dark:bg-purple-950/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50 flex items-center gap-1 transition-colors"
                          >
                            <span>Bridge</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* On-Chain Execution Actions List (Compact & Clean) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-[#6E7681] flex items-center gap-1">
                <Zap className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
                <span>On-Chain Commands</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 dark:text-[#6E7681]">
                {onChainActions.length} Actions
              </span>
            </div>

            <div className="space-y-1">
              {onChainActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  className={`w-full text-left py-1.5 px-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between shadow-2xs ${action.colorClass}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0">{action.icon}</span>
                    <span className="text-[11px] font-semibold truncate leading-none">
                      {action.label}
                    </span>
                  </div>
                  {action.badge && (
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-white/80 dark:bg-black/40 border border-current font-bold flex-shrink-0">
                      {action.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-3 mt-4 border-t border-slate-200 dark:border-[#21262D] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-[#8B949E] px-1">
            <span>Arbitrum One</span>
            <span className="text-emerald-500 font-semibold">ONLINE</span>
          </div>
          <button
            onClick={onDisconnect}
            className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-[#30363D] bg-white dark:bg-transparent hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-mono transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <LogOut className="w-3 h-3" />
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-200 dark:border-[#21262D] bg-white/80 dark:bg-[#0D1117]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                AI Copilot
              </h2>
            </div>
            <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-sky-50 dark:bg-cyan-500/10 
            border border-sky-200 dark:border-cyan-500/20 text-[9px] font-mono text-sky-700 dark:text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Arbitrum One (42161)
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Connected Wallet Balance */}
            {balanceData && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                <Wallet className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                <span>{Number(formatEther(balanceData.value)).toFixed(6)} ETH</span>
              </div>
            )}

            {/* RainbowKit ConnectButton */}
            <ConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus="address"
            />
            {/* Theme Toggle */}
            <ThemeToggle showLabel={false} />

          </div>
        </header>

        {/* Viewport Content - Full Height Pure AI Copilot */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="max-w-7xl mx-auto h-full">
            <AiCopilot
              userAddress={userAddress}
              verifiedDomain={selectedDomain || verification.primaryDomain}
              onRefreshIdentity={onRefreshIdentity}
              initialPrompt={pendingCopilotPrompt}
              onActionDispatched={() => setPendingCopilotPrompt('')}
            />
          </div>
        </div>
      </main>

      {/* Direct On-Chain Trigger Modal */}
      {modalCommandType && (
        <CommandTriggerModal
          isOpen={true}
          onClose={() => setModalCommandType(null)}
          commandType={modalCommandType}
          userAddress={userAddress}
          defaultDomain={selectedDomain || verification.primaryDomain || ''}
          onSubmitCommand={handleModalSubmit}
        />
      )}
    </div>
  );
};


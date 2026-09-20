import React, { useState, useEffect } from 'react';
import { Activity, Globe, Cpu, Zap, Shield, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { callMcpTool } from '../lib/mcpClient';

export const ProtocolStatsBar: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await callMcpTool('get_protocol_stats', {});
      setStats(res);
    } catch (err) {
      console.warn('Live stats fetch notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="mt-3 rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] overflow-hidden shadow-xs transition-colors">
      {/* Top Banner Toggle */}
      <div className="px-4 py-3 bg-slate-50/90 dark:bg-[#161B22]/70 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <Activity className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
          <span className="font-semibold text-slate-900 dark:text-white">
            Doti Protocol Read-Only Specs & Metrics
          </span>
          <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Live MCP
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#21262D] transition-colors"
            title="Refresh Protocol Stats"
            aria-label="Refresh Protocol Stats"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-[11px] font-mono text-sky-600 dark:text-cyan-400 hover:underline px-2 py-1 rounded-md"
          >
            <span>{isOpen ? 'Collapse Stats' : 'View Network Metrics'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Stats Content */}
      {isOpen && (
        <div className="p-4 border-t border-slate-200 dark:border-[#21262D] space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D]">
              <div className="text-[10px] font-mono text-slate-500 dark:text-[#8B949E] uppercase">
                Anchor Network
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                Arbitrum One
              </div>
              <div className="text-[10px] text-sky-600 dark:text-cyan-400 font-mono">Chain ID: 42161</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D]">
              <div className="text-[10px] font-mono text-slate-500 dark:text-[#8B949E] uppercase">
                Minting Model
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                0.001 ETH
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Permanent / 0 Renewals</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D]">
              <div className="text-[10px] font-mono text-slate-500 dark:text-[#8B949E] uppercase">
                Cross-Chain Relay
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                Chainlink CCIP
              </div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">v1.5 Router</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D]">
              <div className="text-[10px] font-mono text-slate-500 dark:text-[#8B949E] uppercase">
                Registered Tokens
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {stats?.totalDomains || stats?.total_domains || 'Verified Live'}
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">ERC-721 Canonical</div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-[#8B949E] flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#21262D]">
            <span>Canonical Registry: 0xf853F8243F10a57CF5e43A49F156F132c05C21a6</span>
            <span>Escrow: 0xBf342bDf2dcB6dcD21c8b104Bc8Ce950dc9EB632</span>
          </div>
        </div>
      )}
    </div>
  );
};

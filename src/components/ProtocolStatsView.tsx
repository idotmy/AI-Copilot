import React, { useState, useEffect } from 'react';
import { Shield, Layers, Activity, ExternalLink, RefreshCw, Cpu } from 'lucide-react';
import { SUPPORTED_CHAINS } from '../config/chains';
import { callMcpTool } from '../lib/mcpClient';

export const ProtocolStatsView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await callMcpTool('get_protocol_stats', {});
      setStats(res);
    } catch (err) {
      console.warn('Stats fetch notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#161B22] border border-[#30363D]">
          <div className="text-xs font-mono text-[#8B949E] uppercase tracking-wider mb-1">
            Registered Identities
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalDomains || stats?.total_domains || 'Live On-Chain'}
          </div>
          <div className="text-[11px] text-cyan-400 font-mono mt-1">Permanent lifetime lifespan</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#161B22] border border-[#30363D]">
          <div className="text-xs font-mono text-[#8B949E] uppercase tracking-wider mb-1">
            Active Networks
          </div>
          <div className="text-2xl font-bold text-white font-mono">4 Chains</div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1">Chainlink CCIP Mirrored</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#161B22] border border-[#30363D]">
          <div className="text-xs font-mono text-[#8B949E] uppercase tracking-wider mb-1">
            Settlement Model
          </div>
          <div className="text-2xl font-bold text-white font-mono">0.001 ETH</div>
          <div className="text-[11px] text-purple-400 font-mono mt-1">Zero annual renewal tax</div>
        </div>
      </div>

      {/* Network Specifications Table */}
      <div className="p-6 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#21262D]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Decentralized Network & CCIP Topology
          </h3>
          <span className="text-xs font-mono text-[#8B949E]">4 Connected Chains</span>
        </div>

        <div className="space-y-3">
          {Object.values(SUPPORTED_CHAINS).map((chain) => (
            <div
              key={chain.chainId}
              className="p-4 rounded-xl bg-[#0D1117] border border-[#21262D] space-y-2 text-xs font-mono"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chain.color }} />
                  <span className="text-white font-bold text-sm">{chain.name}</span>
                  <span className="text-[11px] text-[#8B949E]">Chain ID: {chain.chainId}</span>
                  {chain.isAuthority ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                      MASTER AUTHORITY ANCHOR
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#161B22] text-[#8B949E] border border-[#30363D]">
                      CCIP SATELLITE
                    </span>
                  )}
                </div>

                <a
                  href={chain.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-[#21262D]/60 text-[#8B949E]">
                <div>
                  <span className="block text-[10px] text-[#6E7681]">REGISTRY CONTRACT</span>
                  <span className="text-white font-mono">{chain.contractAddress.slice(0, 10)}...{chain.contractAddress.slice(-6)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#6E7681]">CCIP ROUTER</span>
                  <span className="text-white font-mono">{chain.routerAddress.slice(0, 10)}...{chain.routerAddress.slice(-6)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#6E7681]">CCIP SELECTOR</span>
                  <span className="text-cyan-400 font-mono">{chain.ccipSelector}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

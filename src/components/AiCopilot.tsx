import React, { useState, useRef, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useSignTypedData } from 'wagmi';
import { parseEther, keccak256, toHex, parseAbi } from 'viem';
import {
  Send,
  User,
  Sparkles,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Zap,
  ArrowUpRight,
  Key,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ChatMessage } from '../types/doti';
import {
  DOT_I_ERC721_ABI,
  MARKETPLACE_ABI,
  ESCROW_ABI,
  CCIP_ROUTER_ABI,
  WETH_ABI,
} from '../config/contracts';
import {
  SUPPORTED_CHAINS,
  REGISTRATION_PRICE_ETH,
  MARKETPLACE_CONTRACT_ARBITRUM,
  WETH_CONTRACT_ARBITRUM,
} from '../config/chains';

import { calculateExactBridgeFeeAndGas } from '../utils/bridgeFee';
import { checkMarketplaceApproval, buildListingTypedData, buildCancelListingTypedData } from '../utils/marketplace';
import { ApiKeyModal } from './ApiKeyModal';
import { ElegantToast } from './ElegantToast';
import { ChatMessageContent } from './ChatMessageContent';
import { ProtocolStatsBar } from './ProtocolStatsBar';
import { parseRpcError, CleanRpcError } from '../lib/errorHandler';

interface AiCopilotProps {
  userAddress: string;
  verifiedDomain?: string;
  onRefreshIdentity?: () => void;
  initialPrompt?: string;
  onActionDispatched?: () => void;
}

export const AiCopilot: React.FC<AiCopilotProps> = ({
  userAddress,
  verifiedDomain,
  onRefreshIdentity,
  initialPrompt,
  onActionDispatched,
}) => {
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const publicClient = usePublicClient();

  // BYOK (Bring Your Own Key) Gemini API Key State
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('doti_gemini_api_key') || '';
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const handleSaveKey = (key: string) => {
    setCustomApiKey(key);
    if (key) {
      localStorage.setItem('doti_gemini_api_key', key);
    } else {
      localStorage.removeItem('doti_gemini_api_key');
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Greetings sovereign user. I am your **Doti AI Copilot**, equipped with full coverage for **all 19 official Doti Protocol tools** on **Arbitrum One**.\n\nYou can talk to me in natural language to perform any action on-chain:\n- *"Register satoshi.i"* (Permanent identity)\n- *"Set vitalik.i as my primary domain"*\n- *"Transfer my domain to 0x123..."*\n- *"List my domain for 0.05 ETH on the marketplace"*\n- *"Bridge my domain to Optimism via CCIP"*\n- *"Check availability for agent.i"* or *"Show protocol stats"*\n\nAll owner commands are secured by **on-chain domain ownership verification** before execution.`,
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [txExecuting, setTxExecuting] = useState(false);
  const [executingActionKey, setExecutingActionKey] = useState<string | null>(null);
  const [completedActionKeys, setCompletedActionKeys] = useState<Record<string, boolean>>({});
  const [cancelledActionKeys, setCancelledActionKeys] = useState<Record<string, boolean>>({});
  const [txError, setTxError] = useState<string | null>(null);
  const [cleanError, setCleanError] = useState<CleanRpcError | null>(null);

  const handleCancelAction = (cardKey: string) => {
    setCancelledActionKeys((prev) => ({ ...prev, [cardKey]: true }));
    if (executingActionKey === cardKey) {
      setTxExecuting(false);
      setExecutingActionKey(null);
    }
  };

  const handleRestoreAction = (cardKey: string) => {
    setCancelledActionKeys((prev) => {
      const next = { ...prev };
      delete next[cardKey];
      return next;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isTxSuccess) {
      setTxExecuting(false);
      if (executingActionKey) {
        setCompletedActionKeys((prev) => ({ ...prev, [executingActionKey]: true }));
        setExecutingActionKey(null);
      }
      onRefreshIdentity?.();
    }
  }, [isTxSuccess]);

  // Handle incoming commands dispatched from sidebar / direct action buttons
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      onActionDispatched?.();
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userAddress,
          verifiedDomain,
          customApiKey: customApiKey || undefined,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`AI service responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'I completed your request using live protocol data.',
        timestamp: Date.now(),
        toolInvocations: data.toolInvocations,
        actionCard: data.actionCard,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `AI Copilot notice: ${err?.message || 'Failed to reach AI service'}. You can click "Connect AI Key" above to use your own Gemini API key directly.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Unified On-Chain Action Executor across all 19 tools
  const handleExecuteAction = async (action: ChatMessage['actionCard']) => {
    if (!action) return;
    const actionKey = action.id || action.title || `${action.type}-${action.domainName}`;
    setExecutingActionKey(actionKey);
    setTxExecuting(true);
    setTxError(null);
    setCleanError(null);
    setTxHash(undefined);

    const arb = SUPPORTED_CHAINS[42161];

    try {
      const domainStr = (action.domainName || action.params?.domainName || '').trim().toLowerCase();
      const rawLabel = domainStr.replace(/\.i$/i, '');
      const fullDomain = rawLabel ? `${rawLabel}.i` : '';
      const dHash = keccak256(toHex(fullDomain));

      switch (action.type) {
        case 'REGISTER': {
          const hash = await writeContractAsync({
            address: arb.contractAddress as `0x${string}`,
            abi: DOT_I_ERC721_ABI,
            functionName: 'register',
            args: [rawLabel, BigInt(arb.ccipSelector)],
            value: parseEther(action.priceEth || REGISTRATION_PRICE_ETH),
          });
          setTxHash(hash);
          break;
        }

        case 'SET_PRIMARY': {
          const hash = await writeContractAsync({
            address: arb.contractAddress as `0x${string}`,
            abi: DOT_I_ERC721_ABI,
            functionName: 'setPrimaryDomain',
            args: [dHash],
          });
          setTxHash(hash);
          break;
        }

        case 'UPDATE_PROFILE': {
          const p = action.params || {};
          let socialsObj = p.socialLinks || {};
          if (typeof socialsObj === 'string') {
            try {
              socialsObj = JSON.parse(socialsObj);
            } catch {
              socialsObj = {};
            }
          }
          const websiteVal = p.websiteUrl || p.website || socialsObj.website || '';
          const socialsJson = JSON.stringify({
            website: websiteVal,
            twitter: socialsObj.twitter || p.twitter || '',
            discord: socialsObj.discord || p.discord || '',
            linkedin: socialsObj.linkedin || p.linkedin || '',
            github: socialsObj.github || p.github || '',
            farcaster: socialsObj.farcaster || p.farcaster || '',
            telegram: socialsObj.telegram || p.telegram || '',
          });

          let formattedCustomLinks: Array<{ title: string; url: string }> = [];
          try {
            const rawCustom = typeof p.customLinks === 'string' ? JSON.parse(p.customLinks) : (p.customLinks || []);
            if (Array.isArray(rawCustom)) {
              formattedCustomLinks = rawCustom.map((item: any) => ({
                title: String(item.title || item.label || item.name || '').trim(),
                url: String(item.url || item.link || '').trim(),
              })).filter((item: any) => item.url.length > 0);
            }
          } catch {
            formattedCustomLinks = [];
          }
          const customLinksJson = JSON.stringify(formattedCustomLinks);
          
          let cleanAvatar = (p.profileImageCid || p.avatarCid || p.avatar || '').trim().replace(/^ipfs:\/\//i, '');
          if (!cleanAvatar) {
            cleanAvatar = 'bafkreibjapnr3drrk4bjkudfj7hudvd3ca6ugwgdudoiutdbh6qgozztma';
          }

          const profilePayload = {
            imageMode: 'CUSTOM_IPFS',
            avatarCid: cleanAvatar,
            socialsJson,
            customLinksJson,
          };

          let gasLimit = 220000n;
          if (publicClient && userAddress) {
            try {
              const est = await publicClient.estimateContractGas({
                address: arb.contractAddress as `0x${string}`,
                abi: DOT_I_ERC721_ABI,
                functionName: 'updateProfile',
                args: [dHash, profilePayload],
                account: userAddress as `0x${string}`,
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
          break;
        }

        case 'TRANSFER': {
          const newOwner = (action.params?.newOwner || '') as `0x${string}`;
          if (!newOwner.startsWith('0x')) throw new Error('Invalid newOwner address');

          // Query the true activeTokenId from the on-chain Arbitrum One registry
          let actualTokenId: bigint;
          try {
            const regData = (await publicClient?.readContract({
              address: arb.contractAddress as `0x${string}`,
              abi: DOT_I_ERC721_ABI,
              functionName: 'registry',
              args: [dHash],
            })) as any;

            if (regData && regData[4] !== undefined && BigInt(regData[4]) > 0n) {
              actualTokenId = BigInt(regData[4]);
            } else if (action.params?.activeTokenId && BigInt(action.params.activeTokenId) > 0n) {
              actualTokenId = BigInt(action.params.activeTokenId);
            } else {
              throw new Error(`Active Token ID for domain "${action.domainName}" was not found on-chain.`);
            }
          } catch (readErr: any) {
            console.error('Error fetching on-chain tokenId for transfer:', readErr);
            throw new Error(`Failed to resolve token ID for ${action.domainName}: ${readErr?.message || 'Token not found'}`);
          }

          const hash = await writeContractAsync({
            address: arb.contractAddress as `0x${string}`,
            abi: DOT_I_ERC721_ABI,
            functionName: 'transferFrom',
            args: [userAddress as `0x${string}`, newOwner, actualTokenId],
          });
          setTxHash(hash);
          break;
        }

        case 'BRIDGE': {
          const destId = action.targetChainId || 10;
          const targetChain = SUPPORTED_CHAINS[destId] || SUPPORTED_CHAINS[10];

          let bridgeValue = parseEther('0.000044');
          let gasLimit = 600000n;

          if (publicClient && userAddress) {
            try {
              const quote = await calculateExactBridgeFeeAndGas(
                publicClient,
                userAddress as `0x${string}`,
                rawLabel,
                destId,
                42161
              );
              bridgeValue = quote.value;
              gasLimit = quote.gasLimit;
            } catch (err: any) {
              console.warn('Exact fee quote calculation error:', err);
              throw err;
            }
          }

          const hash = await writeContractAsync({
            address: arb.contractAddress as `0x${string}`,
            abi: DOT_I_ERC721_ABI,
            functionName: 'bridgeDomain',
            args: [dHash, BigInt(targetChain.ccipSelector)],
            value: bridgeValue,
            gas: gasLimit,
          });
          setTxHash(hash);
          break;
        }

        case 'MARKETPLACE_LIST': {
          const priceEth = action.priceEth || action.params?.priceEth || action.params?.priceInEth || '0.05';
          const durationDays = action.params?.durationDays || 30;

          if (!publicClient) throw new Error('Public client unavailable');

          // Step 1: Verify on-chain operator approval on the Doti Registry
          const isApproved = await checkMarketplaceApproval(publicClient, userAddress as `0x${string}`);
          if (!isApproved) {
            const arb = SUPPORTED_CHAINS[42161];
            const approvalHash = await writeContractAsync({
              address: arb.contractAddress as `0x${string}`,
              abi: parseAbi(['function setApprovalForAll(address operator, bool approved)']),
              functionName: 'setApprovalForAll',
              args: [MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`, true],
            });
            setTxHash(approvalHash);
            setMessages((prev) => [
              ...prev,
              {
                id: `approve-marketplace-${Date.now()}`,
                role: 'assistant',
                content: `Marketplace approval transaction dispatched (\`${approvalHash.slice(0, 10)}...\`). Once confirmed, click **Execute Action** again to sign the gasless listing!`,
                timestamp: Date.now(),
              },
            ]);
            break;
          }

          // Step 2: Gasless EIP-712 Order Signature
          const typedData = buildListingTypedData({
            domainName: fullDomain,
            seller: userAddress as `0x${string}`,
            priceEth,
            durationDays,
            tokenId: 1n,
          });

          const signature = await signTypedDataAsync({
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
          });

          // Step 3: Register order on the marketplace
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

          setTxExecuting(false);
          setExecutingActionKey(null);
          setCompletedActionKeys((prev) => ({ ...prev, [actionKey]: true }));

          setMessages((prev) => [
            ...prev,
            {
              id: `list-success-${Date.now()}`,
              role: 'assistant',
              content: `Listed domain **${fullDomain}** on the marketplace for **${priceEth} ETH**!\n\nYour listing is signed via EIP-712 and tradeable across the protocol with 2% marketplace fees.`,
              timestamp: Date.now(),
            },
          ]);
          break;
        }

        case 'MARKETPLACE_BUY': {
          const targetHash = (action.params?.domainHash || dHash) as `0x${string}`;
          const hash = await writeContractAsync({
            address: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
            abi: MARKETPLACE_ABI,
            functionName: 'buy',
            args: [targetHash],
            value: parseEther(action.priceEth || '0.01'),
          });
          setTxHash(hash);
          break;
        }

        case 'MARKETPLACE_MAKE_OFFER': {
          const offerPrice = action.priceEth || action.params?.offerPriceInEth || '0.02';
          const offerAmountWei = parseEther(offerPrice);
          const durationDays = action.params?.durationDays || 7;
          const durationSec = BigInt(durationDays * 86400);

          if (!publicClient) throw new Error('Public client unavailable');

          // Step 1: Verify WETH allowance for Marketplace contract
          const currentAllowance = await publicClient.readContract({
            address: WETH_CONTRACT_ARBITRUM as `0x${string}`,
            abi: WETH_ABI,
            functionName: 'allowance',
            args: [userAddress as `0x${string}`, MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`],
          });

          if (currentAllowance < offerAmountWei) {
            const approveHash = await writeContractAsync({
              address: WETH_CONTRACT_ARBITRUM as `0x${string}`,
              abi: WETH_ABI,
              functionName: 'approve',
              args: [MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`, offerAmountWei],
            });
            setTxHash(approveHash);
            setMessages((prev) => [
              ...prev,
              {
                id: `approve-weth-${Date.now()}`,
                role: 'assistant',
                content: `WETH Approval transaction submitted (\`${approveHash.slice(0, 10)}...\`). Once confirmed, click **Execute Action** again to finalize your ${offerPrice} WETH offer for ${fullDomain}!`,
                timestamp: Date.now(),
              },
            ]);
            break;
          }

          // Step 2: Make offer on Marketplace
          const hash = await writeContractAsync({
            address: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
            abi: MARKETPLACE_ABI,
            functionName: 'makeOffer',
            args: [dHash, durationSec],
          });
          setTxHash(hash);
          break;
        }

        case 'WRAP_ETH': {
          const amount = action.priceEth || action.params?.amountEth || '0.01';
          const hash = await writeContractAsync({
            address: WETH_CONTRACT_ARBITRUM as `0x${string}`,
            abi: WETH_ABI,
            functionName: 'deposit',
            args: [],
            value: parseEther(amount),
          });
          setTxHash(hash);
          break;
        }

        case 'UNWRAP_WETH': {
          const amount = action.priceEth || action.params?.amountWeth || '0.01';
          const hash = await writeContractAsync({
            address: WETH_CONTRACT_ARBITRUM as `0x${string}`,
            abi: WETH_ABI,
            functionName: 'withdraw',
            args: [parseEther(amount)],
          });
          setTxHash(hash);
          break;
        }

        case 'MARKETPLACE_ACCEPT_OFFER': {
          const buyer = (action.params?.buyerAddress || '') as `0x${string}`;
          if (!publicClient) throw new Error('Public client unavailable');

          const isApproved = await checkMarketplaceApproval(publicClient, userAddress as `0x${string}`);
          if (!isApproved) {
            const arb = SUPPORTED_CHAINS[42161];
            const approvalHash = await writeContractAsync({
              address: arb.contractAddress as `0x${string}`,
              abi: parseAbi(['function setApprovalForAll(address operator, bool approved)']),
              functionName: 'setApprovalForAll',
              args: [MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`, true],
            });
            setTxHash(approvalHash);
            setMessages((prev) => [
              ...prev,
              {
                id: `approve-marketplace-accept-${Date.now()}`,
                role: 'assistant',
                content: `Marketplace approval transaction submitted (\`${approvalHash.slice(0, 10)}...\`). Once confirmed, click **Execute Action** to accept the buyer's offer!`,
                timestamp: Date.now(),
              },
            ]);
            break;
          }

          const hash = await writeContractAsync({
            address: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
            abi: MARKETPLACE_ABI,
            functionName: 'acceptOffer',
            args: [dHash, buyer],
          });
          setTxHash(hash);
          break;
        }

        case 'MARKETPLACE_CANCEL_LISTING': {
          if (!userAddress) throw new Error('Wallet not connected');

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
            const hash = await writeContractAsync({
              address: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
              abi: MARKETPLACE_ABI,
              functionName: 'cancelListing',
              args: [dHash],
            });
            setTxHash(hash);
            break;
          }

          setTxExecuting(false);
          setExecutingActionKey(null);
          setCompletedActionKeys((prev) => ({ ...prev, [actionKey]: true }));

          setMessages((prev) => [
            ...prev,
            {
              id: `cancel-list-success-${Date.now()}`,
              role: 'assistant',
              content: `Cancelled listing for domain **${fullDomain}**. It has been delisted from the marketplace and is securely retained in your wallet.`,
              timestamp: Date.now(),
            },
          ]);
          break;
        }

        case 'MARKETPLACE_CANCEL_OFFER': {
          const hash = await writeContractAsync({
            address: MARKETPLACE_CONTRACT_ARBITRUM as `0x${string}`,
            abi: MARKETPLACE_ABI,
            functionName: 'cancelOffer',
            args: [dHash],
          });
          setTxHash(hash);
          break;
        }

        case 'CLAIM_ESCROW_REFUND': {
          const rawEscrow = action.params?.escrowId || dHash;
          const escrowBytes32 = (
            typeof rawEscrow === 'string' && rawEscrow.startsWith('0x') && rawEscrow.length === 66
              ? rawEscrow
              : keccak256(toHex(String(rawEscrow)))
          ) as `0x${string}`;

          const hash = await writeContractAsync({
            address: arb.escrowAddress as `0x${string}`,
            abi: ESCROW_ABI,
            functionName: 'claimRefund',
            args: [escrowBytes32],
          });
          setTxHash(hash);
          break;
        }


        default:
          throw new Error(`Action type ${action.type} is not mapped to on-chain execution.`);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      const parsed = parseRpcError(err);
      setCleanError(parsed);
      setTxError(parsed.message);
      setTxExecuting(false);
    }
  };

  const samplePrompts = [
    'Is Doti protocol active or paused?',
    'How many domains are listed on marketplace?',
    'Show total minted domains on Arbitrum',
  ];

  return (
    <div className="flex flex-col h-[740px] rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] overflow-hidden shadow-sm">
      {/* Header with BYOK Connection Status & Security Badge */}
      <div className="p-4 border-b border-slate-200 dark:border-[#21262D] bg-slate-50/80 dark:bg-[#161B22]/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center text-sky-600 dark:text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Doti Protocol MCP Server
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 19 Tools Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8B949E]">
              Natural language to on-chain execution with strict owner verification
            </p>
          </div>
        </div>

        {/* Bring Your Own Key (BYOK) button */}
        <button
          onClick={() => setIsKeyModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${customApiKey
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            : 'bg-white dark:bg-[#21262D] border-slate-200 dark:border-[#30363D] text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-cyan-400'
            }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>{customApiKey ? 'AI Key Connected' : 'Connect AI Key'}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30 shrink-0 flex items-center justify-center text-sky-600 dark:text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-sky-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-slate-800 dark:text-[#E6EDF3] rounded-bl-none shadow-xs'
                  }`}
              >
                <ChatMessageContent content={msg.content} />

                {/* Tool Invocations Badge */}
                {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#30363D]/80 flex flex-wrap gap-2">
                    {msg.toolInvocations.map((t, idx) => (
                      <div
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${t.status === 'error'
                          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400'
                          : 'bg-white dark:bg-[#0D1117] border-slate-200 dark:border-[#21262D] text-sky-700 dark:text-cyan-400'
                          }`}
                      >
                        {t.status === 'error' ? (
                          <ShieldAlert className="w-3 h-3 text-rose-500" />
                        ) : (
                          <Zap className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
                        )}
                        <span>MCP: {t.toolName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive On-Chain Action Card */}
              {msg.actionCard && (
                <div className="p-4 rounded-xl bg-white dark:bg-[#161B22] border border-sky-300 dark:border-cyan-500/40 shadow-md max-w-md animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {(() => {
                    const cardKey = msg.actionCard.id || msg.actionCard.title || `${msg.actionCard.type}-${msg.actionCard.domainName}`;
                    const isCompleted = completedActionKeys[cardKey];
                    const isCancelled = cancelledActionKeys[cardKey];
                    const isExecuting = (txExecuting || isTxConfirming) && executingActionKey === cardKey;

                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 font-semibold border border-sky-200 dark:border-transparent">
                              Action Ready // {msg.actionCard.type}
                            </span>
                            {isCancelled && (
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold">
                                Cancelled
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-slate-900 dark:text-white font-semibold">
                            {msg.actionCard.priceEth ? `${msg.actionCard.priceEth} ETH` : 'Gas Only'}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center justify-between gap-2">
                          <span>{msg.actionCard.title}</span>
                          {msg.actionCard.params?.durationDays && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#8B949E]">
                              Duration: {msg.actionCard.params.durationDays}d
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-[#8B949E] mb-4 leading-relaxed">
                          {msg.actionCard.description}
                        </p>

                        {isCompleted ? (
                          <div className="w-full py-2.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Action Completed Successfully</span>
                          </div>
                        ) : isCancelled ? (
                          <div className="w-full py-2.5 px-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                                <X className="w-3 h-3 stroke-[2.5]" />
                              </div>
                              <span>Transaction Cancelled / Dismissed</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestoreAction(cardKey)}
                              className="text-[11px] underline text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              Restore
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleExecuteAction(msg.actionCard)}
                              disabled={txExecuting || isTxConfirming}
                              className="flex-1 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-50 text-white dark:text-[#080B10] font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            >
                              {isExecuting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Signing & Confirming on Arbitrum...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>Sign & Execute on Arbitrum One</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCancelAction(cardKey)}
                              disabled={txExecuting || isTxConfirming}
                              title="Cancel / Dismiss Transaction"
                              aria-label="Cancel Transaction"
                              className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-40"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {txHash && (
                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#8B949E]">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {isTxSuccess ? 'Confirmed on Arbitrum' : 'Submitted to Mempool'}
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
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-cyan-600/20 border border-sky-300 dark:border-cyan-500/30 shrink-0 flex items-center justify-center text-sky-700 dark:text-cyan-400">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-slate-500 dark:text-[#8B949E] font-mono">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center text-sky-600 dark:text-cyan-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <span>AI Copilot verifying on-chain ownership & consulting Doti MCP tools...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Prompts */}
      <div className="px-5 py-2.5 border-t border-slate-200 dark:border-[#21262D] bg-slate-50 dark:bg-[#161B22]/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-mono text-slate-400 dark:text-[#6E7681] whitespace-nowrap">
          Suggested:
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="text-[11px] px-3 py-1 rounded-full bg-white dark:bg-[#161B22] hover:bg-slate-100 dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-white whitespace-nowrap transition-colors flex items-center gap-1 shadow-xs"
          >
            <span>{p}</span>
            <ArrowUpRight className="w-2.5 h-2.5" />
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-200 dark:border-[#21262D] bg-slate-50/90 dark:bg-[#161B22]/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Type any command in plain English (e.g. 'Register genesis.i', 'Transfer domain to 0x...')..."
            disabled={isLoading}
            className="flex-1 bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-[#30363D] focus:border-sky-500 dark:focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#6E7681] focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="p-3 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-40 text-white dark:text-[#080B10] font-semibold transition-all duration-150 flex items-center justify-center shadow-md shadow-sky-500/10 dark:shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Protocol Live Stats below chat */}
      <ProtocolStatsBar />

      {/* BYOK Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={customApiKey}
        onSaveKey={handleSaveKey}
      />

      {/* Elegant Toast Error Popup */}
      <ElegantToast
        error={cleanError}
        onClose={() => setCleanError(null)}
      />
    </div>
  );
};

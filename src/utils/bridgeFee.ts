import { PublicClient, encodeFunctionData, formatEther, parseEther, keccak256, stringToBytes, parseAbi } from 'viem';
import { SUPPORTED_CHAINS } from '../config/chains';
import { DOT_I_ERC721_ABI } from '../config/contracts';

const SATELLITE_BRIDGE_ABI = parseAbi([
  'function estimateBridgeBackFee(bytes32 domainHash) view returns (uint256)',
  'function bridgeBackToArbitrum(bytes32 domainHash) payable',
]);

export interface BridgeQuoteResult {
  value: bigint;
  valueEth: string;
  gasLimit: bigint;
  userBalance: bigint;
  userBalanceEth: string;
  hasSufficientBalance: boolean;
  minRequiredWei: bigint;
  minRequiredEth: string;
}

// Typical CCIP fallback minimum fees for known networks in case of 0-balance RPC simulation limit
const KNOWN_CCIP_FALLBACK_FEES: Record<number, bigint> = {
  10: 45_000_000_000_000n, // ~0.000045 ETH for Optimism
  4663: 188_000_000_000_000n, // ~0.000188 ETH for Robinhood Chain
  1: 1_850_000_000_000_000n, // ~0.00185 ETH for Ethereum Mainnet (L1 gas costs)
  137: 120_000_000_000_000n, // ~0.00012 ETH for Polygon
  8453: 45_000_000_000_000n, // ~0.000045 ETH for Base
};

/**
 * Calculates the exact required on-chain CCIP bridge fee and gas limit using
 * binary search simulation against the live contract.
 */
export async function calculateExactBridgeFeeAndGas(
  publicClient: PublicClient,
  userAddress: `0x${string}`,
  cleanDomain: string,
  targetChainId: number,
  sourceChainId: number = 42161
): Promise<BridgeQuoteResult> {
  const sourceChain = SUPPORTED_CHAINS[sourceChainId] || SUPPORTED_CHAINS[42161];
  const targetChain = SUPPORTED_CHAINS[targetChainId] || SUPPORTED_CHAINS[10];

  const fullDomain = cleanDomain.endsWith('.i') ? cleanDomain.toLowerCase() : `${cleanDomain.toLowerCase()}.i`;
  const domainHash = keccak256(stringToBytes(fullDomain));

  let userBalance = 0n;
  try {
    userBalance = await publicClient.getBalance({ address: userAddress });
  } catch (err) {
    console.warn('Failed to fetch user balance:', err);
  }

  if (sourceChain.isAuthority) {
    const data = encodeFunctionData({
      abi: DOT_I_ERC721_ABI,
      functionName: 'bridgeDomain',
      args: [domainHash, BigInt(targetChain.ccipSelector)],
    });

    const canCall = async (val: bigint) => {
      try {
        await publicClient.call({
          account: userAddress,
          to: sourceChain.contractAddress as `0x${string}`,
          data,
          value: val,
        });
        return true;
      } catch {
        return false;
      }
    };

    // If user has balance, test binary search dynamically
    let minRequired = 0n;
    const testMax = userBalance > parseEther('0.05') ? parseEther('0.05') : userBalance;

    if (testMax > 0n && (await canCall(testMax))) {
      let low = 0n;
      let high = testMax;
      const epsilon = 1_000_000_000n; // 1 Gwei precision

      while (high - low > epsilon) {
        const mid = (low + high) / 2n;
        if (await canCall(mid)) {
          high = mid;
        } else {
          low = mid;
        }
      }
      minRequired = high;
    } else {
      // Fallback to live known CCIP oracle benchmark for this destination chain
      minRequired = KNOWN_CCIP_FALLBACK_FEES[targetChainId] || 150_000_000_000_000n;
    }

    const finalValue = minRequired + minRequired / 20n + 1_000_000_000n; // +5% safety buffer
    const hasSufficientBalance = userBalance >= finalValue;

    // Estimate gas or safe default
    let gasLimit = 650_000n;
    if (hasSufficientBalance) {
      try {
        const gasEst = await publicClient.estimateGas({
          account: userAddress,
          to: sourceChain.contractAddress as `0x${string}`,
          data,
          value: finalValue,
        });
        gasLimit = (gasEst * 120n) / 100n;
      } catch (e) {
        // Fallback default
      }
    }

    return {
      value: finalValue,
      valueEth: formatEther(finalValue),
      gasLimit,
      userBalance,
      userBalanceEth: formatEther(userBalance),
      hasSufficientBalance,
      minRequiredWei: minRequired,
      minRequiredEth: formatEther(minRequired),
    };
  } else {
    // Satellite to Authority bridging
    let estimatedFee = 50_000_000_000_000n;
    try {
      const fee = await publicClient.readContract({
        address: sourceChain.contractAddress as `0x${string}`,
        abi: SATELLITE_BRIDGE_ABI,
        functionName: 'estimateBridgeBackFee',
        args: [domainHash],
      });
      if (fee && typeof fee === 'bigint') {
        estimatedFee = fee;
      }
    } catch {
      // Fallback
    }

    const finalValue = estimatedFee + estimatedFee / 10n;
    return {
      value: finalValue,
      valueEth: formatEther(finalValue),
      gasLimit: 500_000n,
      userBalance,
      userBalanceEth: formatEther(userBalance),
      hasSufficientBalance: userBalance >= finalValue,
      minRequiredWei: estimatedFee,
      minRequiredEth: formatEther(estimatedFee),
    };
  }
}

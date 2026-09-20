export interface CleanRpcError {
  title: string;
  message: string;
  isUserRejection: boolean;
  technicalDetails?: string;
}

export function parseRpcError(err: any): CleanRpcError {
  const rawMsg = (err?.message || err?.shortMessage || (typeof err === 'string' ? err : 'Unknown error')).toString();

  // User canceled / rejected transaction in wallet (MetaMask, Rabby, Rainbow, etc.)
  const isUserRejection =
    rawMsg.includes('User rejected the request') ||
    rawMsg.includes('User denied transaction') ||
    rawMsg.includes('user rejected transaction') ||
    rawMsg.includes('User rejected') ||
    rawMsg.includes('ACTION_REJECTED') ||
    rawMsg.includes('4001') ||
    rawMsg.includes('Transaction was rejected');

  if (isUserRejection) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet. No funds or gas were deducted.',
      isUserRejection: true,
    };
  }

  // Insufficient balance
  if (rawMsg.includes('insufficient funds') || rawMsg.includes('exceeds balance') || rawMsg.includes('InsufficientBalance')) {
    return {
      title: 'Insufficient ETH Balance',
      message: 'Your wallet does not have enough ETH on Arbitrum One to cover the registration/action fee and gas.',
      isUserRejection: false,
      technicalDetails: rawMsg.slice(0, 300),
    };
  }

  // Domain not available or already registered
  if (rawMsg.includes('DomainAlreadyRegistered') || rawMsg.includes('already registered')) {
    return {
      title: 'Domain Already Registered',
      message: 'This sovereign .i domain has already been minted by another identity on Arbitrum One.',
      isUserRejection: false,
    };
  }

  // Execution Reverted
  if (rawMsg.includes('execution reverted') || rawMsg.includes('revert')) {
    const reasonMatch = rawMsg.match(/reverted with reason string '([^']+)'/) || rawMsg.match(/reason: '([^']+)'/);
    const customReason = reasonMatch ? reasonMatch[1] : 'Contract conditions not met or unauthorized operation.';
    return {
      title: 'Transaction Reverted',
      message: customReason,
      isUserRejection: false,
      technicalDetails: rawMsg.slice(0, 300),
    };
  }

  // Network or chain mismatch
  if (rawMsg.includes('network mismatch') || rawMsg.includes('Chain mismatch') || rawMsg.includes('wrong network')) {
    return {
      title: 'Wrong Network',
      message: 'Please switch your connected wallet network to Arbitrum One (Chain ID: 42161).',
      isUserRejection: false,
    };
  }

  // Default clean fallback
  return {
    title: 'Transaction Failed',
    message: 'The on-chain transaction could not be completed. Please check your connection and balance.',
    isUserRejection: false,
    technicalDetails: rawMsg.length > 350 ? rawMsg.slice(0, 350) + '...' : rawMsg,
  };
}

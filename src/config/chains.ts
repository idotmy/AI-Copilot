import { ChainConfig } from '../types/doti';

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    isAuthority: true,
    ccipSelector: '4949039107694359620',
    contractAddress: '0xf853F8243F10a57CF5e43A49F156F132c05C21a6',
    escrowAddress: '0xBf342bDf2dcB6dcD21c8b104Bc8Ce950dc9EB632',
    routerAddress: '0x141fa059441E0ca23ce184B6A78bafD2A517DdE8',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    explorerTxUrl: 'https://arbiscan.io/tx/',
    color: '#28A0F0',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    badgeBorder: 'border-cyan-500/40',
  },
  10: {
    chainId: 10,
    name: 'OP Mainnet',
    shortName: 'Optimism',
    isAuthority: false,
    ccipSelector: '3734403246176062136',
    contractAddress: '0xf853F8243F10a57CF5e43A49F156F132c05C21a6',
    escrowAddress: '0xBf342bDf2dcB6dcD21c8b104Bc8Ce950dc9EB632',
    routerAddress: '0x3206695CaE29952f4b0c22a169725a865bc8Ce0f',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerTxUrl: 'https://optimistic.etherscan.io/tx/',
    color: '#FF0420',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    badgeBorder: 'border-rose-500/40',
  },
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    isAuthority: false,
    ccipSelector: '5009297550715157269',
    contractAddress: '0xf853F8243F10a57CF5e43A49F156F132c05C21a6',
    escrowAddress: '0xBf342bDf2dcB6dcD21c8b104Bc8Ce950dc9EB632',
    routerAddress: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
    rpcUrl: 'https://eth.drpc.org',
    explorerUrl: 'https://etherscan.io',
    explorerTxUrl: 'https://etherscan.io/tx/',
    color: '#627EEA',
    badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    badgeBorder: 'border-indigo-500/40',
  },
  4663: {
    chainId: 4663,
    name: 'Robinhood Chain',
    shortName: 'Robinhood',
    isAuthority: false,
    ccipSelector: '6180753054346818345',
    contractAddress: '0xf853F8243F10a57CF5e43A49F156F132c05C21a6',
    escrowAddress: '0xBf342bDf2dcB6dcD21c8b104Bc8Ce950dc9EB632',
    routerAddress: '0x06fC836cf9839B1cd891C440A0a45242DA6Ae1c9',
    rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
    explorerUrl: 'https://robin.etherscan.io',
    explorerTxUrl: 'https://robin.etherscan.io/tx/',
    color: '#00C805',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    badgeBorder: 'border-emerald-500/40',
  },
};

export const DEFAULT_CHAIN = SUPPORTED_CHAINS[42161];
export const PROTOCOL_TLD = '.i';
export const REGISTRATION_PRICE_ETH = '0.001';
export const MARKETPLACE_CONTRACT_ARBITRUM = '0x4751Cf7c24972F3C2598472c38584FBb05ca60Ba';
export const WETH_CONTRACT_ARBITRUM = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
export const SECONDARY_CONTRACT_ADDRESS = '0xf853F8243F10a57CF5e43A49F156F132c05C21a6';

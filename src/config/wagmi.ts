import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum } from 'wagmi/chains';
import { http, fallback } from 'viem';

export const wagmiConfig = getDefaultConfig({
  appName: 'Doti Protocol (.i)',
  projectId: 'abd26af6425e1f03291200a1ef2bfd26',
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: fallback([
      http('https://arb1.arbitrum.io/rpc'),
      http('https://arbitrum.public-rpc.com'),
    ]),
  },
  ssr: false,
});

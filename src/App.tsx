import React, { useState, useEffect } from 'react';
import { WagmiProvider, useAccount, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './config/wagmi';
import { PortalGate } from './components/PortalGate';
import { DashboardLayout } from './components/DashboardLayout';
import { VerificationResult } from './types/doti';
import { verifyDomainOwnershipAcrossChains } from './lib/onChainAuth';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const queryClient = new QueryClient();

function MainContent() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [authData, setAuthData] = useState<VerificationResult | null>(null);

  // If wallet disconnects, reset authentication state
  useEffect(() => {
    if (!isConnected) {
      setAuthData(null);
    }
  }, [isConnected]);

  const handleRefreshIdentity = async () => {
    if (!address) return;
    try {
      const refreshed = await verifyDomainOwnershipAcrossChains(address);
      setAuthData(refreshed);
    } catch (err) {
      console.error('Refresh identity error:', err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setAuthData(null);
  };

  if (!authData || !authData.verified || authData.domains.length === 0) {
    return <PortalGate onAuthenticated={(res) => setAuthData(res)} />;
  }

  return (
    <DashboardLayout
      userAddress={address || authData.userAddress}
      verification={authData}
      onDisconnect={handleDisconnect}
      onRefreshIdentity={handleRefreshIdentity}
    />
  );
}

function ThemedRainbowKitApp() {
  const { theme } = useTheme();

  return (
    <RainbowKitProvider
      modalSize="compact"
      theme={
        theme === 'dark'
          ? darkTheme({
            accentColor: '#00D1FF',
            accentColorForeground: '#080B10',
            borderRadius: 'large',
            fontStack: 'system',
            overlayBlur: 'small',
          })
          : lightTheme({
            accentColor: '#0284c7',
            accentColorForeground: '#ffffff',
            borderRadius: 'large',
            fontStack: 'system',
            overlayBlur: 'small',
          })
      }
    >
      <MainContent />
    </RainbowKitProvider>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemedRainbowKitApp />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>

  );
}

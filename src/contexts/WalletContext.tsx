import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connectWallet } from '../utils/wallet';

interface WalletContextType {
  isConnected: boolean;
  userAddress: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet was previously connected
  useEffect(() => {
    const savedConnectionState = localStorage.getItem('walletConnected');
    if (savedConnectionState === 'true') {
      connect();
    }
  }, []);

  const connect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const { userAddress } = await connectWallet();
      setUserAddress(userAddress);
      setIsConnected(true);
      localStorage.setItem('walletConnected', 'true');
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      localStorage.removeItem('walletConnected');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setUserAddress(null);
    localStorage.removeItem('walletConnected');
  };

  const value = {
    isConnected,
    userAddress,
    connecting,
    error,
    connect,
    disconnect
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}; 
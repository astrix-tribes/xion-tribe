import React from 'react';
import { useWallet } from '../contexts/WalletContext';

const Header: React.FC = () => {
  const { isConnected, userAddress, connecting, connect, disconnect } = useWallet();
  
  return (
    <header className="w-full bg-gray-900 text-white py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-bold">Xion Tribes</div>
        </div>
        
        <div className="flex items-center">
          {isConnected ? (
            <div className="flex items-center space-x-4">
              <div className="text-sm bg-gray-800 rounded-full px-4 py-2">
                {userAddress?.slice(0, 6)}...{userAddress?.slice(-6)}
              </div>
              <button
                onClick={disconnect}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Keplr Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 
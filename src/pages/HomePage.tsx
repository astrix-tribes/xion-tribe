import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import TribePosts from '../components/TribePosts';

const HomePage: React.FC = () => {
  const { isConnected, userAddress } = useWallet();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">All Posts</h1>
      </div>

      {!isConnected ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">Connect your wallet to view and interact with posts</p>
        </div>
      ) : (
        <TribePosts 
          userAddress={userAddress} 
          isMember={false} // Not creating posts from all posts view
        />
      )}
    </div>
  );
};

export default HomePage; 
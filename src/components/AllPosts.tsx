import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import TribePosts from './TribePosts';

const AllPosts: React.FC = () => {
  const { isConnected, userAddress } = useWallet();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">All Posts</h2>
      </div>

      {!isConnected ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">Please connect your wallet to view posts</p>
        </div>
      ) : (
        <TribePosts 
          userAddress={userAddress} 
          isMember={false} // Not creating posts from here
        />
      )}
    </div>
  );
};

export default AllPosts; 
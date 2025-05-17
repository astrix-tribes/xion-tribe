import React from 'react';
import { useWallet } from '../contexts/WalletContext';

const LandingPage: React.FC = () => {
  const { connect, connecting } = useWallet();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          Welcome to Xion Tribes
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Join the decentralized platform for creating and managing tribes, minting profiles, and interacting with posts.
        </p>
        
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              title="Create Your Profile" 
              description="Mint your profile NFT and join the Xion ecosystem."
              icon="👤"
            />
            <FeatureCard 
              title="Join Tribes" 
              description="Connect with like-minded individuals in specialized tribes."
              icon="👥"
            />
            <FeatureCard 
              title="Interact With Posts" 
              description="Create, share, and engage with content in the community."
              icon="📝"
            />
          </div>
        </div>
        
        <button
          onClick={connect}
          disabled={connecting}
          className="mt-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect Keplr Wallet to Get Started'}
        </button>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
};

export default LandingPage; 
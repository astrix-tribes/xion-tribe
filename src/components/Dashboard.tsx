import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import ProfilePage from './ProfilePage';
import PostMinter from './PostMinter';
import RoleManager from './RoleManager';
import TribesPage from './TribesPage';

const Dashboard: React.FC = () => {
  const { userAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<string>('tribes');
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-900 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4">Welcome to Xion Tribes</h2>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 rounded-full w-3 h-3"></div>
            <p className="text-gray-300">
              Connected as: <span className="font-medium">{userAddress}</span>
            </p>
          </div>
        </div>

        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="flex -mb-px space-x-6">
              <button
                onClick={() => setActiveTab('tribes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tribes'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-400'
                }`}
              >
                Tribes
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-400'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-400'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-400'
                }`}
              >
                Roles
              </button>
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg shadow-lg p-6">
            {activeTab === 'tribes' && <TribesPage />}
            {activeTab === 'profile' && <ProfilePage />}
            {activeTab === 'posts' && <PostMinter />}
            {activeTab === 'roles' && <RoleManager />}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 
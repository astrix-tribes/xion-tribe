import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';

interface LayoutProps {
  children: React.ReactNode;
}

// Storage keys
const LOCALSTORAGE_USERNAME_KEY = 'xion_profile_username';
const TRIBES_STORAGE_KEY = 'xion_tribes';

interface Tribe {
  id: number;
  name: string;
  cover_image?: string;
  member_count?: number;
}

interface Profile {
  tokenId: string;
  username: string;
  owner: string;
  metadata: {
    fullName?: string;
    avatar?: string;
    [key: string]: any;
  };
}

const MainLayout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, userAddress, disconnect, connect, connecting } = useWallet();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch user profile and wallet balance on mount
  useEffect(() => {
    if (isConnected && userAddress) {
      fetchUserProfile();
      fetchWalletBalance();
      loadTribes();
    } else {
      setUserProfile(null);
      setWalletBalance('0');
    }
  }, [isConnected, userAddress]);

  // Load tribes from localStorage
  const loadTribes = () => {
    try {
      const storedData = localStorage.getItem(TRIBES_STORAGE_KEY);
      if (storedData) {
        const allTribes = JSON.parse(storedData);
        // Sort by ID for consistent ordering
        allTribes.sort((a: Tribe, b: Tribe) => a.id - b.id);
        setTribes(allTribes);
      }
    } catch (err) {
      console.error("Error loading tribes from storage:", err);
    }
  };

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // Check if we have a username in localStorage
      const savedUsername = localStorage.getItem(LOCALSTORAGE_USERNAME_KEY);
      
      if (savedUsername && userAddress) {
        // First get the token ID by username
        const tokenId = await getTokenIdByUsername(savedUsername);
        
        if (tokenId) {
          // Then get the profile using the token ID
          const profileData = await getProfileByTokenId(tokenId);
          
          // Parse metadata if it's a string
          let metadata = profileData.metadata_uri;
          try {
            if (typeof metadata === 'string') {
              metadata = JSON.parse(metadata);
            }
          } catch (e) {
            console.warn('Could not parse metadata:', e);
          }
          
          // Verify the profile belongs to the current user
          if (profileData.owner === userAddress) {
            setUserProfile({
              tokenId: tokenId,
              username: profileData.username,
              owner: profileData.owner,
              metadata: metadata
            });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!userAddress) return;
    
    try {
      const { client } = await connectWallet();
      // This is a placeholder - replace with actual token balance query
      // based on your chain and token
      const result = await client.getBalance(userAddress, "uxion");
      
      // Format balance (assuming 6 decimals for XION)
      const balance = Number(result.amount) / 1000000;
      setWalletBalance(balance.toFixed(2));
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
    }
  };

  // Helper function to get token ID by username
  const getTokenIdByUsername = async (username: string): Promise<string | null> => {
    try {
      const { client } = await connectWallet();
      const query = {
        n_f_t_minter: {
          get_token_id_by_username: { username }
        }
      };
      
      const result = await client.queryContractSmart(
        CONTRACTS.NFT_MINTER.address,
        query
      );
      
      // Parse result if needed
      let parsedResult = result;
      if (typeof result === 'string') {
        try {
          const decoded = atob(result);
          parsedResult = JSON.parse(decoded);
        } catch (e) {
          console.warn('Could not parse result:', e);
        }
      }
      
      return parsedResult.token_id ? String(parsedResult.token_id) : null;
    } catch (err) {
      console.error('Error getting token ID by username:', err);
      return null;
    }
  };

  // Helper function to get profile by token ID
  const getProfileByTokenId = async (tokenId: string) => {
    try {
      const { client } = await connectWallet();
      const query = {
        n_f_t_minter: {
          get_profile_by_token_id: { token_id: Number(tokenId) }
        }
      };
      
      const result = await client.queryContractSmart(
        CONTRACTS.NFT_MINTER.address,
        query
      );
      
      // Parse result if needed
      let parsedResult = result;
      if (typeof result === 'string') {
        try {
          const decoded = atob(result);
          parsedResult = JSON.parse(decoded);
        } catch (e) {
          console.warn('Could not parse result:', e);
        }
      }
      
      return parsedResult;
    } catch (err) {
      console.error('Error getting profile by token ID:', err);
      throw err;
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 
              className="text-2xl font-bold text-white cursor-pointer"
              onClick={() => navigate('/')}
            >
              Web3 Tribes
            </h1>
            <nav className="ml-10 hidden md:flex space-x-6">
              <button 
                onClick={() => navigate('/')}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'text-blue-400 border-b-2 border-blue-400 pb-1' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Home
              </button>
              <button 
                onClick={() => navigate('/tribes')}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/tribes' 
                    ? 'text-blue-400 border-b-2 border-blue-400 pb-1' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Tribes
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/profile' 
                    ? 'text-blue-400 border-b-2 border-blue-400 pb-1' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Profile
              </button>
            </nav>
          </div>

          <div className="flex items-center">
            {isConnected && userAddress ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  className="flex items-center bg-gray-700 rounded-lg px-4 py-2 hover:bg-gray-600 transition-colors"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {userProfile && userProfile.metadata.avatar ? (
                    <img 
                      src={userProfile.metadata.avatar} 
                      alt={userProfile.username} 
                      className="w-8 h-8 rounded-full mr-2 border border-gray-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 mr-2 flex items-center justify-center font-bold">
                      {userProfile ? userProfile.username.charAt(0).toUpperCase() : userAddress.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left mr-2">
                    <div className="font-medium">
                      {userProfile ? `@${userProfile.username}` : 'Connected'}
                    </div>
                    <div className="text-xs text-gray-300 truncate max-w-[120px]">
                      {userAddress.substring(0, 8)}...{userAddress.substring(userAddress.length - 4)}
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                    <div className="p-4 border-b border-gray-700">
                      {userProfile ? (
                        <div>
                          <div className="font-medium text-lg">{userProfile.metadata.fullName || userProfile.username}</div>
                          <div className="text-sm text-gray-300">@{userProfile.username}</div>
                        </div>
                      ) : (
                        <div className="font-medium">
                          {userAddress.substring(0, 8)}...{userAddress.substring(userAddress.length - 6)}
                        </div>
                      )}
                      <div className="mt-2 text-sm">
                        <span className="text-gray-300">Balance:</span> 
                        <span className="ml-1 font-medium">{walletBalance} XION</span>
                      </div>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => {
                          navigate('/profile');
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                      >
                        Profile Settings
                      </button>
                      <button 
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md transition-colors"
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => {
                  connect();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content with sidebar (only on home page) */}
      {location.pathname === '/' ? (
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Sidebar for tribes */}
          <aside className="w-full md:w-80 lg:w-96 bg-gray-800 border-r border-gray-700 p-4 md:p-6 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
            <div className="mb-6">
              <button
                onClick={() => navigate('/tribe/create')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create New Tribe
              </button>
            </div>
            
            <h2 className="text-lg font-semibold text-white mb-4">All Tribes ({tribes.length})</h2>
            
            {tribes.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p>No tribes available</p>
                <p className="text-sm mt-2">Create your first tribe!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tribes.map((tribe) => (
                  <div 
                    key={tribe.id}
                    onClick={() => navigate(`/tribe/${tribe.id}`)}
                    className="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0 overflow-hidden">
                      {tribe.cover_image ? (
                        <img 
                          src={tribe.cover_image} 
                          alt={tribe.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-white">{tribe.name}</div>
                      {tribe.member_count !== undefined && (
                        <div className="text-xs text-gray-300">{tribe.member_count} members</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
          
          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      ) : (
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      )}
    </div>
  );
};

export default MainLayout; 
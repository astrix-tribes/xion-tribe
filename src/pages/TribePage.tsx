import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';
import TribePosts from '../components/TribePosts';

interface TribeMetadata {
  description?: string;
  cover_image?: string;
  [key: string]: any;
}

interface Tribe {
  id: number;
  admin: string;
  name: string;
  description?: string;
  metadata?: TribeMetadata;
  join_type: 'public' | 'private';
  entry_fee: string;
  creator: string;
  member_count?: number;
  member_status?: string;
  cover_image?: string;
}

// Storage keys
const TRIBES_STORAGE_KEY = 'xion_tribes';

const TribePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, userAddress } = useWallet();
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (isConnected && id) {
      loadTribe(parseInt(id));
    }
  }, [isConnected, id, userAddress]);

  // Helper to decode base64 results
  function decodeResult(result: any) {
    if (typeof result === 'string') {
      try {
        const decoded = atob(result);
        return JSON.parse(decoded);
      } catch (e) {
        return result;
      }
    }
    return result;
  }

  // Try to load tribe from localStorage first
  const loadTribe = async (tribeId: number) => {
    setLoading(true);
    setError('');

    try {
      // Check localStorage first
      const storedTribes = getStoredTribes();
      const storedTribe = storedTribes.find(t => t.id === tribeId);
      
      if (storedTribe) {
        setTribe(storedTribe);
        
        // Check if user is a member
        await checkMemberStatus(tribeId);
        
        setLoading(false);
      } else {
        // Fallback to fetching from blockchain
        await fetchTribeFromBlockchain(tribeId);
      }
    } catch (err) {
      console.error('Error loading tribe:', err);
      setError('Failed to load tribe information');
      setLoading(false);
    }
  };

  // Get tribes from localStorage
  const getStoredTribes = (): Tribe[] => {
    try {
      const storedData = localStorage.getItem(TRIBES_STORAGE_KEY);
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (err) {
      console.error("Error parsing stored tribes:", err);
    }
    return [];
  };

  // Check if user is a member of the tribe
  const checkMemberStatus = async (tribeId: number) => {
    if (!userAddress) return;
    
    try {
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.TRIBE_CONTROLLER.address,
        {
          tribe_controller: {
            get_member_status: {
              tribe_id: tribeId,
              member: userAddress
            }
          }
        }
      );
      
      const parsedStatus = decodeResult(result);
      const memberStatus = parsedStatus.status || 'Not Member';
      
      // Check if user is a member or admin - ensure boolean result
      const isMemberOrAdmin = Boolean(
        memberStatus === 'Member' || 
        memberStatus === 'Admin' || 
        (tribe && tribe.creator === userAddress) ||
        (tribe && tribe.admin === userAddress)
      );
      
      setIsMember(isMemberOrAdmin);
      
      // Update tribe with member status
      setTribe(prev => prev ? { ...prev, member_status: memberStatus } : null);
      
    } catch (err) {
      console.error('Error checking member status:', err);
      setIsMember(false);
    }
  };

  // Fetch tribe data from blockchain
  const fetchTribeFromBlockchain = async (tribeId: number) => {
    try {
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.TRIBE_CONTROLLER.address,
        {
          tribe_controller: {
            get_tribe_details: {
              tribe_id: tribeId
            }
          }
        }
      );
      
      // Parse the result
      const parsedResult = decodeResult(result);
      
      // Parse metadata if it's a string
      let metadata: TribeMetadata = {};
      try {
        if (parsedResult.metadata) {
          if (typeof parsedResult.metadata === 'string') {
            metadata = JSON.parse(parsedResult.metadata);
          } else if (typeof parsedResult.metadata === 'object') {
            metadata = parsedResult.metadata;
          }
        }
      } catch (e) {
        console.warn('Could not parse metadata:', e);
      }
      
      // Create tribe object
      const tribeData: Tribe = {
        id: tribeId,
        admin: parsedResult.admin || '',
        name: parsedResult.name || `Tribe ${tribeId}`,
        description: metadata?.description || '',
        metadata: metadata,
        join_type: parsedResult.join_type || 'public',
        entry_fee: parsedResult.entry_fee || '0',
        creator: parsedResult.creator || '',
        member_count: parsedResult.member_count || 0,
        cover_image: metadata?.cover_image || ''
      };
      
      setTribe(tribeData);
      
      // Check if user is a member
      await checkMemberStatus(tribeId);
      
    } catch (err) {
      console.error(`Error fetching tribe ${tribeId}:`, err);
      setError('Could not find the requested tribe');
    } finally {
      setLoading(false);
    }
  };

  // Join a tribe
  const joinTribe = async () => {
    if (!userAddress || !tribe) return;
    
    try {
      setLoading(true);
      const { client } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          join_tribe: {
            tribe_id: tribe.id
          }
        }
      };
      
      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );
      
      alert(`Joined tribe successfully!`);
      
      // Refresh tribe data
      await loadTribe(tribe.id);
      
    } catch (err) {
      console.error('Error joining tribe:', err);
      setError('Failed to join tribe');
    } finally {
      setLoading(false);
    }
  };

  // Request to join a private tribe
  const requestToJoinTribe = async () => {
    if (!userAddress || !tribe) return;
    
    try {
      setLoading(true);
      const { client } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          request_to_join_tribe: {
            tribe_id: tribe.id
          }
        }
      };
      
      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );
      
      alert(`Join request sent successfully!`);
      
      // Refresh tribe data
      await loadTribe(tribe.id);
      
    } catch (err) {
      console.error('Error requesting to join tribe:', err);
      setError('Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  // Back to home
  const goToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-300">Loading tribe...</p>
      </div>
    );
  }

  if (error || !tribe) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 mb-4">{error || 'Tribe not found'}</p>
        <button
          onClick={goToHome}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Tribe header */}
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 mb-6">
        <div className="h-60 bg-gradient-to-r from-blue-600 to-purple-600 relative">
          {tribe.cover_image && (
            <img 
              src={tribe.cover_image} 
              alt={tribe.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">{tribe.name}</h2>
              <button
                onClick={goToHome}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center mb-6 space-x-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-gray-300">{tribe.member_count || 0} members</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className={`${tribe.join_type === 'public' ? 'text-green-400' : 'text-yellow-400'}`}>
                {tribe.join_type === 'public' ? 'Public' : 'Private'}
              </span>
            </div>
            {tribe.entry_fee && Number(tribe.entry_fee) > 0 && (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-300">Entry Fee: {tribe.entry_fee}</span>
              </div>
            )}
            {userAddress && tribe.creator === userAddress && (
              <div className="flex items-center">
                <span className="px-2 py-1 bg-purple-900/50 text-purple-200 text-xs rounded-full">
                  Creator
                </span>
              </div>
            )}
            {userAddress && tribe.admin === userAddress && (
              <div className="flex items-center">
                <span className="px-2 py-1 bg-purple-900/50 text-purple-200 text-xs rounded-full">
                  Admin
                </span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <p className="text-gray-300">
              {tribe.description || 'No description provided'}
            </p>
          </div>
        
          {!tribe.member_status || tribe.member_status === 'Not Member' ? (
            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={() => tribe.join_type === 'public' ? joinTribe() : requestToJoinTribe()}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                disabled={loading}
              >
                {tribe.join_type === 'public' ? 'Join This Tribe' : 'Request to Join This Tribe'}
              </button>
            </div>
          ) : tribe.member_status === 'Pending' ? (
            <div className="border-t border-gray-700 pt-4">
              <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 p-3 rounded-md">
                Your request to join this tribe is pending approval.
              </div>
            </div>
          ) : userAddress && (tribe.creator === userAddress || tribe.admin === userAddress) ? (
            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={() => navigate(`/tribe/edit/${tribe.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Update Tribe Settings
              </button>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Posts section */}
      {isConnected && (
        <TribePosts
          tribeId={tribe.id}
          userAddress={userAddress}
          isMember={Boolean(isMember || (userAddress && (tribe.creator === userAddress || tribe.admin === userAddress)))}
          tribeName={tribe.name}
        />
      )}
    </div>
  );
};

export default TribePage; 
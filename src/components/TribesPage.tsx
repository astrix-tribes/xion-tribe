import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';
import TribePosts from './TribePosts';
import { useParams, useNavigate } from 'react-router-dom';

// Define types
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

// Storage key for tribes data
const TRIBES_STORAGE_KEY = 'xion_tribes';

// Storage key for posts
const POSTS_STORAGE_KEY = 'xion_tribe_posts';

interface TribesPageProps {
  editMode?: boolean;
}

const TribesPage: React.FC<TribesPageProps> = ({ editMode = false }) => {
  const { isConnected, userAddress } = useWallet();
  const [viewMode, setViewMode] = useState<'tribes' | 'allPosts'>('tribes');
  const [loading, setLoading] = useState(true);
  const [allTribes, setAllTribes] = useState<Tribe[]>([]);
  const [myTribes, setMyTribes] = useState<Tribe[]>([]);
  const [error, setError] = useState('');
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastLoadedTribeId, setLastLoadedTribeId] = useState(-1);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: '',
    isPrivate: false,
    entryFee: '0'
  });
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    description: '',
    coverImage: ''
  });

  // Helper for error messages
  const getErrorMsg = (err: any) => {
    let errorMsg = 'An unknown error occurred';
    if (err && typeof err === 'object') {
      if (err.message) {
        errorMsg = String(err.message);
      } else if (typeof err.toString === 'function') {
        errorMsg = err.toString();
      }
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    return errorMsg;
  };

  // Helper to decode base64-encoded JSON query results
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

  // Get stored tribes from localStorage
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

  // Save tribes to localStorage
  const saveTribes = (tribes: Tribe[]) => {
    try {
      localStorage.setItem(TRIBES_STORAGE_KEY, JSON.stringify(tribes));
    } catch (err) {
      console.error("Error saving tribes:", err);
    }
  };

  // Load tribes on mount
  useEffect(() => {
    if (isConnected) {
      if (editMode && id) {
        // If in edit mode, load the specific tribe by ID
        const tribeId = parseInt(id);
        if (!isNaN(tribeId)) {
          fetchTribeById(tribeId).then(tribe => {
            if (tribe) {
              setSelectedTribe(tribe);
              setShowEditForm(true);
              
              // Pre-populate the edit form
              setEditFormData({
                description: tribe.description || '',
                coverImage: tribe.cover_image || ''
              });
            } else {
              setError('Tribe not found');
              navigate('/tribes');
            }
          }).catch(err => {
            console.error('Error loading tribe for editing:', err);
            setError('Failed to load tribe details');
            navigate('/tribes');
          }).finally(() => {
            setLoading(false);
          });
        } else {
          navigate('/tribes');
        }
      } else {
        // Normal load for tribes listing
        fetchAllTribes();
        fetchMyTribes();
      }
    } else {
      setLoading(false);
    }
  }, [isConnected, userAddress, editMode, id]);

  // Check for new tribes beyond the last loaded tribe ID
  const checkForNewTribes = async () => {
    setLoadingMore(true);
    try {
      let currentId = lastLoadedTribeId + 1;
      const newTribes: Tribe[] = [];
      
      // Loop until we hit an error (meaning no more tribes)
      while (true) {
        try {
          const tribe = await fetchTribeById(currentId);
          if (tribe) {
            newTribes.push(tribe);
            currentId++;
          } else {
            break;
          }
        } catch (err) {
          // No more tribes or error
          console.log(`Stopped at tribe ID ${currentId}`);
          break;
        }
      }
      
      if (newTribes.length > 0) {
        const updatedTribes = [...allTribes, ...newTribes];
        setAllTribes(updatedTribes);
        setLastLoadedTribeId(currentId - 1);
        saveTribes(updatedTribes);
      }
    } catch (err) {
      console.error('Error checking for new tribes:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch a single tribe by ID
  const fetchTribeById = async (tribeId: number): Promise<Tribe | null> => {
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
      const tribe: Tribe = {
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
      
      // Check member status
      if (userAddress) {
        try {
          const statusResult = await client.queryContractSmart(
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
          const parsedStatus = decodeResult(statusResult);
          tribe.member_status = parsedStatus.status || 'Not Member';
        } catch (e) {
          console.warn(`Could not get member status for tribe ${tribeId}:`, e);
          tribe.member_status = 'Not Member';
        }
      }
      
      return tribe;
    } catch (err) {
      console.error(`Error fetching tribe ${tribeId}:`, err);
      return null;
    }
  };

  // Fetch all tribes from the contract
  const fetchAllTribes = async () => {
    setLoading(true);
    setError('');
    try {
      let currentId = 0;
      const tribes: Tribe[] = [];
      const storedTribes = getStoredTribes();
      const storedTribeIds = new Set(storedTribes.map(tribe => tribe.id));
      
      // Loop until we hit an error (meaning no more tribes)
      while (true) {
        try {
          // Skip already stored tribes to avoid refetching
          if (storedTribeIds.has(currentId)) {
            currentId++;
            continue;
          }
          
          const tribe = await fetchTribeById(currentId);
          if (tribe) {
            tribes.push(tribe);
            currentId++;
          } else {
            break;
          }
        } catch (err) {
          // No more tribes or error
          console.log(`Stopped at tribe ID ${currentId}`);
          break;
        }
      }
      
      // Combine with stored tribes
      const updatedTribes = [...storedTribes, ...tribes];
      
      // Sort by ID for consistency
      updatedTribes.sort((a, b) => a.id - b.id);
      
      setAllTribes(updatedTribes);
      setLastLoadedTribeId(currentId - 1);
      
      // Save to localStorage
      saveTribes(updatedTribes);
    } catch (err) {
      console.error('Error fetching tribes:', err);
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's tribes
  const fetchMyTribes = async () => {
    if (!userAddress) return;
    
    try {
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.TRIBE_CONTROLLER.address,
        {
          tribe_controller: {
            get_user_tribes: {
              user: userAddress
            }
          }
        }
      );
      
      const parsedResult = decodeResult(result);
      const tribes: Tribe[] = [];
      
      // Fetch details for each tribe ID
      if (parsedResult.tribe_ids && Array.isArray(parsedResult.tribe_ids)) {
        for (const tribeId of parsedResult.tribe_ids) {
          try {
            const tribe = await fetchTribeById(Number(tribeId));
            if (tribe) {
              tribe.member_status = 'Member';
              tribes.push(tribe);
            }
          } catch (err) {
            console.error(`Error fetching tribe ${tribeId}:`, err);
          }
        }
      }
      
      setMyTribes(tribes);
    } catch (err) {
      console.error('Error fetching my tribes:', err);
    }
  };

  // Update tribe
  const updateTribe = async (tribeId: number) => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      
      // Create updated metadata object
      const metadata = {
        description: editFormData.description,
        cover_image: editFormData.coverImage
      };
      
      const msg = {
        tribe_controller: {
          update_tribe: {
            tribe_id: tribeId,
            new_metadata: JSON.stringify(metadata),
            updated_whitelist: [userAddress]
          }
        }
      };
      
      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );
      
      alert(`Tribe updated successfully!`);
      
      // Reset edit form state
      setShowEditForm(false);
      
      // Fetch the updated tribe data
      const updatedTribe = await fetchTribeById(tribeId);
      
      if (updatedTribe) {
        // Update the tribe in allTribes
        const updatedAllTribes = allTribes.map(t => t.id === tribeId ? updatedTribe : t);
        setAllTribes(updatedAllTribes);
        
        // Save to localStorage
        saveTribes(updatedAllTribes);
        
        // Update posts data with the new tribe name
        updatePostsWithTribeName(tribeId, updatedTribe.name);
        
        // Update the tribe in myTribes if present
        setMyTribes(prevTribes => 
          prevTribes.map(t => t.id === tribeId ? { ...updatedTribe, member_status: 'Member' } : t)
        );
        
        // Update selected tribe if it's the one being edited
        if (selectedTribe && selectedTribe.id === tribeId) {
          setSelectedTribe(updatedTribe);
        }
      }
      
    } catch (err) {
      console.error('Error updating tribe:', err);
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // Update posts with new tribe name
  const updatePostsWithTribeName = (tribeId: number, tribeName: string) => {
    try {
      const storedPostsData = localStorage.getItem(POSTS_STORAGE_KEY);
      if (storedPostsData) {
        const storedPosts = JSON.parse(storedPostsData);
        
        // Update tribe name for all posts from this tribe
        const updatedPosts = storedPosts.map((post: any) => {
          if (post.tribe_id === tribeId) {
            return {
              ...post,
              tribe_name: tribeName
            };
          }
          return post;
        });
        
        // Save back to storage
        localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts));
      }
    } catch (err) {
      console.error('Error updating posts data:', err);
    }
  };

  // Create a tribe
  const createTribe = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      
      // Create metadata object
      const metadata = {
        description: formData.description,
        cover_image: formData.coverImage
      };
      
      const msg = {
        tribe_controller: {
          create_tribe: {
            name: formData.name,
            metadata: JSON.stringify(metadata),
            admins: [userAddress],
            join_type: formData.isPrivate ? "private" : "public",
            entry_fee: formData.entryFee,
            nft_requirements: []
          }
        }
      };
      
      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );
      
      alert(`Tribe created successfully!`);
      
      // Reset form and form state
      setFormData({
        name: '',
        description: '',
        coverImage: '',
        isPrivate: false,
        entryFee: '0'
      });
      setShowCreateForm(false);
      
      // Only fetch new tribes since we know they'll be at the end
      await checkForNewTribes();
      await fetchMyTribes();
      
    } catch (err) {
      console.error('Error creating tribe:', err);
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // Join a tribe
  const joinTribe = async (tribeId: number) => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          join_tribe: {
            tribe_id: tribeId
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
      
      // Update the tribe in the UI
      const updatedTribe = await fetchTribeById(tribeId);
      
      if (updatedTribe) {
        // Update in all tribes
        const updatedAllTribes = allTribes.map(t => t.id === tribeId ? updatedTribe : t);
        setAllTribes(updatedAllTribes);
        
        // Save to localStorage
        saveTribes(updatedAllTribes);
        
        // Add to my tribes
        const updatedTribeWithMemberStatus = { ...updatedTribe, member_status: 'Member' };
        setMyTribes(prevTribes => {
          if (prevTribes.some(t => t.id === tribeId)) {
            return prevTribes.map(t => t.id === tribeId ? updatedTribeWithMemberStatus : t);
          } else {
            return [...prevTribes, updatedTribeWithMemberStatus];
          }
        });
        
        // Update selected tribe if it's the one being joined
        if (selectedTribe && selectedTribe.id === tribeId) {
          setSelectedTribe(updatedTribeWithMemberStatus);
        }
      }
      
    } catch (err) {
      console.error('Error joining tribe:', err);
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // Request to join a tribe
  const requestToJoinTribe = async (tribeId: number) => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          request_to_join_tribe: {
            tribe_id: tribeId
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
      
      // Update the tribe status in the UI
      const updatedTribe = await fetchTribeById(tribeId);
      
      if (updatedTribe) {
        // Update in all tribes
        const updatedAllTribes = allTribes.map(t => t.id === tribeId ? updatedTribe : t);
        setAllTribes(updatedAllTribes);
        
        // Save to localStorage
        saveTribes(updatedAllTribes);
        
        // Update selected tribe if it's the one being requested
        if (selectedTribe && selectedTribe.id === tribeId) {
          setSelectedTribe(updatedTribe);
        }
      }
      
    } catch (err) {
      console.error('Error requesting to join tribe:', err);
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // Tribe card component
  const TribeCard = ({ tribe, isMember }: { tribe: Tribe, isMember: boolean }) => (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 transition-all hover:shadow-xl">
      <div className="h-40 bg-gradient-to-r from-blue-600 to-purple-600 relative">
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 p-4">
          <h3 className="text-xl font-bold text-white">{tribe.name}</h3>
        </div>
      </div>
      <div className="p-4">
        <p className="text-gray-300 mb-2 line-clamp-2 h-12">
          {tribe.description || 'No description provided'}
        </p>
        <div className="flex items-center mb-4">
          <span className="text-sm text-gray-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {tribe.member_count || 0} members
          </span>
          <span className="mx-2 text-gray-500">•</span>
          <span className={`text-sm ${tribe.join_type === 'public' ? 'text-green-400' : 'text-yellow-400'} flex items-center`}>
            {tribe.join_type === 'public' ? 'Public' : 'Private'}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedTribe(tribe)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
          >
            View Details
          </button>
          
          {!isMember && tribe.member_status !== 'Pending' && (
            <button
              onClick={() => tribe.join_type === 'public' ? joinTribe(tribe.id) : requestToJoinTribe(tribe.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
              disabled={loading}
            >
              {tribe.join_type === 'public' ? 'Join' : 'Request to Join'}
            </button>
          )}
          
          {tribe.member_status === 'Pending' && (
            <button
              disabled
              className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md text-sm font-medium opacity-70"
            >
              Pending Approval
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Create tribe form
  const CreateTribeForm = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-4">Create New Tribe</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-1">Tribe Name*</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tribe name"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your tribe"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Cover Image URL</label>
          <input
            type="text"
            value={formData.coverImage}
            onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
          {formData.coverImage && (
            <div className="mt-2 bg-gray-700 p-2 rounded-md inline-block">
              <img 
                src={formData.coverImage} 
                alt="Cover preview" 
                className="h-20 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x100?text=Invalid+URL';
                }}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPrivate"
            checked={formData.isPrivate}
            onChange={(e) => setFormData({...formData, isPrivate: e.target.checked})}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isPrivate" className="ml-2 block text-gray-300">
            Private Tribe (Require Approval to Join)
          </label>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Entry Fee (optional)</label>
          <input
            type="number"
            value={formData.entryFee}
            onChange={(e) => setFormData({...formData, entryFee: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            min="0"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <button
            onClick={createTribe}
            disabled={loading || !formData.name}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Tribe'}
          </button>
          <button
            onClick={() => setShowCreateForm(false)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Edit tribe form
  const EditTribeForm = ({ tribe }: { tribe: Tribe }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Edit Tribe</h2>
        <button
          onClick={() => setShowEditForm(false)}
          className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-1">Tribe Name</label>
          <input
            type="text"
            value={tribe.name}
            disabled
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white opacity-70"
          />
          <p className="mt-1 text-sm text-gray-400">Name cannot be changed</p>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Description</label>
          <textarea
            value={editFormData.description}
            onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your tribe"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Cover Image URL</label>
          <input
            type="text"
            value={editFormData.coverImage}
            onChange={(e) => setEditFormData({...editFormData, coverImage: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
          {editFormData.coverImage && (
            <div className="mt-2 bg-gray-700 p-2 rounded-md inline-block">
              <img 
                src={editFormData.coverImage} 
                alt="Cover preview" 
                className="h-20 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x100?text=Invalid+URL';
                }}
              />
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <button
            onClick={() => updateTribe(tribe.id)}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Tribe'}
          </button>
          <button
            onClick={() => setShowEditForm(false)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Tribe detail view
  const TribeDetail = ({ tribe }: { tribe: Tribe }) => {
    // Determine if user is creator or admin
    const isCreatorOrAdmin = userAddress && (tribe.creator === userAddress || tribe.admin === userAddress);
    
    // Determine if user is a member
    const isMember = Boolean(tribe.member_status === 'Member' || isCreatorOrAdmin);

    // Add debug info to help troubleshoot
    console.log('User address:', userAddress);
    console.log('Tribe creator:', tribe.creator);
    console.log('Tribe admin:', tribe.admin);
    console.log('Member status:', tribe.member_status);
    console.log('Is creator or admin:', isCreatorOrAdmin);

    // Show edit form instead of tribe details if editing
    if (showEditForm) {
      return <EditTribeForm tribe={tribe} />;
    }
    
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
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
                onClick={() => setSelectedTribe(null)}
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
            {isCreatorOrAdmin && (
              <div className="flex items-center">
                <span className="px-2 py-1 bg-purple-900/50 text-purple-200 text-xs rounded-full">
                  {tribe.creator === userAddress ? 'Creator' : 'Admin'}
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
                onClick={() => tribe.join_type === 'public' ? joinTribe(tribe.id) : requestToJoinTribe(tribe.id)}
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
          ) : null}
          
          {/* Render posts component if user is a member */}
          {isMember && (
            <TribePosts 
              tribeId={tribe.id}
              userAddress={userAddress}
              isMember={isMember}
              tribeName={tribe.name}
            />
          )}

          {/* Show edit button for admin/creator */}
          {isCreatorOrAdmin && (
            <div className="mt-6 border-t border-gray-700 pt-4">
              <button
                onClick={() => setShowEditForm(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Update Tribe Settings
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && allTribes.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-300">Loading tribes...</p>
      </div>
    );
  }

  // Main view with tribe list or detail
  return (
    <div className="max-w-7xl mx-auto">
      {/* Navigation tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setViewMode('tribes')}
          className={`px-4 py-2 font-medium text-sm ${
            viewMode === 'tribes' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Tribes
        </button>
        <button
          onClick={() => {
            setViewMode('allPosts');
            setSelectedTribe(null);
            setShowCreateForm(false);
          }}
          className={`px-4 py-2 font-medium text-sm ${
            viewMode === 'allPosts' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          All Posts
        </button>
      </div>

      {viewMode === 'allPosts' ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">All Posts</h2>
          </div>

          <TribePosts 
            userAddress={userAddress} 
            isMember={false} // Can't create posts from all posts view
          />
        </div>
      ) : selectedTribe ? (
        <TribeDetail tribe={selectedTribe} />
      ) : showCreateForm ? (
        <CreateTribeForm />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Tribes</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              Create New Tribe
            </button>
          </div>
          
          {myTribes.length > 0 && (
            <div className="mb-10">
              <h3 className="text-xl font-semibold text-white mb-4">My Tribes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTribes.map(tribe => (
                  <TribeCard key={tribe.id} tribe={tribe} isMember={true} />
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">All Tribes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTribes.map(tribe => (
                <TribeCard 
                  key={tribe.id} 
                  tribe={tribe} 
                  isMember={myTribes.some(myTribe => myTribe.id === tribe.id)}
                />
              ))}
              
              {allTribes.length === 0 && !loading && (
                <div className="col-span-3 bg-gray-800 rounded-lg p-8 text-center">
                  <p className="text-gray-400 mb-4">No tribes have been created yet.</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                  >
                    Create the First Tribe
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-6 bg-red-900/50 border border-red-500 text-white p-4 rounded-lg">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TribesPage; 
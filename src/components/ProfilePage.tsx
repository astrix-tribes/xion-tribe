import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';
import TribePosts from './TribePosts';
import { useNavigate } from 'react-router-dom';

interface Profile {
  tokenId: string;
  username: string;
  owner: string;
  metadata: {
    fullName?: string;
    bio?: string;
    avatar?: string;
    socialLinks?: {
      twitter?: string;
      telegram?: string;
      discord?: string;
      website?: string;
    };
    [key: string]: any;
  };
}

interface ProfileFormData {
  username: string;
  fullName: string;
  bio: string;
  avatar: string;
  twitter: string;
  telegram: string;
  discord: string;
  website: string;
}

// Storage keys
const LOCALSTORAGE_USERNAME_KEY = 'xion_profile_username';
const TRIBES_STORAGE_KEY = 'xion_tribes';

// Define Tribe interface
interface Tribe {
  id: number;
  name: string;
  description?: string;
  cover_image?: string;
  creator: string;
  admin: string;
  member_count?: number;
  join_type?: string;
}

const ProfilePage: React.FC = () => {
  const { isConnected, userAddress, connect, connecting } = useWallet();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [error, setError] = useState('');

  // Form state - combined into a single state object to prevent losing focus
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    fullName: '',
    bio: '',
    avatar: '',
    twitter: '',
    telegram: '',
    discord: '',
    website: ''
  });
  
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // For debounced username check
  const usernameTimeoutRef = useRef<number | null>(null);
  
  // Define refs for all input fields to maintain focus
  const inputRefs = {
    username: useRef<HTMLInputElement>(null),
    fullName: useRef<HTMLInputElement>(null),
    bio: useRef<HTMLTextAreaElement>(null),
    avatar: useRef<HTMLInputElement>(null),
    twitter: useRef<HTMLInputElement>(null),
    telegram: useRef<HTMLInputElement>(null),
    discord: useRef<HTMLInputElement>(null),
    website: useRef<HTMLInputElement>(null),
  };

  const [userTribes, setUserTribes] = useState<Tribe[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'tribes' | 'posts'>('profile');

  const navigate = useNavigate();

  // Handle form field changes
  const handleFormChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => {
      // Only update the specific field that changed
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
    
    // Handle username availability check
    if (field === 'username' && !showUpdateForm) {
      setUsernameAvailable(null);
    }
  }, [showUpdateForm]);

  useEffect(() => {
    if (isConnected && userAddress) {
      checkForExistingProfile();
      loadUserTribes();
    }
  }, [isConnected, userAddress]);

  // Effect for debounced username check
  useEffect(() => {
    // Clear the previous timeout
    if (usernameTimeoutRef.current) {
      window.clearTimeout(usernameTimeoutRef.current);
    }

    // Don't check if username is empty
    if (!formData.username) {
      setUsernameAvailable(null);
      return;
    }

    // Don't check if we're in update mode and username hasn't changed
    if (showUpdateForm && userProfile && formData.username === userProfile.username) {
      setUsernameAvailable(true);
      return;
    }

    // Set a new timeout
    usernameTimeoutRef.current = window.setTimeout(() => {
      checkUsernameExists();
    }, 2000); // 2 seconds debounce time

    // Cleanup on unmount or when username changes again
    return () => {
      if (usernameTimeoutRef.current) {
        window.clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [formData.username, showUpdateForm, userProfile]);

  const getTokenIdByUsername = async (username: string): Promise<string | null> => {
    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        console.warn('Empty username provided');
        return null;
      }

      const { client } = await connectWallet();
      const query = {
        n_f_t_minter: {
          get_token_id_by_username: { username: trimmedUsername }
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
      console.error('Error in getTokenIdByUsername:', err);
      return null;
    }
  };

  const getProfileByTokenId = async (tokenId: string | number) => {
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
      console.error('Error in getProfileByTokenId:', err);
      throw err;
    }
  };

  const fetchProfileByUsername = async (savedUsername: string) => {
    try {
      if (!savedUsername.trim()) {
        console.warn('Empty username provided');
        return null;
      }
      
      // First get the token ID by username
      const tokenId = await getTokenIdByUsername(savedUsername);
      
      if (!tokenId) {
        console.warn('No token ID found for username:', savedUsername);
        return null;
      }
      
      // Then get the profile using the token ID
      const profileResult = await getProfileByTokenId(tokenId);
      
      // Parse metadata if it's a string
      let metadata = profileResult.metadata_uri;
      try {
        if (typeof metadata === 'string') {
          metadata = JSON.parse(metadata);
        }
      } catch (e) {
        console.warn('Could not parse metadata:', e);
      }
      
      return {
        tokenId: tokenId,
        username: profileResult.username,
        owner: profileResult.owner,
        metadata: metadata
      };
    } catch (err) {
      console.error('Error fetching profile by username:', err);
      return null;
    }
  };

  const checkForExistingProfile = async () => {
    if (!userAddress) return;

    setChecking(true);
    setError('');

    try {
      // First check if we have a saved username in localStorage
      const savedUsername = localStorage.getItem(LOCALSTORAGE_USERNAME_KEY);
      
      if (savedUsername) {
        // console.log('Found saved username in localStorage:', savedUsername);
        const profile = await fetchProfileByUsername(savedUsername);
        
        // Verify the profile belongs to the current user
        if (profile && profile.owner === userAddress) {
          // console.log('Profile found by username:', profile);
          setUserProfile(profile);
          setChecking(false);
          setLoading(false);
          return;
        } else {
          // If profile doesn't exist or doesn't belong to this user, remove from localStorage
          // console.log('Saved username does not match current user, removing from localStorage');
          localStorage.removeItem(LOCALSTORAGE_USERNAME_KEY);
        }
      }
      
      // If we don't have a saved username or it didn't match, use the old method
      const { client } = await connectWallet();
      let profileFound = false;
      let tokenId = 0;

      console.log({client, profileFound, tokenId});
      // Loop through token IDs until we find a profile owned by the current user or get an error
      while (!profileFound) {
        console.log({tokenId, contractAddress: CONTRACTS.NFT_MINTER.address});
        try {
          const result = await getProfileByTokenId(tokenId);
          console.log({result: result, userAddress, match: result.owner === userAddress});
          
          // Check if this profile belongs to the connected user
          if (result.owner === userAddress) {
            // Parse metadata if it's a string
            let metadata = result.metadata_uri;
            try {
              if (typeof metadata === 'string') {
                metadata = JSON.parse(metadata);
              }
            } catch (e) {
              // If not valid JSON, keep as is
              console.warn('Could not parse metadata:', e);
            }

            const profile = {
              tokenId: tokenId.toString(),
              username: result.username,
              owner: result.owner,
              metadata: metadata
            };
            
            setUserProfile(profile);
            profileFound = true;
            
            // Save the username to localStorage for faster lookups in the future
            localStorage.setItem(LOCALSTORAGE_USERNAME_KEY, result.username);
          }

          tokenId++;
        } catch (err: any) {
          // If the error is because the token ID doesn't exist, we've checked all profiles
          console.error('Error querying profile:', err);
          break;
        }
      }

      if (!profileFound) {
        setShowCreateForm(true);
      }
    } catch (err: any) {
      console.error('Error checking profiles:', err);
      setError('Failed to check for existing profiles');
    } finally {
      setChecking(false);
      setLoading(false);
    }
  };

  const checkUsernameExists = async () => {
    if (!formData.username) return;

    setCheckingUsername(true);
    setUsernameAvailable(null);

    try {
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.NFT_MINTER.address,
        {
          n_f_t_minter: {
            username_exists: {
              username: formData.username
            }
          }
        }
      );
      
      // The API returns true if username exists, so we negate it for availability
      setUsernameAvailable(!result.exists);
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const createProfile = async () => {
    if (!formData.username) {
      setError('Username is required');
      return;
    }

    if (!userAddress) {
      setError('Wallet not connected');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const { client } = await connectWallet();
      
      // Create metadata object
      const metadata = {
        fullName: formData.fullName || '',
        bio: formData.bio || '',
        avatar: formData.avatar || '',
        socialLinks: {
          twitter: formData.twitter || '',
          telegram: formData.telegram || '',
          discord: formData.discord || '',
          website: formData.website || ''
        }
      };
      
      // Convert to JSON string for the contract
      const metadataUri = JSON.stringify(metadata);

      const msg = {
        n_f_t_minter: {
          create_profile: {
            username: formData.username,
            metadata_uri: metadataUri
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.NFT_MINTER.address,
        msg,
        'auto'
      );

      // Save username to localStorage
      localStorage.setItem(LOCALSTORAGE_USERNAME_KEY, formData.username);
      
      // Refetch profile data after creation
      checkForExistingProfile();
      setShowCreateForm(false);
      
      // Reset form data
      setFormData({
        username: '',
        fullName: '',
        bio: '',
        avatar: '',
        twitter: '',
        telegram: '',
        discord: '',
        website: ''
      });
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message || 'Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const updateProfile = async () => {
    if (!userProfile || !userAddress) {
      setError('Profile or wallet not found');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const { client } = await connectWallet();
      
      // Create updated metadata object
      const metadata = {
        fullName: formData.fullName || '',
        bio: formData.bio || '',
        avatar: formData.avatar || '',
        socialLinks: {
          twitter: formData.twitter || '',
          telegram: formData.telegram || '',
          discord: formData.discord || '',
          website: formData.website || ''
        }
      };
      
      // Convert to JSON string for the contract
      const metadataUri = JSON.stringify(metadata);

      const msg = {
        n_f_t_minter: {
          update_profile_metadata: {
            token_id: Number(userProfile.tokenId),
            new_metadata_uri: metadataUri
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.NFT_MINTER.address,
        msg,
        'auto'
      );

      // Update localStorage if username has changed
      if (formData.username !== userProfile.username) {
        localStorage.setItem(LOCALSTORAGE_USERNAME_KEY, formData.username);
      }
      
      // Refetch profile data after update
      checkForExistingProfile();
      setShowUpdateForm(false);
      
      // Reset form data
      setFormData({
        username: '',
        fullName: '',
        bio: '',
        avatar: '',
        twitter: '',
        telegram: '',
        discord: '',
        website: ''
      });
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const startUpdateProfile = () => {
    if (!userProfile) return;
    
    // Prefill form with existing data
    setFormData({
      username: userProfile.username,
      fullName: userProfile.metadata.fullName || '',
      bio: userProfile.metadata.bio || '',
      avatar: userProfile.metadata.avatar || '',
      twitter: userProfile.metadata.socialLinks?.twitter || '',
      telegram: userProfile.metadata.socialLinks?.telegram || '',
      discord: userProfile.metadata.socialLinks?.discord || '',
      website: userProfile.metadata.socialLinks?.website || ''
    });
    
    setShowUpdateForm(true);
  };

  const cancelUpdate = () => {
    setShowUpdateForm(false);
    // Reset form fields
    setFormData({
      username: '',
      fullName: '',
      bio: '',
      avatar: '',
      twitter: '',
      telegram: '',
      discord: '',
      website: ''
    });
    // Reset validation state
    setUsernameAvailable(null);
  };

  // Load tribes created by or administered by the user
  const loadUserTribes = () => {
    if (!userAddress) return;

    try {
      const storedData = localStorage.getItem(TRIBES_STORAGE_KEY);
      if (storedData) {
        const allTribes = JSON.parse(storedData);
        // Filter for tribes created by this user
        const userOwnedTribes = allTribes.filter((tribe: Tribe) => 
          tribe.creator === userAddress || tribe.admin === userAddress
        );
        setUserTribes(userOwnedTribes);
      }
    } catch (err) {
      console.error("Error loading user tribes:", err);
    }
  };

  if (loading || checking) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-300">Checking for existing profiles...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-300 mb-6">Please connect your wallet to view or create your profile.</p>
          <button
            onClick={connect}
            disabled={connecting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md w-full disabled:opacity-70"
          >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  // Profile form component (shared between create and update)
  const ProfileForm = ({ 
    isUpdate = false, 
    onSubmit, 
    onCancel = undefined,
    isSubmitting 
  }: { 
    isUpdate?: boolean, 
    onSubmit: () => void, 
    onCancel?: () => void,
    isSubmitting: boolean 
  }) => (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">
        {isUpdate ? 'Update Your Profile' : 'Create Your Profile'}
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-gray-300 mb-2">
            Username *
          </label>
          <div className="relative">
            <input
              ref={inputRefs.username}
              type="text"
              value={formData.username}
              onChange={(e) => handleFormChange('username', e.target.value)}
              disabled={isUpdate} // Username can't be changed in update mode
              className={`bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${isUpdate ? 'opacity-70' : ''}`}
              placeholder="Choose a unique username"
              required
            />
            {checkingUsername && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            )}
            {usernameAvailable !== null && !checkingUsername && !isUpdate && (
              <div className="absolute right-3 top-2.5">
                {usernameAvailable ? (
                  <span className="text-green-400 text-xl">✓</span>
                ) : (
                  <span className="text-red-400 text-xl">✗</span>
                )}
              </div>
            )}
          </div>
          {usernameAvailable !== null && !isUpdate && (
            <p className={`mt-2 text-sm ${usernameAvailable ? 'text-green-400' : 'text-red-400'}`}>
              {usernameAvailable ? 'Username is available!' : 'Username is already taken'}
            </p>
          )}
          {isUpdate && (
            <p className="mt-2 text-sm text-gray-400">
              Username cannot be changed
            </p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 mb-2">
            Full Name
          </label>
          <input
            ref={inputRefs.fullName}
            type="text"
            value={formData.fullName}
            onChange={(e) => handleFormChange('fullName', e.target.value)}
            className="bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your full name"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            ref={inputRefs.bio}
            value={formData.bio}
            onChange={(e) => handleFormChange('bio', e.target.value)}
            className="bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tell us about yourself"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">
            Avatar Image URL
          </label>
          <input
            ref={inputRefs.avatar}
            type="text"
            value={formData.avatar}
            onChange={(e) => handleFormChange('avatar', e.target.value)}
            className="bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/your-image.jpg"
          />
          {formData.avatar && (
            <div className="mt-2 bg-gray-700 p-2 rounded-md inline-block">
              <img 
                src={formData.avatar} 
                alt="Avatar preview" 
                className="w-16 h-16 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+URL';
                }}
              />
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-lg font-medium text-white mb-4">Social Links</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">
                Twitter
              </label>
              <input
                ref={inputRefs.twitter}
                type="text"
                value={formData.twitter}
                onChange={(e) => handleFormChange('twitter', e.target.value)}
                className="bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://twitter.com/username"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">
                Telegram
              </label>
              <input
                ref={inputRefs.telegram}
                type="text"
                value={formData.telegram}
                onChange={(e) => handleFormChange('telegram', e.target.value)}
                className="bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://t.me/username"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">
                Discord
              </label>
              <input
                ref={inputRefs.discord}
                type="text"
                value={formData.discord}
                onChange={(e) => handleFormChange('discord', e.target.value)}
                className="bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username#0000"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">
                Website
              </label>
              <input
                ref={inputRefs.website}
                type="text"
                value={formData.website}
                onChange={(e) => handleFormChange('website', e.target.value)}
                className="bg-gray-700 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </div>
        
        <div className="pt-4 flex flex-col md:flex-row gap-4">
          <button
            onClick={onSubmit}
            disabled={isSubmitting || (!isUpdate && (usernameAvailable === false)) || !formData.username || !userAddress}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md disabled:opacity-50"
          >
            {isSubmitting ? (isUpdate ? 'Updating...' : 'Creating...') : (isUpdate ? 'Update Profile' : 'Create Profile')}
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-md"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Tribe card component
  const TribeCard = ({ tribe }: { tribe: Tribe }) => (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 transition-all hover:shadow-xl">
      <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 relative">
        {tribe.cover_image && (
          <img 
            src={tribe.cover_image} 
            alt={tribe.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x200?text=No+Image';
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
          {tribe.join_type && (
            <>
              <span className="mx-2 text-gray-500">•</span>
              <span className={`text-sm ${tribe.join_type === 'public' ? 'text-green-400' : 'text-yellow-400'}`}>
                {tribe.join_type === 'public' ? 'Public' : 'Private'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {userProfile && !showUpdateForm ? (
        <div>
          {/* Profile header */}
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 rounded-full bg-gray-700 overflow-hidden border-4 border-gray-800">
                  {userProfile.metadata.avatar ? (
                    <img 
                      src={userProfile.metadata.avatar} 
                      alt={userProfile.username} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                      {userProfile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold text-white">
                        {userProfile.metadata.fullName || userProfile.username}
                      </h1>
                      {userProfile.metadata.fullName && (
                        <p className="text-gray-300">@{userProfile.username}</p>
                      )}
                      <p className="text-blue-200 mt-1">
                        Token ID: {userProfile.tokenId}
                      </p>
                      <p className="text-gray-300 mt-1 text-sm break-all">
                        Owner: {userProfile.owner}
                      </p>
                    </div>
                    <button 
                      onClick={startUpdateProfile}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium p-2 rounded-md"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-6 py-3 font-medium text-sm ${activeTab === 'profile' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-300 hover:text-white'}`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('tribes')}
                  className={`px-6 py-3 font-medium text-sm ${activeTab === 'tribes' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-300 hover:text-white'}`}
                >
                  My Tribes
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`px-6 py-3 font-medium text-sm ${activeTab === 'posts' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-300 hover:text-white'}`}
                >
                  My Posts
                </button>
              </div>
            </div>
            
            {/* Tab content */}
            <div className="p-6">
              {activeTab === 'profile' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-2">Bio</h2>
                    <p className="text-gray-300">
                      {userProfile.metadata.bio || "No bio provided"}
                    </p>
                  </div>
                  
                  {(userProfile.metadata.socialLinks && Object.values(userProfile.metadata.socialLinks).some(Boolean)) && (
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">Social Links</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {userProfile.metadata.socialLinks.twitter && (
                          <SocialLink 
                            platform="Twitter" 
                            url={userProfile.metadata.socialLinks.twitter}
                            icon="🐦"
                          />
                        )}
                        {userProfile.metadata.socialLinks.telegram && (
                          <SocialLink 
                            platform="Telegram" 
                            url={userProfile.metadata.socialLinks.telegram}
                            icon="✈️"
                          />
                        )}
                        {userProfile.metadata.socialLinks.discord && (
                          <SocialLink 
                            platform="Discord" 
                            url={userProfile.metadata.socialLinks.discord}
                            icon="🎮"
                          />
                        )}
                        {userProfile.metadata.socialLinks.website && (
                          <SocialLink 
                            platform="Website" 
                            url={userProfile.metadata.socialLinks.website}
                            icon="🌐"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tribes' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">My Tribes</h2>
                    <span className="text-sm text-gray-400">{userTribes.length} tribes</span>
                  </div>
                  
                  {userTribes.length === 0 ? (
                    <div className="bg-gray-700 rounded-lg p-8 text-center">
                      <p className="text-gray-400 mb-4">You haven't created any tribes yet</p>
                      <button
                        onClick={() => window.location.href = '/tribe/create'}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                      >
                        Create a Tribe
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {userTribes.map(tribe => (
                        <div key={tribe.id} onClick={() => window.location.href = `/tribe/${tribe.id}`} className="cursor-pointer">
                          <TribeCard tribe={tribe} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'posts' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">My Posts</h2>
                  {userAddress && (
                    <TribePosts 
                      userAddress={userAddress} 
                      isMember={false}
                      userFilter={userAddress}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : showUpdateForm ? (
        <ProfileForm 
          isUpdate={true} 
          onSubmit={updateProfile} 
          onCancel={cancelUpdate}
          isSubmitting={updating} 
        />
      ) : showCreateForm ? (
        <ProfileForm 
          isUpdate={false} 
          onSubmit={createProfile} 
          isSubmitting={creating} 
        />
      ) : (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Profile Found</h2>
          <p className="text-gray-300 mb-6">You don't have a profile yet. Create one to get started.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md"
          >
            Create Profile
          </button>
        </div>
      )}
    </div>
  );
};

interface SocialLinkProps {
  platform: string;
  url: string;
  icon: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ platform, url, icon }) => {
  return (
    <a 
      href={url.startsWith('http') ? url : `https://${url}`} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center space-x-2 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-gray-300">{platform}</span>
    </a>
  );
};

export default ProfilePage; 
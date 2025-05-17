import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';

// Storage key for tribes data
const TRIBES_STORAGE_KEY = 'xion_tribes';

const CreateTribePage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, userAddress } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: '',
    isPrivate: false,
    entryFee: '0'
  });

  // Helper to save a new tribe to localStorage
  const saveNewTribeToStorage = (tribeData: any) => {
    try {
      // Get existing tribes
      const storedData = localStorage.getItem(TRIBES_STORAGE_KEY);
      const existingTribes = storedData ? JSON.parse(storedData) : [];
      
      // Add new tribe
      const updatedTribes = [...existingTribes, tribeData];
      
      // Save back to localStorage
      localStorage.setItem(TRIBES_STORAGE_KEY, JSON.stringify(updatedTribes));
    } catch (err) {
      console.error("Error saving new tribe to storage:", err);
    }
  };

  // Create a tribe
  const createTribe = async () => {
    if (!formData.name) {
      setError("Tribe name is required");
      return;
    }
    
    if (!isConnected || !userAddress) {
      setError("Please connect your wallet");
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const { client } = await connectWallet();
      
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
      
      // Try to extract the tribe ID from the transaction result
      let tribeId = null;
      try {
        // Different chains might return the tribe ID in different formats
        if (result.logs && result.logs.length > 0) {
          const events = result.logs[0].events;
          const wasm = events.find((e: any) => e.type === 'wasm');
          if (wasm && wasm.attributes) {
            const tribeIdAttr = wasm.attributes.find((attr: any) => 
              attr.key === 'tribe_id' || attr.key === 'id'
            );
            if (tribeIdAttr) {
              tribeId = Number(tribeIdAttr.value);
            }
          }
        }
      } catch (err) {
        console.warn("Could not extract tribe ID from result:", err);
      }
      
      // If we got the tribe ID, save to localStorage
      if (tribeId !== null) {
        const newTribe = {
          id: tribeId,
          name: formData.name,
          description: formData.description,
          cover_image: formData.coverImage,
          creator: userAddress,
          admin: userAddress,
          join_type: formData.isPrivate ? 'private' : 'public',
          entry_fee: formData.entryFee,
          member_count: 1, // Creator is automatically a member
          member_status: 'Member'
        };
        
        saveNewTribeToStorage(newTribe);
      }
      
      alert("Tribe created successfully!");
      
      // Navigate to the new tribe or back to home
      if (tribeId !== null) {
        navigate(`/tribe/${tribeId}`);
      } else {
        navigate('/');
      }
      
    } catch (err: any) {
      console.error("Error creating tribe:", err);
      setError(err.message || "Failed to create tribe");
    } finally {
      setLoading(false);
    }
  };

  // Cancel and go back
  const handleCancel = () => {
    navigate('/');
  };

  // Check if user is not connected
  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 mb-4">Please connect your wallet to create a tribe</p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Create New Tribe</h1>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
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
              onClick={handleCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTribePage; 
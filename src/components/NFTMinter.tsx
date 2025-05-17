import React, { useState } from 'react';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';
import { GasPrice } from "@cosmjs/stargate";

export default function NFTMinter() {
  const [username, setUsername] = useState('');
  const [metadataUri, setMetadataUri] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [newMetadataUri, setNewMetadataUri] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryType, setQueryType] = useState<string>('');
  // Separate state for each query input
  const [queryTokenId, setQueryTokenId] = useState('');
  const [queryUsername, setQueryUsername] = useState('');
  const [ownerTokenId, setOwnerTokenId] = useState('');
  const [existsUsername, setExistsUsername] = useState('');

  const createProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        n_f_t_minter: {
          create_profile: {
            username,
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
      alert(`Profile created successfully!\nTx Hash: ${result.transactionHash}`);
      setUsername('');
      setMetadataUri('');
    } catch (err: any) {
      // Log the full error object for debugging
      console.error('Create Profile Error:', err);

      // Safely get the error message
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

      // Custom error for username exists
      if (errorMsg.includes('already taken') || errorMsg.includes('already exists')) {
        alert('This username already exists!');
      } else {
        alert('Error: ' + errorMsg);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileMetadata = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        n_f_t_minter: {
          update_profile_metadata: {
            token_id: parseInt(tokenId),
            new_metadata_uri: newMetadataUri
          }
        }
      };
      console.log('userAddress:', userAddress);
      console.log('contract address:', CONTRACTS.NFT_MINTER.address);
      console.log('msg:', JSON.stringify(msg));
      const result = await client.execute(
        userAddress,
        CONTRACTS.NFT_MINTER.address,
        msg,
        'auto'
      );
      alert(`Profile updated successfully!\nTx Hash: ${result.transactionHash}`);
      setTokenId('');
      setNewMetadataUri('');
    } catch (err: any) {
      if (err.message && err.message.includes('Not authorized')) {
        alert('You are not authorized to update this profile!');
      } else {
        alert('Error: ' + (err.message || err));
      }
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const transferProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        n_f_t_minter: {
          transfer_profile: {
            to: transferTo,
            token_id: parseInt(tokenId)
          }
        }
      };
      console.log('userAddress:', userAddress);
      console.log('contract address:', CONTRACTS.NFT_MINTER.address);
      console.log('msg:', JSON.stringify(msg));
      const result = await client.execute(
        userAddress,
        CONTRACTS.NFT_MINTER.address,
        msg,
        'auto'
      );
      alert(`Profile transferred successfully!\nTx Hash: ${result.transactionHash}`);
      setTokenId('');
      setTransferTo('');
    } catch (err: any) {
      if (err.message && err.message.includes('Not authorized')) {
        alert('You are not authorized to transfer this profile!');
      } else {
        alert('Error: ' + (err.message || err));
      }
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Query functions now take their own input
  const getProfileByTokenId = async (id: string) => {
    if (!id || isNaN(Number(id))) {
      alert('Please enter a valid Token ID!');
      setQueryResult(null);
      setQueryType('profile');
      return;
    }
    try {
      const { client } = await connectWallet();
      const query = {
        n_f_t_minter: {
          get_profile_by_token_id: { token_id: Number(id) }
        }
      };
      console.log('contract address:', CONTRACTS.NFT_MINTER.address);
      console.log('query:', JSON.stringify(query));
      const result = await client.queryContractSmart(
        CONTRACTS.NFT_MINTER.address,
        query
      );
      let parsedResult = result;
      if (typeof result === 'string') {
        const decoded = atob(result);
        parsedResult = JSON.parse(decoded);
      }
      console.log('Parsed Query result:', parsedResult);
      setQueryType('profile');
      setQueryResult(parsedResult);
    } catch (err) {
      setQueryType('profile');
      setQueryResult(null);
      alert('Query failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getTokenIdByUsername = async (uname: string) => {
    const trimmed = uname.trim();
    if (!trimmed) {
      alert('Please enter a username!');
      setQueryResult(null);
      setQueryType('tokenId');
      return;
    }
    try {
      const { client } = await connectWallet();
      const query = {
        n_f_t_minter: {
          get_token_id_by_username: { username: trimmed }
        }
      };
      console.log('contract address:', CONTRACTS.NFT_MINTER.address);
      console.log('query:', JSON.stringify(query));
      const result = await client.queryContractSmart(
        CONTRACTS.NFT_MINTER.address,
        query
      );
      let parsedResult = result;
      if (typeof result === 'string') {
        const decoded = atob(result);
        parsedResult = JSON.parse(decoded);
      }
      console.log('Parsed Query result:', parsedResult);
      setQueryType('tokenId');
      setQueryResult(parsedResult);
    } catch (err) {
      console.error('Query error:', err);
      setQueryType('tokenId');
      setQueryResult(null);
      alert('Query failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const ownerOf = async (id: string) => {
    if (!id || isNaN(Number(id))) {
      alert('Please enter a valid Token ID!');
      setQueryResult(null);
      setQueryType('owner');
      return;
    }
    try {
      const { client } = await connectWallet();
      const query = {
        n_f_t_minter: {
          owner_of: { token_id: Number(id) }
        }
      };
      console.log('contract address:', CONTRACTS.NFT_MINTER.address);
      console.log('query:', JSON.stringify(query));
      const result = await client.queryContractSmart(
        CONTRACTS.NFT_MINTER.address,
        query
      );
      let parsedResult = result;
      if (typeof result === 'string') {
        const decoded = atob(result);
        parsedResult = JSON.parse(decoded);
      }
      setQueryType('owner');
      setQueryResult(parsedResult);
    } catch (err) {
      setQueryType('owner');
      setQueryResult(null);
    }
  };

  const usernameExists = async (uname: string) => {
    const trimmed = uname.trim();
    if (!trimmed) {
      alert('Please enter a username!');
      setQueryResult(null);
      setQueryType('exists');
      return;
    }
    try {
      const { client } = await connectWallet();
      const query = {
        n_f_t_minter: {
          username_exists: { username: trimmed }
        }
      };
      console.log('contract address:', CONTRACTS.NFT_MINTER.address);
      console.log('query:', JSON.stringify(query));
      const result = await client.queryContractSmart(
        CONTRACTS.NFT_MINTER.address,
        query
      );
      let parsedResult = result;
      if (typeof result === 'string') {
        const decoded = atob(result);
        parsedResult = JSON.parse(decoded);
      }
      console.log('Parsed Query result:', parsedResult);
      setQueryType('exists');
      setQueryResult(parsedResult);
    } catch (err) {
      setQueryType('exists');
      setQueryResult(null);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">NFT Minter</h2>
      <div className="space-y-6">
        {/* Create Profile Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Create Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Metadata URI</label>
              <input
                type="text"
                value={metadataUri}
                onChange={(e) => setMetadataUri(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={createProfile}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </div>
        {/* Update Profile Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Update Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Token ID</label>
              <input
                type="number"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">New Metadata URI</label>
              <input
                type="text"
                value={newMetadataUri}
                onChange={(e) => setNewMetadataUri(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={updateProfileMetadata}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </div>
        {/* Transfer Profile Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Transfer Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Token ID</label>
              <input
                type="number"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Transfer To</label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={transferProfile}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Transferring...' : 'Transfer Profile'}
            </button>
          </div>
        </div>
        {/* Query Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Query Functions</h3>
          <div className="space-y-4">
            {/* Get Profile by Token ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Token ID</label>
              <input
                type="number"
                value={queryTokenId}
                onChange={(e) => setQueryTokenId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              <button
                onClick={() => getProfileByTokenId(queryTokenId)}
                className="w-full mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Get Profile by Token ID
              </button>
            </div>
            {/* Get Token ID by Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={queryUsername}
                onChange={(e) => setQueryUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              <button
                onClick={() => getTokenIdByUsername(queryUsername)}
                className="w-full mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Get Token ID by Username
              </button>
            </div>
            {/* Get Owner of Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Token ID</label>
              <input
                type="number"
                value={ownerTokenId}
                onChange={(e) => setOwnerTokenId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              <button
                onClick={() => ownerOf(ownerTokenId)}
                className="w-full mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Get Owner of Token
              </button>
            </div>
            {/* Check Username Exists */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={existsUsername}
                onChange={(e) => setExistsUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              <button
                onClick={() => usernameExists(existsUsername)}
                className="w-full mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Check Username Exists
              </button>
            </div>
          </div>
          {/* Show query result */}
          <div className="mt-4 p-3 border-2 border-blue-500 rounded bg-blue-50">
            <h4 className="font-bold mb-2">Query Result</h4>
            {queryResult && queryType === 'profile' && (
              <div>
                <div><b>Token ID:</b> {queryResult.token_id}</div>
                <div><b>Username:</b> {queryResult.username}</div>
                <div><b>Metadata URI:</b> {queryResult.metadata_uri}</div>
                <div><b>Owner:</b> {queryResult.owner}</div>
              </div>
            )}
            {queryResult && queryType === 'tokenId' && (
              <div><b>Token ID:</b> {queryResult.token_id}</div>
            )}
            {queryResult && queryType === 'owner' && (
              <div><b>Owner:</b> {queryResult.owner}</div>
            )}
            {queryResult && queryType === 'exists' && (
              <div><b>Username Exists:</b> {queryResult.exists ? 'Yes' : 'No'}</div>
            )}
            {!queryResult && (
              <div>No result found or query failed.</div>
            )}
          </div>
        </div>
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
} 
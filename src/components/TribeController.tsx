import React, { useState, useEffect } from 'react';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';

export default function TribeController() {
  const [tribeId, setTribeId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [metadata, setMetadata] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [memberAddress, setMemberAddress] = useState('');
  const [offset, setOffset] = useState('0');
  const [limit, setLimit] = useState('10');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryType, setQueryType] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [connectedAddress, setConnectedAddress] = useState('');
  const [memberStatus, setMemberStatus] = useState('');
  const [requestJoinTribeId, setRequestJoinTribeId] = useState('');
  const [joinWithCodeTribeId, setJoinWithCodeTribeId] = useState('');
  const [joinWithCodeInvite, setJoinWithCodeInvite] = useState('');

  // Show connected wallet address at the top
  useEffect(() => {
    async function fetchAddress() {
      try {
        const { userAddress } = await connectWallet();
        setConnectedAddress(userAddress);
      } catch (e) {
        setConnectedAddress('');
      }
    }
    fetchAddress();
  }, []);

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

  const createTribe = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        tribe_controller: {
          create_tribe: {
            name,
            metadata,
            admins: [userAddress],
            join_type: isPrivate ? "private" : "public",
            entry_fee: entryFee,
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
      alert(`Tribe created successfully!\nTx Hash: ${result.transactionHash}`);
      setName('');
      setMetadata('');
      setIsPrivate(false);
      setEntryFee('0');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  
  const updateTribe = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        tribe_controller: {
          update_tribe: {
            tribe_id: parseInt(tribeId),
            new_metadata: metadata,
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
      alert(`Tribe updated successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
      setMetadata('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          add_member: {
            tribe_id: parseInt(tribeId),
            member: memberAddress
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );

      alert(`Member added successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
      setMemberAddress('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          remove_member: {
            tribe_id: parseInt(tribeId),
            member: memberAddress
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );

      alert(`Member removed successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
      setMemberAddress('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const requestToJoinTribe = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        tribe_controller: {
          request_to_join_tribe: {
            tribe_id: parseInt(requestJoinTribeId)
          }
        }
      };
      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );
      alert(`Join request sent successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const approveMember = async () => {
    if (memberStatus !== 'Pending') {
      alert('Member must be in Pending status to approve.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          approve_member: {
            tribe_id: parseInt(tribeId),
            member: memberAddress
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );

      alert(`Member approved successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
      setMemberAddress('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const rejectMember = async () => {
    if (memberStatus !== 'Pending') {
      alert('Member must be in Pending status to reject.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          reject_member: {
            tribe_id: parseInt(tribeId),
            member: memberAddress
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );

      alert(`Member rejected successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
      setMemberAddress('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const banMember = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        tribe_controller: {
          ban_member: {
            tribe_id: parseInt(tribeId),
            member: memberAddress
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );

      alert(`Member banned successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
      setMemberAddress('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const joinTribeWithCode = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        tribe_controller: {
          join_tribe_with_code: {
            tribe_id: parseInt(tribeId),
            invite_code: inviteCode
          }
        }
      };
      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );
      alert(`Joined tribe with code successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
      setInviteCode('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getMemberStatus = async () => {
    try {
      setLoading(true);
      setError('');
      setQueryType('memberStatus');
      setQueryResult(null);
      const { client } = await connectWallet();
      console.log("Querying TribeController at:", CONTRACTS.TRIBE_CONTROLLER.address);
      const result = await client.queryContractSmart(
        CONTRACTS.TRIBE_CONTROLLER.address,
        {
          tribe_controller: {
            get_member_status: {
              tribe_id: Number(tribeId),
              member: memberAddress
            }
          }
        }
      );
      setMemberStatus(result.status);
      setQueryResult(result);
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getMemberCount = async () => {
    try {
      setLoading(true);
      setError('');
      setQueryType('memberCount');
      setQueryResult(null);
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.TRIBE_CONTROLLER.address,
        {
          tribe_controller: {
            get_member_count: {
              tribe_id: parseInt(tribeId)
            }
          }
        }
      );
      setQueryResult(result);
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getUserTribes = async () => {
    try {
      setLoading(true);
      setError('');
      setQueryType('userTribes');
      setQueryResult(null);
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.TRIBE_CONTROLLER.address,
        {
          tribe_controller: {
            get_user_tribes: {
              user: memberAddress
            }
          }
        }
      );
      setQueryResult(result);
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getTribeDetails = async () => {
    try {
      setLoading(true);
      setError('');
      setQueryType('tribeDetails');
      setQueryResult(null);
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.TRIBE_CONTROLLER.address,
        {
          tribe_controller: {
            get_tribe_details: {
              tribe_id: parseInt(tribeId)
            }
          }
        }
      );
      setQueryResult(result);
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const joinTribe = async () => {
    try {
      setLoading(true);
      setError('');
      const { client, userAddress } = await connectWallet();
      const msg = {
        tribe_controller: {
          join_tribe: {
            tribe_id: parseInt(tribeId)
          }
        }
      };
      const result = await client.execute(
        userAddress,
        CONTRACTS.TRIBE_CONTROLLER.address,
        msg,
        'auto'
      );
      alert(`Joined tribe successfully!\nTx Hash: ${result.transactionHash}`);
      setTribeId('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getErrorMsg(err);
      alert('Error: ' + errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getNextPostId = async () => {
    try {
      setLoading(true);
      setError('');
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.POST_MINTER.address,
        { get_next_post_id: {} }
      );
      // Parse the result if needed
      let nextPostId = result;
      if (typeof result === "string" && !isNaN(Number(result))) {
        nextPostId = Number(result);
      } else if (typeof result === "object" && result.next_post_id) {
        nextPostId = Number(result.next_post_id);
      }
      setQueryResult(nextPostId); // <-- This will show in the output box
    } catch (err) {
      setError('Error fetching next post ID');
    } finally {
      setLoading(false);
    }
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

  // Helper to parse numeric results (e.g., next post ID)
  function parseNumberResult(result: any) {
    if (typeof result === "string" && !isNaN(Number(result))) return Number(result);
    if (typeof result === "object" && result !== null) {
      // Try to find a numeric field
      for (const key in result) {
        if (typeof result[key] === "string" && !isNaN(Number(result[key]))) {
          return Number(result[key]);
        }
      }
    }
    return result;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Tribe Controller</h2>
      {/* Show connected wallet address */}
      <div className="mb-4 p-2 bg-gray-100 rounded border border-gray-300">
        <span className="font-semibold">Connected Wallet Address:</span>
        <span className="ml-2 text-blue-700 select-all">{connectedAddress || 'Not connected'}</span>
        <button
          className="ml-2 px-2 py-1 text-xs bg-blue-200 rounded hover:bg-blue-300"
          onClick={() => {
            if (connectedAddress) navigator.clipboard.writeText(connectedAddress);
          }}
          disabled={!connectedAddress}
        >
          Copy
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Create Tribe Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Create Tribe</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Metadata</label>
              <input
                type="text"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Is Private Tribe
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Entry Fee</label>
              <input
                type="text"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={createTribe}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Creating...' : 'Create Tribe'}
            </button>
          </div>
        </div>

        {/* Update Tribe Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Update Tribe</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tribe ID</label>
              <input
                type="number"
                value={tribeId}
                onChange={(e) => setTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">New Metadata</label>
              <input
                type="text"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Is Private Tribe
              </label>
            </div>
            <button
              onClick={updateTribe}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Updating...' : 'Update Tribe'}
            </button>
          </div>
        </div>

        {/* Member Management Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Member Management</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tribe ID</label>
              <input
                type="number"
                value={tribeId}
                onChange={(e) => setTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Member Address</label>
              <input
                type="text"
                value={memberAddress}
                onChange={(e) => setMemberAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* <button
                onClick={addMember}
                disabled={loading}
                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button> */}
              {/* <button
                onClick={removeMember}
                disabled={loading}
                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {loading ? 'Removing...' : 'Remove Member'}
              </button> */}
              <button
                onClick={approveMember}
                disabled={loading}
                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Approving...' : 'Approve Member'}
              </button>
              <button
                onClick={rejectMember}
                disabled={loading}
                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                {loading ? 'Rejecting...' : 'Reject Member'}
              </button>
              <button
                onClick={banMember}
                disabled={loading}
                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {loading ? 'Banning...' : 'Ban Member'}
              </button>
            </div>
          </div>
        </div>

        {/* Join Tribe Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Join Tribe</h3>
          <div className="space-y-4">
            {/* Request to Join Tribe (for private/gated tribes) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Tribe ID (for Request to Join Tribe)</label>
              <input
                type="number"
                value={requestJoinTribeId}
                onChange={(e) => setRequestJoinTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                onClick={async () => {
                  setTribeId(requestJoinTribeId); // for compatibility with function
                  await requestToJoinTribe();
                }}
                disabled={loading}
                className="mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Requesting...' : 'Request to Join'}
              </button>
            </div>
            {/* Join Tribe With Code (for invite code tribes) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Tribe ID (for Join With Code)</label>
              <input
                type="number"
                value={joinWithCodeTribeId}
                onChange={(e) => setJoinWithCodeTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <label className="block text-sm font-medium text-gray-700 mt-2">Invite Code</label>
              <input
                type="text"
                value={joinWithCodeInvite}
                onChange={(e) => setJoinWithCodeInvite(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                onClick={async () => {
                  setTribeId(joinWithCodeTribeId); // for compatibility with function
                  setInviteCode(joinWithCodeInvite);
                  await joinTribeWithCode();
                }}
                disabled={loading}
                className="mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Joining...' : 'Join with Code'}
              </button>
            </div>
            {/* Join Tribe Directly (for public tribes) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Tribe ID (for Join Tribe)</label>
              <input
                type="number"
                value={tribeId}
                onChange={(e) => setTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                onClick={joinTribe}
                disabled={loading}
                className="mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Joining...' : 'Join Tribe'}
              </button>
            </div>
          </div>
        </div>

        {/* Query Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Query Functions</h3>
          <div className="space-y-6">
            {/* Get Tribe Details */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Tribe ID (for Get Tribe Details)</label>
              <input
                type="number"
                value={tribeId}
                onChange={(e) => setTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                onClick={getTribeDetails}
                className="mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Get Tribe Details
              </button>
            </div>
            {/* Get Member Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Tribe ID (for Get Member Status)</label>
              <input
                type="number"
                value={tribeId}
                onChange={(e) => setTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <label className="block text-sm font-medium text-gray-700 mt-2">Member Address (for Get Member Status)</label>
              <input
                type="text"
                value={memberAddress}
                onChange={(e) => setMemberAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                onClick={getMemberStatus}
                className="mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Get Member Status
              </button>
            </div>
            {/* Get Member Count */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Tribe ID (for Get Member Count)</label>
              <input
                type="number"
                value={tribeId}
                onChange={(e) => setTribeId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                onClick={getMemberCount}
                className="mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Get Member Count
              </button>
            </div>
            {/* Get User Tribes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Member Address (for Get User Tribes)</label>
              <input
                type="text"
                value={memberAddress}
                onChange={(e) => setMemberAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                onClick={getUserTribes}
                className="mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Get User Tribes
              </button>
            </div>
          </div>
          {/* Show query result */}
          <div className="mt-4 p-3 border-2 border-blue-500 rounded bg-blue-50">
            <h4 className="font-bold mb-2">Query Result</h4>
            {queryResult ? (
              <pre className="text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(decodeResult(queryResult), null, 2)}
              </pre>
            ) : (
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
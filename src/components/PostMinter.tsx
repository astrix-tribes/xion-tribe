import React, { useState } from 'react';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';

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

export default function PostMinter() {
  const [tribeId, setTribeId] = useState('');
  const [metadata, setMetadata] = useState('');
  const [isGated, setIsGated] = useState(false);
  const [collectibleContract, setCollectibleContract] = useState('');
  const [collectibleId, setCollectibleId] = useState('');
  const [postId, setPostId] = useState('');
  const [offset, setOffset] = useState('0');
  const [limit, setLimit] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);

  const createPost = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { client, userAddress } = await connectWallet();
      
      const msg = {
        post_minter: {
          create_post: {
            tribe_id: parseInt(tribeId),
            metadata: metadata,
            is_gated: isGated,
            collectible_contract: collectibleContract || null,
            collectible_id: collectibleId ? parseInt(collectibleId) : null
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.POST_MINTER.address,
        msg,
        'auto'
      );

      console.log('Post created:', result);
      // Reset form
      setTribeId('');
      setMetadata('');
      setIsGated(false);
      setCollectibleContract('');
      setCollectibleId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPost = async () => {
    try {
      const { client } = await connectWallet();
      
      const result = await client.queryContractSmart(
        CONTRACTS.POST_MINTER.address,
        {
          post_minter: {
            get_post: { post_id: parseInt(postId) }
          }
        }
      );

      console.log('Post:', result);
      const decodedPost = decodeResult(result);
      setQueryResult(decodedPost);
      console.log('Decoded Post:', decodedPost);
      return decodedPost;
    } catch (err) {
      console.error('Error fetching post:', err);
      throw err;
    }
  };

  const getPostsByTribe = async () => {
    try {
      const { client } = await connectWallet();
      
      const result = await client.queryContractSmart(
        CONTRACTS.POST_MINTER.address,
        {
          post_minter: {
            get_posts_by_tribe: {
              tribe_id: parseInt(tribeId),
              offset: parseInt(offset),
              limit: parseInt(limit)
            }
          }
        }
      );

      console.log('Posts:', result);
      setQueryResult(result);
      return result;
    } catch (err) {
      console.error('Error fetching posts:', err);
      throw err;
    }
  };

  const getNextPostId = async () => {
    try {
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.POST_MINTER.address,
        {
          post_minter: {
            next_post_id: {}
          }
        }
      );
      const decoded = decodeResult(result);
      // If decoded is an object with next_post_id, set just the number
      if (decoded && typeof decoded === 'object' && decoded.next_post_id !== undefined) {
        setQueryResult(decoded.next_post_id);
      } else {
        setQueryResult(decoded);
      }
      console.log('Next Post ID:', decoded);
      return decoded;
    } catch (err) {
      console.error('Error fetching next post ID:', err);
      throw err;
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Post Minter</h2>
      
      <div className="space-y-6">
        {/* Create Post Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Create Post</h3>
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
                checked={isGated}
                onChange={(e) => setIsGated(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Is Gated Content
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Collectible Contract (Optional)</label>
              <input
                type="text"
                value={collectibleContract}
                onChange={(e) => setCollectibleContract(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Collectible ID (Optional)</label>
              <input
                type="number"
                value={collectibleId}
                onChange={(e) => setCollectibleId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={createPost}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </div>

        {/* Query Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Query Functions</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Post ID</label>
              <input
                type="number"
                value={postId}
                onChange={(e) => setPostId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={getPost}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Get Post
            </button>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Offset</label>
              <input
                type="number"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Limit</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={getPostsByTribe}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Get Posts by Tribe
            </button>

            <button
              onClick={getNextPostId}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Get Next Post ID
            </button>
          </div>
        </div>

        {/* Decoded Result Section */}
        <div className="border p-4 rounded-lg mt-4">
          <h3 className="text-lg font-semibold mb-3">Decoded Result</h3>
          <pre>{typeof queryResult === 'number' ? queryResult : JSON.stringify(queryResult, null, 2)}</pre>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
} 
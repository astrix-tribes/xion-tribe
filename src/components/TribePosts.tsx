import React, { useState, useEffect, useCallback } from 'react';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';

// Define post types
interface PostMetadata {
  title?: string;
  content?: string;
  image?: string;
  tags?: string[];
  [key: string]: any;
}

interface Post {
  id: number;
  creator: string;
  tribe_id: number;
  metadata: PostMetadata;
  created_at: string;
  is_gated: boolean;
  tribe_name?: string; // Add tribe name for all posts view
}

interface TribePostsProps {
  tribeId?: number; // Make tribeId optional for all posts view
  userAddress: string | null;
  isMember: boolean;
  tribeName?: string; // Add tribe name prop
  userFilter?: string; // Add userFilter prop to filter posts by creator
}

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

const POSTS_STORAGE_KEY = 'xion_tribe_posts';

const TribePosts: React.FC<TribePostsProps> = ({ tribeId, userAddress, isMember, tribeName, userFilter }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState('');
  const [postCount, setPostCount] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: '',
    tags: ''
  });

  // Get posts from localStorage
  const getStoredPosts = (): Post[] => {
    try {
      const storedData = localStorage.getItem(POSTS_STORAGE_KEY);
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (err) {
      console.error("Error parsing stored posts:", err);
    }
    return [];
  };

  // Save posts to localStorage
  const savePosts = (newPosts: Post[]) => {
    try {
      // Get all stored posts
      const allStoredPosts = getStoredPosts();
      
      // Create a map of current posts by ID for fast lookup
      const postsMap = new Map(allStoredPosts.map(post => [post.id, post]));
      
      // Add or update new posts
      for (const post of newPosts) {
        postsMap.set(post.id, post);
      }
      
      // Convert map back to array
      const updatedPosts = Array.from(postsMap.values());
      
      // Save back to localStorage
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts));
      
      return updatedPosts;
    } catch (err) {
      console.error("Error saving posts:", err);
      return [];
    }
  };

  // Get the next post ID to determine how many posts exist
  const getNextPostId = async (): Promise<number> => {
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
      
      // Handle different response formats
      if (decoded && typeof decoded === 'object' && decoded.next_post_id !== undefined) {
        return Number(decoded.next_post_id);
      } else if (typeof decoded === 'number') {
        return decoded;
      } else if (typeof decoded === 'string' && !isNaN(Number(decoded))) {
        return Number(decoded);
      }
      
      return 0;
    } catch (err) {
      console.error("Error getting next post ID:", err);
      return 0;
    }
  };

  // Get tribe name by ID for post labeling
  const getTribeName = async (tribeId: number): Promise<string> => {
    try {
      // First check if we have the name in localStorage
      const TRIBES_STORAGE_KEY = 'xion_tribes';
      const storedTribeData = localStorage.getItem(TRIBES_STORAGE_KEY);
      
      if (storedTribeData) {
        const tribes = JSON.parse(storedTribeData);
        const tribe = tribes.find((t: any) => t.id === tribeId);
        if (tribe && tribe.name) {
          return tribe.name;
        }
      }
      
      // If not in storage, fetch from contract
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
      
      const decodedResult = decodeResult(result);
      return decodedResult.name || `Tribe ${tribeId}`;
    } catch (err) {
      console.error(`Error getting tribe name for ID ${tribeId}:`, err);
      return `Tribe ${tribeId}`;
    }
  };

  // Get a post by ID
  const getPost = async (postId: number): Promise<Post | null> => {
    try {
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.POST_MINTER.address,
        {
          post_minter: {
            get_post: { post_id: postId }
          }
        }
      );
      
      const decodedPost = decodeResult(result);
      
      // Parse metadata
      let metadata: PostMetadata = {};
      try {
        if (decodedPost.metadata) {
          if (typeof decodedPost.metadata === 'string') {
            metadata = JSON.parse(decodedPost.metadata);
          } else if (typeof decodedPost.metadata === 'object') {
            metadata = decodedPost.metadata;
          }
        }
      } catch (e) {
        console.warn("Could not parse post metadata:", e);
      }
      
      // Get tribe name for the post
      const tribeId = decodedPost.tribe_id || 0;
      const tribeName = await getTribeName(tribeId);
      
      // Create post object
      const post: Post = {
        id: postId,
        creator: decodedPost.creator || '',
        tribe_id: tribeId,
        metadata: metadata,
        created_at: decodedPost.created_at || '',
        is_gated: decodedPost.is_gated || false,
        tribe_name: tribeName
      };
      
      return post;
    } catch (err) {
      console.error(`Error getting post ${postId}:`, err);
      return null;
    }
  };

  // Fetch all posts that belong to this tribe or all posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      
      // Get the total number of posts
      const nextPostId = await getNextPostId();
      setPostCount(nextPostId);
      
      if (nextPostId === 0) {
        setLoadingPosts(false);
        return;
      }
      
      // Get stored posts to avoid re-fetching
      const storedPosts = getStoredPosts();
      let filteredStoredPosts = storedPosts;
      
      // Filter stored posts based on the view
      if (tribeId !== undefined) {
        filteredStoredPosts = storedPosts.filter(post => post.tribe_id === tribeId);
      }
      
      if (userFilter) {
        filteredStoredPosts = filteredStoredPosts.filter(post => post.creator === userFilter);
      }
      
      // Get IDs of stored posts that match our filter criteria
      const storedPostIds = new Set(filteredStoredPosts.map(post => post.id));
      
      const newPosts: Post[] = [];
      
      // If we're in a specific tribe view, optimize fetching by only checking posts that belong to this tribe
      if (tribeId !== undefined) {
        // Try to fetch post IDs for this tribe first
        try {
          // Here we would ideally call a contract method that returns all post IDs for a tribe
          // Since that doesn't seem to exist, we'll improve the current approach
          
          // First display what we already have in localStorage
          setPosts(filteredStoredPosts.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
          
          // Then fetch any new posts since last time
          for (let i = 0; i < nextPostId; i++) {
            // Skip already stored posts
            if (storedPostIds.has(i)) {
              continue;
            }
            
            try {
              const post = await getPost(i);
              if (post && post.tribe_id === tribeId) {
                newPosts.push(post);
              }
            } catch (err) {
              console.error(`Error fetching post ${i}:`, err);
            }
          }
        } catch (err) {
          console.error(`Error fetching posts for tribe ${tribeId}:`, err);
        }
      } else {
        // If showing all posts, fetch any we don't have yet
        for (let i = 0; i < nextPostId; i++) {
          // Skip already stored posts
          if (storedPostIds.has(i)) {
            continue;
          }
          
          try {
            const post = await getPost(i);
            if (post) {
              newPosts.push(post);
            }
          } catch (err) {
            console.error(`Error fetching post ${i}:`, err);
          }
        }
      }
      
      // Save all new posts to localStorage, regardless of tribe
      if (newPosts.length > 0) {
        const allUpdatedPosts = savePosts(newPosts);
        
        // Filter for current view (specific tribe or all)
        let postsToDisplay = tribeId 
          ? allUpdatedPosts.filter(post => post.tribe_id === tribeId)
          : allUpdatedPosts;
        
        // Apply user filter if provided
        if (userFilter) {
          postsToDisplay = postsToDisplay.filter(post => post.creator === userFilter);
        }
        
        // Sort by ID or date (newest first)
        postsToDisplay.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Update state
        setPosts(postsToDisplay);
      }
      
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to load posts");
    } finally {
      setLoadingPosts(false);
      setLoading(false);
    }
  }, [tribeId, userFilter]);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        // First check localStorage
        const storedPosts = getStoredPosts();
        
        // Filter posts based on params
        let filteredPosts = storedPosts;
        
        // If tribeId is provided, filter for that tribe
        if (tribeId !== undefined) {
          filteredPosts = filteredPosts.filter(post => post.tribe_id === tribeId);
        }
        
        // If userFilter is provided, filter by creator
        if (userFilter) {
          filteredPosts = filteredPosts.filter(post => post.creator === userFilter);
        }
        
        if (filteredPosts.length > 0) {
          // Sort by newest first
          filteredPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setPosts(filteredPosts);
          setLoading(false);
        }
        
        // Then check for new posts from the blockchain
        await fetchPosts();
      } catch (err) {
        console.error("Error loading posts:", err);
        setLoading(false);
      }
    };
    
    loadPosts();
  }, [tribeId, userFilter, fetchPosts]);

  // Create a new post
  const createPost = async () => {
    if (!userAddress || !isMember || !tribeId) {
      setError("You must be a member of a tribe to create posts");
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const { client, userAddress } = await connectWallet();
      
      // Create metadata
      const metadata: PostMetadata = {
        title: formData.title,
        content: formData.content,
        image: formData.image,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };
      
      const metadataStr = JSON.stringify(metadata);
      
      const msg = {
        post_minter: {
          create_post: {
            tribe_id: tribeId,
            metadata: metadataStr,
            is_gated: false,
            collectible_contract: null,
            collectible_id: null
          }
        }
      };

      const result = await client.execute(
        userAddress,
        CONTRACTS.POST_MINTER.address,
        msg,
        'auto'
      );

      // Get the new post ID from the transaction result (if available)
      let newPostId: number | null = null;
      try {
        // Different chains might return the new ID in different formats
        if (result.logs && result.logs.length > 0) {
          const events = result.logs[0].events;
          const wasm = events.find((e: any) => e.type === 'wasm');
          if (wasm && wasm.attributes) {
            const postIdAttr = wasm.attributes.find((attr: any) => 
              attr.key === 'post_id' || attr.key === 'id'
            );
            if (postIdAttr) {
              newPostId = Number(postIdAttr.value);
            }
          }
        }
      } catch (err) {
        console.warn("Could not extract post ID from result:", err);
      }
      
      // If we have a new post ID, create a temporary post
      if (newPostId !== null) {
        // Create a temporary post with the known data
        const newPost: Post = {
          id: newPostId,
          creator: userAddress,
          tribe_id: tribeId,
          metadata: metadata,
          created_at: new Date().toISOString(),
          is_gated: false,
          tribe_name: tribeName
        };
        
        // Add to posts state for immediate feedback
        setPosts(prevPosts => [newPost, ...prevPosts]);
        
        // Save to localStorage
        savePosts([newPost]);
      }

      alert("Post created successfully!");
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        image: '',
        tags: ''
      });
      setShowCreateForm(false);
      
      // Refetch posts to include the new one and get any data we couldn't determine locally
      await fetchPosts();
      
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  // Post card component
  const PostCard = ({ post }: { post: Post }) => {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 transition-all hover:shadow-xl mb-4">
        {post.metadata.image && (
          <div className="h-48 md:h-64 overflow-hidden">
            <img 
              src={post.metadata.image} 
              alt={post.metadata.title || 'Post image'} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Image+Not+Available';
              }}
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="text-xl font-bold text-white mb-2">{post.metadata.title || 'Untitled Post'}</h3>
          {/* Show tribe name when viewing all posts, not when in a specific tribe */}
          {!tribeId && post.tribe_name && (
            <div className="mb-2">
              <span 
                className="px-2 py-1 bg-indigo-900/30 text-indigo-200 text-xs rounded-full cursor-pointer hover:bg-indigo-900/50"
                onClick={() => window.location.href = `/tribe/${post.tribe_id}`}
              >
                {post.tribe_name}
              </span>
            </div>
          )}
          <p className="text-gray-300 mb-3 line-clamp-3 overflow-hidden">
            {post.metadata.content || 'No content'}
          </p>
          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.metadata.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-200 text-xs rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center text-xs text-gray-400 mt-4 pt-2 border-t border-gray-700">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {post.creator.substring(0, 8)}...
            </span>
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Create post form
  const CreatePostForm = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Create New Post</h2>
        <button
          onClick={() => setShowCreateForm(false)}
          className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Post title"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Content</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your post here..."
            rows={4}
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Image URL (optional)</label>
          <input
            type="text"
            value={formData.image}
            onChange={(e) => setFormData({...formData, image: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
          {formData.image && (
            <div className="mt-2 bg-gray-700 p-2 rounded-md inline-block">
              <img 
                src={formData.image} 
                alt="Post image preview" 
                className="h-20 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x100?text=Invalid+URL';
                }}
              />
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({...formData, tags: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tag1, tag2, tag3"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <button
            onClick={createPost}
            disabled={loading || !formData.title || !formData.content}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Post'}
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

  // Main component return
  return (
    <div>
      {/* Header section with conditional rendering based on view type */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          {tribeId && (
            <h2 className="text-2xl font-bold text-white">
              {tribeName ? tribeName : `Tribe ${tribeId}`} Posts
            </h2>
          )}
          {!tribeId && !userFilter && (
            <h2 className="text-2xl font-bold text-white">All Posts</h2>
          )}
          {userFilter && (
            <h2 className="text-2xl font-bold text-white">User Posts</h2>
          )}
          
          <div className="text-sm text-gray-400 mt-1">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Only show create button for tribe-specific view when user is a member */}
        {tribeId && isMember && userAddress && !userFilter && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
            disabled={!isMember || !userAddress}
          >
            Create Post
          </button>
        )}
      </div>
      
      {/* Create post form */}
      {showCreateForm && (
        <CreatePostForm />
      )}
      
      {/* Error display */}
      {error && (
        <div className="p-4 mb-4 bg-red-900/30 border border-red-800 rounded-md text-red-200">
          {error}
        </div>
      )}
      
      {/* Loading state */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-400">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">No posts found</p>
          {tribeId && isMember && userAddress && !userFilter && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              Create Your First Post
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
          
          {/* Loading more posts indicator */}
          {loadingPosts && (
            <div className="col-span-full p-4 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-400">Loading more posts...</p>
            </div>
          )}
        </div>
      )}
      
      {/* Load new posts button - only show in tribe view */}
      {!loading && posts.length > 0 && postCount > posts.length && !loadingPosts && (
        <div className="mt-6 text-center">
          <button
            onClick={fetchPosts}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md text-sm font-medium"
          >
            Refresh Posts
          </button>
        </div>
      )}
    </div>
  );
};

export default TribePosts; 
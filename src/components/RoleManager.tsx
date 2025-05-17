import React, { useState } from 'react';
import { CONTRACTS } from '../config/contracts';
import { connectWallet } from '../utils/wallet';

export default function RoleManager() {
  const [role, setRole] = useState('');
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Separate state for each function
  const [grantRoleValue, setGrantRoleValue] = useState('');
  const [grantAccountValue, setGrantAccountValue] = useState('');
  const [revokeRoleValue, setRevokeRoleValue] = useState('');
  const [revokeAccountValue, setRevokeAccountValue] = useState('');
  const [checkRoleValue, setCheckRoleValue] = useState('');
  const [checkAccountValue, setCheckAccountValue] = useState('');

  const [grantResult, setGrantResult] = useState<string | null>(null);
  const [revokeResult, setRevokeResult] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const grantRole = async () => {
    try {
      setLoading(true);
      setError('');
      setGrantResult(null);
      const { client, userAddress } = await connectWallet();
      const msg = {
        role_manager: {
          grant_role: {
            role: grantRoleValue,
            account: grantAccountValue
          }
        }
      };
      const result = await client.execute(
        userAddress,
        CONTRACTS.ROLE_MANAGER.address,
        msg,
        'auto'
      );
      setGrantResult('Role granted successfully!');
      setGrantRoleValue('');
      setGrantAccountValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setGrantResult('Failed to grant role.');
    } finally {
      setLoading(false);
    }
  };

  const revokeRole = async () => {
    try {
      setLoading(true);
      setError('');
      setRevokeResult(null);
      const { client, userAddress } = await connectWallet();
      const msg = {
        role_manager: {
          revoke_role: {
            role: revokeRoleValue,
            account: revokeAccountValue
          }
        }
      };
      const result = await client.execute(
        userAddress,
        CONTRACTS.ROLE_MANAGER.address,
        msg,
        'auto'
      );
      setRevokeResult('Role revoked successfully!');
      setRevokeRoleValue('');
      setRevokeAccountValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setRevokeResult('Failed to revoke role.');
    } finally {
      setLoading(false);
    }
  };

  const hasRole = async () => {
    try {
      setLoading(true);
      setError('');
      setCheckResult(null);
      const { client } = await connectWallet();
      const result = await client.queryContractSmart(
        CONTRACTS.ROLE_MANAGER.address,
        {
          role_manager: {
            has_role: {
              role: checkRoleValue,
              account: checkAccountValue
            }
          }
        }
      );
      setCheckResult(`Has role: ${JSON.stringify(result)}`);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setCheckResult('Failed to check role.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  function decodeBase64String(str: string) {
    try {
      return atob(str);
    } catch {
      return str;
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Role Manager</h2>
      
      <div className="space-y-8">
        {/* Grant Role Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Grant Role</h3>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Role to Grant</label>
            <input
              type="text"
              value={grantRoleValue}
              onChange={(e) => setGrantRoleValue(e.target.value)}
              placeholder="e.g. admin, moderator, creator"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Account to Grant Role</label>
            <input
              type="text"
              value={grantAccountValue}
              onChange={(e) => setGrantAccountValue(e.target.value)}
              placeholder="e.g. xion1abcd1234efgh5678ijkl..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={grantRole}
            disabled={loading}
            className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Granting...' : 'Grant Role'}
          </button>
          {grantResult && (
            <div className="text-blue-700 text-sm mt-2">{grantResult}</div>
          )}
        </div>
        {/* Revoke Role Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Revoke Role</h3>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Role to Revoke</label>
            <input
              type="text"
              value={revokeRoleValue}
              onChange={(e) => setRevokeRoleValue(e.target.value)}
              placeholder="e.g. admin, moderator, creator"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Account to Revoke Role</label>
            <input
              type="text"
              value={revokeAccountValue}
              onChange={(e) => setRevokeAccountValue(e.target.value)}
              placeholder="e.g. xion1abcd1234efgh5678ijkl..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={revokeRole}
            disabled={loading}
            className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {loading ? 'Revoking...' : 'Revoke Role'}
          </button>
          {revokeResult && (
            <div className="text-blue-700 text-sm mt-2">{revokeResult}</div>
          )}
        </div>
        {/* Check Role Section */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Check Role</h3>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Role to Check</label>
            <input
              type="text"
              value={checkRoleValue}
              onChange={(e) => setCheckRoleValue(e.target.value)}
              placeholder="e.g. admin, moderator, creator"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Account to Check</label>
            <input
              type="text"
              value={checkAccountValue}
              onChange={(e) => setCheckAccountValue(e.target.value)}
              placeholder="e.g. xion1abcd1234efgh5678ijkl..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={hasRole}
            disabled={loading}
            className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {loading ? 'Checking...' : 'Check Role'}
          </button>
          {checkResult && (
            <div className="text-blue-700 text-sm mt-2">
              Has role: {decodeBase64String(checkResult.replace('Has role: ', '').replace(/"/g, ''))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-4">{error}</div>
      )}
    </div>
  );
} 
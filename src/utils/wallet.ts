import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../config/contracts';

// Keplr types for TypeScript
declare global {
  interface Window {
    keplr?: any;
    getOfflineSigner?: any;
  }
}

export async function connectWallet() {
  // Check if Keplr is installed
  if (!window.keplr) {
    throw new Error('Keplr extension not found. Please install it to continue.');
  }

  try {
    // Enable the Keplr wallet for the specified chain
    await window.keplr.enable(CHAIN_CONFIG.chainId);
    
    // Get the offline signer from Keplr
    const offlineSigner = window.getOfflineSigner?.(CHAIN_CONFIG.chainId);
    if (!offlineSigner) {
      throw new Error('Failed to get offline signer from Keplr');
    }

    // Get the user accounts
    const accounts = await offlineSigner.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found in Keplr wallet');
    }
    
    const userAddress = accounts[0].address;

    // Connect to the CosmWasm client
    const client = await SigningCosmWasmClient.connectWithSigner(
      CHAIN_CONFIG.rpc,
      offlineSigner,
      { gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice) }
    );

    return { client, userAddress };
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    throw error;
  }
}

export async function getBalance(address: string) {
  try {
    const { client } = await connectWallet();
    const balance = await client.getBalance(address, 'uxion');
    return balance;
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
} 